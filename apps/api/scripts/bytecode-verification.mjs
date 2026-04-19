#!/usr/bin/env node
/**
 * Bytecode Verification Script
 * Compares compiled bytecode (from Hardhat artifacts) with on-chain bytecode.
 *
 * Run: npx hardhat compile && node scripts/bytecode-verification.mjs
 * Requires: SEPOLIA_RPC_URL or RPC_URL (for on-chain fetch)
 *
 * If RPC is unavailable/rate-limited, run with --offline to only print compiled bytecode hashes.
 */

import { ethers } from 'ethers';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SEPOLIA_DEPLOYMENTS = {
  DIDRegistryV2: '0x8e5F41f2B8B3E28a8966e37181B257f9E2725bA5',
  DIDOwnershipV2: '0xac5Ad1482d73d0E09ED3960C02EebF428Ad63722',
  DIDMetadata: { impl: '0xa6000DCc4c4e3dCf17DbD35C30BAB627A3B60e28' },
  DIDService: { impl: '0x52223B023aa6C5B91c7027b2Ca2B0899a651F277' },
};

function loadArtifact(contractName) {
  const base = join(__dirname, '../artifacts/src/contracts');
  const paths = [
    join(base, `${contractName}.sol/${contractName}.json`),
    join(base, `${contractName}V2.sol/${contractName}V2.json`),
  ];
  for (const p of paths) {
    if (existsSync(p)) {
      return JSON.parse(readFileSync(p, 'utf-8'));
    }
  }
  return null;
}

function normalizeBytecode(code) {
  if (!code || typeof code !== 'string') return '';
  return code.replace(/^0x/, '').replace(/a264[\dA-Fa-f]{4}/g, 'a2640000'); // Ignore metadata hash
}

function bytecodeHash(code) {
  const normalized = normalizeBytecode(code);
  return ethers.keccak256('0x' + normalized);
}

async function main() {
  const offline = process.argv.includes('--offline');
  const rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.RPC_URL || '';

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  BYTECODE VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════\n');

  const contracts = [
    { name: 'DIDRegistryV2', artifact: 'DIDRegistryV2', address: SEPOLIA_DEPLOYMENTS.DIDRegistryV2 },
    { name: 'DIDOwnershipV2', artifact: 'DIDOwnershipV2', address: SEPOLIA_DEPLOYMENTS.DIDOwnershipV2 },
    { name: 'DIDMetadata (impl)', artifact: 'DIDMetadata', address: SEPOLIA_DEPLOYMENTS.DIDMetadata.impl },
    { name: 'DIDService (impl)', artifact: 'DIDService', address: SEPOLIA_DEPLOYMENTS.DIDService.impl },
  ];

  for (const c of contracts) {
    const artifact = loadArtifact(c.artifact);
    if (!artifact) {
      console.log(`  ${c.name}: ⚠️  Artifact not found (run: npx hardhat compile)`);
      continue;
    }
    const compiled = artifact.deployedBytecode || artifact.bytecode || '';
    const compiledHash = bytecodeHash(compiled);
    console.log(`  ${c.name}:`);
    console.log(`    Compiled bytecode hash: ${compiledHash}`);

    if (!offline && rpcUrl) {
      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const onChain = await provider.getCode(c.address);
        const onChainHash = bytecodeHash(onChain);
        const match = compiledHash === onChainHash;
        console.log(`    On-chain bytecode hash:  ${onChainHash}`);
        console.log(`    Match: ${match ? '✅' : '❌ MISMATCH'}`);
      } catch (err) {
        console.log(`    On-chain: ❌ ${err.message || err}`);
      }
    } else if (offline) {
      console.log(`    (On-chain check skipped --offline)`);
    } else {
      console.log(`    (On-chain check skipped: set SEPOLIA_RPC_URL or RPC_URL)`);
    }
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
