#!/usr/bin/env node
/* global process, console, URL */
/**
 * Validates Universal Links AASA hosting requirements for production.
 *
 * Usage:
 *   node scripts/validate-aasa.mjs https://safepsy.com
 *
 * Expects:
 *   GET /.well-known/apple-app-site-association → 200
 *   Content-Type includes application/json
 *   Final URL path still ends with apple-app-site-association (no redirect to HTML)
 *
 * Apple tool (manual): https://search.developer.apple.com/appsearch-validation-tool/
 */

const base = process.argv[2] || process.env.AASA_BASE_URL;
if (!base) {
  console.error('Usage: node scripts/validate-aasa.mjs <https://your-domain.com>');
  process.exit(1);
}

const url = new URL('/.well-known/apple-app-site-association', base.replace(/\/$/, ''));

async function main() {
  if (typeof globalThis.fetch !== 'function') {
    console.error('FAIL: fetch() is not available. Use Node 18+ (or provide a fetch polyfill).');
    process.exit(1);
  }

  const res = await globalThis.fetch(url, { redirect: 'manual' });
  const loc = res.headers.get('location');
  if (res.status >= 300 && res.status < 400 && loc) {
    console.error(`FAIL: redirect (${res.status}) to ${loc} — Apple requires AASA without redirects.`);
    process.exit(1);
  }
  if (!res.ok) {
    console.error(`FAIL: HTTP ${res.status} for ${url}`);
    process.exit(1);
  }
  const ct = res.headers.get('content-type') || '';
  if (!ct.toLowerCase().includes('application/json')) {
    console.warn(`WARN: Content-Type is "${ct}" — Apple expects application/json (got ${res.status}).`);
  }
  const text = await res.text();
  try {
    const j = JSON.parse(text);
    if (!j?.applinks?.details?.length) {
      console.error('FAIL: JSON missing applinks.details array.');
      process.exit(1);
    }
    const appId = j.applinks.details[0]?.appID || j.applinks.details[0]?.appIDs?.[0];
    if (!appId || /REPLACE|REAL_TEAM_ID|<|>/.test(String(appId))) {
      console.warn(
        `WARN: appID looks like a placeholder: ${appId} — set real Apple Team ID + bundle id before App Store.`,
      );
    }
  } catch {
    console.error('FAIL: Response is not valid JSON.');
    process.exit(1);
  }
  console.log(`OK: ${url} returned ${res.status}, JSON parsed, Content-Type: ${ct || '(none)'}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
