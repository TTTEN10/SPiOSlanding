import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { linking } from './linking';
import { RootStackParamList } from './types';
import { ChatScreen } from '../screens/ChatScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { SafetyDisclaimerScreen } from '../screens/SafetyDisclaimerScreen';
import { WalletAuthScreen } from '../screens/WalletAuthScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#fff',
  },
};

export function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme} linking={linking}>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'SafePsy' }} />
        <Stack.Screen
          name="Safety"
          component={SafetyDisclaimerScreen}
          options={{ title: 'Safety' }}
        />
        <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Dr.Safe' }} />
        <Stack.Screen name="Wallet" component={WalletAuthScreen} options={{ title: 'Your private space' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
