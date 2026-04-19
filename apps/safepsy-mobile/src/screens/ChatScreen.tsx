import {
  NativeStackScreenProps,
  type NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GiftedChat, IMessage, User } from 'react-native-gifted-chat';
import { useWalletConnect } from '../contexts/WalletConnectContext';
import { API_BASE_URL } from '../config/env';
import { trackActivation } from '../instrumentation/activation';
import { captureException } from '../instrumentation/sentry';
import { RootStackParamList } from '../navigation/types';
import {
  clearChatSymmetricKey,
  initializeChatCrypto,
  loadChatSession,
  saveChatSession,
  type PersistedChatMessage,
} from '../services/chatHistoryService';
import { clearEncryptedDek, getWalletSessionToken } from '../services/secureToken';
import { triggerDidUpdateAfterSave, type SaveChatApiData } from '../services/didService';
import { streamChatCompletion, type ChatApiMessage, type StreamPhase } from '../services/chatStream';
import { useAuthStore } from '../store/authStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

const GUEST_PROMPT_LIMIT = 5;

const FIRST_MESSAGE_SUGGESTIONS = [
  'Do you feel more overwhelmed or more numb lately?',
  "What's been taking more space in your mind than you'd like?",
  'If something feels off, where do you feel it most?',
];

const USER: User = { _id: 'u1', name: 'You' };
const BOT: User = { _id: 'drsafe', name: 'Dr.Safe' };

/** Strip UI-style prefixes so shared text reads as a standalone insight. */
function formatShareableInsight(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^dr\.?\s*safe\s*:\s*/i, '').replace(/^assistant\s*:\s*/i, '');
  s = s.replace(/^["'`]+|["'`]+$/g, '');
  s = s.replace(/\*\*/g, '');
  const sentences = s.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length <= 2) return s.trim();
  return sentences.slice(0, 2).join(' ').trim();
}

export type PersistUiPhase = 'idle' | 'saving' | 'signing' | 'pending' | 'confirmed' | 'failed';

function persistPhaseLabel(
  phase: PersistUiPhase,
  failKind: 'save' | 'did' | null,
  txHash?: string | null,
): string {
  switch (phase) {
    case 'saving':
      return 'Encrypting & saving your chat…';
    case 'signing':
      return 'This confirms your identity — no funds are used';
    case 'pending':
      return txHash
        ? 'Transaction confirming on-chain…'
        : 'Transaction sent — waiting for confirmation…';
    case 'confirmed':
      return 'Saved securely — your data stays encrypted';
    case 'failed':
      return failKind === 'save'
        ? 'Could not save to the server — check your connection and try sending another message'
        : 'On-chain sync failed — your chat is still saved encrypted on the server';
    default:
      return '';
  }
}

function persistPhaseSubline(phase: PersistUiPhase, failKind: 'save' | 'did' | null): string | null {
  if (phase === 'saving') {
    return 'Your messages are encrypted on this device before upload.';
  }
  if (phase === 'signing') {
    return 'This works like a secure signature for your private space.';
  }
  if (phase === 'pending') {
    return 'This helps ensure your encrypted backup has not been tampered with.';
  }
  if (phase === 'failed' && failKind === 'did') {
    return 'You can retry — your encrypted chat was already saved.';
  }
  return null;
}

function toApiMessages(giftedNewestFirst: IMessage[]): ChatApiMessage[] {
  const chronological = [...giftedNewestFirst].reverse();
  const out: ChatApiMessage[] = [];
  for (const m of chronological) {
    const text = (m.text ?? '').trim();
    const role: ChatApiMessage['role'] = m.user?._id === USER._id ? 'user' : 'assistant';
    if (!text) continue;
    out.push({ role, content: m.text ?? '' });
  }
  return out;
}

