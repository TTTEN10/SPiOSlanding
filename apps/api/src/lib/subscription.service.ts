import { SubscriptionTier, SubscriptionStatus, PaymentMethod } from '@prisma/client';
import logger from './logger';
import { DIDService } from './did.service';
import { prisma } from './prisma';

/**
 * Subscription tier limits
 */
export const SUBSCRIPTION_LIMITS = {
  FREE: {
    dailyLimit: 10,
    monthlyLimit: 100,
  },
  PREMIUM: {
    dailyLimit: 100,
    monthlyLimit: 1000,
  },
};

/**
 * Subscription Service
 * Manages user subscriptions and tier assignments
 */
export class SubscriptionService {
  /**
   * Get or create subscription for a wallet address
   */
  async getOrCreateSubscription(walletAddress: string, didTokenId?: string | null): Promise<{
    id: string;
    tier: SubscriptionTier;
    status: SubscriptionStatus;
    dailyLimit: number;
    monthlyLimit: number;
  }> {
    try {
      // Get DID if not provided
      if (!didTokenId) {
        const didService = DIDService.getInstance();
        if (didService) {
          const didInfo = await didService.getDIDInfo(walletAddress);
          if (didInfo.hasDid && didInfo.tokenId) {
            didTokenId = didInfo.tokenId;
          }
        }
      }

      // Try to find existing subscription
      let subscription = await prisma.subscription.findUnique({
        where: { walletAddress },
      });

      // If not found by wallet, try by DID
      if (!subscription && didTokenId) {
        subscription = await prisma.subscription.findUnique({
          where: { didTokenId },
        });
      }

      // Create if doesn't exist
      if (!subscription) {
        subscription = await prisma.subscription.create({
          data: {
            walletAddress: walletAddress.toLowerCase(),
            didTokenId: didTokenId || null,
            tier: SubscriptionTier.FREE,
            status: SubscriptionStatus.ACTIVE,
            paymentMethod: PaymentMethod.NONE,
          },
        });
        logger.info(`Created FREE subscription for wallet ${walletAddress}`);
      }

      // Get limits for tier
      const limits = SUBSCRIPTION_LIMITS[subscription.tier];

      return {
        id: subscription.id,
        tier: subscription.tier,
        status: subscription.status,
        dailyLimit: limits.dailyLimit,
        monthlyLimit: limits.monthlyLimit,
      };
    } catch (error) {
      logger.error(`Error getting subscription for ${walletAddress}:`, error);
      // Return free tier on error
      return {
        id: '',
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.ACTIVE,
        dailyLimit: SUBSCRIPTION_LIMITS.FREE.dailyLimit,
        monthlyLimit: SUBSCRIPTION_LIMITS.FREE.monthlyLimit,
      };
    }
  }

  /**
   * Get subscription by wallet address
   */
  async getSubscription(walletAddress: string) {
    return prisma.subscription.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
    });
  }

  /**
   * Get subscription by DID token ID
   */
  async getSubscriptionByDID(didTokenId: string) {
    return prisma.subscription.findUnique({
      where: { didTokenId },
    });
  }

  /**
   * Update subscription tier
   */
  async updateSubscriptionTier(
    walletAddress: string,
    tier: SubscriptionTier,
    paymentMethod: PaymentMethod,
    metadata?: {
      cryptoTxHash?: string;
      currentPeriodStart?: Date;
      currentPeriodEnd?: Date;
    }
  ) {
    try {
      const subscription = await this.getSubscription(walletAddress);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      return prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          tier,
          paymentMethod,
          status: SubscriptionStatus.ACTIVE,
          cryptoPaymentTxHash: metadata?.cryptoTxHash || subscription.cryptoPaymentTxHash,
          currentPeriodStart: metadata?.currentPeriodStart || subscription.currentPeriodStart,
          currentPeriodEnd: metadata?.currentPeriodEnd || subscription.currentPeriodEnd,
        },
      });
    } catch (error) {
      logger.error(`Error updating subscription tier for ${walletAddress}:`, error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(walletAddress: string, cancelAtPeriodEnd: boolean = true) {
    try {
      const subscription = await this.getSubscription(walletAddress);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      return prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          cancelAtPeriodEnd,
          status: cancelAtPeriodEnd ? SubscriptionStatus.ACTIVE : SubscriptionStatus.CANCELLED,
        },
      });
    } catch (error) {
      logger.error(`Error cancelling subscription for ${walletAddress}:`, error);
      throw error;
    }
  }

  /**
   * Check if subscription is active and valid
   */
  async isSubscriptionActive(walletAddress: string): Promise<boolean> {
    try {
      const subscription = await this.getSubscription(walletAddress);
      if (!subscription) {
        return false;
      }

      // Check status
      if (subscription.status !== SubscriptionStatus.ACTIVE) {
        return false;
      }

      // Check if cancelled but still in period
      if (subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd) {
        if (new Date() > subscription.currentPeriodEnd) {
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error(`Error checking subscription status for ${walletAddress}:`, error);
      return false;
    }
  }

  /**
   * Get subscription limits for a wallet
   */
  async getSubscriptionLimits(walletAddress: string): Promise<{
    dailyLimit: number;
    monthlyLimit: number;
    tier: SubscriptionTier;
  }> {
    const subscription = await this.getOrCreateSubscription(walletAddress);
    return {
      dailyLimit: subscription.dailyLimit,
      monthlyLimit: subscription.monthlyLimit,
      tier: subscription.tier,
    };
  }
}

export const subscriptionService = new SubscriptionService();

