#!/usr/bin/env node
/**
 * Prepares Metadata/Service upgrade: deploys new implementations and outputs
 * Timelock calldata for the Governance Safe to propose.
 *
 * Run: node scripts/prepare-metadata-service-upgrade.mjs (from apps/api)
 * Requires: PRIVATE_KEY, SEPOLIA_RPC_URL
 *
 * After running: Create a proposal in the Governance Safe with the output calldata.
 */

import 'dotenv/config';
import { ethers } from 'ethers';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const METADATA_PROXY = '0x27965EE779822819729a662717eAC7360Eb7FCDF';
const SERVICE_PROXY = '0x2E9058F31127C994f01099406ff3C85d87063627';
const NEW_REGISTRY = '0x8e5F41f2B8B3E28a8966e37181B257f9E2725bA5';
const NEW_OWNERSHIP = '0xac5Ad1482d73d0E09ED3960C02EebF428Ad63722';
const TIMELOCK = '0xdD26Ade2e6432FE8356CedA5607C0b548fa5397B';

function loadArtifact(name) {
  const p = join(__dirname, `../artifacts/src/contracts/${name}.sol/${name}.json`);
  if (existsSync(p)) {
    return JSON.parse(readFileSync(p, 'utf-8'));
  }
  throw new Error(`Artifact not found: ${name}`);
}

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.RPC_URL || '';
  const privateKey = process.env.PRIVATE_KEY || process.env.DID_BACKEND_SIGNER_PRIVATE_KEY || '';

  if (!privateKey || !rpcUrl) {
    console.error('Required: PRIVATE_KEY and SEPOLIA_RPC_URL');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  PREPARE METADATA/SERVICE UPGRADE');
  console.log('═══════════════════════════════════════════════════════════\n');

  const metaArt = loadArtifact('DIDMetadata');
  const svcArt = loadArtifact('DIDService');

  console.log('1. Deploying new DIDMetadata implementation...');
  const metaImpl = await (new ethers.ContractFactory(metaArt.abi, metaArt.bytecode, wallet)).deploy();
  await metaImpl.waitForDeployment();
  const metaImplAddr = await metaImpl.getAddress();
  console.log(`   ✅ ${metaImplAddr}`);

  console.log('2. Deploying new DIDService implementation...');
  const svcImpl = await (new ethers.ContractFactory(svcArt.abi, svcArt.bytecode, wallet)).deploy();
  await svcImpl.waitForDeployment();
  const svcImplAddr = await svcImpl.getAddress();
  console.log(`   ✅ ${svcImplAddr}`);

  const iface = new ethers.Interface([
    'function upgradeToAndCall(address,bytes)',
    'function setRegistryContract(address)',
    'function setOwnershipContract(address)',
  ]);

  const calls = [
    { target: METADATA_PROXY, data: iface.encodeFunctionData('upgradeToAndCall', [metaImplAddr, '0x']) },
    { target: METADATA_PROXY, data: iface.encodeFunctionData('setRegistryContract', [NEW_REGISTRY]) },
    { target: METADATA_PROXY, data: iface.encodeFunctionData('setOwnershipContract', [NEW_OWNERSHIP]) },
    { target: SERVICE_PROXY, data: iface.encodeFunctionData('upgradeToAndCall', [svcImplAddr, '0x']) },
    { target: SERVICE_PROXY, data: iface.encodeFunctionData('setRegistryContract', [NEW_REGISTRY]) },
    { target: SERVICE_PROXY, data: iface.encodeFunctionData('setOwnershipContract', [NEW_OWNERSHIP]) },
  ];

  const salt = ethers.keccak256(ethers.toUtf8Bytes('metadata-service-upgrade-' + Date.now()));
  const timelockIface = new ethers.Interface([
    'function scheduleBatch(address[] targets, uint256[] values, bytes[] payloads, bytes32 predecessor, bytes32 salt)',
  ]);
  const scheduleBatchData = timelockIface.encodeFunctionData('scheduleBatch', [
    calls.map((c) => c.target),
    calls.map(() => 0n),
    calls.map((c) => c.data),
    ethers.ZeroHash,
    salt,
  ]);

  const outPath = join(__dirname, '../deployments/metadata-service-upgrade-proposal.json');
  writeFileSync(outPath, JSON.stringify({
    metadataImpl: metaImplAddr,
    serviceImpl: svcImplAddr,
    newRegistry: NEW_REGISTRY,
    newOwnership: NEW_OWNERSHIP,
    timelock: TIMELOCK,
    salt,
    scheduleBatchTx: {
      to: TIMELOCK,
      value: '0',
      data: scheduleBatchData,
    },
    individualCalls: calls.map((c, i) => ({
      index: i + 1,
      target: c.target,
      value: '0',
      data: c.data,
    })),
    instructions: [
      '1. Go to Governance Safe: https://app.safe.global/home?safe=eth:11155111:0x8644F9AaB59C411AAE7E397aDEAc44a1dc34fCb1',
      '2. Create new transaction → Contract interaction',
      '3. To: ' + TIMELOCK,
      '4. Data: (use scheduleBatchTx.data from this JSON)',
      '5. Value: 0',
      '6. After 3-of-5 signers approve, execute. Timelock will schedule (1h delay).',
      '7. After 1 hour, execute the Timelock operation (executeBatch with the same targets/values/payloads).',
    ],
  }, null, 2));
  console.log(`\n📝 Proposal saved to ${outPath}`);

  const regPath = join(__dirname, '../deployments/sepolia-latest.json');
  const reg = JSON.parse(readFileSync(regPath, 'utf-8'));
  reg.contracts.DIDMetadata.implementation = metaImplAddr;
  reg.contracts.DIDService.implementation = svcImplAddr;
  reg.timestamp = new Date().toISOString();
  writeFileSync(regPath, JSON.stringify(reg, null, 2));
  console.log('   Updated sepolia-latest.json with new impl addresses');

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  NEXT: Create proposal in Governance Safe (3-of-5 signatures)');
  console.log('  See metadata-service-upgrade-proposal.json for calldata');
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
