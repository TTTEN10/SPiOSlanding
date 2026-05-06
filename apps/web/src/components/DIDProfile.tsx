import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Shield, 
  Wallet, 
  Hash, 
  Calendar, 
  FileText, 
  Download, 
  Trash2, 
  AlertTriangle,
  CheckCircle,
  Loader2,
  Copy,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { apiUrl } from '../config/api'

interface DIDProfileData {
  hasDid: boolean;
  tokenId: string | null;
  walletAddress: string;
  encryptedDataExists: boolean;
  isRevoked?: boolean;
  contractAddress?: string;
  network?: string;
  chainId?: number;
  profile?: {
    owner: string;
    createdAt: string;
    lastUpdatedAt: string;
    chatDataReference: string;
    encryptedKeyMetadataLength: number;
    hasChatReference: boolean;
  };
}

interface DataPointer {
  dataHash: string;
  dataType: string;
  storageLocation: string;
  updatedAt: string;
}

export default function DIDProfile() {
  const { authState } = useAuth();
  const { showToast } = useToast();
  const [profileData, setProfileData] = useState<DIDProfileData | null>(null);
  const [pointers, setPointers] = useState<DataPointer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authState.isVerified && authState.walletAddress) {
      loadProfileData();
    } else {
      setProfileData(null);
      setPointers([]);
    }
  }, [authState.isVerified, authState.walletAddress]);

  const loadProfileData = async () => {
    if (!authState.isVerified || !authState.walletAddress) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('walletSessionToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(apiUrl('/did/info'), {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load DID profile');
      }

      const data = await response.json();
      if (data.success) {
        setProfileData(data.data);
        // TODO: Load pointers from DIDService contract if available
        // For now, we'll show empty pointers array
        setPointers([]);
      } else {
        throw new Error(data.message || 'Failed to load DID profile');
      }
    } catch (err: any) {
      console.error('Error loading DID profile:', err);
      setError(err.message || 'Failed to load DID profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    if (!authState.isVerified || !authState.walletAddress) {
      showToast('error', 'Please verify your wallet first');
      return;
    }

    try {
      setIsExporting(true);
      setError(null);

      const token = localStorage.getItem('walletSessionToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(apiUrl('/did/export'), {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to export DID data');
      }

      const data = await response.json();
      if (data.success) {
        // Create and download JSON file
        const jsonStr = JSON.stringify(data.data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `did-profile-${authState.walletAddress.slice(2, 10)}-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('success', 'DID profile exported successfully');
      } else {
        throw new Error(data.message || 'Failed to export DID data');
      }
    } catch (err: any) {
      console.error('Error exporting DID:', err);
      setError(err.message || 'Failed to export DID data');
      showToast('error', err.message || 'Failed to export DID data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRevoke = async () => {
    if (!authState.isVerified || !authState.walletAddress) {
      showToast('error', 'Please verify your wallet first');
      return;
    }

    if (!showRevokeConfirm) {
      setShowRevokeConfirm(true);
      return;
    }

    try {
      setIsRevoking(true);
      setError(null);

      const token = localStorage.getItem('walletSessionToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // First, get revocation instructions from backend
      const response = await fetch(apiUrl('/did/revoke'), {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ clearChatReference: true }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to revoke DID');
      }

      const data = await response.json();
      if (data.success) {
        // Backend returns instructions - user needs to call contract directly
        // For now, show success message
        showToast('success', 'Revocation initiated. Please complete the transaction in your wallet.');
        setShowRevokeConfirm(false);
        // Reload profile data
        await loadProfileData();
      } else {
        throw new Error(data.message || 'Failed to revoke DID');
      }
    } catch (err: any) {
      console.error('Error revoking DID:', err);
      setError(err.message || 'Failed to revoke DID');
      showToast('error', err.message || 'Failed to revoke DID');
    } finally {
      setIsRevoking(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast('success', `${label} copied to clipboard`);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: string) => {
    try {
      const date = new Date(parseInt(timestamp) * 1000);
      return date.toLocaleString();
    } catch {
      return timestamp;
    }
  };

  const getEtherscanUrl = (address: string) => {
    return `https://etherscan.io/address/${address}`;
  };

  const getEtherscanTokenUrl = (tokenId: string) => {
    const contractAddress = profileData?.contractAddress || '';
    if (!contractAddress) return '';
    return `https://etherscan.io/token/${contractAddress}?a=${tokenId}`;
  };

  if (!authState.isVerified) {
    return null;
  }

  if (isLoading && !profileData) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <p className="text-sm">Loading DID profile...</p>
        </div>
      </div>
    );
  }

  if (!profileData || !profileData.hasDid) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
          <AlertTriangle className="w-5 h-5" />
          <p className="text-sm font-medium">No DID found. Please create your DID identity first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Profile Card */}
      <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 rounded-2xl p-6 border border-indigo-200 dark:border-indigo-800 shadow-lg">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
              <Shield className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">DID Profile</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Decentralized Identity</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadProfileData}
              disabled={isLoading}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            {profileData.isRevoked ? (
              <div className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-xs font-semibold">
                Revoked
              </div>
            ) : (
              <div className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-xs font-semibold flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Active
              </div>
            )}
          </div>
        </div>

        {/* Wallet Address */}
        <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Wallet Address</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-gray-900 dark:text-white">{profileData.walletAddress}</span>
            <button
              onClick={() => copyToClipboard(profileData.walletAddress, 'Address')}
              className="p-1 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              title="Copy address"
            >
              <Copy className="w-4 h-4" />
            </button>
            <a
              href={getEtherscanUrl(profileData.walletAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              title="View on Etherscan"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Token ID */}
        {profileData.tokenId && (
          <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Hash className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Token ID</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-gray-900 dark:text-white">{profileData.tokenId}</span>
              {profileData.contractAddress && (
                <a
                  href={getEtherscanTokenUrl(profileData.tokenId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  title="View token on Etherscan"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Profile Details */}
        {profileData.profile && (
          <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Profile Details</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">Created:</span>
                <span className="text-gray-900 dark:text-white">{formatDate(profileData.profile.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">Updated:</span>
                <span className="text-gray-900 dark:text-white">{formatDate(profileData.profile.lastUpdatedAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 dark:text-gray-400">Chat Reference:</span>
                <span className="text-gray-900 dark:text-white">
                  {profileData.profile.hasChatReference ? (
                    <span className="font-mono text-xs">{formatAddress(profileData.profile.chatDataReference)}</span>
                  ) : (
                    <span className="text-gray-400">None</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 dark:text-gray-400">Encrypted Key Metadata:</span>
                <span className="text-gray-900 dark:text-white">
                  {profileData.profile.encryptedKeyMetadataLength > 0 ? (
                    `${profileData.profile.encryptedKeyMetadataLength} bytes`
                  ) : (
                    <span className="text-gray-400">None</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Data Pointers */}
        <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <Hash className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Data Pointers</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">({pointers.length})</span>
          </div>
          {pointers.length > 0 ? (
            <div className="space-y-2">
              {pointers.map((pointer, index) => (
                <div key={index} className="p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="text-xs font-mono text-gray-900 dark:text-white">{formatAddress(pointer.dataHash)}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Type: {pointer.dataType} | Location: {pointer.storageLocation.slice(0, 20)}...
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No data pointers found</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Export</span>
              </>
            )}
          </button>
          {!profileData.isRevoked && (
            <button
              onClick={handleRevoke}
              disabled={isRevoking}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRevoking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Revoking...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Revoke</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Revoke Confirmation */}
        {showRevokeConfirm && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">
                  Warning: Revoking your DID is permanent
                </p>
                <ul className="text-xs text-red-700 dark:text-red-300 space-y-1 mb-3">
                  <li>• Your DID token will be burned (destroyed)</li>
                  <li>• Your address will be permanently banned from receiving new DIDs</li>
                  <li>• This action cannot be undone</li>
                  <li>• You will lose access to all DID-associated features</li>
                </ul>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRevoke}
                    disabled={isRevoking}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRevoking ? 'Confirming...' : 'Confirm Revocation'}
                  </button>
                  <button
                    onClick={() => setShowRevokeConfirm(false)}
                    disabled={isRevoking}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

