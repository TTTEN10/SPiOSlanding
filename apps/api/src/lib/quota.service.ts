import Redis from 'ioredis';
import logger from './logger';
import { DIDService } from './did.service';
import { subscriptionService, SUBSCRIPTION_LIMITS } from './subscription.service';

/**
 * Quota Service Configuration
 */
interface QuotaConfig {
  redisUrl?: string;
  redisHost?: string;
  redisPort?: number;
  redisPassword?: string;
  redisDb?: number;
  dailyLimit?: number; // Daily chat quota per DID
  monthlyLimit?: number; // Monthly chat quota per DID
  defaultDailyLimit?: number; // Default daily limit if not specified
  defaultMonthlyLimit?: number; // Default monthly limit if not specified
}

/**
 * Quota Status
 */
export interface QuotaStatus {
  did: string;
  dailyUsed: number;
  dailyLimit: number;
  monthlyUsed: number;
  monthlyLimit: number;
  dailyRemaining: number;
  monthlyRemaining: number;
  canUse: boolean;
  resetDailyAt: string; // ISO timestamp
  resetMonthlyAt: string; // ISO timestamp
}

/**
 * Quota Service
 * Manages chat quotas per DID using Redis
 */
export class QuotaService {
  private redis: Redis | null = null;
  private config: QuotaConfig;
  private dailyLimit: number;
  private monthlyLimit: number;

