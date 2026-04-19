import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Deployment script for DIDRegistry and DIDStorage contracts
 * 
 * Usage:
 *   - Set PRIVATE_KEY and RPC_URL in environment variables
 *   - Run: npx ts-node src/contracts/scripts/deploy.ts
 */

interface DeploymentConfig {
  network: string;
  rpcUrl: string;
  privateKey: string;
  gasPrice?: string;
  gasLimit?: number;
}

interface DeploymentResult {
  didRegistry: string;
  didStorage: string;
  network: string;
  blockNumber: number;
  timestamp: number;
}

// Contract ABIs (simplified - in production, use full ABIs from compilation)
const DID_REGISTRY_ABI = [
  'function createDID(string memory did, bytes32 didHash) external',
  'function getDID(bytes32 didHash) external view returns (string memory did, address owner, uint256 createdAt, uint256 updatedAt, bool revoked)',
  'function isValidDID(bytes32 didHash) external view returns (bool)',
];

const DID_STORAGE_ABI = [
  'function storeData(bytes32 didHash, bytes memory data, string memory dataType, bool encrypted) external returns (bytes32)',
  'function getData(bytes32 dataHash) external view returns (bytes memory data, string memory dataType, address owner, uint256 createdAt, uint256 updatedAt, bool encrypted)',
];

async function deployContracts(config: DeploymentConfig): Promise<DeploymentResult> {
  // Initialize provider
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const wallet = new ethers.Wallet(config.privateKey, provider);

  console.log(`Deploying contracts to ${config.network}...`);
  console.log(`Deployer address: ${wallet.address}`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log(`Deployer balance: ${ethers.formatEther(balance)} ETH`);

  if (balance < ethers.parseEther('0.01')) {
    throw new Error('Insufficient balance for deployment');
  }

  // Note: In production, you would compile the contracts first and load the bytecode
  // For now, this is a template that shows the deployment structure
  console.log('\n⚠️  Note: This is a deployment script template.');
  console.log('In production, compile contracts first using Hardhat or Foundry,');
  console.log('then load the bytecode and ABI from the artifacts.\n');

  // Example deployment flow (would need actual bytecode):
  // 1. Deploy DIDRegistry
  // 2. Deploy DIDStorage with DIDRegistry address
  // 3. Save deployment addresses

  const blockNumber = await provider.getBlockNumber();
  const block = await provider.getBlock(blockNumber);

  // Return mock addresses for template
  // In production, these would be the actual deployed contract addresses
  const result: DeploymentResult = {
    didRegistry: '0x0000000000000000000000000000000000000000', // Replace with actual
    didStorage: '0x0000000000000000000000000000000000000000', // Replace with actual
    network: config.network,
    blockNumber,
    timestamp: block?.timestamp || Math.floor(Date.now() / 1000),
  };

  return result;
}

function saveDeploymentInfo(result: DeploymentResult, network: string) {
  const deploymentsDir = path.join(process.cwd(), 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const filePath = path.join(deploymentsDir, `${network}.json`);
  fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
  console.log(`\n✅ Deployment info saved to: ${filePath}`);
}

async function main() {
  const network = process.env.NETWORK || 'localhost';
  const rpcUrl = process.env.RPC_URL || 'http://localhost:8545';
  const privateKey = process.env.PRIVATE_KEY || '';

  if (!privateKey) {
    throw new Error('PRIVATE_KEY environment variable is required');
  }

  const config: DeploymentConfig = {
    network,
    rpcUrl,
    privateKey,
    gasPrice: process.env.GAS_PRICE,
    gasLimit: process.env.GAS_LIMIT ? parseInt(process.env.GAS_LIMIT) : undefined,
  };

  try {
    const result = await deployContracts(config);
    saveDeploymentInfo(result, network);
    console.log('\n✅ Deployment completed successfully!');
    console.log(`DIDRegistry: ${result.didRegistry}`);
    console.log(`DIDStorage: ${result.didStorage}`);
  } catch (error) {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { deployContracts, DeploymentConfig, DeploymentResult };


