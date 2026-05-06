import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import {
  SUPPORTED_CHAIN_ID,
  SUPPORTED_CHAIN_ID_HEX,
} from '../config/supportedChain';
import { getApiBaseUrl } from '../config/api'

type WalletConnectProvider = {
  accounts: string[];
  chainId: number;
  session?: unknown;
  request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  on: (event: string, cb: (...args: any[]) => void) => void;
};

interface WalletInfo {
  address: string;
  chainId: number;
  isConnected: boolean;
}

interface WalletContextType {
  wallet: WalletInfo | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  signMessage: (message: string) => Promise<string>;
  isLoading: boolean;
  error: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: React.ReactNode;
}

// Use empty string when not set: same-origin requests use Vite proxy (dev) or Caddy (prod)
const API_BASE_URL = getApiBaseUrl()
const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '';
/** Sepolia chain params for wallet_addEthereumChain (when chain not in wallet) */
const SEPOLIA_CHAIN_PARAMS = {
  chainId: SUPPORTED_CHAIN_ID_HEX,
  chainName: 'Sepolia',
  nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://rpc.sepolia.org'],
  blockExplorerUrls: ['https://sepolia.etherscan.io'],
};

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletConnectProvider, setWalletConnectProvider] = useState<WalletConnectProvider | null>(null);

  const clearWalletState = useCallback(() => {
    setWallet(null);
    setProvider(null);
    setSigner(null);
    localStorage.removeItem('wallet_verification_message');
    localStorage.removeItem('wallet_verification_nonce');
  }, []);

  // Initialize WalletConnect provider (lazy initialization - will be created on connect if needed)
  // This effect only sets up the provider if it's already connected from a previous session
  useEffect(() => {
    const initWalletConnect = async () => {
      if (!WALLETCONNECT_PROJECT_ID) {
        console.warn('WalletConnect Project ID not set. WalletConnect will not be available.');
        return;
      }

      try {
        const { EthereumProvider } = await import('@walletconnect/ethereum-provider');
        // Only initialize if we want to check for existing sessions
        // The provider will be created on-demand when user clicks connect
        const provider = await EthereumProvider.init({
          projectId: WALLETCONNECT_PROJECT_ID,
          chains: [SUPPORTED_CHAIN_ID], // Sepolia Testnet
          optionalChains: [],
          showQrModal: true,
          metadata: {
            name: 'SafePsy',
            description: 'Safe Online-Therapy Platform',
            url: window.location.origin,
            icons: [`${window.location.origin}/LogoTransparent1.png`],
          },
        });

        // Set up event listeners
        provider.on('display_uri', (uri: string) => {
          console.log('WalletConnect URI:', uri);
        });

        provider.on('connect', () => {
          console.log('WalletConnect connected');
        });

        provider.on('disconnect', () => {
          console.log('WalletConnect disconnected');
          setWallet(null);
          setProvider(null);
          setSigner(null);
        });

        provider.on('chainChanged', (chainId: number | string) => {
          const numericChainId = typeof chainId === 'string' ? parseInt(chainId, 16) : chainId;
          console.log('Chain changed:', numericChainId);
          // Disconnect if user switches to a different chain
          if (numericChainId !== SUPPORTED_CHAIN_ID) {
            console.warn('Unsupported chain detected. Disconnecting wallet.');
            setError('Please switch to Sepolia Testnet to use SafePsy.');
            try {
              provider.disconnect();
            } finally {
              clearWalletState();
            }
          } else {
            setWallet((prev) => prev ? { ...prev, chainId: numericChainId } : null);
          }
        });

        provider.on('accountsChanged', (accounts: string[]) => {
          console.log('Accounts changed:', accounts);
          if (accounts.length > 0) {
            setWallet((prev) => prev ? { ...prev, address: accounts[0] } : null);
          } else {
            setWallet(null);
            setProvider(null);
            setSigner(null);
            localStorage.removeItem('wallet_verification_message');
            localStorage.removeItem('wallet_verification_nonce');
          }
        });

        setWalletConnectProvider(provider as unknown as WalletConnectProvider);
      } catch (err) {
        console.error('WalletConnect initialization error:', err);
      }
    };

    initWalletConnect();
  }, []);

  // Check for existing connection on mount
  useEffect(() => {
    const checkExistingConnection = async () => {
      // Check MetaMask connection
      if (typeof window.ethereum !== 'undefined') {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.listAccounts();
          if (accounts.length > 0) {
            const network = await provider.getNetwork();
            const chainId = Number(network.chainId);
            
            // Only allow Sepolia Testnet
            if (chainId !== SUPPORTED_CHAIN_ID) {
              console.warn('Unsupported chain detected on existing connection. Chain ID:', chainId);
              return;
            }
            
            const signer = await provider.getSigner();
            setProvider(provider);
            setSigner(signer);
            setWallet({
              address: accounts[0].address,
              chainId,
              isConnected: true,
            });
          }
        } catch (err) {
          console.error('Error checking existing connection:', err);
        }
      }

      // Check WalletConnect connection
      if (walletConnectProvider && walletConnectProvider.session) {
        try {
          const accounts = walletConnectProvider.accounts;
          const chainId = walletConnectProvider.chainId;
          
          // Only allow Sepolia Testnet
          if (chainId !== SUPPORTED_CHAIN_ID) {
            console.warn('Unsupported chain detected on WalletConnect connection. Chain ID:', chainId);
            return;
          }
          
          if (accounts.length > 0) {
            // Create ethers provider from WalletConnect
          const ethersProvider = new ethers.BrowserProvider(walletConnectProvider);
            const signer = await ethersProvider.getSigner();
            setProvider(ethersProvider);
            setSigner(signer);
            setWallet({
              address: accounts[0],
              chainId,
              isConnected: true,
            });
          }
        } catch (err) {
          console.error('Error checking WalletConnect connection:', err);
        }
      }
    };

    checkExistingConnection();
  }, [walletConnectProvider]);

  // Listen for MetaMask chain changes
  useEffect(() => {
    if (typeof window.ethereum === 'undefined') {
      return;
    }

    const handleChainChanged = (chainId: string) => {
      const numericChainId = parseInt(chainId, 16);
      console.log('MetaMask chain changed:', numericChainId);
      
      // Disconnect if user switches to a different chain
      if (numericChainId !== SUPPORTED_CHAIN_ID) {
        console.warn('Unsupported chain detected. Disconnecting wallet.');
        setError('Please switch to Sepolia Testnet to use SafePsy.');
        // Disconnect wallet
        if (walletConnectProvider && walletConnectProvider.session) {
          walletConnectProvider.disconnect();
        }
        setWallet(null);
        setProvider(null);
        setSigner(null);
        localStorage.removeItem('wallet_verification_message');
        localStorage.removeItem('wallet_verification_nonce');
      } else {
        // Update chain ID if still connected
        setWallet((prev) => prev ? { ...prev, chainId: numericChainId } : null);
        setError(null);
      }
    };

    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      if (window.ethereum && window.ethereum.removeListener) {
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [walletConnectProvider]);

  const connectWallet = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Prioritize WalletConnect if Project ID is configured
      if (WALLETCONNECT_PROJECT_ID) {
        const ensureWalletConnectProvider = async (): Promise<WalletConnectProvider | null> => {
          if (walletConnectProvider) return walletConnectProvider;
          try {
            const { EthereumProvider } = await import('@walletconnect/ethereum-provider');
            const wc = (await EthereumProvider.init({
              projectId: WALLETCONNECT_PROJECT_ID,
              chains: [SUPPORTED_CHAIN_ID],
              optionalChains: [],
              showQrModal: true,
              metadata: {
                name: 'SafePsy',
                description: 'Safe Online-Therapy Platform',
                url: window.location.origin,
                icons: [`${window.location.origin}/LogoTransparent1.png`],
              },
            })) as unknown as WalletConnectProvider;

            wc.on('disconnect', () => {
              console.log('WalletConnect disconnected');
              setWallet(null);
              setProvider(null);
              setSigner(null);
            });

            wc.on('chainChanged', (chainId: number | string) => {
              const numericChainId = typeof chainId === 'string' ? parseInt(chainId, 16) : chainId;
              console.log('Chain changed:', numericChainId);
              if (numericChainId !== SUPPORTED_CHAIN_ID) {
                console.warn('Unsupported chain detected. Disconnecting wallet.');
                setError('Please switch to Sepolia Testnet to use SafePsy.');
                try {
                  wc.disconnect();
                } finally {
                  clearWalletState();
                }
              } else {
                setWallet((prev) => (prev ? { ...prev, chainId: numericChainId } : null));
              }
            });

            wc.on('accountsChanged', (accounts: string[]) => {
              console.log('Accounts changed:', accounts);
              if (accounts.length > 0) {
                setWallet((prev) => (prev ? { ...prev, address: accounts[0] } : null));
              } else {
                setWallet(null);
                setProvider(null);
                setSigner(null);
                localStorage.removeItem('wallet_verification_message');
                localStorage.removeItem('wallet_verification_nonce');
              }
            });

            setWalletConnectProvider(wc);
            return wc;
          } catch (e) {
            console.error('WalletConnect initialization error:', e);
            return null;
          }
        };

        // Use existing provider or wait for it to be initialized
        const providerToUse = await ensureWalletConnectProvider();
        
        if (!providerToUse) {
          // Fall through to MetaMask
        } else {
          // Provider already initialized, try to connect
          try {
            await providerToUse.connect();
            const accounts = providerToUse.accounts;
            const chainId = providerToUse.chainId;

            // Validate chain ID
            if (chainId !== SUPPORTED_CHAIN_ID) {
              throw new Error('Please switch to Sepolia Testnet to use SafePsy. Unsupported network detected.');
            }

            if (accounts.length > 0) {
              const ethersProvider = new ethers.BrowserProvider(providerToUse);
              const signer = await ethersProvider.getSigner();

              setProvider(ethersProvider);
              setSigner(signer);
              setWallet({
                address: accounts[0],
                chainId,
                isConnected: true,
              });

              // Request verification message from API
              await requestVerificationMessage(accounts[0], chainId);
              return;
            }
          } catch (wcError: any) {
            // If user cancels WalletConnect, try MetaMask
            if (wcError.message?.includes('User rejected') || wcError.code === 5001 || wcError.code === 'USER_REJECTED') {
              console.log('WalletConnect cancelled, trying MetaMask...');
            } else {
              console.error('WalletConnect error:', wcError);
              // Continue to MetaMask fallback
            }
          }
        }
      }

      // Fallback to MetaMask or injected provider
      if (typeof window.ethereum !== 'undefined') {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send('eth_requestAccounts', []);
        const network = await provider.getNetwork();
        const chainId = Number(network.chainId);

        // Validate chain ID - only Sepolia Testnet is supported
        if (chainId !== SUPPORTED_CHAIN_ID) {
          // Try to switch to Sepolia
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: SUPPORTED_CHAIN_ID_HEX }],
            });
            // Re-fetch network after switch
            const updatedNetwork = await provider.getNetwork();
            const updatedChainId = Number(updatedNetwork.chainId);
            if (updatedChainId !== SUPPORTED_CHAIN_ID) {
              throw new Error('Please switch to Sepolia Testnet to use SafePsy.');
            }
          } catch (switchError: any) {
            // If switch fails (4902 = chain not added), add Sepolia then switch
            if (switchError.code === 4902) {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [SEPOLIA_CHAIN_PARAMS],
              });
              const updatedNetwork = await provider.getNetwork();
              const updatedChainId = Number(updatedNetwork.chainId);
              if (updatedChainId !== SUPPORTED_CHAIN_ID) {
                throw new Error('Please switch to Sepolia Testnet to use SafePsy.');
              }
            } else {
              throw new Error('Please switch to Sepolia Testnet to use SafePsy.');
            }
          }
        }

        const signer = await provider.getSigner();

        setProvider(provider);
        setSigner(signer);
        setWallet({
          address: accounts[0],
          chainId: SUPPORTED_CHAIN_ID,
          isConnected: true,
        });

        // Request verification message from API
        await requestVerificationMessage(accounts[0], SUPPORTED_CHAIN_ID);
      } else if (!WALLETCONNECT_PROJECT_ID) {
        throw new Error('No Ethereum wallet found. Please install MetaMask or configure WalletConnect Project ID.');
      } else {
        throw new Error('No Ethereum wallet found. Please install MetaMask or use WalletConnect.');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to connect wallet';
      setError(errorMessage);
      console.error('Wallet connection error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [walletConnectProvider, clearWalletState]);

  const requestVerificationMessage = async (address: string, chainId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/wallet/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
          'x-chain-id': chainId.toString(),
        },
      });

      const data = await response.json();
      if (data.success) {
        // Store verification message in localStorage for later use
        localStorage.setItem('wallet_verification_message', data.data.message);
        localStorage.setItem('wallet_verification_nonce', data.data.nonce);
        return data.data;
      }
    } catch (err) {
      console.error('Error requesting verification message:', err);
    }
  };

  const disconnectWallet = useCallback(() => {
    if (walletConnectProvider && walletConnectProvider.session) {
      walletConnectProvider.disconnect();
    }
    clearWalletState();
    setError(null);
  }, [walletConnectProvider, clearWalletState]);

  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const signature = await signer.signMessage(message);
      
      // Verify signature with API
      if (wallet) {
        const response = await fetch(`${API_BASE_URL}/api/auth/wallet/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-wallet-address': wallet.address,
            'x-wallet-signature': signature,
            'x-wallet-message': message,
            'x-chain-id': wallet.chainId.toString(),
          },
        });

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.message || 'Signature verification failed');
        }
      }

      return signature;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to sign message';
      setError(errorMessage);
      throw err;
    }
  }, [signer, wallet]);

  return (
    <WalletContext.Provider
      value={{
        wallet,
        provider,
        signer,
        connectWallet,
        disconnectWallet,
        signMessage,
        isLoading,
        error,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

