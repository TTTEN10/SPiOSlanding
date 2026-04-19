import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useWalletConnect } from '../contexts/WalletConnectContext';
import { RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/authStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Wallet'>;

export function WalletAuthScreen(_props: Props) {
  const {
    projectIdConfigured,
    wcConnected,
    wcAddress,
    isBusy,
    error,
    authPhase,
    connectAndSignIn,
    disconnectWallet,
  } = useWalletConnect();
  const token = useAuthStore((s) => s.token);
  const sessionAddr = useAuthStore((s) => s.walletAddress);
  const isVerified = useAuthStore((s) => s.isVerified);
  const restoreError = useAuthStore((s) => s.restoreError);
  const [localErr, setLocalErr] = useState<string | null>(null);

  const onConnect = async () => {
    setLocalErr(null);
    try {
      await connectAndSignIn();
      Alert.alert(
        'This space is now securely yours.',
        'Only you can access what you share here. Your wallet is the anchor that keeps this space private when you come back.',
      );
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : String(e));
    }
  };

  const onDisconnect = async () => {
    try {
      await disconnectWallet();
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>Your private space</Text>
      <Text style={styles.p}>
        Your wallet is an emotional continuity anchor — not “crypto,” but the key that says this space
        belongs to you. Encrypted history can load on this device. Same SafePsy API as the web app:{' '}
        <Text style={styles.mono}>POST /api/auth/wallet/connect</Text> then{' '}
        <Text style={styles.mono}>POST /api/auth/wallet/verify</Text>. Your JWT is stored in SecureStore
        (separate from your chat encryption key).
      </Text>

      {!projectIdConfigured && (
        <Text style={styles.warn}>
          Set EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID in your env to enable WalletConnect (see
          apps/web env.example for VITE_WALLETCONNECT_PROJECT_ID).
        </Text>
      )}

      <View style={styles.trustBox}>
        <Text style={styles.trustTitle}>What signing means</Text>
        <Text style={styles.trustStep}>
          <Text style={styles.trustBold}>Create your space: </Text>
          This confirms your identity — no funds are used.
        </Text>
        <Text style={styles.trustStep}>
          <Text style={styles.trustBold}>Sign: </Text>
          This works like a secure signature, not a purchase.
        </Text>
        <Text style={styles.trustStep}>
          <Text style={styles.trustBold}>Later (saving chat): </Text>
          A wallet step can show your encrypted backup was not tampered with — still not a payment.
        </Text>
      </View>

      {(error || localErr || restoreError) && (
        <Text style={styles.err}>{error || localErr || restoreError}</Text>
      )}

      <View style={styles.box}>
        <Text style={styles.label}>API session</Text>
        <Text style={styles.mono}>
          {isVerified && sessionAddr
            ? `Verified — ${sessionAddr}`
            : token
              ? 'Token present (reconnect wallet to sign)'
              : 'Guest'}
        </Text>
      </View>

      <View style={styles.box}>
        <Text style={styles.label}>WalletConnect</Text>
        <Text style={styles.mono}>
          {wcConnected && wcAddress ? `Connected — ${wcAddress}` : 'Not connected'}
        </Text>
        {isBusy && (
          <Text style={styles.phase}>
            {authPhase === 'connecting' && 'Pairing…'}
            {authPhase === 'awaiting_signature' &&
              'When your wallet opens: approve the message — it confirms who you are. No funds are sent.'}
            {authPhase === 'verifying' && 'Verifying with SafePsy…'}
            {authPhase === 'success' && 'Success.'}
            {authPhase === 'error' && 'Error.'}
            {authPhase === 'idle' && 'Working…'}
          </Text>
        )}
      </View>

      <Pressable
        style={[styles.btn, (!projectIdConfigured || isBusy) && styles.btnDisabled]}
        disabled={!projectIdConfigured || isBusy}
        onPress={() => void onConnect()}
      >
        <Text style={styles.btnText}>{isBusy ? 'In progress…' : 'Create your private space'}</Text>
      </Pressable>

      <Pressable
        style={[styles.btnSecondary, isBusy && styles.btnDisabled]}
        disabled={isBusy}
        onPress={() => void onDisconnect()}
      >
        <Text style={styles.btnSecondaryText}>Sign out & disconnect</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 10 },
  p: { fontSize: 15, lineHeight: 22, color: '#333', marginBottom: 12 },
  mono: { fontFamily: 'Menlo', fontSize: 12, color: '#222' },
  warn: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 14,
    color: '#664d03',
  },
  err: { color: '#b00020', marginBottom: 12, fontSize: 14 },
  trustBox: {
    backgroundColor: '#f4f8fb',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#cde',
  },
  trustTitle: { fontSize: 14, fontWeight: '700', color: '#0d3d4d', marginBottom: 8 },
  trustStep: { fontSize: 13, lineHeight: 19, color: '#333', marginBottom: 8 },
  trustBold: { fontWeight: '700', color: '#0d3d4d' },
  box: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  label: { fontSize: 12, color: '#666', marginBottom: 4 },
  phase: { marginTop: 8, fontSize: 13, color: '#1a5f7a' },
  btn: {
    backgroundColor: '#1a5f7a',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  btnSecondary: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1a5f7a',
  },
  btnSecondaryText: { color: '#1a5f7a', fontSize: 15, fontWeight: '600' },
});