function giftedToPersistable(giftedNewestFirst: IMessage[]): PersistedChatMessage[] {
  return [...giftedNewestFirst]
    .reverse()
    .filter((m) => (m.text ?? '').trim())
    .map((m) => ({
      id: String(m._id),
      role: (m.user?._id === USER._id ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.text ?? '',
      timestamp:
        m.createdAt instanceof Date
          ? m.createdAt.toISOString()
          : new Date(m.createdAt as number).toISOString(),
    }));
}

function persistedToGifted(rows: PersistedChatMessage[]): IMessage[] {
  return [...rows].reverse().map((m) => ({
    _id: m.id,
    text: m.content,
    createdAt: new Date(m.timestamp),
    user: m.role === 'user' ? USER : BOT,
  }));
}

const GiftedChatPane = memo(function GiftedChatPane({
  messages,
  isTyping,
  streamLocked,
  persistLocked,
  onSend,
}: {
  messages: IMessage[];
  isTyping: boolean;
  streamLocked: boolean;
  persistLocked: boolean;
  onSend: (m: IMessage[]) => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <GiftedChat
        messages={messages}
        onSend={onSend}
        user={USER}
        isTyping={isTyping}
        placeholder="Message Dr.Safe…"
        alwaysShowSend
        disableComposer={streamLocked || persistLocked}
      />
    </View>
  );
});

export function ChatScreen(_props: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const token = useAuthStore((s) => s.token);
  const isVerified = useAuthStore((s) => s.isVerified);
  const sessionWallet = useAuthStore((s) => s.walletAddress);
  const { signer, wcAddress } = useWalletConnect();

  const [messages, setMessages] = useState<IMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [streamPhase, setStreamPhase] = useState<StreamPhase>('idle');
  const [persistPhase, setPersistPhase] = useState<PersistUiPhase>('idle');
  const [persistTxHint, setPersistTxHint] = useState<string | null>(null);
  const [persistFailKind, setPersistFailKind] = useState<'save' | 'did' | null>(null);
  const [keyRecoveryPending, setKeyRecoveryPending] = useState(false);
  const [guestSaveNudgeDismissed, setGuestSaveNudgeDismissed] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const guestSends = useRef(0);
  const messagesRef = useRef<IMessage[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cryptoInitFor = useRef<string | null>(null);
  const prevVerified = useRef(false);
  const lastDidPayloadRef = useRef<SaveChatApiData | null>(null);
  const confirmedResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const streamLocked =
    streamPhase === 'connecting' || streamPhase === 'streaming' || streamPhase === 'retrying';

  const persistLocked =
    persistPhase === 'saving' || persistPhase === 'signing' || persistPhase === 'pending';

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const userMessageCount = useMemo(
    () => messages.filter((m) => m.user?._id === USER._id && (m.text ?? '').trim()).length,
    [messages],
  );

  const showGuestSaveNudge =
    !token &&
    !guestSaveNudgeDismissed &&
    userMessageCount >= 2 &&
    userMessageCount < GUEST_PROMPT_LIMIT;

  const guestNudgeCopy = useMemo(() => {
    if (userMessageCount === 2) {
      return {
        title: 'Want to keep this space private and come back to it later?',
        body: 'You can secure your conversations so only you can access them — your wallet becomes the key to this emotional space, not a payment.',
      };
    }
    return {
      title: 'Secure your space so it always stays yours',
      body: 'Create your private space — your wallet is an emotional continuity anchor (a key only you hold), not a payment step.',
    };
  }, [userMessageCount]);

  const activationMsgRef = useRef({ first: false, m3: false });
  const walletNudgeTrackedRef = useRef(false);

  useEffect(() => {
    if (userMessageCount >= 1 && !activationMsgRef.current.first) {
      activationMsgRef.current.first = true;
      trackActivation('on_first_message', { mode: token ? 'authenticated' : 'guest' });
    }
    if (userMessageCount >= 3 && !activationMsgRef.current.m3) {
      activationMsgRef.current.m3 = true;
      trackActivation('on_message_3', { mode: token ? 'authenticated' : 'guest' });
    }
  }, [userMessageCount, token]);

  useEffect(() => {
    if (showGuestSaveNudge && !walletNudgeTrackedRef.current) {
      walletNudgeTrackedRef.current = true;
      trackActivation('on_wallet_prompt_shown', { at_user_message: String(userMessageCount) });
    }
  }, [showGuestSaveNudge, userMessageCount]);

  useEffect(() => {
    if (isVerified && !prevVerified.current) {
      setMessages([]);
      guestSends.current = 0;
      activationMsgRef.current = { first: false, m3: false };
      walletNudgeTrackedRef.current = false;
    }
    prevVerified.current = isVerified;
  }, [isVerified]);

  const finishFreshWithoutHistory = useCallback(
    async (wallet: string, wcSigner: NonNullable<typeof signer>) => {
      setKeyRecoveryPending(false);
      await initializeChatCrypto(wcSigner, wallet);
      cryptoInitFor.current = wallet;
      setMessages([]);
    },
    [],
  );

  const recoverAndReload = useCallback(
    async (wallet: string, wcSigner: NonNullable<typeof signer>) => {
      setKeyRecoveryPending(false);
      try {
        await clearEncryptedDek(wallet);
        clearChatSymmetricKey();
        await initializeChatCrypto(wcSigner, wallet);
        cryptoInitFor.current = wallet;
        const second = await loadChatSession();
        if (second.corrupted) {
          Alert.alert(
            'History still locked',
            'The server backup was encrypted with a different device key. You can keep chatting — new messages will use this device’s key.',
          );
          setMessages([]);
        } else {
          setMessages(persistedToGifted(second.messages));
        }
      } catch (e) {
        captureException(e, { area: 'chat_key_recovery' });
        Alert.alert('Unlock failed', e instanceof Error ? e.message : String(e));
      }
    },
    [],
  );

  useEffect(() => {
    if (!isVerified || !signer || !sessionWallet) {
      clearChatSymmetricKey();
      cryptoInitFor.current = null;
      setKeyRecoveryPending(false);
      return;
    }
    if (!wcAddress || wcAddress.toLowerCase() !== sessionWallet.toLowerCase()) {
      return;
    }
    if (cryptoInitFor.current === sessionWallet) return;
    if (keyRecoveryPending) return;

    void (async () => {
      try {
        await initializeChatCrypto(signer, sessionWallet);
        const { messages: loaded, corrupted } = await loadChatSession();
        if (corrupted) {
          await clearEncryptedDek(sessionWallet);
          clearChatSymmetricKey();
          cryptoInitFor.current = null;
          setMessages([]);
          setKeyRecoveryPending(true);
          Alert.alert(
            'Chat backup locked',
            'This device cannot read your saved chat. That often means another phone created the backup, or keys changed. You can re-sign to create a new device key and try loading again, or start fresh on this device (old backup stays unreadable here).',
            [
              {
                text: 'Re-sign & try again',
                onPress: () => void recoverAndReload(sessionWallet, signer),
              },
              {
                text: 'Start fresh here',
                style: 'destructive',
                onPress: () => void finishFreshWithoutHistory(sessionWallet, signer),
              },
            ],
            { cancelable: false },
          );
          return;
        }
        cryptoInitFor.current = sessionWallet;
        setMessages(persistedToGifted(loaded));
      } catch (e) {
        captureException(e, { area: 'chat_crypto_init' });
        Alert.alert('Could not unlock chat', e instanceof Error ? e.message : String(e));
      }
    })();
  }, [
    isVerified,
    signer,
    sessionWallet,
    wcAddress,
    keyRecoveryPending,
    recoverAndReload,
    finishFreshWithoutHistory,
  ]);

  const runDidRetry = useCallback(async () => {
    const payload = lastDidPayloadRef.current;
    if (!payload || !signer) return;
    setPersistPhase('signing');
    setPersistTxHint(null);
    setPersistFailKind(null);
    try {
      await triggerDidUpdateAfterSave(signer, payload, {
        onPhase: (p, detail) => {
          if (p === 'signing') setPersistPhase('signing');
          if (p === 'pending') {
            setPersistPhase('pending');
            setPersistTxHint(detail ?? null);
          }
          if (p === 'confirmed') {
            setPersistPhase('confirmed');
            lastDidPayloadRef.current = null;
            if (confirmedResetTimer.current) clearTimeout(confirmedResetTimer.current);
            confirmedResetTimer.current = setTimeout(() => {
              setPersistPhase('idle');
              setPersistTxHint(null);
            }, 2500);
          }
          if (p === 'failed') setPersistPhase('failed');
        },
      });
    } catch (e) {
      captureException(e, { area: 'chat_did_retry' });
      setPersistFailKind('did');
      setPersistPhase('failed');
    }
  }, [signer]);

  const flushPersist = useCallback(async () => {
    if (!isVerified || !sessionWallet || !wcAddress || !signer) return;
    if (wcAddress.toLowerCase() !== sessionWallet.toLowerCase()) return;

    if (confirmedResetTimer.current) {
      clearTimeout(confirmedResetTimer.current);
      confirmedResetTimer.current = null;
    }

    const snap = messagesRef.current;
    const rows = giftedToPersistable(snap);
    if (rows.length === 0) return;

    setPersistPhase('saving');
    setPersistTxHint(null);
    setPersistFailKind(null);
    try {
      const result = await saveChatSession(rows, { skipDidAfterSave: true });

      if (result.requiresDidUpdate && result.chatReference) {
        lastDidPayloadRef.current = {
          requiresDidUpdate: true,
          chatReference: result.chatReference,
          preserveEncryptedKeyMetadata: result.preserveEncryptedKeyMetadata ?? null,
        };
        setPersistPhase('signing');
        try {
          await triggerDidUpdateAfterSave(signer, lastDidPayloadRef.current, {
            onPhase: (p, detail) => {
              if (p === 'signing') setPersistPhase('signing');
              if (p === 'pending') {
                setPersistPhase('pending');
                setPersistTxHint(detail ?? null);
              }
              if (p === 'confirmed') {
                setPersistPhase('confirmed');
                lastDidPayloadRef.current = null;
                if (confirmedResetTimer.current) clearTimeout(confirmedResetTimer.current);
                confirmedResetTimer.current = setTimeout(() => {
                  setPersistPhase('idle');
                  setPersistTxHint(null);
                }, 2500);
              }
              if (p === 'failed') setPersistPhase('failed');
            },
          });
        } catch (e) {
          captureException(e, { area: 'chat_did_after_save' });
          setPersistFailKind('did');
          setPersistPhase('failed');
        }
      } else {
        lastDidPayloadRef.current = null;
        setPersistPhase('confirmed');
        if (confirmedResetTimer.current) clearTimeout(confirmedResetTimer.current);
        confirmedResetTimer.current = setTimeout(() => {
          setPersistPhase('idle');
          setPersistTxHint(null);
        }, 2000);
      }
    } catch (e) {
      captureException(e, { area: 'chat_save' });
      setPersistFailKind('save');
      setPersistPhase('failed');
      Alert.alert(
        'Save failed',
        e instanceof Error ? e.message : String(e),
        [{ text: 'Retry', onPress: () => void flushPersist() }, { text: 'OK', style: 'cancel' }],
      );
    }
  }, [isVerified, sessionWallet, wcAddress, signer]);

  const schedulePersist = useCallback(() => {
    if (!isVerified || !sessionWallet || !wcAddress || !signer) return;
    if (wcAddress.toLowerCase() !== sessionWallet.toLowerCase()) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void flushPersist();
    }, 900);
  }, [isVerified, sessionWallet, wcAddress, signer, flushPersist]);

  const onSend = useCallback(
    (newMessages: IMessage[] = []) => {
      const isGuest = !token;
      if (isGuest && guestSends.current >= GUEST_PROMPT_LIMIT) {
        trackActivation('on_wallet_prompt_limit');
        Alert.alert(
          'This space can stay yours',
          `You've reached the guest try limit (${GUEST_PROMPT_LIMIT} messages this session). Create your private space to keep coming back — same warmth, with encryption you control. No funds are spent on sign-in.`,
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Create your private space', onPress: () => navigation.navigate('Wallet') },
          ],
        );
        return;
      }
      if (isGuest) {
        guestSends.current += 1;
      }

      const assistantId = `asst-${Date.now()}`;
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      const signal = abortRef.current.signal;

      setMessages((prev) => {
        const assistantShell: IMessage = {
          _id: assistantId,
          text: '',
          createdAt: new Date(),
          user: BOT,
        };
        const apiMessages = toApiMessages([...newMessages, ...prev]);

        queueMicrotask(() => {
          setIsTyping(true);
          setStreamPhase('connecting');
          void (async () => {
            const bearer = token ?? (await getWalletSessionToken());
            const mode: 'guest' | 'authenticated' = bearer ? 'authenticated' : 'guest';
            await streamChatCompletion({
              baseUrl: API_BASE_URL,
              messages: apiMessages,
              mode,
              bearerToken: bearer,
              signal,
              flushIntervalMs: 85,
              onPhase: (p) => setStreamPhase(p),
              onDelta: (chunk) => {
                setMessages((cur) => {
                  const [head, ...rest] = cur;
                  if (!head || head._id !== assistantId) return cur;
                  return [{ ...head, text: (head.text ?? '') + chunk }, ...rest];
                });
              },
              onFinish: () => {
                setIsTyping(false);
                setStreamPhase('idle');
                schedulePersist();
              },
              onError: (err) => {
                setIsTyping(false);
                setStreamPhase('idle');
                Alert.alert('Chat error', err.message);
                captureException(err, { area: 'chat_stream' });
                setMessages((cur) => cur.filter((m) => m._id !== assistantId));
              },
            });
          })();
        });

        return [assistantShell, ...newMessages, ...prev];
      });
    },
    [token, schedulePersist, navigation],
  );

  const copyLastDrSafeReply = useCallback(async () => {
    const row = messages.find((m) => m.user?._id === BOT._id && (m.text ?? '').trim());
    const text = row?.text?.trim();
    if (!text) {
      Alert.alert('Nothing to copy yet', 'Send a message and wait for Dr.Safe to reply first.');
      return;
    }
    const shareable = formatShareableInsight(text);
    await Clipboard.setStringAsync(shareable);
    trackActivation('on_shareable_insight_copy');
    Alert.alert('Copied', 'A clean, shareable version is on your clipboard.');
  }, [messages]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => void copyLastDrSafeReply()} hitSlop={10} style={{ paddingHorizontal: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#1a5f7a' }}>Copy insight</Text>
        </Pressable>
      ),
    });
  }, [navigation, copyLastDrSafeReply]);

  const persistBannerVisible = persistPhase !== 'idle';
  const persistLabel = useMemo(
    () => persistPhaseLabel(persistPhase, persistFailKind, persistTxHint),
    [persistPhase, persistFailKind, persistTxHint],
  );
  const persistSubline = useMemo(
    () => persistPhaseSubline(persistPhase, persistFailKind),
    [persistPhase, persistFailKind],
  );

  return (
    <View style={styles.fill}>
      {persistBannerVisible ? (
        <View style={[styles.persistBar, { paddingTop: 8 + insets.top }]}>
          <Text style={styles.persistText}>{persistLabel}</Text>
          {persistSubline ? <Text style={styles.persistSub}>{persistSubline}</Text> : null}
          {persistPhase === 'failed' && persistFailKind === 'did' && lastDidPayloadRef.current ? (
            <Pressable style={styles.retryBtn} onPress={() => void runDidRetry()}>
              <Text style={styles.retryBtnText}>Retry on-chain sync</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {showGuestSaveNudge ? (
        <View style={styles.guestNudge}>
          <View style={styles.guestNudgeTextWrap}>
            <Text style={styles.guestNudgeTitle}>{guestNudgeCopy.title}</Text>
            <Text style={styles.guestNudgeBody}>{guestNudgeCopy.body}</Text>
          </View>
          <Pressable
            style={styles.guestNudgeBtn}
            onPress={() => {
              trackActivation('on_wallet_prompt_cta');
              navigation.navigate('Wallet');
            }}
          >
            <Text style={styles.guestNudgeBtnText}>Create your private space</Text>
          </Pressable>
          <Pressable onPress={() => setGuestSaveNudgeDismissed(true)} hitSlop={12}>
            <Text style={styles.guestNudgeDismiss}>Dismiss</Text>
          </Pressable>
        </View>
      ) : null}
      {messages.length === 0 && !streamLocked ? (
        <View style={styles.starterBar}>
          <Text style={styles.starterHint}>
            Pick one line to start — or write your own. One honest sentence is enough.
          </Text>
          {FIRST_MESSAGE_SUGGESTIONS.map((line, i) => (
            <Pressable
              key={line}
              style={styles.starterChip}
              onPress={() =>
                onSend([
                  {
                    _id: `starter-${Date.now()}-${i}`,
                    text: line,
                    createdAt: new Date(),
                    user: USER,
                  },
                ])
              }
            >
              <Text style={styles.starterChipText}>{line}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={styles.chatColumn}>
        <GiftedChatPane
          messages={messages}
          isTyping={isTyping}
          streamLocked={streamLocked}
          persistLocked={persistLocked}
          onSend={onSend}
        />
        <View style={styles.retentionFooter}>
          <Text style={styles.retentionLine}>This space will be here when you return.</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#fff' },
  chatColumn: { flex: 1 },
  retentionFooter: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e8e8e8',
    backgroundColor: '#fafafa',
    gap: 4,
  },
  retentionLine: { fontSize: 12, color: '#666', textAlign: 'center', lineHeight: 17, fontStyle: 'italic' },
  guestNudge: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#f6f1ff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#d4c4f0',
    gap: 10,
  },
  guestNudgeTextWrap: { gap: 4 },
  guestNudgeTitle: { fontSize: 15, fontWeight: '700', color: '#2d1f4d' },
  guestNudgeBody: { fontSize: 13, lineHeight: 18, color: '#4a3d66' },
  guestNudgeBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#1a5f7a',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  guestNudgeBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  guestNudgeDismiss: { fontSize: 13, color: '#5c4d7a', fontWeight: '600' },
  starterBar: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
    gap: 8,
    backgroundColor: '#fafafa',
  },
  starterHint: { fontSize: 13, color: '#444', marginBottom: 2 },
  starterChip: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#c5dce4',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  starterChipText: { fontSize: 14, color: '#0d3d4d', lineHeight: 20 },
  persistBar: {
    backgroundColor: '#e8f4f8',
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#bcd',
  },
  persistText: { fontSize: 14, color: '#0d3d4d', lineHeight: 20 },
  persistSub: { fontSize: 12, color: '#3d5c66', lineHeight: 17, marginTop: 4 },
  retryBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#1a5f7a',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  retryBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
