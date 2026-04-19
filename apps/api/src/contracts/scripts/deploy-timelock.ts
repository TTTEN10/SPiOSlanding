/**
 * Deployment script for GovernanceTimelock contract
 * 
 * Features:
 * - Deploys GovernanceTimelock with proper configuration
 * - Idempotent (checks existing deployments)
 * - Validates Safe addresses
 * 
 * Usage:
 *   yarn deploy:timelock --network sepolia
 *   npx tsx src/contracts/scripts/deploy-timelock.ts --network sepolia
 * 
 * Environment variables:
 *   - PRIVATE_KEY: Deployer private key
 *   - RPC_URL: RPC endpoint URL
 *   - NETWORK: Network name (default: localhost)
 *   - GOVERNANCE_SAFE: Governance Safe address (required)
 *   - TIMELOCK_MIN_DELAY: Minimum delay in seconds (default: 3600 for testing, 259200 for production)
 */

import 'dotenv/config';
import { ethers } from 'ethers';
import { DeploymentConfig, DeploymentResult } from './types.js';
import {
  isContractDeployed,
  getContractDeployment,
  updateDeploymentRegistry,
  getChainId,
  readDeploymentRegistry,
} from './deployment-registry.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Network chain IDs
const NETWORK_CHAIN_IDS: Record<string, number> = {
  localhost: 1337,
  hardhat: 1337,
  sepolia: 11155111,
  mainnet: 1,
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load contract artifact from Hardhat compilation
 */
async function loadContractArtifact(contractName: string): Promise<{
  abi: any[];
  bytecode: string;
}> {
  const artifactsBase = path.join(__dirname, '../../../artifacts/src/contracts');
  
  // Try governance subdirectory first
  const governancePath = path.join(artifactsBase, `governance/${contractName}.sol/${contractName}.json`);
  if (fs.existsSync(governancePath)) {
    const artifact = JSON.parse(fs.readFileSync(governancePath, 'utf-8'));
    return {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
    };
  }
  
  // Try root contracts directory
  const rootPath = path.join(artifactsBase, `${contractName}.sol/${contractName}.json`);
  if (fs.existsSync(rootPath)) {
    const artifact = JSON.parse(fs.readFileSync(rootPath, 'utf-8'));
    return {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
    };
  }
  
  throw new Error(
    `Failed to load contract artifact for ${contractName}. ` +
    `Tried: ${governancePath} and ${rootPath}. ` +
    `Make sure contracts are compiled first: npx hardhat compile`
  );
}

/**
 * Get Safe addresses from registry
 */
function getSafeAddresses(network: string): { governanceSafe: string; emergencySafe: string } {
  const safeRegistryPath = path.join(__dirname, '../../../deployments/safe-addresses-registry.json');
  
  if (!fs.existsSync(safeRegistryPath)) {
    throw new Error('Safe addresses registry not found. Expected: apps/api/deployments/safe-addresses-registry.json');
  }
  
  const chainId = NETWORK_CHAIN_IDS[network] || getChainId(network);
  const registry = JSON.parse(fs.readFileSync(safeRegistryPath, 'utf-8'));
  
  const governanceSafe = registry.find((entry: any) => 
    entry.name === 'Gov Safe' && entry.chainId === chainId
  );
  const emergencySafe = registry.find((entry: any) => 
    entry.name === 'Emergency Safe' && entry.chainId === chainId
  );
  
  if (!governanceSafe) {
    throw new Error(`Governance Safe address not found for network ${network} (chainId: ${chainId})`);
  }
  if (!emergencySafe) {
    throw new Error(`Emergency Safe address not found for network ${network} (chainId: ${chainId})`);
  }
  
  return {
    governanceSafe: governanceSafe.address,
    emergencySafe: emergencySafe.address,
  };
}

/**
 * Verify Safe address on-chain
 */
async function verifySafeAddress(provider: ethers.Provider, address: string, name: string): Promise<boolean> {
  try {
    const code = await provider.getCode(address);
    if (code === '0x' || code.length <= 2) {
      console.warn(`⚠️  ${name} at ${address} has no code. It may not be deployed yet.`);
      return false;
    }
    console.log(`✅ ${name} verified on-chain at ${address}`);
    return true;
  } catch (error) {
    console.warn(`⚠️  Failed to verify ${name} on-chain:`, error);
    return false;
  }
}

/**
 * Deploy GovernanceTimelock contract
 */
async function deployTimelock(
  config: DeploymentConfig,
  governanceSafe: string,
  minDelay: number
): Promise<DeploymentResult> {
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const wallet = new ethers.Wallet(config.privateKey, provider);

  // Check if already deployed
  const isDeployed = isContractDeployed(config.network, 'GovernanceTimelock');
  
  if (isDeployed && !config.force) {
    const existing = getContractDeployment(config.network, 'GovernanceTimelock');
    if (existing && 'address' in existing) {
      console.log(`[SKIP] GovernanceTimelock already deployed at ${existing.address}`);
      console.log(`       Transaction: ${existing.tx}`);
      console.log(`       Block: ${existing.block}`);
      
      const block = await provider.getBlock(existing.block);
      return {
        contractName: 'GovernanceTimelock',
        address: existing.address,
        deployer: wallet.address,
        txHash: existing.tx,
        blockNumber: existing.block,
        timestamp: block?.timestamp || Math.floor(Date.now() / 1000),
      };
    }
  }

  if (isDeployed && config.force) {
    const existing = getContractDeployment(config.network, 'GovernanceTimelock');
    console.log(`\n[FORCE DEPLOY] Existing deployment will be replaced:`);
    console.log(`  Contract: GovernanceTimelock`);
    if (existing && 'address' in existing) {
      console.log(`  Existing address: ${existing.address}`);
      console.log(`  Existing tx: ${existing.tx}`);
    }
    
    if (process.env.ALLOW_FORCE_DEPLOY !== 'true') {
      throw new Error('Force deployment requires ALLOW_FORCE_DEPLOY=true');
    }
  }

  console.log(`\n[DEPLOY] Deploying GovernanceTimelock...`);
  console.log(`  Deployer: ${wallet.address}`);
  console.log(`  Governance Safe: ${governanceSafe}`);
  console.log(`  Min Delay: ${minDelay} seconds (${minDelay / 3600} hours)`);

  // Verify Safe address on-chain
  await verifySafeAddress(provider, governanceSafe, 'Governance Safe');

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log(`  Balance: ${ethers.formatEther(balance)} ETH`);

  if (balance < ethers.parseEther('0.001')) {
    throw new Error('Insufficient balance for deployment');
  }

  // Load contract artifact
  const artifact = await loadContractArtifact('GovernanceTimelock');
  
  // Create contract factory
  const factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    wallet
  );

  // Constructor parameters:
  // - minDelay: minimum delay in seconds
  // - proposers: array of addresses that can propose (Governance Safe)
  // - executors: empty array (permissionless execution)
  // - admin: Governance Safe address (can be zero address to renounce)
  const proposers = [governanceSafe];
  const executors: string[] = []; // Empty = permissionless execution
  const admin = governanceSafe; // Governance Safe is admin

  console.log(`  Constructor args:`);
  console.log(`    minDelay: ${minDelay}`);
  console.log(`    proposers: [${proposers.join(', ')}]`);
  console.log(`    executors: [] (permissionless)`);
  console.log(`    admin: ${admin}`);

  // Deploy contract
  const deployOptions: any = {};
  if (config.gasLimit) {
    deployOptions.gasLimit = config.gasLimit;
  }
  if (config.gasPrice) {
    deployOptions.gasPrice = ethers.parseUnits(config.gasPrice, 'gwei');
  }

  const contract = await factory.deploy(
    minDelay,
    proposers,
    executors,
    admin,
    deployOptions
  );
  
  console.log(`  Transaction hash: ${contract.deploymentTransaction()?.hash}`);
  console.log(`  Waiting for confirmation...`);

  // Wait for deployment
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  
  // Get deployment transaction receipt
  const receipt = await contract.deploymentTransaction()?.wait();
  if (!receipt) {
    throw new Error('Failed to get deployment receipt');
  }

  const block = await provider.getBlock(receipt.blockNumber);
  
  console.log(`  ✅ Deployed at: ${address}`);
  console.log(`  Block: ${receipt.blockNumber}`);
  console.log(`  Gas used: ${receipt.gasUsed.toString()}`);

  return {
    contractName: 'GovernanceTimelock',
    address,
    deployer: wallet.address,
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    timestamp: block?.timestamp || Math.floor(Date.now() / 1000),
  };
}

