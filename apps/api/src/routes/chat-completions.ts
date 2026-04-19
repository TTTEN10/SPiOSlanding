import { Router, Response } from 'express';
import Joi from 'joi';
import logger from '../lib/logger';
import { optionalAuthenticateWallet, AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { aiGatewayService, ChatCompletionRequest } from '../lib/ai-gateway.service';
import { chatRateLimitMiddleware } from '../lib/ratelimit';
import { optionalQuotaMiddleware } from '../middleware/quota';
import { chatConcurrencyMiddleware } from '../middleware/concurrency';
import { priceOracleService } from '../lib/price-oracle.service';
import { enhanceWithRAG } from '../lib/chat-rag-context';

const chatCompletionSchema = Joi.object({
  messages: Joi.array()
    .items(
      Joi.object({
        role: Joi.string().valid('user', 'assistant', 'system').required(),
        content: Joi.string().min(1).max(10000).required(),
        timestamp: Joi.date().optional(),
      })
    )
    .min(1)
    .max(100)
    .required(),
  model: Joi.string().max(100).optional(),
  temperature: Joi.number().min(0).max(2).optional(),
  maxTokens: Joi.number().integer().min(1).max(4000).optional(),
  stream: Joi.boolean().optional(),
  userId: Joi.string().max(255).optional(),
  sessionId: Joi.string().max(255).optional(),
  mode: Joi.string().valid('guest', 'authenticated').optional(),
});

/**
 * Shared OpenAI-style chat completions (same handler for /api/chat/completions and /beta/chat/completions).
 */
export function mountChatCompletions(router: Router, path: string = '/completions'): void {
  router.post(
    path,
    chatRateLimitMiddleware,
    optionalAuthenticateWallet,
    chatConcurrencyMiddleware,
    optionalQuotaMiddleware,
    validate(chatCompletionSchema),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const request: ChatCompletionRequest = req.body;
        const shouldStream = request.stream !== false;
        const isGuestMode = request.mode === 'guest';

        if (isGuestMode) {
          logger.debug('Chat completion: guest mode — skipping quota increment and persistence');
        }

        if (!isGuestMode && req.quota && req.wallet) {
          const { did, service } = req.quota;
          const walletAddress = req.wallet.walletAddress.toLowerCase();
          const incrementResult = await service.incrementUsage(did);
          await service.getQuotaStatus(did, walletAddress);

          if (!incrementResult.success) {
            const premiumPricing = await priceOracleService.getPremiumPricing();
            const pricing = {
              PREMIUM: {
                crypto: {
                  ETH: premiumPricing.ETH,
                  USDT: premiumPricing.USDT,
                  USDC: premiumPricing.USDC,
                },
              },
            };

            const paywallData = {
              error: 'QUOTA_EXCEEDED',
              message: 'Chat quota exceeded. Upgrade to Premium to continue.',
              quota: {
                dailyUsed: incrementResult.status.dailyUsed,
                dailyLimit: incrementResult.status.dailyLimit,
                monthlyUsed: incrementResult.status.monthlyUsed,
                monthlyLimit: incrementResult.status.monthlyLimit,
                resetDailyAt: incrementResult.status.resetDailyAt,
                resetMonthlyAt: incrementResult.status.resetMonthlyAt,
              },
              paywall: {
                showPaywall: true,
                pricing,
                paymentRecipient: process.env.CRYPTO_PAYMENT_CONTRACT_ADDRESS || null,
              },
            };

            if (shouldStream) {
              res.setHeader('Content-Type', 'text/event-stream');
              res.setHeader('Cache-Control', 'no-cache');
              res.setHeader('Connection', 'keep-alive');
              res.write(`event: error\n`);
              res.write(`data: ${JSON.stringify(paywallData)}\n\n`);
              res.end();
            } else {
              res.status(429).json(paywallData);
            }
            return;
          }
        }

        const withContext =
          req.query.withContext === 'true' || String(req.query.withContext) === 'true';
        const enhancedRequest = withContext ? await enhanceWithRAG(request) : request;

        if (shouldStream) {
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');
          res.setHeader('X-Accel-Buffering', 'no');

          res.write(`event: connected\n`);
          res.write(`data: ${JSON.stringify({ status: 'connected' })}\n\n`);

          try {
            for await (const sseMessage of aiGatewayService.generateCompletionStream(enhancedRequest)) {
              const eventLine = `event: ${sseMessage.event}\n`;
              const dataLine = `data: ${sseMessage.data}\n`;
              const idLine = sseMessage.id ? `id: ${sseMessage.id}\n` : '';
              const retryLine = sseMessage.retry ? `retry: ${sseMessage.retry}\n` : '';

              res.write(eventLine + dataLine + idLine + retryLine + '\n');
            }
          } catch (streamError: any) {
            logger.error('Streaming error:', streamError);
            res.write(`event: error\n`);
            res.write(`data: ${JSON.stringify({ error: 'Streaming error', message: streamError.message })}\n\n`);
          } finally {
            res.end();
          }
        } else {
          const completion = await aiGatewayService.generateCompletion(enhancedRequest);
          res.json(completion);
        }
      } catch (error: any) {
        logger.error('Chat completion error:', error);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message || 'Failed to generate completion',
            code: error.code || 'COMPLETION_ERROR',
          });
        }
      }
    }
  );
}
