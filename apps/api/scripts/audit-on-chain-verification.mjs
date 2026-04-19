#!/usr/bin/env node
/**
 * On-Chain Audit Verification Script (JS) - avoids tsx/esbuild
 * Run: node scripts/audit-on-chain-verification.mjs
 * Requires: SEPOLIA_RPC_URL or RPC_URL (loads .env via dotenv)
 */

import 'dotenv/config';
import { ethers } from 'ethers';

const SEPOLIA_DEPLOYMENTS = {
  DIDRegistryV2: '0x8e5F41f2B8B3E28a8966e37181B257f9E2725bA5',
  DIDOwnershipV2: '0xac5Ad1482d73d0E09ED3960C02EebF428Ad63722',
  DIDMetadata: { proxy: '0x27965EE779822819729a662717eAC7360Eb7FCDF', impl: '0xa6000DCc4c4e3dCf17DbD35C30BAB627A3B60e28' },
  DIDService: { proxy: '0x2E9058F31127C994f01099406ff3C85d87063627', impl: '0x52223B023aa6C5B91c7027b2Ca2B0899a651F277' },
  GovernanceTimelock: '0xdD26Ade2e6432FE8356CedA5607C0b548fa5397B',
};

const ERC1967_IMPLEMENTATION_SLOT = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';

