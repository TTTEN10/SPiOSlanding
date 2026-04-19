/**
 * Idempotent deployment script for DIDRegistry and DIDOwnership contracts
 * 
 * Features:
 * - Checks if contracts are already deployed before deploying
 * - Skips deployment if contract exists (unless --force flag)
 * - Atomic deployment metadata persistence
 * - Automatic smoke check after deployment
 * 
 * Usage:
 *   yarn deploy:contracts --network sepolia
 *   yarn deploy:contracts --network sepolia --force
 * 
 * Environment variables:
 *   - PRIVATE_KEY: Deployer private key
 *   - RPC_URL: RPC endpoint URL
 *   - NETWORK: Network name (default: localhost)
 *   - ALLOW_FORCE_DEPLOY: Set to 'true' to allow force deploy without prompt
 */

import 'dotenv/config';
import { ethers } from 'ethers';
import * as readline from 'readline';
import {
  DeploymentConfig,
  DeploymentResult,
  getDeploymentBlock,
  getDeploymentPrimaryAddress,
  getDeploymentTx,
} from './types.js';
import {
  isContractDeployed,
  getContractDeployment,
  readDeploymentRegistry,
  updateDeploymentRegistry,
} from './deployment-registry.js';
import { runSmokeCheck } from './smoke-check.js';

// Network chain IDs
const NETWORK_CHAIN_IDS: Record<string, number> = {
  localhost: 1337,
  hardhat: 1337,
  sepolia: 11155111,
  mainnet: 1,
};

// Contract deployment order (DIDOwnership must be deployed before DIDRegistry)
const CONTRACT_DEPLOYMENT_ORDER = ['DIDOwnership', 'DIDRegistry'] as const;

/**
 * Load contract artifacts from Hardhat compilation
 */
async function loadContractArtifact(contractName: string): Promise<{
  abi: any[];
  bytecode: string;
}> {
  const fs = await import('fs');
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  const { dirname } = await import('path');
  
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const artifactsBase = path.join(__dirname, '../../../artifacts/src/contracts');
  
  // Try with V2 suffix first
  const v2Path = path.join(artifactsBase, `${contractName}V2.sol/${contractName}V2.json`);
  if (fs.existsSync(v2Path)) {
    const artifact = JSON.parse(fs.readFileSync(v2Path, 'utf-8'));
    return {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
    };
  }
  
  // Try without V2 suffix
  const regularPath = path.join(artifactsBase, `${contractName}.sol/${contractName}.json`);
  if (fs.existsSync(regularPath)) {
    const artifact = JSON.parse(fs.readFileSync(regularPath, 'utf-8'));
    return {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
    };
  }
  
  throw new Error(
    `Failed to load contract artifact for ${contractName}. ` +
    `Tried: ${v2Path} and ${regularPath}. ` +
    `Make sure contracts are compiled first: npx hardhat compile`
  );
}

/**
 * Prompt user for confirmation
 */
function promptConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${question} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Deploy a single contract
 */
