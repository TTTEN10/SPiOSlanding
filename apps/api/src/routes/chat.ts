import { Router, Request, Response } from 'express';
import Joi from 'joi';
import logger from '../lib/logger';
import { authenticateWallet, optionalAuthenticateWallet, AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { SUPPORTED_CHAIN_ID } from '../lib/constants';
import { DIDService } from '../lib/did.service';
import { ethers } from 'ethers';
import { aiGatewayService, ChatCompletionRequest } from '../lib/ai-gateway.service';
import { safetyResponseInterceptor } from '../middleware/safety';
import { optionalQuotaMiddleware } from '../middleware/quota';
import { chatConcurrencyMiddleware } from '../middleware/concurrency';
import { QuotaService } from '../lib/quota.service';
import { subscriptionService } from '../lib/subscription.service';
import { priceOracleService } from '../lib/price-oracle.service';
import { storageService } from '../lib/storage.service';
import { encryptAES256GCM, generateEncryptionKey } from '../lib/crypto';
import { prisma } from '../lib/prisma';
import { DR_SAFE_SYSTEM_PROMPT } from '../lib/dr-safe-system-prompt';
import { mountChatCompletions } from './chat-completions';
import { getUpstreamHealthSnapshot } from '../lib/llm-upstream-health';
import { requireUpstreamStatusAuth } from '../middleware/upstream-status-auth';

const router = Router();

// Apply safety middleware to all chat routes
router.use(safetyResponseInterceptor);

/**
 * Validation schema for chat save
 */
const chatSaveSchema = Joi.object({
  encryptedChatBlob: Joi.string().required(),
  didTokenId: Joi.string().allow(null).optional(),
  generateSummary: Joi.boolean().optional().default(true), // Generate and store encrypted summary
  messages: Joi.array().items(
    Joi.object({
      role: Joi.string().valid('user', 'assistant', 'system').required(),
      content: Joi.string().required(),
    })
  ).optional(), // Optional: messages for summary generation (if not provided, summary will be basic)
});

/**
 * Generate a chat summary from messages
 */
async function generateChatSummary(messages: any[]): Promise<string> {
  try {
    // Filter out system messages and create a summary prompt
    const conversationMessages = messages
      .filter((msg) => msg.role !== 'system')
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n');

    if (!conversationMessages || conversationMessages.length < 50) {
      // Too short to summarize meaningfully
      return conversationMessages || 'Empty conversation';
    }

    const summaryPrompt = `Please provide a concise summary of the following conversation. Focus on key topics, concerns, and any important information discussed. Keep it under 200 words.

Conversation:
${conversationMessages}

Summary:`;

    const completion = await aiGatewayService.generateCompletion({
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that creates concise summaries of conversations.',
        },
        {
          role: 'user',
          content: summaryPrompt,
        },
      ],
      model: 'llama-3-70b-instruct', // Scaleway default model
      temperature: 0.3,
      maxTokens: 300,
      stream: false,
    });

    const text = completion.choices[0]?.message?.content;
    return text || conversationMessages;
  } catch (error: any) {
    logger.error('Error generating chat summary:', error);
    // Fallback: return first 500 chars of conversation
    const conversationMessages = messages
      .filter((msg) => msg.role !== 'system')
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n');
    return conversationMessages.substring(0, 500);
  }
}

/**
 * POST /api/chat/save
 * Save encrypted chat history
 * 
 * Input: { encryptedChatBlob: string, didTokenId: string | null }
 * Auth: Required (wallet session)
 * 
 * Flow:
 * 1. Validate authenticated wallet session
 * 2. Ensure caller is DID owner (if DID exists)
 * 3. Store encrypted blob in database
 * 4. Generate hash of encrypted blob
 * 5. Update DID's encryptedData field with hash + encrypted key reference
 */
