import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useEffect } from 'react';
import { AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WalletConnectProvider } from './src/contexts/WalletConnectContext';
import { validateProductionEnvironment } from './src/config/productionEnv';
import { initSentry } from './src/instrumentation/sentry';
import { RootNavigator } from './src/navigation/RootNavigator';
import { trackActivation } from './src/instrumentation/activation';
import { useAuthStore } from './src/store/authStore';

initSentry();
validateProductionEnvironment();

const queryClient = new QueryClient();

function AuthBootstrap({ children }: { children: ReactNode }) {
  const hydrate = useAuthStore((s) => s.hydrate);
  const restoreSession = useAuthStore((s) => s.restoreSession);

  useEffect(() => {
    trackActivation('on_app_open');
  }, []);

  useEffect(() => {
    void (async () => {
      await hydrate();
      await restoreSession();
    })();
  }, [hydrate, restoreSession]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void restoreSession();
      }
    });
    return () => sub.remove();
  }, [restoreSession]);

  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WalletConnectProvider>
        <SafeAreaProvider>
          <AuthBootstrap>
            <RootNavigator />
            <StatusBar style="dark" />
          </AuthBootstrap>
        </SafeAreaProvider>
      </WalletConnectProvider>
    </QueryClientProvider>
  );
}
