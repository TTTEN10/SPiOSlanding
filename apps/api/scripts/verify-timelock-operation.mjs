#!/usr/bin/env node
/**
 * Verify Timelock operation state and Metadata/Service wiring.
 * Run: node scripts/verify-timelock-operation.mjs (from apps/api)
 * Requires: SEPOLIA_RPC_URL or RPC_URL
 *
 * Explains TimelockUnexpectedOperationState: operation not ready, already done, or wrong predecessor.
 */

import 'dotenv/config';
import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const TIMELOCK_ABI = [
  'function hashOperationBatch(address[] targets, uint256[] values, bytes[] payloads, bytes32 predecessor, bytes32 salt) view returns (bytes32)',
  'function isOperation(bytes32 id) view returns (bool)',
  'function isOperationPending(bytes32 id) view returns (bool)',
  'function isOperationReady(bytes32 id) view returns (bool)',
  'function isOperationDone(bytes32 id) view returns (bool)',
  'function getTimestamp(bytes32 id) view returns (uint256)',
];

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.RPC_URL || '';
  if (!rpcUrl) {
    console.error('Required: SEPOLIA_RPC_URL or RPC_URL');
    process.exit(1);
  }

  const proposalPath = join(__dirname, '../deployments/metadata-service-upgrade-proposal.json');
  const proposal = JSON.parse(readFileSync(proposalPath, 'utf-8'));

  const targets = proposal.individualCalls.map((c) => c.target);
  const values = proposal.individualCalls.map(() => 0n);
  const payloads = proposal.individualCalls.map((c) => c.data);
  const predecessor = ethers.ZeroHash;
  const salt = proposal.salt;

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const timelock = new ethers.Contract(proposal.timelock, TIMELOCK_ABI, provider);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  TIMELOCK OPERATION VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════\n');

  const opId = await timelock.hashOperationBatch(targets, values, payloads, predecessor, salt);
  console.log('Operation ID:', opId);

  const [isOp, isPending, isReady, isDone, timestamp] = await Promise.all([
    timelock.isOperation(opId),
    timelock.isOperationPending(opId),
    timelock.isOperationReady(opId),
    timelock.isOperationDone(opId),
    timelock.getTimestamp(opId).catch(() => 0n),
  ]);

  console.log('  isOperation:      ', isOp);
  console.log('  isOperationPending:', isPending);
  console.log('  isOperationReady: ', isReady);
  console.log('  isOperationDone:   ', isDone);
  if (timestamp > 0n) {
    const readyAt = new Date(Number(timestamp) * 1000);
    console.log('  executeAfter:      ', readyAt.toISOString());
  }

  if (isDone) {
    console.log('\n✅ Operation already executed. Metadata/Service should be migrated.');
  } else if (isReady) {
    console.log('\n✅ Operation READY. Run: node scripts/execute-timelock-batch.mjs');
  } else if (isPending) {
    console.log('\n⏳ Operation PENDING. Wait until executeAfter, then run execute-timelock-batch.mjs');
  } else {
    console.log('\n❓ Operation not found or unexpected state. TimelockUnexpectedOperationState may mean: already done, wrong salt, or delay not passed.');
  }

  // Quick Metadata/Service wiring check
  console.log('\n3. METADATA/SERVICE WIRING');
  console.log('──────────────────────────');
  const abi = ['function registryContract() view returns (address)', 'function ownershipContract() view returns (address)'];
  const meta = new ethers.Contract('0x27965EE779822819729a662717eAC7360Eb7FCDF', abi, provider);
  const svc = new ethers.Contract('0x2E9058F31127C994f01099406ff3C85d87063627', abi, provider);
  const [mr, mo, sr, so] = await Promise.all([meta.registryContract(), meta.ownershipContract(), svc.registryContract(), svc.ownershipContract()]);
  const expectedReg = proposal.newRegistry.toLowerCase();
  const expectedOwn = proposal.newOwnership.toLowerCase();

  console.log('  Metadata registry:  ', mr, mr.toLowerCase() === expectedReg ? '✅' : '❌');
  console.log('  Metadata ownership: ', mo, mo.toLowerCase() === expectedOwn ? '✅' : '❌');
  console.log('  Service registry:   ', sr, sr.toLowerCase() === expectedReg ? '✅' : '❌');
  console.log('  Service ownership:  ', so, so.toLowerCase() === expectedOwn ? '✅' : '❌');

  const migrated = [mr, mo, sr, so].every((a) => a.toLowerCase() === expectedReg || a.toLowerCase() === expectedOwn);
  console.log('\n  Migration status:', migrated ? '✅ MIGRATED' : '⏳ PENDING');

  console.log('\n═══════════════════════════════════════════════════════════\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
