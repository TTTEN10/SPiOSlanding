/**
 * Wallet connect + signature verification. Optional for browsing; required for encrypted persistence,
 * DID flows, and unlimited chat. Guests use ChatWidget without verifying (session-only, capped prompts).
 */
import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import { Wallet, LogOut, CheckCircle, AlertCircle, Shield, AlertTriangle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { SUPPORTED_CHAIN_ID, SUPPORTED_NETWORK_NAME } from '../config/supportedChain';
import { useToast } from '../hooks/useToast';
import { getActionableErrorMessage } from '../utils/errorMessages';

export default function ConnectWallet() {
  const { wallet, connectWallet, isLoading: walletLoading, error: walletError } = useWallet();
  const { authState, verifyWallet, logout, checkDID } = useAuth();
  const { showToast, ToastContainer } = useToast();
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [showNetworkGuide, setShowNetworkGuide] = useState(false);
  const [showVerificationInfo, setShowVerificationInfo] = useState(false);
  const [verificationStep, setVerificationStep] = useState<'idle' | 'requesting' | 'signing' | 'verifying' | 'complete'>('idle');
  const [autoVerifyRequested, setAutoVerifyRequested] = useState(false);

  // Check DID when wallet is verified
  useEffect(() => {
    if (authState.isVerified) {
      // Always check DID status after verification
      if (authState.didStatus === 'none' || authState.didStatus === 'checking') {
        checkDID();
      }
    }
  }, [authState.isVerified, checkDID]);

  const handleConnect = async () => {
    try {
      setVerificationError(null);
      await connectWallet();
      // After connection, automatically verify wallet (once wallet state is present).
      setAutoVerifyRequested(true);
    } catch (err: any) {
      setVerificationError(err.message || 'Failed to connect wallet');
    }
  };

  const handleVerify = useCallback(async () => {
    if (!wallet) return;

    try {
      setIsVerifying(true);
      setVerificationStep('requesting');
      setVerificationError(null);
      
      // Simulate steps for better UX feedback
      await new Promise(resolve => setTimeout(resolve, 300));
      setVerificationStep('signing');
      
      await verifyWallet();
      
      setVerificationStep('verifying');
      await new Promise(resolve => setTimeout(resolve, 500));
      setVerificationStep('complete');
      
      showToast('success', 'This space now belongs to you — wallet verified.', 3000);
      
      setTimeout(() => {
        setVerificationStep('idle');
      }, 2000);
    } catch (err: any) {
      const errorMsg = getActionableErrorMessage(err, {
        code: 'WALLET_NOT_VERIFIED',
      });
      setVerificationError(errorMsg);
      showToast('error', errorMsg);
      setVerificationStep('idle');
    } finally {
      setIsVerifying(false);
    }
  }, [wallet, verifyWallet, showToast]);

  // If user just connected, trigger verification once wallet state is available.
  // (connectWallet updates context state asynchronously; relying on wallet immediately after await can fail.)
  useEffect(() => {
    if (!autoVerifyRequested) return;
    if (!wallet) return;
    if (authState.isVerified) {
      setAutoVerifyRequested(false);
      return;
    }
    if (wallet.chainId !== SUPPORTED_CHAIN_ID) {
      // Wrong network: user needs to switch first; keep the flag off to avoid surprise prompts.
      setAutoVerifyRequested(false);
      return;
    }
    void handleVerify();
    setAutoVerifyRequested(false);
  }, [autoVerifyRequested, wallet, authState.isVerified, handleVerify]);

  const handleDisconnect = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Show network error if on wrong network
  const isWrongNetwork = wallet && wallet.chainId !== SUPPORTED_CHAIN_ID;

  const getVerificationStepText = () => {
    switch (verificationStep) {
      case 'requesting':
        return 'Requesting verification...';
      case 'signing':
        return 'Sign in your wallet — confirms identity; no funds are used';
      case 'verifying':
        return 'Verifying signature...';
      case 'complete':
        return 'Verified!';
      default:
        return 'Verifying...';
    }
  };

  if (wallet) {
    return (
      <div className="flex flex-col items-end gap-2">
        {/* Network Error Banner with Guide */}
        {isWrongNetwork && (
          <div className="max-w-xs">
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">Please switch to Sepolia Testnet</span>
              <button
                onClick={() => setShowNetworkGuide(!showNetworkGuide)}
                className="ml-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
                aria-label={showNetworkGuide ? "Hide network guide" : "Show network guide"}
              >
                {showNetworkGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
            {showNetworkGuide && (
              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-800 dark:text-blue-300 space-y-2">
                <p className="font-semibold">How to switch networks:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Open your wallet extension</li>
                  <li>Click the network dropdown (top of wallet)</li>
                  <li>Select "Sepolia"</li>
                  <li>Return here and refresh</li>
                </ol>
                <p className="text-xs opacity-75 mt-2">Network: {SUPPORTED_NETWORK_NAME} (chain ID {SUPPORTED_CHAIN_ID})</p>
              </div>
            )}
          </div>
        )}

        <div className="relative flex items-center gap-2">
          {/* Wallet Address & Verification Status - clickable for info when not verified */}
          <div
            role={!authState.isVerified ? "button" : undefined}
            tabIndex={!authState.isVerified ? 0 : undefined}
            onClick={!authState.isVerified ? () => setShowVerificationInfo(!showVerificationInfo) : undefined}
            onKeyDown={!authState.isVerified ? (e) => e.key === 'Enter' && setShowVerificationInfo(!showVerificationInfo) : undefined}
            className={`flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg ${!authState.isVerified ? 'cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30' : ''}`}
            title={!authState.isVerified ? "Why verify? Click for info" : undefined}
            aria-label={!authState.isVerified ? "Learn why verification is needed" : undefined}
          >
            {authState.isVerified ? (
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            )}
            <span className="text-sm font-mono text-green-700 dark:text-green-300">
              {formatAddress(wallet.address)}
            </span>
          </div>

          {/* Verification Info Tooltip - drops down from wallet address */}
          {showVerificationInfo && !authState.isVerified && (
            <div className="absolute top-full left-0 mt-2 max-w-xs p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-800 dark:text-blue-300 z-50 shadow-lg">
              <p className="font-semibold mb-2">Why verify?</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Keeps this space yours — saved chats link to keys you control</li>
                <li>One signature — like a secure ID check, not a payment</li>
                <li>Unlocks encrypted history and continuity across sessions</li>
                <li>No funds are moved for verification</li>
              </ul>
              <button
                onClick={(e) => { e.stopPropagation(); setShowVerificationInfo(false); }}
                className="mt-2 text-blue-600 dark:text-blue-400 hover:underline text-xs"
              >
                Got it
              </button>
            </div>
          )}

          {/* DID Status Badge */}
          {authState.isVerified && (
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs">
              {authState.didStatus === 'exists' ? (
                <>
                  <Shield className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  <span className="text-blue-700 dark:text-blue-300">DID Active</span>
                </>
              ) : authState.didStatus === 'checking' ? (
                <span className="text-blue-700 dark:text-blue-300">Checking...</span>
              ) : authState.didStatus === 'error' ? (
                <>
                  <AlertCircle className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-yellow-700 dark:text-yellow-300">DID Error</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">No DID</span>
                </>
              )}
            </div>
          )}

          {/* Verify Button */}
          {!authState.isVerified && !isVerifying && !isWrongNetwork && (
            <button
              onClick={handleVerify}
              className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white font-semibold text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-3 rounded-xl hover:from-primary-700 hover:to-secondary-700 focus:outline-none focus:ring-4 focus:ring-primary-200 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-primary-500/25 transform hover:-translate-y-0.5 active:scale-95 min-h-[44px] flex items-center justify-center gap-2"
              title="Confirm identity in your wallet — no funds used"
            >
              <CheckCircle className="w-4 h-4 text-white" />
              <span className="hidden sm:inline text-white">Verify</span>
            </button>
          )}

          {isVerifying && (
            <div className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2 min-h-[44px]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{getVerificationStepText()}</span>
            </div>
          )}

          {/* Disconnect Button */}
          <button
            onClick={handleDisconnect}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Disconnect wallet"
            aria-label="Disconnect wallet"
          >
            <LogOut className="w-4 h-4" />
          </button>

          {/* Error Messages - dropdown overlay, does not affect header size */}
          {(verificationError || authState.error) && (
            <div className="absolute top-full right-0 mt-2 z-50 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300 max-w-xs space-y-1 shadow-lg">
              <p className="font-semibold">Verification Failed</p>
              <p>{verificationError || authState.error}</p>
              {verificationError && !verificationError.includes('network') && (
                <button
                  onClick={handleVerify}
                  className="mt-2 text-xs underline hover:no-underline"
                >
                  Try again
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={handleConnect}
        disabled={walletLoading}
        className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white font-semibold text-sm sm:text-base px-4 sm:px-8 py-2 sm:py-3 rounded-xl hover:from-primary-700 hover:to-secondary-700 focus:outline-none focus:ring-4 focus:ring-primary-200 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-primary-500/25 transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none min-h-[44px] flex items-center justify-center gap-2"
        title="Secure this space — wallet is for identity and encryption, not payments"
      >
        <Wallet className="w-4 h-4 text-white" />
        <span className="hidden sm:inline text-white">
          {walletLoading ? 'Connecting...' : 'Save & sync'}
        </span>
        <span className="sm:hidden text-white">Save</span>
      </button>
      {walletError && (
        <div className="absolute top-full mt-2 right-0 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300 max-w-xs z-50">
          <p className="font-semibold mb-1">Connection Error</p>
          <p>{walletError || 'Something went wrong. Please try again.'}</p>
          <button
            onClick={handleConnect}
            className="mt-2 text-xs underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}
      <ToastContainer />
    </div>
  );
}
