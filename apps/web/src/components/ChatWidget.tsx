import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowUp, X, Edit2, Trash2, Check, X as CloseIcon, WifiOff, MessageSquare, Copy } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import { useChatEncryption } from '../hooks/useChatEncryption';
import { updateChatReference } from '../utils/did-contract';
import { useOffline } from '../hooks/useOffline';
import { useToast, type ToastType } from '../hooks/useToast';
import { getActionableErrorMessage } from '../utils/errorMessages';
import Paywall from './Paywall';
import EmptyState from './EmptyState';
import GuestModeLimitModal from './GuestModeLimitModal';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  encrypted?: boolean;
  isEditing?: boolean;
  canEdit?: boolean; // User messages can be edited within 30 seconds
}

interface PaywallData {
  quota: {
    dailyUsed: number;
    dailyLimit: number;
    monthlyUsed: number;
    monthlyLimit: number;
    resetDailyAt: string;
    resetMonthlyAt: string;
  };
  pricing: {
    PREMIUM: {
      crypto: {
        ETH: string;
        USDT: string;
        USDC: string;
      };
    };
  };
  paymentRecipient: string | null;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const MAX_MESSAGE_LENGTH = 2000;
const EDIT_WINDOW_MS = 30000; // 30 seconds
/** Guest mode: max user messages per browser session (in-memory only; resets on refresh). */
const GUEST_PROMPT_LIMIT = 5;

const FIRST_MESSAGE_SUGGESTIONS = [
  "What's been on your mind more than usual lately?",
  'Do you feel more overwhelmed or more empty right now?',
  "What's something you haven't said out loud yet?",
];

export default function ChatWidget() {
  const [searchParams] = useSearchParams();
  const { authState, userMode } = useAuth();
  const { wallet, signer } = useWallet();
  const { symmetricKey, loadChat, saveChat, isLoading: encryptionLoading, error: encryptionError } = useChatEncryption();
  const { isOffline } = useOffline();
  const { showToast, ToastContainer } = useToast();
  
  // Check if withContext query parameter is set
  const withContext = searchParams.get('withContext') === 'true';
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendPhase, setSendPhase] = useState<
    'idle' | 'checking' | 'encrypting' | 'sending' | 'streaming' | 'saving' | 'error'
  >('idle');
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallData, setPaywallData] = useState<PaywallData | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [requestInProgress, setRequestInProgress] = useState(false);
  const [guestPromptCount, setGuestPromptCount] = useState(0);
  const [showGuestLimitModal, setShowGuestLimitModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const concurrencyCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isGuest = userMode === 'guest';

  // Wallet verified mid-session: reset guest limit and allow persistence path (load replaces thread).
  useEffect(() => {
    if (authState.isVerified) {
      setGuestPromptCount(0);
      setShowGuestLimitModal(false);
    }
  }, [authState.isVerified]);

  const scrollToWalletConnect = useCallback(() => {
    document.getElementById('wallet-connect-region')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  // After the 5th guest message is sent, show conversion modal once streaming finishes.
  useEffect(() => {
    if (!isGuest || isStreaming) return;
    if (guestPromptCount >= GUEST_PROMPT_LIMIT) {
      setShowGuestLimitModal(true);
    }
  }, [isGuest, guestPromptCount, isStreaming]);

  // Check concurrency status
  const checkConcurrencyStatus = useCallback(async (): Promise<boolean> => {
    if (!wallet?.address) return false;

    try {
      const token = localStorage.getItem('walletSessionToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      headers['x-wallet-address'] = wallet.address;
      headers['x-chain-id'] = wallet.chainId.toString();

      const response = await fetch(`${API_BASE_URL}/api/chat/concurrency`, {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const inProgress = data.data.requestInProgress || false;
          setRequestInProgress(inProgress);
          return inProgress;
        }
      }
      return false;
    } catch (error) {
      console.error('Error checking concurrency status:', error);
      // Don't show error to user, just log it
      return false;
    }
  }, [wallet?.address, wallet?.chainId]);

  // Poll concurrency status periodically when wallet is connected
  useEffect(() => {
    if (wallet?.address && symmetricKey && !encryptionLoading) {
      // Check immediately
      checkConcurrencyStatus();

      // Then poll every 2 seconds
      concurrencyCheckIntervalRef.current = setInterval(() => {
        checkConcurrencyStatus();
      }, 2000);

      return () => {
        if (concurrencyCheckIntervalRef.current) {
          clearInterval(concurrencyCheckIntervalRef.current);
        }
      };
    } else {
      // Reset requestInProgress when wallet disconnects
      setRequestInProgress(false);
    }
  }, [wallet?.address, symmetricKey, encryptionLoading, checkConcurrencyStatus]);

  // Load encrypted chat history when wallet session is verified and the symmetric key is ready.
  // Always replaces in-memory messages so a prior guest thread does not leak after verification.
  useEffect(() => {
    if (symmetricKey && !encryptionLoading && authState.isVerified) {
      setIsLoadingHistory(true);
      loadChat()
        .then((loadedMessages) => {
          const raw = loadedMessages ?? [];
          const now = Date.now();
          setMessages(
            raw.map((msg: any) => {
              const timestamp = msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp);
              const messageTime = timestamp.getTime();
              const canEdit = msg.role === 'user' && now - messageTime < EDIT_WINDOW_MS;

              return {
                id: msg.id || `msg-${Date.now()}-${Math.random()}`,
                role: msg.role,
                content: msg.content,
                timestamp,
                encrypted: false,
                canEdit,
              };
            })
          );
          setIsLoadingHistory(false);
        })
        .catch((err) => {
          console.error('Error loading chat:', err);
          showToast('error', 'Failed to load chat history');
          setIsLoadingHistory(false);
        });
    } else if (!symmetricKey && !encryptionLoading) {
      setIsLoadingHistory(false);
    }
  }, [symmetricKey, encryptionLoading, loadChat, showToast, authState.isVerified]);

  // Check if message can be edited (within 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.role === 'user' && msg.canEdit) {
            const now = Date.now();
            const messageTime = msg.timestamp.getTime();
            return {
              ...msg,
              canEdit: (now - messageTime) < EDIT_WINDOW_MS,
            };
          }
          return msg;
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Handle editing a message
  const handleEditMessage = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (message && message.canEdit) {
      setEditingMessageId(messageId);
      setEditContent(message.content);
      inputRef.current?.focus();
    }
  };

  // Handle saving edited message
  const handleSaveEdit = async () => {
    if (!editContent.trim() || !editingMessageId) return;

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === editingMessageId
          ? { ...msg, content: editContent.trim(), canEdit: false, isEditing: false }
          : msg
      )
    );

    try {
      const updatedMessages = messages.map((msg) =>
        msg.id === editingMessageId
          ? { ...msg, content: editContent.trim() }
          : msg
      );
      if (!isGuest) {
        await saveChat(
          updatedMessages.map((msg) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
          }))
        );
      }
      showToast('success', 'Message updated');
    } catch (error) {
      console.error('Error saving edited message:', error);
      showToast('error', 'Failed to update message');
    }

    setEditingMessageId(null);
    setEditContent('');
  };

  // Handle canceling edit
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent('');
  };

  // Handle deleting a message
  const handleDeleteMessage = async (messageId: string) => {
    if (!window.confirm('Are you sure you want to delete this message?')) {
      return;
    }

    setMessages((prev) => prev.filter((msg) => msg.id !== messageId));

    try {
      const updatedMessages = messages.filter((msg) => msg.id !== messageId);
      if (!isGuest) {
        await saveChat(
          updatedMessages.map((msg) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
          }))
        );
      }
      showToast('success', 'Message deleted');
    } catch (error) {
      console.error('Error deleting message:', error);
      showToast('error', 'Failed to delete message');
      // Restore message on error
      const message = messages.find((m) => m.id === messageId);
      if (message) {
        setMessages((prev) => [...prev, message]);
      }
    }
  };

  // Handle sending a message.
  // Guest mode: messages stay in React state only; API requests include mode: 'guest' (no server persistence).
  // Authenticated: wallet-derived encryption + saveChat + quota path.
  const handleSend = async (contentOverride?: string) => {
    const trimmed = (typeof contentOverride === 'string' ? contentOverride : input).trim();
    if (!trimmed || isStreaming || isSending || trimmed.length > MAX_MESSAGE_LENGTH || requestInProgress) return;
    if (!isGuest && (!symmetricKey || encryptionLoading)) return;

    if (isGuest && guestPromptCount >= GUEST_PROMPT_LIMIT) {
      setShowGuestLimitModal(true);
      return;
    }

    if (isOffline) {
      showToast('error', 'Cannot send messages while offline. Please check your connection.');
      return;
    }

    setIsSending(true);
    setSendPhase('checking');

    let streamFinalized = false;
    try {
      // Check concurrency status one more time before sending (wallet / DID path only)
      const isInProgress = await checkConcurrencyStatus();
      if (isInProgress) {
        showToast('error', 'Please wait for the chatbot to respond before sending another message.');
        return;
      }

      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
        encrypted: false,
        canEdit: true,
      };

      if (isGuest) {
        setGuestPromptCount((c) => c + 1);
      }

      setMessages((prev) => [...prev, userMessage]);

      // Best-effort persistence of the user message (authenticated)
      if (!isGuest) {
        setSendPhase('encrypting');
        try {
          const updatedMessages = [...messages, userMessage];
          await saveChat(
            updatedMessages.map((msg) => ({
              id: msg.id,
              role: msg.role,
              content: msg.content,
              timestamp: msg.timestamp,
            }))
          );
        } catch (error) {
          const errorMsg = getActionableErrorMessage(error, { code: 'CHAT_SAVE_FAILED' });
          console.error('Error saving chat:', error);
          showToast('error', errorMsg);
        }
      }

      setInput('');
      setIsStreaming(true);
      setSendPhase('sending');
      setIsTyping(true);

      // Show typing indicator
      setTimeout(() => {
        setIsTyping(false);
      }, 500);

      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();

      // Messages are already decrypted in state, just format for API
      const decryptedMessages = [...messages, userMessage].map((msg) => ({
        role: msg.role,
        content: msg.content, // Already decrypted
        timestamp: msg.timestamp,
      }));

      // Prepare headers with wallet authentication if available
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add JWT token if available
      const token = localStorage.getItem('walletSessionToken');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Also add wallet headers for quota checking
      if (wallet) {
        headers['x-wallet-address'] = wallet.address;
        headers['x-chain-id'] = wallet.chainId.toString();
      }

      // Build URL with withContext query parameter if needed
      const chatUrl = new URL(`${API_BASE_URL}/api/chat/completions`);
      if (withContext) {
        chatUrl.searchParams.set('withContext', 'true');
      }

      // Stream response from API
      const response = await fetch(chatUrl.toString(), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: decryptedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          stream: true,
          mode: isGuest ? 'guest' : 'authenticated',
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }

        // Check if it's a quota exceeded error
        if (response.status === 429 && errorData.error === 'QUOTA_EXCEEDED' && errorData.paywall) {
          setPaywallData({
            quota: errorData.quota,
            pricing: errorData.paywall.pricing,
            paymentRecipient: errorData.paywall.paymentRecipient,
          });
          setShowPaywall(true);
          setIsStreaming(false);
          return;
        }

        const errorMsg = getActionableErrorMessage(null, {
          status: response.status,
          code: errorData.error || errorData.code,
          originalMessage: errorData.message,
        });
        throw new Error(errorMsg);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';
      let currentEvent = '';
      let assistantMessage: Message = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };

      const persistAfterStream = async () => {
        if (streamFinalized) return;
        streamFinalized = true;
        setIsStreaming(false);
        setSendPhase('saving');
        try {
          if (!isGuest) {
            const updatedMessages = [...messages, { ...assistantMessage, encrypted: false }];
            await saveChat(
              updatedMessages.map((msg) => ({
                id: msg.id,
                role: msg.role,
                content: msg.role === 'assistant' ? assistantMessage.content : msg.content,
                timestamp: msg.timestamp,
              }))
            );
          }

          if (!isGuest && signer && wallet) {
            try {
              const token = localStorage.getItem('walletSessionToken');
              const headers: HeadersInit = {
                'Content-Type': 'application/json',
              };
              if (token) {
                headers['Authorization'] = `Bearer ${token}`;
              }

              const saveResponse = await fetch(`${API_BASE_URL}/api/chat/save`, {
                method: 'POST',
                headers,
                credentials: 'include',
                body: JSON.stringify({
                  encryptedChatBlob: '',
                  didTokenId: null,
                }),
              });

              if (saveResponse.ok) {
                const saveData = await saveResponse.json();
                if (saveData.success && saveData.data.requiresDidUpdate && signer) {
                  const chatRef = saveData.data.blobHash || '';
                  await updateChatReference(signer, chatRef, new Uint8Array(0));
                }
              }
            } catch (didError) {
              console.error('Error updating DID:', didError);
            }
          }
        } catch (error) {
          console.error('Error saving chat:', error);
        }
      };

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;
        if (sendPhase !== 'streaming') setSendPhase('streaming');

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.substring(7).trim();
          } else if (line.startsWith('data: ')) {
            try {
              const raw = line.substring(6).trim();
              if (raw === '[DONE]') {
                await persistAfterStream();
                continue;
              }
              const data = JSON.parse(raw);

              // OpenAI-compatible SSE (chat.completion.chunk): no "event:" lines
              const delta = data?.choices?.[0]?.delta as { content?: string } | undefined;
              if (delta?.content) {
                assistantMessage.content += delta.content;
                setMessages((prev) => {
                  const lastMsg = prev[prev.length - 1];
                  if (lastMsg?.role === 'assistant' && lastMsg.id === assistantMessage.id) {
                    return [...prev.slice(0, -1), { ...lastMsg, content: assistantMessage.content }];
                  }
                  return [...prev, assistantMessage];
                });
              }
              const finishReason = data?.choices?.[0]?.finish_reason;
              if (finishReason) {
                await persistAfterStream();
              }

              if (currentEvent === 'token') {
                // Append token to assistant message
                assistantMessage.content += data.token;
                setMessages((prev) => {
                  const lastMsg = prev[prev.length - 1];
                  if (lastMsg?.role === 'assistant' && lastMsg.id === assistantMessage.id) {
                    return [...prev.slice(0, -1), { ...lastMsg, content: assistantMessage.content }];
                  }
                  return [...prev, assistantMessage];
                });
              } else if (currentEvent === 'done') {
                await persistAfterStream();
              } else if (currentEvent === 'error') {
                // Check if it's a quota exceeded error
                if (data.error === 'QUOTA_EXCEEDED' && data.paywall) {
                  setPaywallData({
                    quota: data.quota,
                    pricing: data.paywall.pricing,
                    paymentRecipient: data.paywall.paymentRecipient,
                  });
                  setShowPaywall(true);
                  setIsStreaming(false);
                  return;
                }
                throw new Error(data.message || 'Streaming error');
              }
            } catch (error) {
              console.error('Error parsing SSE data:', error);
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request aborted');
      } else {
        const errorMsg = error instanceof Error 
          ? error.message 
          : getActionableErrorMessage(error);
        
        setSendPhase('error');
        showToast('error', errorMsg);
        
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-error`,
            role: 'assistant',
            content: `I encountered an error: ${errorMsg}. Please try again.`,
            timestamp: new Date(),
            encrypted: false,
          },
        ]);
      }
    } finally {
      if (!streamFinalized) {
        setIsStreaming(false);
      }
      setIsTyping(false);
      setIsSending(false);
      setSendPhase('idle');
    }
  };

  // Handle cancel streaming
  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      setIsTyping(false);
    }
  };

  // Display message (already decrypted by hook)
  const displayMessage = async (message: Message): Promise<string> => {
    // Messages are already decrypted when loaded from the hook
    return message.content;
  };

  const guestAtLimit = isGuest && guestPromptCount >= GUEST_PROMPT_LIMIT;
  const guestOneLeft = isGuest && guestPromptCount === GUEST_PROMPT_LIMIT - 1;

  return (
    <>
      <GuestModeLimitModal
        open={showGuestLimitModal}
        onClose={() => setShowGuestLimitModal(false)}
        onScrollToWallet={scrollToWalletConnect}
      />
      {showPaywall && paywallData && (
        <Paywall
          quota={paywallData.quota}
          pricing={paywallData.pricing}
          paymentRecipient={paywallData.paymentRecipient}
          onClose={() => {
            setShowPaywall(false);
            setPaywallData(null);
          }}
          onUpgradeSuccess={() => {
            setShowPaywall(false);
            setPaywallData(null);
            // Optionally refresh quota or retry the request
          }}
        />
      )}
      <div className="flex flex-col h-[600px] bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-white/10 shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-white/20 rounded-t-lg space-y-2">
        {isGuest ? (
          <p
            className="text-xs font-medium text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 text-center"
            role="status"
          >
            Guest mode: this chat lives in this tab only — refresh clears it. When you&apos;re ready, save it securely
            with a wallet (ownership + privacy tool — not a payment).
          </p>
        ) : (
          <p className="text-xs text-body opacity-60 text-center">
            All the exchanged data will be encrypted and stored in your personal wallet. Nobody except you
            will have access to it
          </p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50 dark:bg-neutral-950">
        {isLoadingHistory ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="py-6 px-3">
            <EmptyState
              icon={MessageSquare}
              title="Start in one tap"
              description={
                isGuest
                  ? 'No login. Pick a first line or write your own — Dr.Safe meets you where you are.'
                  : 'Send a message to begin. All messages are encrypted with AES-256-GCM and stored securely in your wallet.'
              }
            />
            <div className="max-w-md mx-auto mt-6 space-y-2">
              <p className="text-xs text-center text-body opacity-70 mb-2">Try an opening that feels real</p>
              {FIRST_MESSAGE_SUGGESTIONS.map((line) => (
                <button
                  key={line}
                  type="button"
                  disabled={guestAtLimit || isOffline || isStreaming}
                  onClick={() => void handleSend(line)}
                  className="w-full text-left text-sm px-4 py-3 rounded-xl border border-primary-200 dark:border-primary-800 bg-white/80 dark:bg-neutral-900/60 text-heading hover:bg-primary-50 dark:hover:bg-primary-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {line}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              displayMessage={displayMessage}
              showToast={showToast}
              isEditing={editingMessageId === message.id}
              editContent={editContent}
              onEdit={handleEditMessage}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={handleCancelEdit}
              onDelete={handleDeleteMessage}
              setEditContent={setEditContent}
            />
          ))
        )}

        {/* Connection Status */}
        {isStreaming && (
          <div className="flex items-center gap-2 text-xs text-body opacity-75 px-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Connected - Streaming response...</span>
          </div>
        )}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-center space-x-2 text-body opacity-75">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <span className="text-xs">Assistant is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 dark:border-white/20 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-b-lg">
        {/* Offline Indicator */}
        {isOffline && (
          <div className="mb-2 flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
            <WifiOff className="w-4 h-4" />
            <span>Offline - Messages cannot be sent</span>
          </div>
        )}
        {guestOneLeft && !guestAtLimit && (
          <p className="mb-2 text-xs text-amber-700 dark:text-amber-300" role="status">
            One try left in guest mode. Save this conversation securely to keep going with unlimited chat.
          </p>
        )}
        {guestAtLimit && (
          <p className="mb-2 text-xs text-amber-800 dark:text-amber-200 font-medium" role="alert">
            Guest limit reached — keep this space yours with Save & sync.
            <button
              type="button"
              onClick={() => setShowGuestLimitModal(true)}
              className="ml-2 underline text-primary-600 dark:text-primary-400"
            >
              Why?
            </button>
          </p>
        )}
        
        {/* Editing Indicator */}
        {editingMessageId && (
          <div className="mb-2 flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs">
            <span className="text-blue-700 dark:text-blue-300">Editing message...</span>
            <button
              onClick={handleCancelEdit}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
              aria-label="Cancel editing"
            >
              <CloseIcon className="w-3 h-3" />
            </button>
          </div>
        )}

        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={editingMessageId ? editContent : input}
              onChange={(e) => {
                if (editingMessageId) {
                  if (e.target.value.length <= MAX_MESSAGE_LENGTH) {
                    setEditContent(e.target.value);
                  }
                } else {
                  if (e.target.value.length <= MAX_MESSAGE_LENGTH) {
                    setInput(e.target.value);
                  }
                }
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (editingMessageId) {
                    handleSaveEdit();
                  } else {
                    handleSend();
                  }
                }
                if (e.key === 'Escape') {
                  if (editingMessageId) {
                    handleCancelEdit();
                  }
                }
              }}
              placeholder={
                editingMessageId
                  ? 'Edit your message...'
                  : isGuest
                    ? 'Say it in your own words...'
                    : 'Type your message...'
              }
              disabled={
                isStreaming ||
                isSending ||
                (!isGuest && (!symmetricKey || encryptionLoading)) ||
                isOffline ||
                requestInProgress ||
                guestAtLimit
              }
              maxLength={MAX_MESSAGE_LENGTH}
              className="w-full px-4 py-2 border border-gray-300 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-neutral-950 text-heading placeholder:text-body placeholder:opacity-50"
            />
            {/* Character Counter */}
            <div className="absolute bottom-1 right-2 text-xs text-body opacity-50">
              {editingMessageId ? editContent.length : input.length}/{MAX_MESSAGE_LENGTH}
              {((editingMessageId ? editContent.length : input.length) / MAX_MESSAGE_LENGTH) > 0.8 && (
                <span className="text-yellow-600 dark:text-yellow-400 ml-1">⚠️</span>
              )}
            </div>
          </div>
          {editingMessageId ? (
            <>
              <button
                onClick={handleSaveEdit}
                disabled={!editContent.trim()}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Save edit"
              >
                <Check className="w-5 h-5" />
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Cancel edit"
              >
                <X className="w-5 h-5" />
              </button>
            </>
          ) : isStreaming ? (
            <button
              onClick={handleCancel}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              aria-label="Cancel streaming"
            >
              Cancel
            </button>
          ) : (
            <button
              onClick={() => void handleSend()}
              disabled={
                !input.trim() ||
                isSending ||
                (!isGuest && (!symmetricKey || encryptionLoading)) ||
                isOffline ||
                input.length > MAX_MESSAGE_LENGTH ||
                requestInProgress ||
                isStreaming ||
                guestAtLimit
              }
              className="px-4 py-2 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-primary-500/25 transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center min-h-[44px] min-w-[44px]"
              aria-label="Send message"
              title={requestInProgress ? "Please wait for the chatbot to respond before sending another message" : ""}
            >
              <ArrowUp className="w-5 h-5" />
            </button>
          )}
        </div>
        {/* Reliability / progress line */}
        {!isGuest && (isSending || isStreaming || encryptionLoading) && (
          <p className="text-xs text-body opacity-80 mt-2" role="status" aria-live="polite">
            {encryptionLoading
              ? 'Preparing secure encryption…'
              : sendPhase === 'checking'
                ? 'Checking session…'
                : sendPhase === 'encrypting'
                  ? 'Encrypting…'
                  : sendPhase === 'sending'
                    ? 'Sending…'
                    : sendPhase === 'streaming'
                      ? 'Receiving…'
                      : sendPhase === 'saving'
                        ? 'Saving securely…'
                        : 'Working…'}
          </p>
        )}
        {!isGuest && encryptionLoading && (
          <p className="text-xs text-body opacity-75 mt-2 flex items-center gap-1">
            <span className="animate-spin">⟳</span>
            Initializing encryption...
          </p>
        )}
        {!isGuest && encryptionError && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-2">{encryptionError}</p>
        )}
      </div>
      </div>
      <ToastContainer />
    </>
  );
}

// Message Bubble Component
function MessageBubble({
  message,
  displayMessage,
  showToast,
  isEditing = false,
  editContent = '',
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  setEditContent,
}: {
  message: Message;
  displayMessage: (message: Message) => Promise<string>;
  showToast?: (type: ToastType, message: string, duration?: number) => void;
  isEditing?: boolean;
  editContent?: string;
  onEdit?: (id: string) => void;
  onSaveEdit?: () => void;
  onCancelEdit?: () => void;
  onDelete?: (id: string) => void;
  setEditContent?: (content: string) => void;
}) {
  const [decryptedContent, setDecryptedContent] = useState<string>('');
  const [isDecrypting, setIsDecrypting] = useState(true);
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadContent = async () => {
      setIsDecrypting(true);
      try {
        const content = await displayMessage(message);
        if (isMounted) {
          setDecryptedContent(content);
          setIsDecrypting(false);
        }
      } catch (error) {
        console.error('Error loading message content:', error);
        if (isMounted) {
          setDecryptedContent('[Error loading message]');
          setIsDecrypting(false);
        }
      }
    };
    loadContent();
    return () => {
      isMounted = false;
    };
  }, [message, displayMessage]);

  const isUser = message.role === 'user';

  return (
    <div 
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} group`}
      onMouseEnter={() => isUser && setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 relative ${
          isUser
            ? 'bg-indigo-600 text-white'
            : 'bg-gray-50 dark:bg-gray-800/50 text-heading border border-gray-200 dark:border-white/20'
        }`}
      >
        {isEditing && isUser ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent?.(e.target.value)}
              className="w-full px-2 py-1 rounded text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600"
              rows={3}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={onSaveEdit}
                className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
              >
                Save
              </button>
              <button
                onClick={onCancelEdit}
                className="px-3 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : isDecrypting ? (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse"></div>
            <span className={`text-xs ${isUser ? 'text-white' : 'text-body opacity-75'}`}>Decrypting...</span>
          </div>
        ) : (
          <>
            <p className={`text-sm whitespace-pre-wrap ${isUser ? 'text-white' : 'text-heading'}`}>{decryptedContent}</p>
            {!isUser && decryptedContent.trim() && (
              <button
                type="button"
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
                onClick={async () => {
                  const block = `${decryptedContent.trim()}\n\n— SafePsy`;
                  try {
                    await navigator.clipboard.writeText(block);
                    showToast?.('success', 'Copied — plain text, subtle credit');
                  } catch {
                    showToast?.('error', 'Could not copy — try selecting the text');
                  }
                }}
              >
                <Copy className="w-3.5 h-3.5" aria-hidden />
                Copy reflection
              </button>
            )}
            {/* Action Buttons (for user messages) */}
            {isUser && showActions && message.canEdit && !isEditing && (
              <div className="absolute -top-8 right-0 flex gap-1 bg-gray-800 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => onEdit?.(message.id)}
                  className="p-1 hover:bg-gray-700 dark:hover:bg-gray-600 rounded"
                  title="Edit message"
                  aria-label="Edit message"
                >
                  <Edit2 className="w-3 h-3 text-white" />
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this message?')) {
                      onDelete?.(message.id);
                    }
                  }}
                  className="p-1 hover:bg-gray-700 dark:hover:bg-gray-600 rounded"
                  title="Delete message"
                  aria-label="Delete message"
                >
                  <Trash2 className="w-3 h-3 text-white" />
                </button>
              </div>
            )}
          </>
        )}
        <p className={`text-xs mt-2 ${isUser ? 'text-indigo-100' : 'text-body opacity-75'}`}>
          {message.timestamp.toLocaleTimeString()}
          {message.encrypted && (
            <span className="ml-2">🔒</span>
          )}
        </p>
      </div>
    </div>
  );
}

