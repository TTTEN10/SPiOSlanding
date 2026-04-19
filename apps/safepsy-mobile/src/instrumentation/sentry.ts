import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

function buildSentryRelease(): string {
  const version = Constants.expoConfig?.version ?? '0.0.0';
  const build =
    Constants.nativeBuildVersion ??
    (typeof Constants.expoConfig?.ios?.buildNumber === 'string'
      ? Constants.expoConfig.ios.buildNumber
      : undefined) ??
    (Constants.expoConfig?.android?.versionCode != null
      ? String(Constants.expoConfig.android.versionCode)
      : undefined) ??
    'dev';
  return `safepsy-mobile@${version}+${build}`;
}

export function initSentry(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    release: buildSentryRelease(),
    dist: Constants.nativeBuildVersion ?? undefined,
    environment: __DEV__ ? 'development' : 'production',
    sendDefaultPii: false,
    tracesSampleRate: 0.15,
    enableAutoSessionTracking: true,
  });
}

export function captureException(error: unknown, context?: Record<string, string>): void {
  if (!process.env.EXPO_PUBLIC_SENTRY_DSN?.trim()) return;
  Sentry.withScope((scope) => {
    if (context) {
      for (const [k, v] of Object.entries(context)) {
        scope.setTag(k, v);
      }
    }
    Sentry.captureException(error);
  });
}

/** Structured production signal (wallet, DID, decrypt) without throwing. */
export function captureMonitoringEvent(
  message: string,
  context: Record<string, string>,
  level: 'info' | 'warning' | 'error' = 'warning',
): void {
  if (!process.env.EXPO_PUBLIC_SENTRY_DSN?.trim()) return;
  Sentry.withScope((scope) => {
    for (const [k, v] of Object.entries(context)) {
      scope.setTag(k, v);
    }
    Sentry.captureMessage(message, { level });
  });
}

export function addMonitoringBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>,
): void {
  if (!process.env.EXPO_PUBLIC_SENTRY_DSN?.trim()) return;
  Sentry.addBreadcrumb({ category, message, data, level: 'info' });
}
