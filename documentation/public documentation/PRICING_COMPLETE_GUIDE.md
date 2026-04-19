# Pricing Model & Implementation Guide

For the **$PSY token** (revised LLM-first tokenomics), tier roles, dual payment (fiat or $PSY), and **cashback to user wallet** (Gold), see [TOKENOMICS.md](TOKENOMICS.md).

## Pricing model overview

The product uses a **three-tier** pricing structure: one freemium tier and two premium tiers. Premium payments are tied to the **$PSY token** (users buy $PSY directly or indirectly when paying).

| Tier | Model | Price | Quotas | Description |
|------|--------|-------|--------|-------------|
| **Free trial** | Freemium | $0 | Limited | Free trial with limited quota; upgrade to premium for **$20/month**. |
| **$19/month** | Premium | $19/month | Extended | Premium for extended quotas. Users buy **$PSY token** directly or indirectly when paying. |
| **$69/month (Gold)** | Premium | $69/month | Unlimited | Unlimited quotas. Users buy **$PSY token** directly or indirectly when paying and receive **token cashback** (see below). |

### Summary

- **Quota levels**: Limited (free) → Extended ($19) → Unlimited ($69).
- **$PSY token**: Premium plans ($19 and $69) involve purchasing $PSY (directly or indirectly).
- **Token cashback (Gold / $69)**: Only the $69/month tier includes token cashback. **Cashback is credited to the user’s wallet.**
- **Upgrade from free**: Documented upgrade path is **$20/month** (may align with $19 plan as a rounded or promotional price; clarify in product copy if needed).

### Gold tier ($69/month) — cashback

For subscribers on the **Gold** plan ($69/month), token cashback is credited **to the user’s wallet**. The cashback is sent to the same wallet used for the subscription (or the linked wallet associated with the account).

---

## Current implementation (single premium tier)

The codebase currently implements a **single premium tier at $20 USD** for 30 days. ETH pricing is **dynamically calculated** from the current market price so the subscription stays at **$20 USD** regardless of ETH fluctuations.

## Implementation

### Price Oracle Service
- **Location**: `apps/api/src/lib/price-oracle.service.ts`
- **Features**:
  - Fetches current ETH price from CoinGecko API
  - 1-minute cache to reduce API calls
  - Fallback to environment variable if API fails
  - Calculates ETH amount: `$20 USD / current ETH price`

### Updated Services

1. **Crypto Payment Service** (`apps/api/src/lib/crypto-payment.service.ts`)
   - `getTierPricing()` now async and uses dynamic ETH price
   - Payment verification uses current market price

2. **Quota Middleware** (`apps/api/src/middleware/quota.ts`)
   - Returns dynamic ETH price in paywall response

3. **Chat Route** (`apps/api/src/routes/chat.ts`)
   - Returns dynamic ETH price when quota exceeded

4. **Payment Route** (`apps/api/src/routes/payment.ts`)
   - `/api/payment/pricing` endpoint returns dynamic ETH price

5. **Paywall Component** (`apps/web/src/components/Paywall.tsx`)
   - Handles price strings with or without currency suffix
   - Parses ETH amount correctly

## How It Works

### Price Calculation Flow

1. **User triggers paywall** (quota exceeded or manual upgrade)
2. **Backend fetches current ETH price** from CoinGecko
3. **Calculate ETH amount**: `$20 / ETH_price_in_USD`
4. **Return pricing** to frontend
5. **User pays** the calculated ETH amount
6. **Backend verifies** payment matches expected amount

### Example

If ETH is trading at $3,500:
- ETH amount = $20 / $3,500 = **0.005714 ETH**

If ETH is trading at $4,000:
- ETH amount = $20 / $4,000 = **0.005 ETH**

## API Integration

### CoinGecko API
- **Endpoint**: `https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd`
- **Rate Limit**: Free tier allows 10-50 calls/minute
- **Cache**: 1 minute to stay within limits
- **Fallback**: Environment variable if API fails

### Alternative Sources
- Can be extended to use CoinMarketCap, Uniswap, or Chainlink oracles
- Currently uses CoinGecko (free, reliable)

## Configuration

### Environment Variables (Optional Fallback)
```env
# These are only used if price oracle fails
CRYPTO_PRICE_PREMIUM_ETH=0.005714
CRYPTO_PRICE_PREMIUM_USDT=20.00
CRYPTO_PRICE_PREMIUM_USDC=20.00
```

