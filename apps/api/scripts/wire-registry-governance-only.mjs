#!/usr/bin/env node
/**
 * Wire governance on DIDRegistryV2 only: grant DEFAULT_ADMIN_ROLE and MINTER_ROLE to Timelock,
 * then revoke from deployer. Use when setup-governance was skipped for Registry (deployer lacked admin)
 * but deployer now has admin (e.g. after fix-sepolia-ownership).
 *
 * Run from apps/api: node scripts/wire-registry-governance-only.mjs
 * Requires: PRIVATE_KEY or DID_BACKEND_SIGNER_PRIVATE_KEY, SEPOLIA_RPC_URL or RPC_URL
 */

import 'dotenv/config';
import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const REGISTRY_ABI = [
  'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
  'function MINTER_ROLE() view returns (bytes32)',
  'function grantRole(bytes32 role, address account)',
  'function revokeRole(bytes32 role, address account)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
];

const TIMELOCK_ADDRESS = '0xdD26Ade2e6432FE8356CedA5607C0b548fa5397B';
const REGISTRY_ADDRESS = '0x8e5F41f2B8B3E28a8966e37181B257f9E2725bA5';

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.RPC_URL || '';
  const privateKey = process.env.PRIVATE_KEY || process.env.DID_BACKEND_SIGNER_PRIVATE_KEY || '';

  if (!privateKey || !rpcUrl) {
    console.error('Required: PRIVATE_KEY (or DID_BACKEND_SIGNER_PRIVATE_KEY) and SEPOLIA_RPC_URL (or RPC_URL)');
    process.exit(1);
  }

  // Optional: read from deployment registry
  let registryAddr = REGISTRY_ADDRESS;
  let timelockAddr = TIMELOCK_ADDRESS;
  try {
    const regPath = join(__dirname, '../deployments/sepolia-latest.json');
    const reg = JSON.parse(readFileSync(regPath, 'utf-8'));
    if (reg.contracts?.DIDRegistryV2?.address) registryAddr = reg.contracts.DIDRegistryV2.address;
    if (reg.contracts?.GovernanceTimelock?.address) timelockAddr = reg.contracts.GovernanceTimelock.address;
  } catch (_) {}

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const registry = new ethers.Contract(registryAddr, REGISTRY_ABI, wallet);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  WIRE DIDRegistryV2 GOVERNANCE ONLY');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`Registry: ${registryAddr}`);
  console.log(`Timelock: ${timelockAddr}`);
  console.log(`Deployer: ${wallet.address}\n`);

  const defaultAdmin = await registry.DEFAULT_ADMIN_ROLE();
  const minterRole = await registry.MINTER_ROLE();
  const deployerHasAdmin = await registry.hasRole(defaultAdmin, wallet.address);
  const timelockHasAdmin = await registry.hasRole(defaultAdmin, timelockAddr);
  const timelockHasMinter = await registry.hasRole(minterRole, timelockAddr);

  if (timelockHasAdmin && timelockHasMinter) {
    console.log('✅ Timelock already has DEFAULT_ADMIN_ROLE and MINTER_ROLE on DIDRegistryV2. Nothing to do.');
    process.exit(0);
  }

  if (!deployerHasAdmin) {
    console.error('❌ Deployer does not have DEFAULT_ADMIN_ROLE on DIDRegistryV2. Cannot wire. Grant roles manually from the current admin.');
    process.exit(1);
  }

  if (!timelockHasAdmin) {
    console.log('Granting DEFAULT_ADMIN_ROLE to Timelock...');
    await (await registry.grantRole(defaultAdmin, timelockAddr)).wait();
    console.log('  ✅ DEFAULT_ADMIN_ROLE granted');
  }
  if (!timelockHasMinter) {
    console.log('Granting MINTER_ROLE to Timelock...');
    await (await registry.grantRole(minterRole, timelockAddr)).wait();
    console.log('  ✅ MINTER_ROLE granted');
  }

  if (await registry.hasRole(defaultAdmin, wallet.address)) {
    console.log('Revoking DEFAULT_ADMIN_ROLE from deployer...');
    await (await registry.revokeRole(defaultAdmin, wallet.address)).wait();
    console.log('  ✅ Revoked');
  }
  if (await registry.hasRole(minterRole, wallet.address)) {
    console.log('Revoking MINTER_ROLE from deployer...');
    await (await registry.revokeRole(minterRole, wallet.address)).wait();
    console.log('  ✅ Revoked');
  }

  console.log('\n✅ DIDRegistryV2 governance wiring complete. Timelock now holds DEFAULT_ADMIN_ROLE and MINTER_ROLE.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
