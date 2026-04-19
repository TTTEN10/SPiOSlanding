#!/usr/bin/env node
/**
 * Setup governance roles for new Registry and Ownership.
 * Run: node scripts/setup-governance.mjs (from apps/api)
 * Reads addresses from deployments/sepolia-latest.json
 */

import 'dotenv/config';
import { ethers } from 'ethers';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ABI = [
  'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
  'function MINTER_ROLE() view returns (bytes32)',
  'function grantRole(bytes32 role, address account)',
  'function revokeRole(bytes32 role, address account)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
];

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.RPC_URL || '';
  const privateKey = process.env.PRIVATE_KEY || process.env.DID_BACKEND_SIGNER_PRIVATE_KEY || '';

  if (!privateKey || !rpcUrl) {
    console.error('Required: PRIVATE_KEY and SEPOLIA_RPC_URL');
    process.exit(1);
  }

  const regPath = join(__dirname, '../deployments/sepolia-latest.json');
  const reg = JSON.parse(readFileSync(regPath, 'utf-8'));
  const timelock = reg.contracts?.GovernanceTimelock?.address || '0xdD26Ade2e6432FE8356CedA5607C0b548fa5397B';
  const registryAddr = reg.contracts?.DIDRegistryV2?.address;
  const ownershipAddr = reg.contracts?.DIDOwnershipV2?.address;
  const metadataAddr = reg.contracts?.DIDMetadata?.proxy;
  const serviceAddr = reg.contracts?.DIDService?.proxy;

  if (!registryAddr || !ownershipAddr) {
    console.error('Registry or Ownership not in deployment registry');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  SETUP GOVERNANCE');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`Timelock: ${timelock}`);
  console.log(`Registry: ${registryAddr}`);
  console.log(`Ownership: ${ownershipAddr}`);
  console.log(`Deployer: ${wallet.address}\n`);

  const registry = new ethers.Contract(registryAddr, ABI, wallet);
  const ownership = new ethers.Contract(ownershipAddr, ABI, wallet);

  // DIDRegistryV2
  console.log('1. DIDRegistryV2...');
  const deployerHasRegAdmin = await registry.hasRole(await registry.DEFAULT_ADMIN_ROLE(), wallet.address);
  if (!deployerHasRegAdmin) {
    console.log('   ⚠️  Deployer has no admin, skipping');
  } else {
    await (await registry.grantRole(await registry.DEFAULT_ADMIN_ROLE(), timelock)).wait();
    await (await registry.grantRole(await registry.MINTER_ROLE(), timelock)).wait();
    await (await registry.revokeRole(await registry.DEFAULT_ADMIN_ROLE(), wallet.address)).wait();
    await (await registry.revokeRole(await registry.MINTER_ROLE(), wallet.address)).wait();
    console.log('   ✅ Roles transferred to Timelock');
  }

  // DIDOwnershipV2
  console.log('2. DIDOwnershipV2...');
  const deployerHasOwnAdmin = await ownership.hasRole(await ownership.DEFAULT_ADMIN_ROLE(), wallet.address);
  if (!deployerHasOwnAdmin) {
    console.log('   ⚠️  Deployer has no admin, skipping');
  } else {
    await (await ownership.grantRole(await ownership.DEFAULT_ADMIN_ROLE(), timelock)).wait();
    await (await ownership.revokeRole(await ownership.DEFAULT_ADMIN_ROLE(), wallet.address)).wait();
    console.log('   ✅ Roles transferred to Timelock');
  }

  if (metadataAddr && serviceAddr) {
    console.log('3. DIDMetadata & DIDService: Timelock already has admin (skip)');
  }

  const outPath = join(__dirname, '../deployments/governance-sepolia.json');
  writeFileSync(outPath, JSON.stringify({
    network: 'sepolia',
    timestamp: new Date().toISOString(),
    timelock,
    registry: registryAddr,
    ownership: ownershipAddr,
  }, null, 2));
  console.log(`\n📝 Saved ${outPath}`);
  console.log('\n═══════════════════════════════════════════════════════════\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
