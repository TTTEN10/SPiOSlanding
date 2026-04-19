/**
 * Migration Script: Fix DIDRegistryV2.ownershipContract on Sepolia
 *
 * The original deployment had Registry.ownershipContract pointing to deployer (EOA)
 * due to circular dependency. This script deploys new Registry+Ownership with
 * correct cross-references using the two-phase deploy (Ownership.setRegistryContract).
 *
 * Prerequisites:
 * - PRIVATE_KEY or DID_BACKEND_SIGNER_PRIVATE_KEY
 * - SEPOLIA_RPC_URL or RPC_URL
 *
 * After running:
 * - Update Metadata and Service to point to new Registry/Ownership via setRegistryContract/setOwnershipContract
 * - Deploy new Metadata and Service implementations (with setters), upgrade proxies, then call setters
 * - Run setup-governance if needed
 *
 * Usage: npx tsx src/contracts/scripts/fix-sepolia-ownership.ts
 */

import 'dotenv/config';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function loadContractArtifact(contractName: string): Promise<{ abi: any[]; bytecode: string }> {
  const artifactsBase = path.join(__dirname, '../../../artifacts/src/contracts');
  const v2Path = path.join(artifactsBase, `${contractName}V2.sol/${contractName}V2.json`);
  if (fs.existsSync(v2Path)) {
    const artifact = JSON.parse(fs.readFileSync(v2Path, 'utf-8'));
    return { abi: artifact.abi, bytecode: artifact.bytecode };
  }
  throw new Error(`Artifact not found: ${v2Path}`);
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

  // Step 1: Deploy Ownership with address(0)
  console.log('\n1. Deploying DIDOwnershipV2 with placeholder...');
  const ownershipArtifact = await loadContractArtifact('DIDOwnership');
  const ownershipFactory = new ethers.ContractFactory(
    ownershipArtifact.abi,
    ownershipArtifact.bytecode,
    wallet
  );
  const ownership = await ownershipFactory.deploy(ethers.ZeroAddress, wallet.address);
  await ownership.waitForDeployment();
  const ownershipAddr = await ownership.getAddress();
  const ownershipTx = ownership.deploymentTransaction();
  const ownershipInterface = new ethers.Contract(ownershipAddr, ownershipArtifact.abi, wallet);
  console.log(`   ✅ DIDOwnershipV2: ${ownershipAddr}`);

  // Step 2: Deploy Registry with Ownership
  console.log('\n2. Deploying DIDRegistryV2 with Ownership address...');
  const registryArtifact = await loadContractArtifact('DIDRegistry');
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
  const registryInterface = new ethers.Contract(registryAddr, registryArtifact.abi, wallet);
  console.log(`   ✅ DIDRegistryV2: ${registryAddr}`);

  // Step 3: Set Registry on Ownership
  console.log('\n3. Wiring Ownership.registryContract to Registry...');
  const tx = await ownershipInterface.setRegistryContract(registryAddr);
  await tx.wait();
  console.log('   ✅ Ownership.registryContract set');

  // Verify
  const regOwnership = await registryInterface.ownershipContract();
  const ownRegistry = await ownershipInterface.registryContract();
  console.log('\n4. Verification:');
  console.log(`   Registry.ownershipContract → ${regOwnership} ${regOwnership === ownershipAddr ? '✅' : '❌'}`);
  console.log(`   Ownership.registryContract → ${ownRegistry} ${ownRegistry === registryAddr ? '✅' : '❌'}`);

  // Update deployment registry
  const deploymentsPath = path.join(__dirname, '../../../../deployments/sepolia-latest.json');
  let registryData: any = {};
  if (fs.existsSync(deploymentsPath)) {
    registryData = JSON.parse(fs.readFileSync(deploymentsPath, 'utf-8'));
  }
  registryData.contracts = registryData.contracts || {};
  registryData.contracts.DIDOwnershipV2 = {
    address: ownershipAddr,
    tx: ownershipTx?.hash || '',
    block: (await ownershipTx?.wait())?.blockNumber || 0,
  };
  registryData.contracts.DIDRegistryV2 = {
    address: registryAddr,
    tx: registryTx?.hash || '',
    block: (await registryTx?.wait())?.blockNumber || 0,
  };
  registryData.timestamp = new Date().toISOString();
  fs.writeFileSync(deploymentsPath, JSON.stringify(registryData, null, 2));
  console.log(`\n   📝 Updated ${deploymentsPath}`);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  NEXT STEPS:');
  console.log('  1. Upgrade DIDMetadata and DIDService to new implementations (with setRegistryContract/setOwnershipContract)');
  console.log('  2. Call setRegistryContract and setOwnershipContract on Metadata and Service proxies');
  console.log('  3. Run setup-governance to transfer roles to Timelock');
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
