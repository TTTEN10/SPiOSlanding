import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Shield, CheckCircle, AlertCircle, Loader2, Plus, RefreshCw } from 'lucide-react';
import { apiUrl } from '../config/api'

interface DIDInfo {
  hasDid: boolean;
  tokenId: string | null;
  encryptedDataExists: boolean;
  walletAddress: string;
  encryptedDataSize?: number;
  contractAddress?: string;
  network?: string;
}

export default function DIDManager() {
  const { authState, checkDID } = useAuth();
  const [didInfo, setDidInfo] = useState<DIDInfo | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load DID info when component mounts or auth state changes
  useEffect(() => {
    if (authState.isVerified && authState.walletAddress) {
      loadDIDInfo();
    } else {
      setDidInfo(null);
    }
  }, [authState.isVerified, authState.walletAddress]);

  const loadDIDInfo = async () => {
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
        throw new Error('Failed to load DID information');
      }

      const data = await response.json();
      if (data.success) {
        setDidInfo(data.data);
        // Update auth context DID status
        if (data.data.hasDid) {
          checkDID();
        }
      } else {
        throw new Error(data.message || 'Failed to load DID information');
      }
    } catch (err: any) {
      console.error('Error loading DID info:', err);
      setError(err.message || 'Failed to load DID information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDID = async () => {
    if (!authState.isVerified || !authState.walletAddress) {
      setError('Please verify your wallet first');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);
      setSuccess(null);

      const token = localStorage.getItem('walletSessionToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(apiUrl('/did/create'), {
        method: 'POST',
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create DID');
      }

      const data = await response.json();
      if (data.success) {
        setSuccess('DID created successfully!');
        // Reload DID info
        await loadDIDInfo();
        // Update auth context
        await checkDID();
      } else {
        throw new Error(data.message || 'Failed to create DID');
      }
    } catch (err: any) {
      console.error('Error creating DID:', err);
      setError(err.message || 'Failed to create DID');
    } finally {
      setIsCreating(false);
    }
  };

  if (!authState.isVerified) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-medium">Please verify your wallet to manage your Safe ID Token</p>
        </div>
      </div>
    );
  }

  if (isLoading && !didInfo) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <p className="text-sm">Loading DID information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* DID Status Panel */}
      <div className="p-4 bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            <h3 className="text-lg font-semibold text-heading">Safe ID Token</h3>
          </div>
          <button
            onClick={loadDIDInfo}
            disabled={isLoading}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {didInfo?.hasDid ? (
          <div className="space-y-3">
            {/* Identity Active State */}
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">Identity Active</p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  Token ID: {didInfo.tokenId}
                </p>
              </div>
            </div>

            {/* Encrypted Data Status */}
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                Secure Data Storage
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                {didInfo.encryptedDataExists
                  ? `Yes - ${didInfo.encryptedDataSize || 0} bytes stored`
                  : 'No data stored yet'}
              </p>
            </div>

            {/* Additional Info */}
            {didInfo.network && (
              <div className="p-3 bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Network: {didInfo.network}
                </p>
                {didInfo.contractAddress && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 font-mono">
                    Contract: {didInfo.contractAddress.slice(0, 10)}...{didInfo.contractAddress.slice(-8)}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* No Identity State */}
            <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  No identity yet
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  Create your Safe ID Token to get started
                </p>
              </div>
            </div>

            {/* Create Button */}
            <button
              onClick={handleCreateDID}
              disabled={isCreating}
              className="w-full bg-gradient-to-r from-primary-600 to-secondary-600 text-white font-semibold text-sm px-4 py-3 rounded-xl hover:from-primary-700 hover:to-secondary-700 focus:outline-none focus:ring-4 focus:ring-primary-200 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-primary-500/25 transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Identity...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Create my Safe ID Token</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
          </div>
        )}
      </div>
    </div>
  );
}

