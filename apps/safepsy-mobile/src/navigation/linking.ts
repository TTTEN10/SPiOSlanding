import type { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { UNIVERSAL_LINK_ORIGINS } from '../config/domains';
import type { RootStackParamList } from './types';

/**
 * Custom scheme + HTTPS hosts for WalletConnect return and Universal Links (Associated Domains).
 */
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL('/'), 'safepsy://', ...UNIVERSAL_LINK_ORIGINS],
  config: {
    screens: {
      Home: '',
      Chat: 'chat',
      Wallet: 'wallet',
      Safety: 'safety',
    },
  },
};
