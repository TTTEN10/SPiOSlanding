import { ethers } from 'ethers';
import logger from './logger';

/**
 * Price Oracle Service
 * Fetches current cryptocurrency prices and calculates dynamic pricing
 */
export class PriceOracleService {
  private provider: ethers.JsonRpcProvider | null = null;
  private cache: Map<string, { price: number; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 60 * 1000; // 1 minute cache
  private readonly PREMIUM_USD_PRICE = 20; // $20 USD for 30 days
  private readonly PRICE_MARKUP = 0.02; // 2% markup on ETH price

  constructor() {
    const rpcUrl = process.env.RPC_URL || process.env.ETH_RPC_URL;
    if (rpcUrl) {
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
    }
  }

  /**
   * Get cached price or fetch new one
   */
  private async getCachedOrFetch(
    key: string,
    fetchFn: () => Promise<number>
  ): Promise<number> {
    const cached = this.cache.get(key);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
      logger.debug(`Using cached ${key} price: $${cached.price}`);
      return cached.price;
    }

    try {
      const price = await fetchFn();
      this.cache.set(key, { price, timestamp: now });
      logger.info(`Fetched new ${key} price: $${price}`);
      return price;
    } catch (error) {
      logger.error(`Error fetching ${key} price:`, error);
      
      // Return cached price even if expired as fallback
      if (cached) {
        logger.warn(`Using expired cached ${key} price as fallback: $${cached.price}`);
        return cached.price;
      }
      
      throw error;
    }
  }

  /**
   * Fetch ETH price from CoinGecko API
   */
  private async fetchETHPriceFromCoinGecko(): Promise<number> {
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = (await response.json()) as { ethereum?: { usd?: number } };
      const price = data.ethereum?.usd;

      if (!price || typeof price !== 'number') {
        throw new Error('Invalid price data from CoinGecko');
      }

      return price;
    } catch (error) {
      logger.error('Error fetching ETH price from CoinGecko:', error);
      throw error;
    }
  }

  /**
   * Fetch ETH price from alternative source (CoinMarketCap or direct)
   */
  private async fetchETHPriceAlternative(): Promise<number> {
    // Try alternative API or use a fallback
    try {
      // You can add CoinMarketCap API here if needed
      // For now, we'll use a reasonable fallback
      logger.warn('Using fallback ETH price calculation');
      return 3500; // Fallback price
    } catch (error) {
      logger.error('Error fetching ETH price from alternative source:', error);
      throw error;
    }
  }

  /**
   * Get current ETH price in USD (raw price from CoinGecko)
   */
  async getETHPrice(): Promise<number> {
    return this.getCachedOrFetch('ETH', async () => {
      try {
        return await this.fetchETHPriceFromCoinGecko();
      } catch (error) {
        logger.warn('CoinGecko failed, trying alternative:', error);
        return await this.fetchETHPriceAlternative();
      }
    });
  }


  /**
   * Calculate ETH amount for premium subscription ($20 USD)
   * Applies 2% markup to the ETH amount (user pays 2% more ETH than base price)
   */
  async getPremiumETHAmount(): Promise<string> {
    try {
      const ethPrice = await this.getETHPrice();
      // Calculate base ETH amount at CoinGecko price
      const baseEthAmount = this.PREMIUM_USD_PRICE / ethPrice;
      // Apply 2% markup to ETH amount (user pays 2% more ETH)
      const ethAmount = baseEthAmount * (1 + this.PRICE_MARKUP);
      
      // Round to 6 decimal places to avoid precision issues
      const rounded = Math.round(ethAmount * 1000000) / 1000000;
      
      logger.info(
        `Premium ETH amount calculated: ${rounded} ETH ` +
        `(Base amount at $${ethPrice}: ${baseEthAmount.toFixed(6)} ETH, with 2% markup: ${rounded} ETH)`
      );
      return rounded.toFixed(6);
    } catch (error) {
      logger.error('Error calculating premium ETH amount:', error);
      // Fallback to environment variable or default
      return process.env.CRYPTO_PRICE_PREMIUM_ETH || '0.005714';
    }
  }

  /**
   * Get premium ETH amount as BigInt (for payment verification)
   */
  async getPremiumETHAmountBigInt(): Promise<bigint> {
    const ethAmountStr = await this.getPremiumETHAmount();
    return ethers.parseEther(ethAmountStr);
  }

  /**
   * Get all premium pricing (dynamic ETH, fixed USDT/USDC)
   */
  async getPremiumPricing(): Promise<{
    ETH: string;
    USDT: string;
    USDC: string;
    USD: number;
    period: string;
  }> {
    const ethAmount = await this.getPremiumETHAmount();
    
    return {
      ETH: ethAmount,
      USDT: process.env.CRYPTO_PRICE_PREMIUM_USDT || '20.00',
      USDC: process.env.CRYPTO_PRICE_PREMIUM_USDC || '20.00',
      USD: this.PREMIUM_USD_PRICE,
      period: '30 days',
    };
  }

  /**
   * Clear price cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('Price cache cleared');
  }
}

export const priceOracleService = new PriceOracleService();