router.post(
  '/save',
  authenticateWallet,
  validate(chatSaveSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.wallet) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Validate chain ID
      if (req.wallet.chainId !== SUPPORTED_CHAIN_ID) {
        return res.status(400).json({
          success: false,
          message: 'Only Sepolia Testnet is supported',
          error: 'UNSUPPORTED_CHAIN',
        });
      }

      const { encryptedChatBlob, didTokenId, generateSummary = true, messages } = req.body;
      const walletAddress = req.wallet.walletAddress.toLowerCase();

      // Verify DID ownership if DID exists
      const didService = DIDService.getInstance();
      if (didService) {
        const hasDid = await didService.hasDid(walletAddress);
        if (hasDid) {
          const didInfo = await didService.getDIDInfo(walletAddress);
          if (didTokenId && didInfo.tokenId !== didTokenId) {
            return res.status(403).json({
              success: false,
              message: 'DID token ID does not match authenticated wallet',
              error: 'DID_MISMATCH',
            });
          }
        } else if (didTokenId) {
          return res.status(404).json({
            success: false,
            message: 'DID not found for wallet',
            error: 'DID_NOT_FOUND',
          });
        }
      }

      // Generate hash of encrypted blob (for on-chain storage)
      const encoder = new TextEncoder();
      const blobBytes = encoder.encode(encryptedChatBlob);
      const hash = await crypto.subtle.digest('SHA-256', blobBytes);
      const blobHash = ethers.hexlify(new Uint8Array(hash));

      // Generate and encrypt chat summary if requested
      let encryptedSummaryRef: string | null = null;
      let encryptedSummaryKey: Buffer | null = null;

      if (generateSummary) {
        try {
          // Generate a summary key for encrypting the summary
          encryptedSummaryKey = generateEncryptionKey();
          
          // Generate chat summary from messages if provided, otherwise create basic metadata summary
          let summaryText: string;
          if (messages && Array.isArray(messages) && messages.length > 0) {
            // Generate AI-powered summary from actual messages
            summaryText = await generateChatSummary(messages);
          } else {
            // Fallback: create a basic metadata summary
            summaryText = `Chat summary for wallet ${walletAddress}. Last updated: ${new Date().toISOString()}. Hash: ${blobHash.substring(0, 16)}...`;
          }
          
          // Encrypt the summary locally using AES-256-GCM
          const encryptedSummary = encryptAES256GCM(summaryText, encryptedSummaryKey);
          
          // Upload encrypted summary to S3/IPFS gateway
          const storageResult = await storageService.uploadEncryptedSummary(
            Buffer.from(encryptedSummary, 'base64'),
            walletAddress
          );
          
          if (storageResult.success && storageResult.reference) {
            encryptedSummaryRef = storageResult.reference;
            logger.info(`Chat summary encrypted and stored: ${encryptedSummaryRef} (${storageResult.storageType})`);
          } else {
            logger.warn('Failed to store encrypted chat summary:', storageResult.error);
          }
        } catch (summaryError: any) {
          logger.error('Error generating/storing chat summary:', summaryError);
          // Continue without summary - don't fail the whole request
        }
      }

      // Store or update encrypted chat in database
      const encryptedChat = await prisma.encryptedChat.upsert({
        where: { walletAddress },
        update: {
          encryptedBlob: encryptedChatBlob,
          encryptedBlobHash: blobHash,
          didTokenId: didTokenId || null,
          encryptedSummaryRef: encryptedSummaryRef || null,
          updatedAt: new Date(),
        },
        create: {
          walletAddress,
          encryptedBlob: encryptedChatBlob,
          encryptedBlobHash: blobHash,
          didTokenId: didTokenId || null,
          encryptedSummaryRef: encryptedSummaryRef || null,
        },
      });

      // Update DID's chat reference with hash
      // The chat reference is stored as bytes32 (hash) in the DID profile
      if (didService) {
        try {
          const didInfo = await didService.getDIDInfo(walletAddress);
          if (didInfo?.hasDid) {
            // Get existing profile to preserve encrypted key metadata
            const profile = await didService.getProfile(walletAddress);
            
            // Convert blob hash to bytes32 format (remove 0x prefix if present, ensure 32 bytes)
            const hashBytes = ethers.getBytes(blobHash);
            const hashBytes32 = ethers.zeroPadValue(ethers.hexlify(hashBytes.slice(0, 32)), 32);
            
            // Use the hash as the chat reference (string format for frontend)
            const chatReference = blobHash;

            // Log with hashed wallet address for privacy (wallet address is public but hash for logs)
            const hashedWallet = ethers.keccak256(ethers.toUtf8Bytes(walletAddress)).substring(0, 16);
            logger.info(`Chat saved for wallet ${hashedWallet}..., hash: ${blobHash.substring(0, 16)}...`);

            res.json({
              success: true,
              message: 'Chat saved successfully',
              data: {
                chatId: encryptedChat.id,
                blobHash,
                didTokenId: didInfo.tokenId,
                // Return the chat reference that should be stored in DID
                chatReference,
                // Encrypted summary reference (S3 key or IPFS CID)
                encryptedSummaryRef: encryptedSummaryRef || null,
                // Encrypted summary key (base64 encoded, client should encrypt this with user's key)
                encryptedSummaryKey: encryptedSummaryKey ? encryptedSummaryKey.toString('base64') : null,
                // Preserve existing encrypted key metadata if it exists
                preserveEncryptedKeyMetadata: profile?.encryptedKeyMetadata || null,
                // Indicates frontend should call storeEncryptedChatSummary or updateChatReference
                requiresDidUpdate: true,
              },
            });
          } else {
            // DID exists but hasDid is false - just save chat without DID update
            res.json({
              success: true,
              message: 'Chat saved successfully',
              data: {
                chatId: encryptedChat.id,
                blobHash,
                didTokenId: null,
                requiresDidUpdate: false,
              },
            });
          }
        } catch (didError) {
          logger.error('Error updating DID data:', didError);
          // Still return success for chat save, but note DID update failed
          res.json({
            success: true,
            message: 'Chat saved, but DID update may be needed',
            data: {
              chatId: encryptedChat.id,
              blobHash,
              didTokenId: null,
              requiresDidUpdate: true,
              warning: 'DID update should be performed by wallet owner',
            },
          });
        }
      } else {
        // No DID yet, just save chat
        res.json({
          success: true,
          message: 'Chat saved successfully',
          data: {
            chatId: encryptedChat.id,
            blobHash,
            didTokenId: null,
            requiresDidUpdate: false,
          },
        });
      }
    } catch (error: any) {
      logger.error('Chat save error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to save chat',
      });
    }
  }
);