  constructor(config: QuotaConfig = {}) {
    this.config = config;
    this.dailyLimit = config.dailyLimit || config.defaultDailyLimit || 100;
    this.monthlyLimit = config.monthlyLimit || config.defaultMonthlyLimit || 1000;

    // Initialize Redis connection
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection
   */
  private initializeRedis(): void {
    try {
      if (this.config.redisUrl) {
        // Use Redis URL (e.g., for Upstash, Redis Cloud, etc.)
        this.redis = new Redis(this.config.redisUrl, {
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
          reconnectOnError: (err) => {
            const targetError = 'READONLY';
            if (err.message.includes(targetError)) {
              return true; // Reconnect on READONLY error
            }
            return false;
          },
        });
      } else if (this.config.redisHost) {
        // Use host/port configuration
        this.redis = new Redis({
          host: this.config.redisHost,
          port: this.config.redisPort || 6379,
          password: this.config.redisPassword,
          db: this.config.redisDb || 0,
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
        });
      } else {
        logger.warn('Redis not configured. Quota service will run in fallback mode (no persistence).');
        return;
      }

      // Handle Redis connection events
      this.redis.on('connect', () => {
        logger.info('Redis connected for quota service');
      });

      this.redis.on('error', (error) => {
        logger.error('Redis connection error:', error);
      });

      this.redis.on('close', () => {
        logger.warn('Redis connection closed');
      });

      this.redis.on('reconnecting', () => {
        logger.info('Redis reconnecting...');
      });
    } catch (error) {
      logger.error('Failed to initialize Redis:', error);
      this.redis = null;
    }
  }

  /**
   * Get Redis key for daily quota
   */
  private getDailyKey(did: string): string {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `quota:chat:${did}:daily:${today}`;
  }

  /**
   * Get Redis key for monthly quota
   */
  private getMonthlyKey(did: string): string {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
    return `quota:chat:${did}:monthly:${month}`;
  }

  /**
   * Get quota limit key (for storing custom limits per DID)
   */
  private getLimitKey(did: string): string {
    return `quota:chat:${did}:limits`;
  }

  /**
   * Get concurrency lock key for a DID
   */
  private getConcurrencyLockKey(did: string): string {
    return `concurrency:chat:${did}:lock`;
  }

  /**
   * Check if Redis is available
   */
  private isRedisAvailable(): boolean {
    return this.redis !== null && this.redis.status === 'ready';
  }

  /**
   * Get quota status for a DID
   * Optionally accepts walletAddress to check subscription tier
   */
  async getQuotaStatus(did: string, walletAddress?: string): Promise<QuotaStatus> {
    // Get subscription limits if wallet address is provided
    let subscriptionLimits = { dailyLimit: this.dailyLimit, monthlyLimit: this.monthlyLimit };
    if (walletAddress) {
      try {
        const limits = await subscriptionService.getSubscriptionLimits(walletAddress);
        subscriptionLimits = {
          dailyLimit: limits.dailyLimit === -1 ? Number.MAX_SAFE_INTEGER : limits.dailyLimit,
          monthlyLimit: limits.monthlyLimit === -1 ? Number.MAX_SAFE_INTEGER : limits.monthlyLimit,
        };
      } catch (error) {
        logger.warn(`Error getting subscription limits for ${walletAddress}, using defaults:`, error);
      }
    }

    if (!this.isRedisAvailable()) {
      // Fallback: return subscription-based quota if Redis is not available
      logger.warn(`Redis not available, returning subscription quota for DID: ${did}`);
      return {
        did,
        dailyUsed: 0,
        dailyLimit: subscriptionLimits.dailyLimit,
        monthlyUsed: 0,
        monthlyLimit: subscriptionLimits.monthlyLimit,
        dailyRemaining: subscriptionLimits.dailyLimit,
        monthlyRemaining: subscriptionLimits.monthlyLimit,
        canUse: true,
        resetDailyAt: this.getNextDayReset(),
        resetMonthlyAt: this.getNextMonthReset(),
      };
    }

    try {
      const dailyKey = this.getDailyKey(did);
      const monthlyKey = this.getMonthlyKey(did);
      const limitKey = this.getLimitKey(did);

      // Get current usage and limits
      const [dailyUsed, monthlyUsed, limits] = await Promise.all([
        this.redis!.get(dailyKey).then((val) => parseInt(val || '0', 10)),
        this.redis!.get(monthlyKey).then((val) => parseInt(val || '0', 10)),
        this.redis!.hgetall(limitKey),
      ]);

      // Use subscription limits, then custom limits, then defaults
      const dailyLimit = limits.dailyLimit
        ? parseInt(limits.dailyLimit, 10)
        : subscriptionLimits.dailyLimit;
      const monthlyLimit = limits.monthlyLimit
        ? parseInt(limits.monthlyLimit, 10)
        : subscriptionLimits.monthlyLimit;

      // Update limits in Redis if subscription changed
      if (walletAddress && (!limits.dailyLimit || !limits.monthlyLimit)) {
        await this.redis!.hset(limitKey, {
          dailyLimit: dailyLimit.toString(),
          monthlyLimit: monthlyLimit.toString(),
        });
      }

      const dailyRemaining = dailyLimit === Number.MAX_SAFE_INTEGER 
        ? Number.MAX_SAFE_INTEGER 
        : Math.max(0, dailyLimit - dailyUsed);
      const monthlyRemaining = monthlyLimit === Number.MAX_SAFE_INTEGER
        ? Number.MAX_SAFE_INTEGER
        : Math.max(0, monthlyLimit - monthlyUsed);
      const canUse = (dailyLimit === Number.MAX_SAFE_INTEGER || dailyRemaining > 0) && 
                     (monthlyLimit === Number.MAX_SAFE_INTEGER || monthlyRemaining > 0);

      return {
        did,
        dailyUsed,
        dailyLimit,
        monthlyUsed,
        monthlyLimit,
        dailyRemaining,
        monthlyRemaining,
        canUse,
        resetDailyAt: this.getNextDayReset(),
        resetMonthlyAt: this.getNextMonthReset(),
      };
    } catch (error) {
      logger.error(`Error getting quota status for DID ${did}:`, error);
      // Fallback to subscription limits on error
      return {
        did,
        dailyUsed: 0,
        dailyLimit: subscriptionLimits.dailyLimit,
        monthlyUsed: 0,
        monthlyLimit: subscriptionLimits.monthlyLimit,
        dailyRemaining: subscriptionLimits.dailyLimit,
        monthlyRemaining: subscriptionLimits.monthlyLimit,
        canUse: true,
        resetDailyAt: this.getNextDayReset(),
        resetMonthlyAt: this.getNextMonthReset(),
      };
    }
  }

  /**
   * Check if a DID can use chat (has quota remaining)
   * Optionally accepts walletAddress to check subscription tier
   */
  async canUseChat(did: string, walletAddress?: string): Promise<boolean> {
    const status = await this.getQuotaStatus(did, walletAddress);
    return status.canUse;
  }

  /**
   * Increment chat usage for a DID
   * Returns true if increment was successful, false if quota exceeded
   */
  async incrementUsage(did: string): Promise<{ success: boolean; status: QuotaStatus }> {
    if (!this.isRedisAvailable()) {
      logger.warn(`Redis not available, allowing usage for DID: ${did}`);
      const status = await this.getQuotaStatus(did);
      return { success: true, status };
    }

    try {
      const dailyKey = this.getDailyKey(did);
      const monthlyKey = this.getMonthlyKey(did);
      const limitKey = this.getLimitKey(did);

      // Get current limits
      const limits = await this.redis!.hgetall(limitKey);
      const dailyLimit = limits.dailyLimit
        ? parseInt(limits.dailyLimit, 10)
        : this.dailyLimit;
      const monthlyLimit = limits.monthlyLimit
        ? parseInt(limits.monthlyLimit, 10)
        : this.monthlyLimit;

      // Check current usage
      const dailyUsed = parseInt((await this.redis!.get(dailyKey)) || '0', 10);
      const monthlyUsed = parseInt((await this.redis!.get(monthlyKey)) || '0', 10);

      // Check if quota is exceeded
      if (dailyUsed >= dailyLimit || monthlyUsed >= monthlyLimit) {
        const status = await this.getQuotaStatus(did);
        return { success: false, status };
      }

      // Increment usage
      const now = Date.now();
      const dailyTtl = this.getSecondsUntilMidnight();
      const monthlyTtl = this.getSecondsUntilMonthEnd();

      await Promise.all([
        this.redis!.incr(dailyKey),
        this.redis!.expire(dailyKey, dailyTtl),
        this.redis!.incr(monthlyKey),
        this.redis!.expire(monthlyKey, monthlyTtl),
      ]);

      // Get updated status
      const status = await this.getQuotaStatus(did);
      logger.info(`Chat usage incremented for DID ${did}: daily=${status.dailyUsed}/${status.dailyLimit}, monthly=${status.monthlyUsed}/${status.monthlyLimit}`);

      return { success: true, status };
    } catch (error) {
      logger.error(`Error incrementing usage for DID ${did}:`, error);
      // Allow usage on error (fail open)
      const status = await this.getQuotaStatus(did);
      return { success: true, status };
    }
  }

  /**
   * Set custom quota limits for a DID
   */
  async setQuotaLimits(
    did: string,
    dailyLimit?: number,
    monthlyLimit?: number
  ): Promise<void> {
    if (!this.isRedisAvailable()) {
      logger.warn('Redis not available, cannot set quota limits');
      return;
    }

    try {
      const limitKey = this.getLimitKey(did);
      const updates: Record<string, string> = {};

      if (dailyLimit !== undefined) {
        updates.dailyLimit = dailyLimit.toString();
      }
      if (monthlyLimit !== undefined) {
        updates.monthlyLimit = monthlyLimit.toString();
      }

      if (Object.keys(updates).length > 0) {
        await this.redis!.hset(limitKey, updates);
        logger.info(`Quota limits updated for DID ${did}:`, updates);
      }
    } catch (error) {
      logger.error(`Error setting quota limits for DID ${did}:`, error);
      throw error;
    }
  }

  /**
   * Reset quota for a DID (admin function)
   */
  async resetQuota(did: string, resetDaily: boolean = true, resetMonthly: boolean = true): Promise<void> {
    if (!this.isRedisAvailable()) {
      logger.warn('Redis not available, cannot reset quota');
      return;
    }

    try {
      const promises: Promise<number>[] = [];

      if (resetDaily) {
        const dailyKey = this.getDailyKey(did);
        promises.push(this.redis!.del(dailyKey));
      }

      if (resetMonthly) {
        const monthlyKey = this.getMonthlyKey(did);
        promises.push(this.redis!.del(monthlyKey));
      }

      await Promise.all(promises);
      logger.info(`Quota reset for DID ${did}: daily=${resetDaily}, monthly=${resetMonthly}`);
    } catch (error) {
      logger.error(`Error resetting quota for DID ${did}:`, error);
      throw error;
    }
  }

  /**
   * Get seconds until midnight (for daily quota TTL)
   */
  private getSecondsUntilMidnight(): number {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return Math.ceil((midnight.getTime() - now.getTime()) / 1000);
  }

  /**
   * Get seconds until end of month (for monthly quota TTL)
   */
  private getSecondsUntilMonthEnd(): number {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return Math.ceil((nextMonth.getTime() - now.getTime()) / 1000);
  }

  /**
   * Get next day reset timestamp
   */
  private getNextDayReset(): string {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return midnight.toISOString();
  }

  /**
   * Get next month reset timestamp
   */
  private getNextMonthReset(): string {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toISOString();
  }

  /**
   * Get DID from wallet address
   */
  async getDIDFromWallet(walletAddress: string): Promise<string | null> {
    try {
      const didService = DIDService.getInstance();
      if (!didService) {
        return null;
      }

      const didInfo = await didService.getDIDInfo(walletAddress);
      if (!didInfo.hasDid || !didInfo.tokenId) {
        return null;
      }

      return didInfo.tokenId;
    } catch (error) {
      logger.error(`Error getting DID from wallet ${walletAddress}:`, error);
      return null;
    }
  }

  /**
   * Acquire a concurrency lock for a DID
   * Returns true if lock was acquired, false if already locked
   * @param did DID token ID
   * @param ttlSeconds Time to live in seconds (default: 300 = 5 minutes)
   */
  async acquireConcurrencyLock(did: string, ttlSeconds: number = 300): Promise<boolean> {
    if (!this.isRedisAvailable()) {
      logger.warn('Redis not available, allowing request (no concurrency control)');
      return true; // Allow if Redis is down (fail open)
    }

    try {
      const lockKey = this.getConcurrencyLockKey(did);
      // Use SET with NX (only set if not exists) and EX (expiration)
      const result = await this.redis!.set(lockKey, '1', 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    } catch (error) {
      logger.error(`Error acquiring concurrency lock for DID ${did}:`, error);
      // Fail open - allow request if lock acquisition fails
      return true;
    }
  }

  /**
   * Release a concurrency lock for a DID
   * @param did DID token ID
   */
  async releaseConcurrencyLock(did: string): Promise<void> {
    if (!this.isRedisAvailable()) {
      return;
    }

    try {
      const lockKey = this.getConcurrencyLockKey(did);
      await this.redis!.del(lockKey);
      logger.debug(`Concurrency lock released for DID ${did}`);
    } catch (error) {
      logger.error(`Error releasing concurrency lock for DID ${did}:`, error);
      // Don't throw - lock will expire naturally
    }
  }

  /**
   * Check if a DID has an active concurrency lock
   * @param did DID token ID
   */
  async hasConcurrencyLock(did: string): Promise<boolean> {
    if (!this.isRedisAvailable()) {
      return false;
    }

    try {
      const lockKey = this.getConcurrencyLockKey(did);
      const exists = await this.redis!.exists(lockKey);
      return exists === 1;
    } catch (error) {
      logger.error(`Error checking concurrency lock for DID ${did}:`, error);
      return false; // Fail closed - assume no lock if check fails
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      logger.info('Redis connection closed for quota service');
    }
  }

  /**
   * Get singleton instance
   */
  private static instance: QuotaService | null = null;

  static getInstance(): QuotaService {
    if (!QuotaService.instance) {
      const config: QuotaConfig = {
        redisUrl: process.env.REDIS_URL,
        redisHost: process.env.REDIS_HOST,
        redisPort: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : undefined,
        redisPassword: process.env.REDIS_PASSWORD,
        redisDb: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB, 10) : undefined,
        dailyLimit: process.env.CHAT_QUOTA_DAILY_LIMIT
          ? parseInt(process.env.CHAT_QUOTA_DAILY_LIMIT, 10)
          : undefined,
        monthlyLimit: process.env.CHAT_QUOTA_MONTHLY_LIMIT
          ? parseInt(process.env.CHAT_QUOTA_MONTHLY_LIMIT, 10)
          : undefined,
        defaultDailyLimit: 100,
        defaultMonthlyLimit: 1000,
      };
      QuotaService.instance = new QuotaService(config);
    }
    return QuotaService.instance;
  }
}

