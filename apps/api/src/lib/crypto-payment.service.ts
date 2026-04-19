import { ethers } from 'ethers';
import logger from './logger';
import { SUPPORTED_CHAIN_ID, SUPPORTED_NETWORK_NAME } from './constants';
import { priceOracleService } from './price-oracle.service';
import { prisma } from './prisma';

/**
 * Crypto Payment Service
 * Handles cryptocurrency payments for subscriptions
 */
export class CryptoPaymentService {
  private provider: ethers.JsonRpcProvider | null = null;
  private paymentContractAddress: string | null = null;

  constructor() {
    const rpcUrl = process.env.RPC_URL || process.env.ETH_RPC_URL;
    const contractAddress = process.env.CRYPTO_PAYMENT_CONTRACT_ADDRESS;

    if (rpcUrl) {
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
    }

    if (contractAddress) {
      this.paymentContractAddress = contractAddress;
    }

    if (this.provider && this.paymentContractAddress) {
      logger.info('Crypto payment service initialized');
    } else {
      logger.warn('Crypto payment service not fully configured');
    }
  }

  /**
   * Check if crypto payments are configured
   */
  isConfigured(): boolean {
    return this.provider !== null && this.paymentContractAddress !== null;
  }

  /**
   * Verify crypto payment transaction
   * Supports ETH, USDT, and USDC
   */
  async verifyPayment(
    txHash: string,
    expectedAmount: bigint,
    expectedRecipient: string,
    currency: 'ETH' | 'USDT' | 'USDC' = 'ETH'
  ): Promise<{
    verified: boolean;
    amount: bigint;
    recipient: string;
    blockNumber: number;
    currency: string;
  }> {
    if (!this.provider) {
      throw new Error('Crypto payment service not configured');
    }

    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      if (!receipt) {
        throw new Error('Transaction not found');
      }

      // Verify chain ID
      const network = await this.provider.getNetwork();
      if (Number(network.chainId) !== SUPPORTED_CHAIN_ID) {
        throw new Error(`Transaction not on supported network (${SUPPORTED_NETWORK_NAME})`);
      }

      // Get transaction details
      const tx = await this.provider.getTransaction(txHash);
      if (!tx) {
        throw new Error('Transaction details not found');
      }

      // Verify transaction is confirmed
      if (receipt.status !== 1) {
        throw new Error('Transaction failed');
      }

      if (currency === 'ETH') {
        // Native ETH transfer
        // Verify recipient
        if (tx.to?.toLowerCase() !== expectedRecipient.toLowerCase()) {
          throw new Error('Transaction recipient mismatch');
        }

        // Verify amount
        if (tx.value !== expectedAmount) {
          throw new Error('Transaction amount mismatch');
        }

        return {
          verified: true,
          amount: tx.value,
          recipient: tx.to || '',
          blockNumber: receipt.blockNumber,
          currency: 'ETH',
        };
      } else {
        // ERC-20 token transfer (USDT/USDC)
        // Parse transfer event from logs
        const tokenAddress = this.getTokenAddress(currency);
        const tokenAbi = [
          'function transfer(address to, uint256 amount) external returns (bool)',
          'event Transfer(address indexed from, address indexed to, uint256 value)',
        ];
        const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, this.provider);

        // Find Transfer event in logs
        let transferFound = false;
        let transferAmount = BigInt(0);

        for (const log of receipt.logs) {
          try {
            const parsedLog = tokenContract.interface.parseLog(log);
            if (parsedLog && parsedLog.name === 'Transfer') {
              const [from, to, value] = parsedLog.args;
              if (to.toLowerCase() === expectedRecipient.toLowerCase()) {
                transferFound = true;
                transferAmount = value;
                break;
              }
            }
          } catch (e) {
            // Not a transfer event, continue
          }
        }

        if (!transferFound) {
          throw new Error('Token transfer not found in transaction');
        }

        // Verify amount (with small tolerance for rounding)
        const tolerance = expectedAmount / BigInt(1000); // 0.1% tolerance
        const diff = transferAmount > expectedAmount 
          ? transferAmount - expectedAmount 
          : expectedAmount - transferAmount;
        
        if (diff > tolerance) {
          throw new Error('Transaction amount mismatch');
        }

        return {
          verified: true,
          amount: transferAmount,
          recipient: expectedRecipient,
          blockNumber: receipt.blockNumber,
          currency,
        };
      }
    } catch (error) {
      logger.error('Error verifying crypto payment:', error);
      throw error;
    }
  }

  /**
   * Create payment record
   */
  async createPaymentRecord(
    walletAddress: string,
    didTokenId: string | null,
    subscriptionId: string,
    txHash: string,
    amount: bigint,
    currency: string = 'ETH'
  ) {
    try {
      const amountDecimal = ethers.formatEther(amount);

      return prisma.payment.create({
        data: {
          subscriptionId,
          walletAddress: walletAddress.toLowerCase(),
          didTokenId: didTokenId || null,
          amount: amountDecimal,
          currency,
          paymentMethod: 'CRYPTO',
          status: 'PENDING',
          cryptoTxHash: txHash,
        },
      });
    } catch (error) {
      logger.error('Error creating payment record:', error);
      throw error;
    }
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(
    txHash: string,
    status: 'COMPLETED' | 'FAILED',
    blockNumber?: number
  ) {
    try {
      const updateData: any = {
        status,
      };

      if (blockNumber) {
        updateData.cryptoBlockNumber = BigInt(blockNumber);
      }

      return prisma.payment.updateMany({
        where: { cryptoTxHash: txHash },
        data: updateData,
      });
    } catch (error) {
      logger.error('Error updating payment status:', error);
      throw error;
    }
  }

  /**
   * Get payment recipient address
   */
  getPaymentRecipient(): string {
    if (!this.paymentContractAddress) {
      throw new Error('Payment contract address not configured');
    }
    return this.paymentContractAddress;
  }

  /**
   * Get tier pricing for a currency
   * ETH price is dynamically calculated based on current market price
   */
  async getTierPricing(tier: 'PREMIUM', currency: 'ETH' | 'USDT' | 'USDC'): Promise<bigint> {
    if (currency === 'ETH') {
      // Get dynamic ETH price
      try {
        const ethAmount = await priceOracleService.getPremiumETHAmountBigInt();
        return ethAmount;
      } catch (error) {
        logger.error('Error getting dynamic ETH price, using fallback:', error);
        // Fallback to environment variable or default
        const fallbackPrice = process.env.CRYPTO_PRICE_PREMIUM_ETH || '0.005714';
        return ethers.parseEther(fallbackPrice);
      }
    } else {
      // USDT/USDC prices are fixed
      const pricing: Record<string, Record<string, string>> = {
        PREMIUM: {
          USDT: process.env.CRYPTO_PRICE_PREMIUM_USDT || '20.00',
          USDC: process.env.CRYPTO_PRICE_PREMIUM_USDC || '20.00',
        },
      };

      const price = pricing[tier]?.[currency] || '0';
      // USDT/USDC use 6 decimals
      return ethers.parseUnits(price, 6);
    }
  }

  /**
   * Get token contract addresses
   */
  getTokenAddress(currency: 'USDT' | 'USDC'): string {
    const addresses: Record<string, string> = {
      USDT: process.env.USDT_CONTRACT_ADDRESS || '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      USDC: process.env.USDC_CONTRACT_ADDRESS || '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    };
    return addresses[currency];
  }

  /**
   * Process crypto payment and upgrade subscription
   */
  async processPayment(
    walletAddress: string,
    didTokenId: string | null,
    tier: 'PREMIUM',
    txHash: string,
    currency: 'ETH' | 'USDT' | 'USDC' = 'ETH'
  ): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Crypto payment service not configured');
    }

    try {
      // Get subscription
      const subscription = await prisma.subscription.findUnique({
        where: { walletAddress: walletAddress.toLowerCase() },
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Verify payment
      const expectedAmount = await this.getTierPricing(tier, currency);
      const recipient = this.getPaymentRecipient();

      const verification = await this.verifyPayment(txHash, expectedAmount, recipient, currency);

      if (!verification.verified) {
        throw new Error('Payment verification failed');
      }

      // Format amount for storage
      let amountDecimal: string;
      if (currency === 'ETH') {
        amountDecimal = ethers.formatEther(verification.amount);
      } else {
        amountDecimal = ethers.formatUnits(verification.amount, 6);
      }

      // Create payment record
      await prisma.payment.create({
        data: {
          subscriptionId: subscription.id,
          walletAddress: walletAddress.toLowerCase(),
          didTokenId: didTokenId || null,
          amount: amountDecimal,
          currency,
          paymentMethod: 'CRYPTO',
          status: 'PENDING',
          cryptoTxHash: txHash,
        },
      });

      // Update payment status
      await this.updatePaymentStatus(txHash, 'COMPLETED', verification.blockNumber);

      // Calculate period end (30 days from now)
      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + 30);

      // Update subscription
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          tier: tier as any,
          status: 'ACTIVE' as any,
          paymentMethod: 'CRYPTO' as any,
          cryptoPaymentTxHash: txHash,
          currentPeriodStart: new Date(),
          currentPeriodEnd: periodEnd,
        },
      });

      logger.info(`Crypto payment processed for ${walletAddress}: ${tier} tier (${currency})`);
    } catch (error) {
      logger.error('Error processing crypto payment:', error);
      throw error;
    }
  }
}

export const cryptoPaymentService = new CryptoPaymentService();