/**
 * GET /api/chat/summary
 * Retrieve encrypted chat summary for authenticated wallet
 * 
 * Auth: Required (wallet session)
 * 
 * Flow:
 * 1. Validate authenticated wallet session
 * 2. Get summary reference from database (or DID contract)
 * 3. Download encrypted summary from IPFS/S3 storage
 * 4. Return encrypted summary blob (frontend will decrypt)
 */
router.get(
  '/summary',
  authenticateWallet,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.wallet) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Validate chain ID
      if (req.wallet.chainId !== SUPPORTED_CHAIN_ID) {
        return res.status(400).json({
          success: false,
          message: 'Only Sepolia Testnet is supported',
          error: 'UNSUPPORTED_CHAIN',
        });
      }

      const walletAddress = req.wallet.walletAddress.toLowerCase();

      // Get summary reference from database
      const encryptedChat = await prisma.encryptedChat.findUnique({
        where: { walletAddress },
        select: {
          encryptedSummaryRef: true,
        },
      });

      if (!encryptedChat || !encryptedChat.encryptedSummaryRef) {
        return res.status(404).json({
          success: false,
          message: 'Chat summary not found',
          error: 'SUMMARY_NOT_FOUND',
        });
      }

      // Download encrypted summary from storage (IPFS/S3)
      const encryptedSummaryBuffer = await storageService.downloadEncryptedSummary(
        encryptedChat.encryptedSummaryRef
      );

      if (!encryptedSummaryBuffer) {
        return res.status(404).json({
          success: false,
          message: 'Failed to download chat summary from storage',
          error: 'STORAGE_ERROR',
        });
      }

      // Convert buffer to base64 for transmission
      const encryptedSummaryBase64 = encryptedSummaryBuffer.toString('base64');

      // Log with hashed wallet address for privacy
      const hashedWallet = ethers.keccak256(ethers.toUtf8Bytes(walletAddress)).substring(0, 16);
      logger.info(`Chat summary retrieved for wallet ${hashedWallet}...`);

      res.json({
        success: true,
        data: {
          encryptedSummary: encryptedSummaryBase64,
          reference: encryptedChat.encryptedSummaryRef,
        },
      });
    } catch (error: any) {
      logger.error('Chat summary retrieval error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve chat summary',
      });
    }
  }
);

/**
 * GET /api/chat/load
 * Load encrypted chat history for authenticated wallet
 * 
 * Auth: Required (wallet session)
 * 
 * Flow:
 * 1. Validate authenticated wallet session
 * 2. Load encrypted chat from database
 * 3. Return encrypted blob (frontend will decrypt)
 */