async function deployContract(
  contractName: string,
  config: DeploymentConfig,
  constructorArgs: any[] = []
): Promise<DeploymentResult> {
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const wallet = new ethers.Wallet(config.privateKey, provider);

  // Check if already deployed
  const isDeployed = isContractDeployed(config.network, contractName);
  
  if (isDeployed && !config.force) {
    const existing = getContractDeployment(config.network, contractName);
    if (!existing) {
      throw new Error(`Expected deployment entry for ${contractName} but registry is missing data`);
    }
    const primary = getDeploymentPrimaryAddress(existing);
    console.log(`[SKIP] ${contractName} already deployed at ${primary}`);
    console.log(`       Transaction: ${getDeploymentTx(existing)}`);
    console.log(`       Block: ${getDeploymentBlock(existing)}`);

    const registry = readDeploymentRegistry(config.network);
    const block = await provider.getBlock(getDeploymentBlock(existing));
    return {
      contractName,
      address: primary,
      deployer: registry?.deployer ?? wallet.address,
      txHash: getDeploymentTx(existing),
      blockNumber: getDeploymentBlock(existing),
      timestamp: block?.timestamp || Math.floor(Date.now() / 1000),
    };
  }

  if (isDeployed && config.force) {
    const existing = getContractDeployment(config.network, contractName);
    console.log(`\n[FORCE DEPLOY] Existing deployment will be replaced:`);
    console.log(`  Contract: ${contractName}`);
    console.log(`  Existing address: ${existing ? getDeploymentPrimaryAddress(existing) : 'unknown'}`);
    console.log(`  Existing tx: ${existing ? getDeploymentTx(existing) : 'unknown'}`);
    
    // Require confirmation unless ALLOW_FORCE_DEPLOY is set
    if (process.env.ALLOW_FORCE_DEPLOY !== 'true') {
      const confirmed = await promptConfirmation(
        `\n⚠️  WARNING: This will deploy a new contract. The old deployment will remain on-chain.\n` +
        `Are you sure you want to proceed?`
      );
      
      if (!confirmed) {
        throw new Error('Force deployment cancelled by user');
      }
    } else {
      console.log('  [ALLOW_FORCE_DEPLOY=true] Skipping confirmation prompt');
    }
  }

  console.log(`\n[DEPLOY] Deploying ${contractName}...`);
  console.log(`  Deployer: ${wallet.address}`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log(`  Balance: ${ethers.formatEther(balance)} ETH`);

  if (balance < ethers.parseEther('0.001')) {
    throw new Error('Insufficient balance for deployment');
  }

  // Load contract artifact
  const artifact = await loadContractArtifact(contractName);
  
  // Create contract factory
  const factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    wallet
  );

  // Deploy contract
  const deployOptions: any = {};
  if (config.gasLimit) {
    deployOptions.gasLimit = config.gasLimit;
  }
  if (config.gasPrice) {
    deployOptions.gasPrice = ethers.parseUnits(config.gasPrice, 'gwei');
  }

  console.log(`  Deploying with constructor args: ${constructorArgs.length > 0 ? JSON.stringify(constructorArgs) : 'none'}`);
  
  const contract = await factory.deploy(...constructorArgs, deployOptions);
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
    contractName,
    address,
    deployer: wallet.address,
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    timestamp: block?.timestamp || Math.floor(Date.now() / 1000),
  };
}

/**
 * Deploy all contracts in order
 */
