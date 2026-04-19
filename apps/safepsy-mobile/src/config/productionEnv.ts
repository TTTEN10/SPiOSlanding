import * as Linking from 'expo-linking';
import { captureException } from '../instrumentation/sentry';
import { UNIVERSAL_LINK_ORIGINS } from './domains';
import {
  API_BASE_URL,
  APP_DOMAIN_LOCK,
  UNIVERSAL_LINK_BASE,
  WALLETCONNECT_PROJECT_ID,
} from './env';

function parseHost(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Naive registrable domain (sufficient for `*.safepsy.com` + `safepsy.com`). */
export function registrableDomain(hostname: string): string {
  const parts = hostname.split('.').filter(Boolean);
  if (parts.length <= 2) return hostname;
  return parts.slice(-2).join('.');
}

function isLocalApi(host: string | null): boolean {
  if (!host) return true;
  return (
    host === 'localhost' ||
    host.startsWith('127.') ||
    host === '10.0.2.2' ||
    host.endsWith('.local')
  );
}

const allowedUniversalHosts = new Set(
  UNIVERSAL_LINK_ORIGINS.map((o) => {
    try {
      return new URL(o).hostname.toLowerCase();
    } catch {
      return '';
    }
  }).filter(Boolean),
);

/**
 * Production / release builds: domain or WalletConnect misconfiguration throws before UI.
 * Development (`__DEV__`): same issues are logged, app keeps running for local iteration.
 *
 * Internal/preview builds that intentionally use odd URLs may set
 * `EXPO_PUBLIC_RELAX_DOMAIN_FATAL=true` (still logs warnings; never throws).
 */
export function validateProductionEnvironment(): void {
  const apiHost = parseHost(API_BASE_URL);
  const universalHost = UNIVERSAL_LINK_BASE ? parseHost(UNIVERSAL_LINK_BASE) : null;
  const relax = process.env.EXPO_PUBLIC_RELAX_DOMAIN_FATAL?.trim() === 'true';
  const fatals: string[] = [];

  if (isLocalApi(apiHost)) {
    console.log('✅ Production environment validated (local API — full domain lock skipped)');
    return;
  }

  if (!WALLETCONNECT_PROJECT_ID) {
    fatals.push(
      'EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID is empty — WalletConnect will fail for all users.',
    );
  }

  if (!UNIVERSAL_LINK_BASE || !/^https:\/\//i.test(UNIVERSAL_LINK_BASE)) {
    fatals.push(
      'EXPO_PUBLIC_UNIVERSAL_LINK_BASE must be set to HTTPS (e.g. https://safepsy.com) when API is not local — ' +
        'required for WalletConnect return URL and Universal Links.',
    );
  }

  if (apiHost && universalHost) {
    const ra = registrableDomain(apiHost);
    const ru = registrableDomain(universalHost);
    if (ra !== ru) {
      fatals.push(
        `API registrable domain "${ra}" must match Universal Link base registrable domain "${ru}" (same root domain family).`,
      );
    }
  }

  if (APP_DOMAIN_LOCK) {
    const check = (host: string | null, label: string) => {
      if (!host) return;
      const reg = registrableDomain(host);
      const ok =
        reg === APP_DOMAIN_LOCK || host === APP_DOMAIN_LOCK || host.endsWith(`.${APP_DOMAIN_LOCK}`);
      if (!ok) {
        fatals.push(
          `EXPO_PUBLIC_APP_DOMAIN=${APP_DOMAIN_LOCK} but ${label} hostname "${host}" is not under that domain.`,
        );
      }
    };
    check(apiHost, 'API');
    check(universalHost, 'Universal');
  }

  if (universalHost && !allowedUniversalHosts.has(universalHost)) {
    fatals.push(
      `EXPO_PUBLIC_UNIVERSAL_LINK_BASE host "${universalHost}" must match src/config/domains.ts and app.json associatedDomains.`,
    );
  }

  const schemePreview = Linking.createURL('/');
  if (__DEV__ && !UNIVERSAL_LINK_BASE && schemePreview.startsWith('exp://')) {
    console.warn(
      '[SafePsy] WalletConnect metadata may use exp:// in dev. Set EXPO_PUBLIC_UNIVERSAL_LINK_BASE for production-like dev.',
    );
  }

  if (relax && fatals.length > 0) {
    console.warn(
      `[SafePsy] EXPO_PUBLIC_RELAX_DOMAIN_FATAL=true — skipping fatal throw (${fatals.length} issue(s)):\n${fatals.join('\n')}`,
    );
    return;
  }

  if (__DEV__ && fatals.length > 0) {
    for (const f of fatals) {
      console.error('[SafePsy]', f);
    }
    return;
  }

  if (!__DEV__ && fatals.length > 0) {
    const message = `FATAL: Production domain mismatch\n${fatals.join('\n')}`;
    const err = new Error(message);
    captureException(err, { area: 'startup', kind: 'production_domain_mismatch' });
    throw err;
  }

  console.log('✅ Production environment validated');
}
