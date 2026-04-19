#!/usr/bin/env node
/**
 * Execute the scheduled Timelock batch (Metadata/Service upgrade + setRegistry/setOwnership).
 * Run 1 hour after scheduleBatch was executed.
 *
 * Run: node scripts/execute-timelock-batch.mjs (from apps/api)
 * Requires: SEPOLIA_RPC_URL or RPC_URL, PRIVATE_KEY or DID_BACKEND_SIGNER_PRIVATE_KEY
 *
 * If TimelockUnexpectedOperationState: the 1h delay has not passed yet. Retry after executeBatchReadyAfter.
 */

import 'dotenv/config';
import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.RPC_URL || '';
  const privateKey = process.env.PRIVATE_KEY || process.env.DID_BACKEND_SIGNER_PRIVATE_KEY || '';

  if (!rpcUrl) {
    console.error('Required: SEPOLIA_RPC_URL or RPC_URL');
    process.exit(1);
  }

  const proposalPath = join(__dirname, '../deployments/metadata-service-upgrade-proposal.json');
  const proposal = JSON.parse(readFileSync(proposalPath, 'utf-8'));

  const targets = proposal.individualCalls.map((c) => c.target);
  const values = proposal.individualCalls.map(() => 0n);
  const payloads = proposal.individualCalls.map((c) => c.data);

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  if (!privateKey) {
    console.error('Required: PRIVATE_KEY or DID_BACKEND_SIGNER_PRIVATE_KEY (execution is permissionless but needs gas)');
    process.exit(1);
  }
  const wallet = new ethers.Wallet(privateKey, provider);

  const timelock = new ethers.Contract(
    proposal.timelock,
    ['function executeBatch(address[] targets, uint256[] values, bytes[] payloads, bytes32 predecessor, bytes32 salt)'],
    wallet
  );

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  EXECUTE TIMELOCK BATCH');
  console.log('═══════════════════════════════════════════════════════════\n');

  const tx = await timelock.executeBatch(targets, values, payloads, ethers.ZeroHash, proposal.salt);
  console.log('Transaction:', tx.hash);
  await tx.wait();
  console.log('✅ Batch executed successfully');
  console.log('\nMetadata and Service now point to new Registry and Ownership.');
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch((e) => {
  if (e.shortMessage?.includes('TimelockUnexpectedOperationState') || e.info?.error?.data?.startsWith('0xe2517d3f')) {
    console.error('\n⏳ TimelockUnexpectedOperationState: 1h delay has not passed yet.');
    console.error('   Retry after executeBatchReadyAfter in metadata-service-upgrade-proposal.json');
    console.error('   Or execute from Safe: use executeBatchTx.data in the proposal.\n');
  }
  console.error(e);
  process.exit(1);
});