### Premium subscription (current single tier)
- **Fixed USD Price**: $20 (target model also has $19/month and $69/month; see [Pricing model overview](#pricing-model-overview))
- **Period**: 30 days
- **ETH Amount**: Dynamically calculated
- **USDT/USDC**: Fixed at $20 (1:1 with USD)

## Testing

### Test Price Oracle
```typescript
import { priceOracleService } from './lib/price-oracle.service';

// Get current pricing
const pricing = await priceOracleService.getPremiumPricing();
console.log(pricing);
// Output: { ETH: '0.005714', USDT: '20.00', USDC: '20.00', USD: 20, period: '30 days' }
```

### Test Payment Flow
1. Trigger quota exceeded
2. Check paywall shows current ETH price
3. Complete payment
4. Verify backend accepts payment at current market rate

## Benefits

✅ **Always $20 USD**: Subscription price stays constant in USD
✅ **Fair for users**: Users pay fair market rate in ETH
✅ **Automatic updates**: No manual price adjustments needed
✅ **Cached**: Reduces API calls with 1-minute cache
✅ **Resilient**: Falls back to env variable if API fails

## Monitoring

- Price cache is logged for debugging
- API failures are logged with warnings
- Fallback to cached/static price if API unavailable

## Future Enhancements

- Add multiple price sources (CoinGecko, CoinMarketCap, Chainlink)
- Use median price from multiple sources
- Add price volatility alerts
- Implement price smoothing to avoid rapid fluctuations
- Implement full 3-tier model ($19/month, $69/month) and $PSY token integration (see Dependencies below)

---

## Dependencies and implementation status (3-tier model)

To support the full pricing model (Free trial, $19/month, $69/month) with $PSY token and cashback:

| Area | File / component | Current state | Required for 3-tier + $PSY |
|------|-------------------|----------------|-----------------------------|
| **Tiers** | `apps/api/schema.prisma` | `SubscriptionTier`: FREE, PREMIUM | Add tier(s), e.g. PREMIUM_EXTENDED ($19), PREMIUM_UNLIMITED ($69), or single PREMIUM with planId/pricePoint. |
| **Limits** | `apps/api/src/lib/subscription.service.ts` | `SUBSCRIPTION_LIMITS`: FREE, PREMIUM only | Add limits for extended ($19) and unlimited ($69). |
| **Pricing API** | `apps/api/src/lib/price-oracle.service.ts` | Single `PREMIUM_USD_PRICE = 20` | Support multiple USD prices ($19, $69) and optionally $PSY equivalent. |
| **Payment** | `apps/api/src/lib/crypto-payment.service.ts` | `getTierPricing(tier: 'PREMIUM', …)` | Support tier/plan (e.g. $19 vs $69), and $PSY payment path. |
| **Payment route** | `apps/api/src/routes/payment.ts` | `tier: Joi.string().valid('PREMIUM')`, single tier in `/pricing` | Validate multiple tiers; return 3-tier pricing from GET `/pricing`. |
| **Quota** | `apps/api/src/middleware/quota.ts` | Returns single premium price | Return pricing per tier when quota exceeded. |
| **Chat** | `apps/api/src/routes/chat.ts` | Uses single `getPremiumPricing()` | Use tier-specific pricing when returning paywall. |
| **Frontend** | `apps/web/src/components/Paywall.tsx` | Single premium option | Display Free / $19 / $69 and upgrade from free ($20). |
| **$PSY token** | — | Not implemented | Payment flow where fiat/crypto converts to or is tied to $PSY; 10% discount when paying in $PSY (see [TOKENOMICS.md](TOKENOMICS.md)). |
| **Cashback** | — | Not implemented | Gold ($69/month): 10% cashback in $PSY credited to the user’s wallet. |

### Tokenomics dependencies (see [TOKENOMICS.md](TOKENOMICS.md) — revised LLM-first model)

Implementation areas required for the full tokenomics model:

| Area | Current state | Required |
|------|----------------|----------|
| **Dual payment** | Fiat (Stripe) + crypto (ETH/USDT/USDC) | Fiat (Stripe) **or** $PSY; $PSY unlocks 10% discount, unlimited Memory Vault, Advanced Privacy Layer, early AI features, governance. |
| **$PSY utility** | — | Enforce feature gates: AI Memory Vault (limited vs unlimited by payment type), Advanced Privacy Layer, early-access features, governance participation. |
| **Revenue-sharing** | — | 9% platform net revenue → Treasury; 3% of Treasury → stakers. Treasury and distribution logic. |
| **Staking** | — | Staking contract or integration; yield from Treasury (3%); enhanced multiplier for Gold members. |
| **Gold benefits** | — | 10% $PSY cashback to wallet; enhanced staking multiplier; early feature access; governance proposal rights. |
| **Deflationary (buyback + burn)** | — | 5% platform net revenue → buy $PSY from market → permanent burn. Accounting and execution path. |
| **Airdrop** | — | Proof-of-Mental-Health score (holding, activity, staking duration, referral, subscription longevity, session consistency); 20% of supply from Ecosystem over 3 years. |
| **ICO / phases** | — | Phase 0 (private), Phase 1 (product-led pre-sale), Phase 2 (public after 20k users + $100k MRR). Metrics tracking and gating. |
| **Token allocation** | — | Fixed supply; allocation per [TOKENOMICS.md](TOKENOMICS.md) (Public 25%, Team 22%, Ecosystem 21%, Treasury 7%, Liquidity 10%, User Growth 10%, Foundation 5%). |

### Environment variables (for 3-tier and tokenomics)

When extending to multiple tiers and tokenomics, consider:

```env
# Optional fallbacks per tier (if price oracle fails)
CRYPTO_PRICE_PREMIUM_ETH=0.005714
CRYPTO_PRICE_PREMIUM_USDT=20.00
CRYPTO_PRICE_PREMIUM_USDC=20.00
# Future: PREMIUM_19_*, PREMIUM_69_*, PSY_* for $PSY pricing/cashback

# Tokenomics (when implemented)
# TREASURY_REVENUE_SHARE_PCT=9
# STAKER_DISTRIBUTION_PCT=3
# GOLD_CASHBACK_PCT=10
# BUYBACK_BURN_PCT=5
# AIRDROP_ECOSYSTEM_PCT=20
```

---

# Dynamic ETH Pricing - Implementation Summary ✅

## Overview

The premium subscription ETH price is now **dynamically calculated** based on the current market price, ensuring it always equals **$20 USD** regardless of ETH price fluctuations.

## How It Works

1. **Price Fetching**: Fetches current ETH/USD price from CoinGecko API
2. **Calculation**: `ETH Amount = $20 USD / Current ETH Price`
3. **Caching**: 1-minute cache to reduce API calls
4. **Fallback**: Uses environment variable if API fails

## Example Calculations

| ETH Price (USD) | ETH Amount for $20 |
|-----------------|-------------------|
| $3,000          | 0.006667 ETH      |
| $3,500          | 0.005714 ETH      |
| $4,000          | 0.005000 ETH      |
| $4,500          | 0.004444 ETH      |

## Files Modified

### Backend
- ✅ `apps/api/src/lib/price-oracle.service.ts` - **NEW** Price oracle service
- ✅ `apps/api/src/lib/crypto-payment.service.ts` - Updated to use dynamic pricing
- ✅ `apps/api/src/middleware/quota.ts` - Returns dynamic ETH price
- ✅ `apps/api/src/routes/chat.ts` - Returns dynamic ETH price
- ✅ `apps/api/src/routes/payment.ts` - Returns dynamic ETH price

### Frontend
- ✅ `apps/web/src/components/Paywall.tsx` - Handles price parsing

## API Integration

**CoinGecko API**:
- Endpoint: `https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd`
- Free tier: 10-50 calls/minute
- Cache: 1 minute
- Fallback: Environment variable

## Testing

The pricing is automatically updated when:
- User triggers paywall (quota exceeded)
- User requests `/api/payment/pricing`
- Payment verification occurs

## Benefits

✅ **Always $20 USD**: Subscription stays constant in USD value
✅ **Fair pricing**: Users pay current market rate
✅ **Automatic**: No manual price updates needed
✅ **Resilient**: Falls back gracefully if API unavailable

# 2% Price Markup Implementation ✅

## Overview

The ETH price for premium subscriptions now includes a **2% markup** on top of the CoinGecko market price. This ensures the platform has a buffer for market fluctuations and transaction fees.

## Calculation

### Formula
```
Base ETH Amount = $20 USD / CoinGecko ETH Price
Final ETH Amount = Base ETH Amount × 1.02
```

### Example

**Without Markup:**
- CoinGecko ETH Price: $3,500
- Base ETH Amount: $20 / $3,500 = **0.005714 ETH**

**With 2% Markup:**
- CoinGecko ETH Price: $3,500
- Base ETH Amount: $20 / $3,500 = **0.005714 ETH**
- Final ETH Amount: 0.005714 × 1.02 = **0.005828 ETH**

**Result**: User pays **2% more ETH** than the base market rate
**USD Value**: 0.005828 × $3,500 = **$20.40** (2% more than $20)

## Implementation

### Price Oracle Service
- **Location**: `apps/api/src/lib/price-oracle.service.ts`
- **Markup**: `PRICE_MARKUP = 0.02` (2%)
- **Applied in**: `getPremiumETHAmount()` method

### Updated Calculation
```typescript
const ethPrice = await this.getETHPrice(); // From CoinGecko
const baseEthAmount = this.PREMIUM_USD_PRICE / ethPrice; // Base amount
const ethAmount = baseEthAmount * (1 + this.PRICE_MARKUP); // Add 2% markup
```

## Benefits

✅ **Market Buffer**: Protects against price fluctuations during payment
✅ **Fee Coverage**: Accounts for gas fees and transaction costs
✅ **Fair Pricing**: Still based on real market price, just with small buffer
✅ **Transparent**: Markup is applied consistently

## Price Comparison Examples

| CoinGecko Price | Base ETH Amount | Final ETH Amount (2% Markup) | USD Value | Difference |
|-----------------|-----------------|------------------------------|-----------|------------|
| $3,000          | 0.006667 ETH    | 0.006800 ETH                 | $20.40    | +2.0%      |
| $3,500          | 0.005714 ETH    | 0.005828 ETH                 | $20.40    | +2.0%      |
| $4,000          | 0.005000 ETH    | 0.005100 ETH                 | $20.40    | +2.0%      |
| $4,500          | 0.004444 ETH    | 0.004533 ETH                 | $20.40    | +2.0%      |

## Notes

- The 2% markup is applied to the ETH amount, making users pay 2% more ETH
- Users pay ~$20.40 USD equivalent (2% more than base $20)
- This protects the platform from market volatility during payment processing
- The markup is transparent in logs for debugging
- Payment verification uses the marked-up amount

