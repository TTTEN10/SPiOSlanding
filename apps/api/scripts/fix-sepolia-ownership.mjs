#!/usr/bin/env node
/**
 * Migration Script: Fix DIDRegistryV2.ownershipContract on Sepolia
 * Run: node scripts/fix-sepolia-ownership.mjs (from apps/api)
 * Requires: PRIVATE_KEY, SEPOLIA_RPC_URL or RPC_URL
 */

import 'dotenv/config';
import { ethers } from 'ethers';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadContractArtifact(contractName) {
  const base = join(__dirname, '../artifacts/src/contracts');
  const v2Path = join(base, `${contractName}V2.sol/${contractName}V2.json`);
  if (existsSync(v2Path)) {
    const artifact = JSON.parse(readFileSync(v2Path, 'utf-8'));
    return { abi: artifact.abi, bytecode: artifact.bytecode };
  }
  throw new Error(`Artifact not found: ${v2Path}. Run: npx hardhat compile`);
}

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.RPC_URL || '';
  const privateKey = process.env.PRIVATE_KEY || process.env.DID_BACKEND_SIGNER_PRIVATE_KEY || '';

  if (!privateKey || !rpcUrl) {
    console.error('Required: PRIVATE_KEY and SEPOLIA_RPC_URL (or RPC_URL)');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  FIX SEPOLIA: Deploy Registry+Ownership with correct wiring');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`Deployer: ${wallet.address}`);

  console.log('\n1. Deploying DIDOwnershipV2 with placeholder...');
  const ownershipArtifact = loadContractArtifact('DIDOwnership');
  const ownershipFactory = new ethers.ContractFactory(
    ownershipArtifact.abi,
    ownershipArtifact.bytecode,
    wallet
  );
  const ownership = await ownershipFactory.deploy(ethers.ZeroAddress, wallet.address);
  await ownership.waitForDeployment();
  const ownershipAddr = await ownership.getAddress();
  const ownershipTx = ownership.deploymentTransaction();
  const ownershipReceipt = await ownershipTx?.wait();
  console.log(`   ✅ DIDOwnershipV2: ${ownershipAddr}`);

  console.log('\n2. Deploying DIDRegistryV2 with Ownership address...');
  const registryArtifact = loadContractArtifact('DIDRegistry');
  const registryFactory = new ethers.ContractFactory(
    registryArtifact.abi,
    registryArtifact.bytecode,
    wallet
  );
  const registry = await registryFactory.deploy(
    'SafePsy DID Identity',
    'SAFEPSY-DID',
    ownershipAddr,
    wallet.address
  );
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  const registryTx = registry.deploymentTransaction();
  const registryReceipt = await registryTx?.wait();
  console.log(`   ✅ DIDRegistryV2: ${registryAddr}`);

  console.log('\n3. Wiring Ownership.registryContract to Registry...');
  const tx = await ownership.setRegistryContract(registryAddr);
  await tx.wait();
  console.log('   ✅ Ownership.registryContract set');

  const regOwnership = await registry.ownershipContract();
  const ownRegistry = await ownership.registryContract();
  console.log('\n4. Verification:');
  console.log(`   Registry.ownershipContract → ${regOwnership} ${regOwnership === ownershipAddr ? '✅' : '❌'}`);
  console.log(`   Ownership.registryContract → ${ownRegistry} ${ownRegistry === registryAddr ? '✅' : '❌'}`);

  const deploymentsPath = join(__dirname, '../deployments/sepolia-latest.json');
  let registryData = {};
  if (existsSync(deploymentsPath)) {
    registryData = JSON.parse(readFileSync(deploymentsPath, 'utf-8'));
  }
  registryData.contracts = registryData.contracts || {};
  registryData.contracts.DIDOwnershipV2 = {
    address: ownershipAddr,
    tx: ownershipTx?.hash || '',
    block: ownershipReceipt?.blockNumber || 0,
  };
  registryData.contracts.DIDRegistryV2 = {
    address: registryAddr,
    tx: registryTx?.hash || '',
    block: registryReceipt?.blockNumber || 0,
  };
  registryData.timestamp = new Date().toISOString();
  writeFileSync(deploymentsPath, JSON.stringify(registryData, null, 2));
  console.log(`\n   📝 Updated ${deploymentsPath}`);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  NEXT STEPS:');
  console.log('  1. Call setRegistryContract/setOwnershipContract on Metadata and Service proxies');
  console.log('  2. Run setup-governance to transfer roles to Timelock');
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