async function deployAllContracts(config: DeploymentConfig): Promise<DeploymentResult[]> {
  const results: DeploymentResult[] = [];
  const chainId = NETWORK_CHAIN_IDS[config.network] || 1;

  // Get deployer address for admin
  const deployerAddress = config.privateKey ? new ethers.Wallet(config.privateKey).address : ethers.ZeroAddress;
  
  // Circular dependency: Ownership needs Registry (for ownerOf), Registry needs Ownership (for revoke isAuthorized)
  // Solution: Deploy Ownership with address(0), then Registry with Ownership, then Ownership.setRegistry(Registry)
  // DIDOwnershipV2 has one-time setRegistryContract() for this.
  
  // Step 1: Deploy DIDOwnership with address(0) (registry will be set in step 3)
  console.log('\n=== Deploying DIDOwnership (with placeholder, will set Registry in step 3) ===');
  const ownershipResult = await deployContract('DIDOwnership', config, [
    ethers.ZeroAddress, // registryContract placeholder (setRegistryContract called after Registry deploy)
    deployerAddress, // admin (temporary, will be transferred to Timelock)
  ]);
  results.push(ownershipResult);
  
  updateDeploymentRegistry(
    config.network,
    chainId,
    deployerAddress,
    'DIDOwnershipV2',
    {
      address: ownershipResult.address,
      tx: ownershipResult.txHash,
      block: ownershipResult.blockNumber,
    }
  );
  
  // Step 2: Deploy DIDRegistry with Ownership address (correct reference from the start)
  console.log('\n=== Deploying DIDRegistry (with Ownership address) ===');
  const registryResult = await deployContract(
    'DIDRegistry',
    config,
    [
      'SafePsy DID Identity', // name
      'SAFEPSY-DID', // symbol
      ownershipResult.address, // ownershipContract (correct - revoke will call isAuthorized)
      deployerAddress, // admin (temporary, will be transferred to Timelock)
    ]
  );
  results.push(registryResult);
  
  updateDeploymentRegistry(
    config.network,
    chainId,
    deployerAddress,
    'DIDRegistryV2',
    {
      address: registryResult.address,
      tx: registryResult.txHash,
      block: registryResult.blockNumber,
    }
  );
  
  // Step 3: Set Registry on Ownership (one-time, resolves circular dependency)
  console.log('\n=== Wiring Ownership.registryContract to Registry ===');
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const wallet = new ethers.Wallet(config.privateKey, provider);
  const ownershipContract = new ethers.Contract(
    ownershipResult.address,
    ['function setRegistryContract(address) external', 'function registryContract() view returns (address)'],
    wallet
  );
  const currentRegistry = await ownershipContract.registryContract();
  if (currentRegistry === ethers.ZeroAddress) {
    const tx = await ownershipContract.setRegistryContract(registryResult.address);
    await tx.wait();
    console.log('  ✅ Ownership.registryContract set to Registry');
  } else {
    console.log('  ⏭️  Ownership.registryContract already set, skipping');
  }


  return results;
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

  const rpcUrl = (network === 'sepolia' ? process.env.SEPOLIA_RPC_URL : '') ||
    process.env.RPC_URL ||
    (network === 'localhost' ? 'http://localhost:8545' : '');
  
  const privateKey = process.env.PRIVATE_KEY || process.env.DID_BACKEND_SIGNER_PRIVATE_KEY || '';

  if (!privateKey) {
    console.error('\n❌ Missing required environment variable: PRIVATE_KEY or DID_BACKEND_SIGNER_PRIVATE_KEY');
    console.error('\nTo fix this, set one of the following:');
    console.error('  export PRIVATE_KEY=<your_private_key>');
    console.error('  # OR');
    console.error('  export DID_BACKEND_SIGNER_PRIVATE_KEY=<your_private_key>');
    console.error('\nFor Sepolia testnet, you also need:');
    console.error('  export RPC_URL=<sepolia_rpc_url>');
    console.error('  # OR');
    console.error('  export SEPOLIA_RPC_URL=<sepolia_rpc_url>');
    console.error('\nSee SMART-CONTRACTS_DEPLOYMENT.md for more details.\n');
    throw new Error('PRIVATE_KEY or DID_BACKEND_SIGNER_PRIVATE_KEY environment variable is required');
  }

  if (!rpcUrl) {
    console.error(`\n❌ Missing required environment variable: RPC_URL for network: ${network}`);
    console.error('\nTo fix this, set one of the following:');
    if (network === 'sepolia') {
      console.error('  export RPC_URL=<sepolia_rpc_url>');
      console.error('  # OR');
      console.error('  export SEPOLIA_RPC_URL=<sepolia_rpc_url>');
    } else {
      console.error(`  export RPC_URL=<${network}_rpc_url>`);
    }
    console.error('\nSee SMART-CONTRACTS_DEPLOYMENT.md for more details.\n');
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
  console.log('  Smart Contract Deployment');
  console.log('========================================');
  console.log(`Network: ${network}`);
  console.log(`RPC URL: ${rpcUrl}`);
  console.log(`Force: ${force ? 'YES' : 'NO'}`);
  console.log('========================================\n');

  try {
    // Deploy contracts
    const results = await deployAllContracts(config);
    
    console.log('\n========================================');
    console.log('  Deployment Summary');
    console.log('========================================');
    results.forEach((result) => {
      console.log(`${result.contractName}:`);
      console.log(`  Address: ${result.address}`);
      console.log(`  Tx: ${result.txHash}`);
      console.log(`  Block: ${result.blockNumber}`);
    });
    console.log('========================================\n');

    // Run smoke check
    console.log('\n=== Running Smoke Checks ===');
    const smokeCheckPassed = await runSmokeCheck(network, rpcUrl);
    
    if (!smokeCheckPassed) {
      console.error('\n❌ Smoke checks failed. Deployment may be incomplete.');
      process.exit(1);
    }

    console.log('\n✅ All deployments and smoke checks completed successfully!');
  } catch (error) {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  }
}

// Check if this is the main module (ES modules)
// When run via tsx/node, import.meta.url will match the script being executed
const isMainModule = import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/') || '') ||
  process.argv[1]?.includes('deploy-idempotent');

if (isMainModule) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { deployAllContracts, deployContract };