/**
 * Main deployment function
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const networkIndex = args.indexOf('--network');
  const network = networkIndex >= 0 && args[networkIndex + 1]
    ? args[networkIndex + 1]
    : process.env.NETWORK || 'localhost';
  
  const force = args.includes('--force') || process.env.FORCE_DEPLOY === 'true';

  const rpcUrl = 
    (network === 'sepolia' ? (process.env.SEPOLIA_RPC_URL || process.env.RPC_URL) : '') ||
    (network === 'mainnet' ? process.env.RPC_URL : '') ||
    (network === 'localhost' ? 'http://localhost:8545' : '') ||
    process.env.RPC_URL || '';
  
  const privateKey = process.env.PRIVATE_KEY || process.env.DID_BACKEND_SIGNER_PRIVATE_KEY || '';

  // Get Safe addresses
  let governanceSafe = process.env.GOVERNANCE_SAFE || '';
  if (!governanceSafe) {
    try {
      const safes = getSafeAddresses(network);
      governanceSafe = safes.governanceSafe;
      console.log(`📋 Using Governance Safe from registry: ${governanceSafe}`);
    } catch (error) {
      console.error('\n❌ Failed to get Governance Safe address:', error);
      throw new Error('GOVERNANCE_SAFE environment variable is required, or Safe must be registered in safe-addresses-registry.json');
    }
  }

  // Get min delay (default: 1 hour for testing, 72 hours for production)
  const minDelay = process.env.TIMELOCK_MIN_DELAY 
    ? parseInt(process.env.TIMELOCK_MIN_DELAY)
    : (network === 'mainnet' ? 259200 : 3600); // 72h for mainnet, 1h for testnet

  if (!privateKey) {
    console.error('\n❌ Missing required environment variable: PRIVATE_KEY or DID_BACKEND_SIGNER_PRIVATE_KEY');
    throw new Error('PRIVATE_KEY or DID_BACKEND_SIGNER_PRIVATE_KEY environment variable is required');
  }

  if (!rpcUrl) {
    console.error(`\n❌ Missing required environment variable: RPC_URL for network: ${network}`);
    throw new Error(`RPC_URL environment variable is required for network: ${network}`);
  }

  const config: DeploymentConfig = {
    network,
    rpcUrl,
    privateKey,
    gasPrice: process.env.GAS_PRICE,
    gasLimit: process.env.GAS_LIMIT ? parseInt(process.env.GAS_LIMIT) : undefined,
    force,
  };

  console.log('\n========================================');
  console.log('  GovernanceTimelock Deployment');
  console.log('========================================');
  console.log(`Network: ${network}`);
  console.log(`RPC URL: ${rpcUrl}`);
  console.log(`Governance Safe: ${governanceSafe}`);
  console.log(`Min Delay: ${minDelay} seconds (${minDelay / 3600} hours)`);
  console.log(`Force: ${force ? 'YES' : 'NO'}`);
  console.log('========================================\n');

  try {
    // Deploy Timelock
    const result = await deployTimelock(config, governanceSafe, minDelay);
    
    // Update registry
    const chainId = NETWORK_CHAIN_IDS[network] || getChainId(network);
    updateDeploymentRegistry(
      network,
      chainId,
      result.deployer,
      'GovernanceTimelock',
      {
        address: result.address,
        tx: result.txHash,
        block: result.blockNumber,
      },
      config.deploymentTag
    );

    // Update timelock config in registry
    const registry = readDeploymentRegistry(network, config.deploymentTag);
    if (registry) {
      registry.timelockMinDelaySec = minDelay;
      const { writeDeploymentRegistry } = await import('./deployment-registry.js');
      // Note: writeDeploymentRegistry is not exported, we'll update manually
      const deploymentsDir = path.join(__dirname, '../../../../deployments');
      const fileName = config.deploymentTag || `${network}-latest`;
      const filePath = path.join(deploymentsDir, `${fileName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(registry, null, 2), 'utf-8');
    }

    console.log('\n========================================');
    console.log('  Deployment Summary');
    console.log('========================================');
    console.log(`GovernanceTimelock: ${result.address}`);
    console.log(`Tx: ${result.txHash}`);
    console.log(`Block: ${result.blockNumber}`);
    console.log(`Min Delay: ${minDelay} seconds`);
    console.log('========================================\n');

    console.log('\n✅ GovernanceTimelock deployed successfully!');
    console.log('\n📝 Next steps:');
    console.log('  1. Verify all contracts are deployed (DIDRegistry, DIDOwnership, DIDMetadata, DIDService)');
    console.log('  2. Run setup-governance.ts to transfer roles to Timelock');
  } catch (error) {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  }
}

// Check if this is the main module
const isMainModule = import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/') || '') ||
  process.argv[1]?.includes('deploy-timelock');

if (isMainModule) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { deployTimelock };