const ACCESS_CONTROL_ABI = [
  'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
  'function MINTER_ROLE() view returns (bytes32)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function getRoleAdmin(bytes32 role) view returns (bytes32)',
];

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo';
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  SEPOLIA SMART CONTRACT AUDIT - ON-CHAIN VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════\n');

  // 1. Bytecode presence check
  console.log('1. BYTECODE PRESENCE CHECK');
  console.log('──────────────────────────');
  for (const [name, addr] of Object.entries(SEPOLIA_DEPLOYMENTS)) {
    const address = typeof addr === 'object' ? addr.proxy : addr;
    const code = await provider.getCode(address);
    const hasCode = code !== '0x' && code.length > 2;
    console.log(`  ${name}: ${hasCode ? '✅ Has bytecode' : '❌ No code'}`);
  }

  // 2. Proxy implementation pointers
  console.log('\n2. PROXY → IMPLEMENTATION POINTERS');
  console.log('──────────────────────────────────');
  for (const [name, addr] of Object.entries(SEPOLIA_DEPLOYMENTS)) {
    if (typeof addr !== 'object') continue;
    const implSlot = await provider.getStorage(addr.proxy, ERC1967_IMPLEMENTATION_SLOT);
    const implAddr = '0x' + implSlot.slice(-40);
    const match = implAddr.toLowerCase() === addr.impl.toLowerCase();
    console.log(`  ${name} Proxy: ${addr.proxy}`);
    console.log(`    Expected impl: ${addr.impl}`);
    console.log(`    On-chain impl: ${implAddr} ${match ? '✅' : '❌ MISMATCH'}`);
  }

  // 3. Contract wiring
  console.log('\n3. CONTRACT WIRING');
  console.log('─────────────────');
  const regContract = new ethers.Contract(SEPOLIA_DEPLOYMENTS.DIDRegistryV2, ['function ownershipContract() view returns (address)'], provider);
  const ownContract = new ethers.Contract(SEPOLIA_DEPLOYMENTS.DIDOwnershipV2, ['function registryContract() view returns (address)'], provider);
  const registryPointsTo = await regContract.ownershipContract();
  const ownershipPointsTo = await ownContract.registryContract();

  console.log(`  DIDRegistryV2.ownershipContract → ${registryPointsTo}`);
  console.log(`    Expected: ${SEPOLIA_DEPLOYMENTS.DIDOwnershipV2}`);
  console.log(`    ${registryPointsTo.toLowerCase() === SEPOLIA_DEPLOYMENTS.DIDOwnershipV2.toLowerCase() ? '✅' : '❌ MISMATCH (circular dependency - Registry has deployer as placeholder!)'}`);
  console.log(`  DIDOwnershipV2.registryContract → ${ownershipPointsTo}`);
  console.log(`    Expected: ${SEPOLIA_DEPLOYMENTS.DIDRegistryV2}`);
  console.log(`    ${ownershipPointsTo.toLowerCase() === SEPOLIA_DEPLOYMENTS.DIDRegistryV2.toLowerCase() ? '✅' : '❌ MISMATCH'}`);

  // 4. Role holders
  console.log('\n4. ROLE HOLDERS');
  console.log('───────────────');
  const deployerAddr = '0x1F4739e229AdCb1c986C8A8b66f686ddEc29694c'.toLowerCase();

  const registryRoles = new ethers.Contract(SEPOLIA_DEPLOYMENTS.DIDRegistryV2, ACCESS_CONTROL_ABI, provider);
  const [regDefaultAdmin, regMinter] = await Promise.all([
    registryRoles.DEFAULT_ADMIN_ROLE(),
    registryRoles.MINTER_ROLE(),
  ]);
  const regAdminHasTimelock = await registryRoles.hasRole(regDefaultAdmin, SEPOLIA_DEPLOYMENTS.GovernanceTimelock);
  const regMinterHasTimelock = await registryRoles.hasRole(regMinter, SEPOLIA_DEPLOYMENTS.GovernanceTimelock);
  const regAdminHasDeployer = await registryRoles.hasRole(regDefaultAdmin, deployerAddr);

  console.log(`  DIDRegistryV2:`);
  console.log(`    Timelock has DEFAULT_ADMIN_ROLE: ${regAdminHasTimelock ? '✅' : '❌ NOT SET (governance pending!)'}`);
  console.log(`    Timelock has MINTER_ROLE: ${regMinterHasTimelock ? '✅' : '❌ NOT SET'}`);
  console.log(`    Deployer has DEFAULT_ADMIN_ROLE: ${regAdminHasDeployer ? '⚠️ Yes (will be revoked)' : 'No'}`);

  const ownershipRoles = new ethers.Contract(SEPOLIA_DEPLOYMENTS.DIDOwnershipV2, ACCESS_CONTROL_ABI, provider);
  const ownAdminHasTimelock = await ownershipRoles.hasRole(await ownershipRoles.DEFAULT_ADMIN_ROLE(), SEPOLIA_DEPLOYMENTS.GovernanceTimelock);
  console.log(`  DIDOwnershipV2: Timelock has DEFAULT_ADMIN_ROLE: ${ownAdminHasTimelock ? '✅' : '❌'}`);

  const metadataRoles = new ethers.Contract(SEPOLIA_DEPLOYMENTS.DIDMetadata.proxy, ACCESS_CONTROL_ABI, provider);
  const metaAdminHasTimelock = await metadataRoles.hasRole(await metadataRoles.DEFAULT_ADMIN_ROLE(), SEPOLIA_DEPLOYMENTS.GovernanceTimelock);
  console.log(`  DIDMetadata (proxy): Timelock has DEFAULT_ADMIN_ROLE: ${metaAdminHasTimelock ? '✅' : '❌'}`);

  const serviceRoles = new ethers.Contract(SEPOLIA_DEPLOYMENTS.DIDService.proxy, ACCESS_CONTROL_ABI, provider);
  const svcAdminHasTimelock = await serviceRoles.hasRole(await serviceRoles.DEFAULT_ADMIN_ROLE(), SEPOLIA_DEPLOYMENTS.GovernanceTimelock);
  console.log(`  DIDService (proxy): Timelock has DEFAULT_ADMIN_ROLE: ${svcAdminHasTimelock ? '✅' : '❌'}`);

  // 5. UUPS Metadata/Service registry/ownership refs
  console.log('\n5. UUPS CONTRACT REFERENCES');
  console.log('────────────────────────────');
  const metaRefs = new ethers.Contract(SEPOLIA_DEPLOYMENTS.DIDMetadata.proxy, [
    'function registryContract() view returns (address)',
    'function ownershipContract() view returns (address)',
  ], provider);
  const [metaReg, metaOwn] = await Promise.all([metaRefs.registryContract(), metaRefs.ownershipContract()]);
  console.log(`  DIDMetadata: registry=${metaReg}, ownership=${metaOwn}`);
  console.log(`    Expected registry: ${SEPOLIA_DEPLOYMENTS.DIDRegistryV2} ${metaReg.toLowerCase() === SEPOLIA_DEPLOYMENTS.DIDRegistryV2.toLowerCase() ? '✅' : '❌'}`);
  console.log(`    Expected ownership: ${SEPOLIA_DEPLOYMENTS.DIDOwnershipV2} ${metaOwn.toLowerCase() === SEPOLIA_DEPLOYMENTS.DIDOwnershipV2.toLowerCase() ? '✅' : '❌'}`);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  VERIFICATION COMPLETE');
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
