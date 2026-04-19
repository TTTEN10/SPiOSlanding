import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import { SUPPORTED_CHAIN_ID } from '../config/supportedChain';
import { Wallet, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { ethers } from 'ethers';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface PricingTier {
  name: string;
  dailyLimit: number;
  monthlyLimit: number;
  price: {
    crypto: {
      ETH?: string;
      USDT?: string;
      USDC?: string;
    } | string | null;
  };
}

interface PricingData {
  tiers: {
    FREE: PricingTier;
    PREMIUM: PricingTier;
  };
}

interface Subscription {
  id: string;
  tier: 'FREE' | 'PREMIUM';
  status: string;
  paymentMethod: string;
  currentPeriodEnd?: string;
}

export default function Payment() {
  const { authState } = useAuth();
  const { wallet, signer } = useWallet();
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadPricing();
    if (authState.isVerified) {
      loadSubscription();
    }
  }, [authState.isVerified]);

  const loadPricing = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/payment/pricing`);
      const data = await response.json();
      if (data.success) {
        setPricing(data.data);
      }
    } catch (err) {
      console.error('Error loading pricing:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSubscription = async () => {
    if (!authState.isVerified) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/payment/subscription`, {
        credentials: 'include',
        headers: {
          'x-wallet-address': wallet?.address || '',
          'x-chain-id': wallet?.chainId?.toString() ?? String(SUPPORTED_CHAIN_ID),
        },
      });
      const data = await response.json();
      if (data.success) {
        setSubscription(data.data);
      }
    } catch (err) {
      console.error('Error loading subscription:', err);
    }
  };

  const handleCryptoPayment = async (tier: 'PREMIUM', currency: 'ETH' | 'USDT' | 'USDC' = 'ETH') => {
    if (!authState.isVerified || !wallet || !signer) {
      setError('Please connect and verify your wallet first');
      return;
    }

    setProcessing(`crypto-${tier}-${currency}`);
    setError(null);

    try {
      // Get payment recipient address and amount
      const pricingResponse = await fetch(`${API_BASE_URL}/api/payment/pricing`);
      const pricingData = await pricingResponse.json();
      
      if (!pricingData.success) {
        throw new Error('Failed to get pricing');
      }

      const tierData = pricingData.data.tiers[tier];
      const cryptoPrices = tierData.price.crypto;
      
      if (typeof cryptoPrices === 'string' || !cryptoPrices) {
        throw new Error('Crypto pricing not available');
      }

      // Get payment recipient (from env or API)
      const recipientAddress = import.meta.env.VITE_CRYPTO_PAYMENT_ADDRESS;
      if (!recipientAddress) {
        throw new Error('Payment recipient address not configured');
      }

      let tx;
      let txHash: string;

      if (currency === 'ETH') {
        // Native ETH transfer
        const amountEth = cryptoPrices.ETH?.replace(' ETH', '') || '0.05';
        const amountWei = ethers.parseEther(amountEth);

        tx = await signer.sendTransaction({
          to: recipientAddress,
          value: amountWei,
        });
        txHash = tx.hash;
      } else {
        // ERC-20 token transfer (USDT/USDC)
        const tokenAddresses: Record<string, string> = {
          USDT: import.meta.env.VITE_USDT_CONTRACT_ADDRESS || '0xdAC17F958D2ee523a2206206994597C13D831ec7',
          USDC: import.meta.env.VITE_USDC_CONTRACT_ADDRESS || '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        };

        const tokenAddress = tokenAddresses[currency];
        if (!tokenAddress) {
          throw new Error(`${currency} contract address not configured`);
        }

        const amountStr = cryptoPrices[currency]?.replace(` ${currency}`, '') || '150';
        const amount = ethers.parseUnits(amountStr, 6); // USDT/USDC use 6 decimals

        // ERC-20 transfer ABI
        const tokenAbi = ['function transfer(address to, uint256 amount) external returns (bool)'];
        const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, signer);

        tx = await tokenContract.transfer(recipientAddress, amount);
        txHash = tx.hash;
      }

      setSuccess(`Transaction sent: ${txHash}. Waiting for confirmation...`);

      // Wait for confirmation
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        // Transaction confirmed, process payment
        const paymentResponse = await fetch(`${API_BASE_URL}/api/payment/crypto`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-wallet-address': wallet.address,
            'x-chain-id': wallet.chainId.toString(),
          },
          credentials: 'include',
          body: JSON.stringify({
            tier,
            txHash: receipt.hash,
            currency,
          }),
        });

        const paymentData = await paymentResponse.json();
        if (paymentData.success) {
          setSuccess(`Payment successful! Transaction: ${receipt.hash}`);
          await loadSubscription();
        } else {
          throw new Error(paymentData.message || 'Failed to process payment');
        }
      } else {
        throw new Error('Transaction failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process crypto payment');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!pricing) {
    return <div className="p-8 text-center text-gray-600">Failed to load pricing</div>;
  }

  const currentTier = subscription?.tier || 'FREE';
  const isCurrentTier = (tier: string) => currentTier === tier;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-3xl font-bold mb-6">Subscription Plans</h2>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <XCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-green-800">{success}</span>
        </div>
      )}

      {subscription && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800">
            <strong>Current Plan:</strong> {subscription.tier}
            {subscription.currentPeriodEnd && (
              <span className="ml-2 text-sm">
                (Expires: {new Date(subscription.currentPeriodEnd).toLocaleDateString()})
              </span>
            )}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(['FREE', 'PREMIUM'] as const).map((tier) => {
          const tierData = pricing.tiers[tier];
          const isCurrent = isCurrentTier(tier);
          const isUpgrade = !isCurrent && tier !== 'FREE';

          return (
            <div
              key={tier}
              className={`border rounded-lg p-6 ${
                isCurrent ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <h3 className="text-xl font-bold mb-2">{tierData.name}</h3>
              <div className="mb-4">
                <div className="text-2xl font-bold">
                  {tier === 'FREE' ? 'Free' : 'Premium'}
                </div>
                {tier !== 'FREE' &&
                  tierData.price.crypto !== null &&
                  typeof tierData.price.crypto === 'object' &&
                  !Array.isArray(tierData.price.crypto) && (
                  <div className="text-sm text-gray-600 mt-1">
                    {'ETH' in tierData.price.crypto &&
                      tierData.price.crypto.ETH &&
                      `or ${tierData.price.crypto.ETH}`}
                    {'USDT' in tierData.price.crypto &&
                      tierData.price.crypto.USDT &&
                      ` / ${tierData.price.crypto.USDT}`}
                    {'USDC' in tierData.price.crypto &&
                      tierData.price.crypto.USDC &&
                      ` / ${tierData.price.crypto.USDC}`}
                  </div>
                )}
              </div>
              <ul className="mb-6 space-y-2 text-sm">
                <li>
                  Daily: {tierData.dailyLimit} messages
                </li>
                <li>
                  Monthly: {tierData.monthlyLimit} messages
                </li>
              </ul>
              {isCurrent && (
                <div className="p-3 bg-blue-100 rounded text-center text-blue-800 font-semibold">
                  Current Plan
                </div>
              )}
              {isUpgrade && (
                <div className="space-y-2">
                  {tierData.price.crypto && typeof tierData.price.crypto === 'object' && (
                    <div className="space-y-2">
                      {tierData.price.crypto.ETH && (
                        <button
                          onClick={() => handleCryptoPayment(tier as 'PREMIUM', 'ETH')}
                          disabled={processing !== null || !authState.isVerified || !signer}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processing === `crypto-${tier}-ETH` ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Wallet className="w-4 h-4" />
                              Pay with ETH
                            </>
                          )}
                        </button>
                      )}
                      {tierData.price.crypto.USDT && (
                        <button
                          onClick={() => handleCryptoPayment(tier as 'PREMIUM', 'USDT')}
                          disabled={processing !== null || !authState.isVerified || !signer}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processing === `crypto-${tier}-USDT` ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Wallet className="w-4 h-4" />
                              Pay with USDT
                            </>
                          )}
                        </button>
                      )}
                      {tierData.price.crypto.USDC && (
                        <button
                          onClick={() => handleCryptoPayment(tier as 'PREMIUM', 'USDC')}
                          disabled={processing !== null || !authState.isVerified || !signer}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processing === `crypto-${tier}-USDC` ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Wallet className="w-4 h-4" />
                              Pay with USDC
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!authState.isVerified && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
          <p className="text-yellow-800">
            Please connect and verify your wallet to upgrade your subscription.
          </p>
        </div>
      )}
    </div>
  );
}

