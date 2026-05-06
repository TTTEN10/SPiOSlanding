import { useState, useEffect } from 'react';
import { Shield, CheckCircle, Lock, Eye, EyeOff, ExternalLink, Copy, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import { getDIDProfile } from '../utils/did-contract';
import { decryptChatHistory } from '../utils/did-encryption';
import { useChatEncryption } from '../hooks/useChatEncryption';
import { toEthersReadProvider } from '../utils/ethers-helpers';
import { apiUrl } from '../config/api'

interface DIDTokenVisualizationProps {
  className?: string;
}

export default function DIDTokenVisualization({ className = '' }: DIDTokenVisualizationProps) {
  const { authState } = useAuth();
  const { wallet, provider } = useWallet();
  const { symmetricKey } = useChatEncryption();
  const [profile, setProfile] = useState<any>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [showDecrypted, setShowDecrypted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authState.didInfo?.hasDid && wallet?.address && provider) {
      loadDIDData();
    }
  }, [authState.didInfo, wallet, provider]);

  const loadDIDData = async () => {
    if (!wallet?.address) return;
    const readProvider = toEthersReadProvider(provider);
    if (!readProvider) return;

    try {
      setIsLoading(true);
      setError(null);

      // Load profile from contract
      const didProfile = await getDIDProfile(readProvider, wallet.address);
      setProfile(didProfile);

      // Load encrypted chat if key is available
      if (symmetricKey && didProfile.chatDataReference !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        try {
          const token = localStorage.getItem('walletSessionToken');
          const headers: HeadersInit = {
            'Content-Type': 'application/json',
          };
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const response = await fetch(apiUrl('/chat/load'), {
            method: 'GET',
            headers,
            credentials: 'include',
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data.hasChat) {
              const decrypted = await decryptChatHistory(data.data.encryptedChatBlob, symmetricKey);
              const messages = JSON.parse(decrypted);
              setChatHistory(messages);
            }
          }
        } catch (err) {
          console.error('Error loading chat history:', err);
        }
      }
    } catch (err: any) {
      console.error('Error loading DID data:', err);
      setError(err.message || 'Failed to load DID data');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString();
  };

  if (!authState.didInfo?.hasDid) {
    const message = !wallet?.address
      ? 'Connect Wallet to start'
      : 'No DID token found. Create your identity to get started.';
    return (
      <div className={`p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="text-center py-8">
          <Shield className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
          <p className="text-gray-600 dark:text-gray-400">{message}</p>
        </div>
      </div>
    );
  }

  const contractAddress = import.meta.env.VITE_DID_IDENTITY_TOKEN_ADDRESS || '';
  const displayTokenId = authState.didInfo.tokenId ?? authState.didInfo.did ?? '';
  const etherscanUrl = `https://etherscan.io/token/${contractAddress}?a=${displayTokenId}`;

  return (
    <div className={`p-6 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-2xl border border-indigo-200 dark:border-indigo-800 shadow-xl ${className}`}>
      {/* Token Card Header */}
      <div className="relative mb-6">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-xl opacity-20 blur-2xl"></div>
        
        {/* Token ID Badge */}
        <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 border border-indigo-200 dark:border-indigo-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">SafePsy DID Token</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Token ID: #{displayTokenId}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-green-600 dark:text-green-400">Active</span>
            </div>
          </div>

          {/* Wallet Address */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 dark:text-gray-400">Owner:</span>
              <span className="text-sm font-mono text-gray-900 dark:text-white">
                {formatAddress(wallet?.address || '')}
              </span>
            </div>
            <button
              onClick={() => copyToClipboard(wallet?.address || '')}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              title="Copy address"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 text-gray-500" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Profile Information */}
      {profile && (
        <div className="mb-6 space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Profile Data
          </h4>
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-lg p-4 border border-gray-200 dark:border-gray-700 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Created:</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {formatDate(profile.createdAt)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Last Updated:</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {formatDate(profile.lastUpdatedAt)}
              </span>
            </div>
            {profile.chatDataReference !== '0x0000000000000000000000000000000000000000000000000000000000000000' && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Chat Reference:</span>
                <span className="text-gray-900 dark:text-white font-mono text-xs">
                  {formatAddress(profile.chatDataReference)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Encrypted Chat History */}
      {chatHistory.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Encrypted Chat History
            </h4>
            <button
              onClick={() => setShowDecrypted(!showDecrypted)}
              className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              {showDecrypted ? (
                <>
                  <EyeOff className="w-3 h-3" />
                  Hide
                </>
              ) : (
                <>
                  <Eye className="w-3 h-3" />
                  View
                </>
              )}
            </button>
          </div>
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-lg p-4 border border-gray-200 dark:border-gray-700 max-h-64 overflow-y-auto">
            {showDecrypted ? (
              <div className="space-y-2">
                {chatHistory.slice(-5).map((msg: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-2 rounded text-xs ${
                      msg.role === 'user'
                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-100'
                        : 'bg-gray-100 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    <div className="font-medium mb-1">{msg.role === 'user' ? 'You' : 'Assistant'}</div>
                    <div className="text-xs opacity-90">{msg.content?.substring(0, 100)}...</div>
                  </div>
                ))}
                {chatHistory.length > 5 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
                    +{chatHistory.length - 5} more messages
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <Lock className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {chatHistory.length} encrypted messages
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Click "View" to decrypt and display
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contract Link */}
      {contractAddress && (
        <div className="flex items-center justify-center pt-4 border-t border-gray-200 dark:border-gray-700">
          <a
            href={etherscanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
          >
            <span>View on Etherscan</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-2xl flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Loading token data...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}
    </div>
  );
}

