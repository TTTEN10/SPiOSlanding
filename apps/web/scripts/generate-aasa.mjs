#!/usr/bin/env node
/* global process, console */
/**
 * Generates `public/.well-known/apple-app-site-association` with a real Team ID.
 *
 * Usage:
 *   APPLE_TEAM_ID=ABCDE12345 node scripts/generate-aasa.mjs
 *
 * Output:
 *   Writes `public/.well-known/apple-app-site-association`
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.resolve(__dirname, '../public/.well-known/apple-app-site-association');

const teamId = (process.env.APPLE_TEAM_ID || process.env.VITE_APPLE_TEAM_ID || '').trim();
const bundleId = (process.env.APPLE_BUNDLE_ID || 'com.safepsy.mobile').trim();

if (!teamId || /REAL_TEAM_ID|<|>/.test(teamId)) {
  if (fs.existsSync(outPath)) {
    console.warn(
      `WARN: Missing APPLE_TEAM_ID; leaving existing apple-app-site-association as-is: ${outPath}`
    );
    process.exit(0);
  }

  console.warn(
    'WARN: Missing APPLE_TEAM_ID; writing placeholder apple-app-site-association. ' +
      'Set APPLE_TEAM_ID=ABCDE12345 to generate a production-valid AASA.'
  );
  const placeholder = {
    applinks: { apps: [], details: [{ appID: `MISSING_TEAM_ID.${bundleId}`, paths: ['*'] }] },
  };
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(placeholder, null, 2) + '\n', 'utf8');
  process.exit(0);
}

const aasa = {
  applinks: {
    apps: [],
    details: [
      {
        appID: `${teamId}.${bundleId}`,
        paths: ['*'],
      },
    ],
  },
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(aasa, null, 2) + '\n', 'utf8');
console.log(`OK: wrote ${outPath}`);

