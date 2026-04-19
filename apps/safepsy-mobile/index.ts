import 'react-native-url-polyfill/auto';
import '@walletconnect/react-native-compat';
import { install } from 'react-native-quick-crypto';
install();
import 'react-native-get-random-values';
import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';

import App from './App';

registerRootComponent(App);
