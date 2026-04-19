import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { API_BASE_URL } from '../config/env';
import { RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/authStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const isVerified = useAuthStore((s) => s.isVerified);

  return (
    <View style={styles.outer}>
      <View style={styles.middle}>
        <Text style={styles.title}>SafePsy</Text>
        <Text style={styles.tagline}>A private space to talk things through — no login required to begin.</Text>
        {hydrated && token && isVerified ? (
          <Text style={styles.welcomeBack}>Welcome back. This is still your space.</Text>
        ) : null}
        <Text style={styles.sub}>API: {API_BASE_URL}</Text>
        <Text style={styles.sub}>
          Session: {!hydrated ? '…' : token ? 'saved & verified (wallet)' : 'guest (nothing saved yet)'}
        </Text>

        <Pressable style={styles.btn} onPress={() => navigation.navigate('Chat')}>
          <Text style={styles.btnText}>Start talking (no login)</Text>
        </Pressable>
        <Pressable style={styles.btnSecondary} onPress={() => navigation.navigate('Wallet')}>
          <Text style={styles.btnSecondaryText}>Create your private space</Text>
        </Pressable>
        <Pressable style={styles.btnGhost} onPress={() => navigation.navigate('Safety')}>
          <Text style={styles.btnGhostText}>Safety & disclaimers</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerHint}>Legal & safety are always available from this screen.</Text>
        <Pressable onPress={() => navigation.navigate('Safety')}>
          <Text style={styles.footerLink}>Safety, crisis numbers & privacy summary</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: '#fff' },
  middle: { flex: 1, padding: 24, justifyContent: 'center', gap: 12 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  tagline: { fontSize: 15, lineHeight: 22, color: '#333', marginBottom: 8 },
  welcomeBack: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1a5f7a',
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  sub: { fontSize: 14, color: '#555', marginBottom: 4 },
  btn: {
    backgroundColor: '#1a5f7a',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  btnSecondary: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1a5f7a',
  },
  btnSecondaryText: { color: '#1a5f7a', fontSize: 15, fontWeight: '600' },
  btnGhost: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnGhostText: { color: '#555', fontSize: 14, fontWeight: '600' },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ddd',
  },
  footerHint: { fontSize: 13, color: '#666', marginBottom: 8 },
  footerLink: { fontSize: 14, fontWeight: '600', color: '#1a5f7a' },
});
