import { useState, useEffect } from 'react';
import { X, Lock, Zap, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { ethers } from 'ethers';
import { apiUrl } from '../config/api'

interface QuotaInfo {
  dailyUsed: number;
  dailyLimit: number;
  monthlyUsed: number;
  monthlyLimit: number;
  resetDailyAt: string;
  resetMonthlyAt: string;
}

interface Pricing {
  PREMIUM: {
    crypto: {
      ETH: string;
      USDT: string;
      USDC: string;
    };
  };
}

interface PaywallProps {
  quota: QuotaInfo;
  pricing: Pricing;
  paymentRecipient: string | null;
  onClose?: () => void;
  onUpgradeSuccess?: () => void;
}

type PaymentCurrency = 'ETH' | 'USDT' | 'USDC';
type PaymentStep = 'select' | 'paying' | 'verify' | 'success' | 'error';

export default function Paywall({
  quota,
  pricing,
  paymentRecipient,
  onClose,
  onUpgradeSuccess,
}: PaywallProps) {
  const { wallet, signer } = useWallet();
  const [selectedCurrency, setSelectedCurrency] = useState<PaymentCurrency>('ETH');
  const [txHash, setTxHash] = useState('');
  const [step, setStep] = useState<PaymentStep>('select');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset state when wallet changes
  useEffect(() => {
    if (!wallet) {
      setStep('select');
      setTxHash('');
      setError(null);
    }
  }, [wallet]);

  const handleSendPayment = async () => {
    if (!wallet || !signer || !paymentRecipient) {
      setError('Wallet not connected or payment recipient not configured');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setStep('paying');

    try {
      let priceStr = pricing.PREMIUM.crypto[selectedCurrency];
      // Remove "ETH" suffix if present (backend may include it)
      if (selectedCurrency === 'ETH' && priceStr.includes('ETH')) {
        priceStr = priceStr.replace(/\s*ETH\s*/i, '').trim();
      }
      // Remove "USDT" or "USDC" suffix if present
      if ((selectedCurrency === 'USDT' || selectedCurrency === 'USDC') && priceStr.includes(selectedCurrency)) {
        priceStr = priceStr.replace(new RegExp(`\\s*${selectedCurrency}\\s*`, 'i'), '').trim();
      }
      
      let amount: bigint;
      let tx: ethers.TransactionResponse;

      if (selectedCurrency === 'ETH') {
        // Send native ETH
        amount = ethers.parseEther(priceStr);
        tx = await signer.sendTransaction({
          to: paymentRecipient,
          value: amount,
        });
      } else {
        // Send ERC-20 token (USDT/USDC)
        const tokenAddresses: Record<string, string> = {
          USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
          USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        };
        const tokenAddress = tokenAddresses[selectedCurrency];
        const tokenAbi = [
          'function transfer(address to, uint256 amount) external returns (bool)',
        ];
        const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, signer);
        amount = ethers.parseUnits(priceStr, 6); // USDT/USDC use 6 decimals
        tx = await tokenContract.transfer(paymentRecipient, amount);
      }

      setTxHash(tx.hash);
      setStep('verify');

      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error('Transaction receipt not available');
      }
      if (receipt.status === 1) {
        // Transaction confirmed, verify with backend
        await verifyPayment(tx.hash);
      } else {
        throw new Error('Transaction failed');
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment failed. Please try again.');
      setStep('error');
      setIsProcessing(false);
    }
  };

  const verifyPayment = async (hash: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      // Get JWT token from localStorage
      const token = localStorage.getItem('walletSessionToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // Add Authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(apiUrl('/payment/crypto'), {
        method: 'POST',
        headers,
        credentials: 'include', // Include cookies
        body: JSON.stringify({
          tier: 'PREMIUM',
          txHash: hash,
          currency: selectedCurrency,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStep('success');
        setIsProcessing(false);
        // Call success callback after a delay
        setTimeout(() => {
          if (onUpgradeSuccess) {
            onUpgradeSuccess();
          }
          if (onClose) {
            onClose();
          }
        }, 2000);
      } else {
        throw new Error(data.message || 'Payment verification failed');
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      setError(err.message || 'Payment verification failed. Please contact support.');
      setStep('error');
      setIsProcessing(false);
    }
  };

  const handleManualTxHash = async () => {
    if (!txHash || !txHash.match(/^0x[a-fA-F0-9]{64}$/)) {
      setError('Invalid transaction hash');
      return;
    }

    setStep('verify');
    await verifyPayment(txHash);
  };

  const dailyPercentage = (quota.dailyUsed / quota.dailyLimit) * 100;
  const monthlyPercentage = (quota.monthlyUsed / quota.monthlyLimit) * 100;

  if (!wallet) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-heading">Connect Wallet Required</h2>
            {onClose && (
              <button
                onClick={onClose}
                className="text-body hover:text-heading transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          <p className="text-body mb-4">
            Please connect your wallet to upgrade to Premium and continue using the chat.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Lock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-heading">Quota Exceeded</h2>
              <p className="text-sm text-body opacity-75">Upgrade to Premium to continue</p>
            </div>
          </div>
          {onClose && step === 'select' && (
            <button
              onClick={onClose}
              className="text-body hover:text-heading transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Quota Status */}
        <div className="mb-6 space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-body">Daily Usage</span>
              <span className="text-heading font-medium">
                {quota.dailyUsed} / {quota.dailyLimit}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-red-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(dailyPercentage, 100)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-body">Monthly Usage</span>
              <span className="text-heading font-medium">
                {quota.monthlyUsed} / {quota.monthlyLimit}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-orange-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(monthlyPercentage, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Payment Steps */}
        {step === 'select' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-primary-600 to-secondary-600 rounded-lg p-6 text-white">
              <div className="flex items-center space-x-2 mb-2">
                <Zap className="w-5 h-5" />
                <h3 className="text-lg font-semibold">Premium Features</h3>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>125 daily messages (vs 10 free)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>1,250 monthly messages (vs 100 free)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>30-day access</span>
                </li>
              </ul>
            </div>

            <div>
              <label className="block text-sm font-medium text-heading mb-3">
                Select Payment Method
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['ETH', 'USDT', 'USDC'] as PaymentCurrency[]).map((currency) => (
                  <button
                    key={currency}
                    onClick={() => setSelectedCurrency(currency)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedCurrency === currency
                        ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="font-semibold text-heading">{currency}</div>
                    <div className="text-sm text-body mt-1">
                      {pricing.PREMIUM.crypto[currency]}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {paymentRecipient && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <p className="text-xs text-body mb-2">Payment Recipient:</p>
                <p className="text-sm font-mono text-heading break-all">
                  {paymentRecipient}
                </p>
              </div>
            )}

            <button
              onClick={handleSendPayment}
              disabled={isProcessing || !paymentRecipient}
              className="w-full py-3 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  <span>Pay {pricing.PREMIUM.crypto[selectedCurrency]} {selectedCurrency}</span>
                </>
              )}
            </button>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <p className="text-sm text-body mb-3">Already sent payment?</p>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder="Enter transaction hash (0x...)"
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-heading placeholder:text-body placeholder:opacity-50"
                />
                <button
                  onClick={handleManualTxHash}
                  disabled={!txHash || isProcessing}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Verify
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'paying' && (
          <div className="text-center py-8">
            <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-heading mb-2">Processing Payment</h3>
            <p className="text-body">Please confirm the transaction in your wallet...</p>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-heading mb-2">Verifying Payment</h3>
              <p className="text-body mb-4">Transaction submitted, verifying with backend...</p>
              {txHash && (
                <a
                  href={`https://etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-700 text-sm font-mono break-all"
                >
                  View on Etherscan: {txHash.slice(0, 10)}...{txHash.slice(-8)}
                </a>
              )}
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-8">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-heading mb-2">Payment Successful!</h3>
            <p className="text-body">Your Premium subscription is now active. You can continue chatting.</p>
          </div>
        )}

        {step === 'error' && (
          <div className="space-y-4">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-800 dark:text-red-200 mb-1">Payment Failed</h4>
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setStep('select');
                  setError(null);
                  setTxHash('');
                }}
                className="flex-1 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Try Again
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-heading rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