router.get(
  '/load',
  authenticateWallet,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.wallet) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Validate chain ID
      if (req.wallet.chainId !== SUPPORTED_CHAIN_ID) {
        return res.status(400).json({
          success: false,
          message: 'Only Sepolia Testnet is supported',
          error: 'UNSUPPORTED_CHAIN',
        });
      }

      const walletAddress = req.wallet.walletAddress.toLowerCase();

      // Load encrypted chat from database
      const encryptedChat = await prisma.encryptedChat.findUnique({
        where: { walletAddress },
      });

      if (!encryptedChat) {
        return res.json({
          success: true,
          data: {
            hasChat: false,
            encryptedChatBlob: null,
            blobHash: null,
          },
        });
      }

      // Optionally verify hash matches DID if DID exists
      const didService = DIDService.getInstance();
      if (didService) {
        const hasDid = await didService.hasDid(walletAddress);
        if (hasDid) {
          try {
            const profile = await didService.getProfile(walletAddress);
            if (profile) {
              // Convert bytes32 chat reference to hex string for comparison
              const chatRefHex = profile.chatDataReference;
              if (chatRefHex && chatRefHex !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
                // Compare with stored hash (may need to normalize format)
                const storedHash = encryptedChat.encryptedBlobHash.toLowerCase();
                const refHash = chatRefHex.toLowerCase();
                if (refHash !== storedHash && !storedHash.startsWith(refHash.slice(0, 10))) {
                  // Log with hashed wallet address for privacy
                  const hashedWallet = ethers.keccak256(ethers.toUtf8Bytes(walletAddress)).substring(0, 16);
                  logger.warn(`Chat hash mismatch for wallet ${hashedWallet}...`);
                  // Still return chat, but note the mismatch
                }
              }
            }
          } catch (error) {
            // Ignore DID check errors
            logger.warn('Could not verify chat hash with DID:', error);
          }
        }
      }

      // Log with hashed wallet address for privacy
      const hashedWallet = ethers.keccak256(ethers.toUtf8Bytes(walletAddress)).substring(0, 16);
      logger.info(`Chat loaded for wallet ${hashedWallet}...`);

      res.json({
        success: true,
        data: {
          hasChat: true,
          encryptedChatBlob: encryptedChat.encryptedBlob,
          blobHash: encryptedChat.encryptedBlobHash,
          didTokenId: encryptedChat.didTokenId,
          encryptedSummaryRef: encryptedChat.encryptedSummaryRef,
          updatedAt: encryptedChat.updatedAt.toISOString(),
        },
      });
    } catch (error: any) {
      logger.error('Chat load error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to load chat',
      });
    }
  }
);

/**
 * GET /api/chat/upstream-status
 * Last probe result per configured LLM base URL (from env). Optional secret: AI_UPSTREAM_STATUS_SECRET.
 */
router.get('/upstream-status', requireUpstreamStatusAuth, (_req, res) => {
  res.json({
    success: true,
    skipHealthCheck: process.env.AI_SKIP_UPSTREAM_HEALTH_CHECK === '1',
    upstreams: getUpstreamHealthSnapshot(),
  });
});

/** POST /api/chat/completions — shared with /beta/chat/completions (see chat-completions.ts) */
mountChatCompletions(router);

/**
 * GET /api/chat/quota
 * Get quota status for authenticated DID
 * 
 * Auth: Required (wallet session)
 */
router.get(
  '/quota',
  authenticateWallet,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.wallet) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const walletAddress = req.wallet.walletAddress.toLowerCase();
      const quotaService = QuotaService.getInstance();

      // Get DID from wallet address
      const did = await quotaService.getDIDFromWallet(walletAddress);

      if (!did) {
        return res.json({
          success: true,
          message: 'No DID found for wallet',
          data: {
            hasDid: false,
            quota: null,
          },
        });
      }

      // Get quota status (pass wallet address for subscription check)
      const quotaStatus = await quotaService.getQuotaStatus(did, walletAddress);
      
      // Get subscription info
      const subscription = await subscriptionService.getOrCreateSubscription(walletAddress);

      res.json({
        success: true,
        data: {
          hasDid: true,
          did,
          quota: quotaStatus,
          subscription: {
            tier: subscription.tier,
            status: subscription.status,
            dailyLimit: subscription.dailyLimit,
            monthlyLimit: subscription.monthlyLimit,
          },
        },
      });
    } catch (error: any) {
      logger.error('Quota status error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get quota status',
      });
    }
  }
);

/**
 * GET /api/chat/concurrency
 * Check if a chat request is currently in progress for authenticated DID
 * 
 * Auth: Required (wallet session)
 */
router.get(
  '/concurrency',
  authenticateWallet,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.wallet) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const walletAddress = req.wallet.walletAddress.toLowerCase();
      const quotaService = QuotaService.getInstance();

      // Get DID from wallet address
      const did = await quotaService.getDIDFromWallet(walletAddress);

      if (!did) {
        return res.json({
          success: true,
          data: {
            hasDid: false,
            requestInProgress: false,
          },
        });
      }

      // Check if there's an active concurrency lock
      const hasLock = await quotaService.hasConcurrencyLock(did);

      res.json({
        success: true,
        data: {
          hasDid: true,
          did,
          requestInProgress: hasLock,
        },
      });
    } catch (error: any) {
      logger.error('Concurrency status error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get concurrency status',
      });
    }
  }
);

/**
 * GET /api/chat/health
 * Health check for chat endpoints
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Chat endpoints are healthy',
    timestamp: new Date().toISOString(),
  });
});

export default router;
