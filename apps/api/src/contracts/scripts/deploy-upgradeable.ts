/**
 * Deployment script for UUPS upgradeable contracts (DIDMetadata, DIDService)
 * 
 * Features:
 * - Deploys implementation contract
 * - Deploys UUPS proxy pointing to implementation
 * - Initializes proxy with registry and ownership addresses
 * - Idempotent (checks existing deployments)
 * 
 * Usage:
 *   yarn deploy:upgradeable --network sepolia
 *   npx tsx src/contracts/scripts/deploy-upgradeable.ts --network sepolia
 * 
 * Environment variables:
 *   - PRIVATE_KEY: Deployer private key
 *   - RPC_URL: RPC endpoint URL
 *   - NETWORK: Network name (default: localhost)
 *   - DID_REGISTRY: DIDRegistry contract address (required)
 *   - DID_OWNERSHIP: DIDOwnership contract address (required)
 */

import 'dotenv/config';
import { ethers } from 'ethers';
import { DeploymentConfig, DeploymentResult, getDeploymentPrimaryAddress } from './types.js';
import {
  isContractDeployed,
  getContractDeployment,
  updateDeploymentRegistry,
  getChainId,
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
 * Load ERC1967Proxy artifact (from OpenZeppelin)
 */
async function loadERC1967ProxyArtifact(): Promise<{
  abi: any[];
  bytecode: string;
}> {
  // ERC1967Proxy is typically in node_modules/@openzeppelin/contracts/build/contracts
  // Or we can use the minimal proxy bytecode
  // For now, we'll use a simplified approach - deploy implementation and proxy separately
  // The proxy bytecode can be generated or we can use a factory pattern
  
  // Minimal ERC1967Proxy ABI
  const abi = [
    'constructor(address implementation, bytes memory _data)',
    'function implementation() external view returns (address)',
  ];
  
  // We'll need to get the bytecode from OpenZeppelin contracts
  // For now, let's use a different approach - deploy via Hardhat's upgrades plugin if available
  // Otherwise, we'll need to compile ERC1967Proxy separately
  
  throw new Error('ERC1967Proxy deployment requires Hardhat runtime or pre-compiled proxy bytecode');
}

/**
 * Deploy a UUPS upgradeable contract
 */
async function deployUpgradeableContract(
  contractName: string,
  config: DeploymentConfig,
  registryAddress: string,
  ownershipAddress: string,
  adminAddress: string
): Promise<DeploymentResult> {
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const wallet = new ethers.Wallet(config.privateKey, provider);

  // Check if already deployed
  const isDeployed = isContractDeployed(config.network, contractName);
  
  if (isDeployed && !config.force) {
    const existing = getContractDeployment(config.network, contractName);
    if (existing && 'proxy' in existing) {
      console.log(`[SKIP] ${contractName} already deployed:`);
      console.log(`       Proxy: ${existing.proxy}`);
      console.log(`       Implementation: ${existing.implementation}`);
      console.log(`       Transaction: ${existing.tx}`);
      console.log(`       Block: ${existing.block}`);
      
      // Get block timestamp for existing deployment
      const block = await provider.getBlock(existing.block);
      return {
        contractName,
        address: existing.proxy, // Return proxy address as main address
        deployer: wallet.address,
        txHash: existing.tx,
        blockNumber: existing.block,
        timestamp: block?.timestamp || Math.floor(Date.now() / 1000),
        proxyAddress: existing.proxy,
        implementationAddress: existing.implementation,
      };
    }
  }

  if (isDeployed && config.force) {
    const existing = getContractDeployment(config.network, contractName);
    console.log(`\n[FORCE DEPLOY] Existing deployment will be replaced:`);
    console.log(`  Contract: ${contractName}`);
    if (existing && 'proxy' in existing) {
      console.log(`  Existing proxy: ${existing.proxy}`);
      console.log(`  Existing implementation: ${existing.implementation}`);
      console.log(`  Existing tx: ${existing.tx}`);
    }
    
    if (process.env.ALLOW_FORCE_DEPLOY !== 'true') {
      throw new Error('Force deployment requires ALLOW_FORCE_DEPLOY=true');
    }
  }

  console.log(`\n[DEPLOY] Deploying ${contractName} (UUPS upgradeable)...`);
  console.log(`  Deployer: ${wallet.address}`);
  console.log(`  Registry: ${registryAddress}`);
  console.log(`  Ownership: ${ownershipAddress}`);
  console.log(`  Admin: ${adminAddress}`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log(`  Balance: ${ethers.formatEther(balance)} ETH`);

  if (balance < ethers.parseEther('0.001')) {
    throw new Error('Insufficient balance for deployment');
  }

  // Load contract artifact
  const artifact = await loadContractArtifact(contractName);
  
  // Deploy implementation first
  console.log(`  Deploying implementation...`);
  const factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    wallet
  );
  
  const deployOptions: any = {};
  if (config.gasLimit) {
    deployOptions.gasLimit = config.gasLimit;
  }
  if (config.gasPrice) {
    deployOptions.gasPrice = ethers.parseUnits(config.gasPrice, 'gwei');
  }
  
  const implementation = await factory.deploy(deployOptions);
  console.log(`  Implementation tx: ${implementation.deploymentTransaction()?.hash}`);
  console.log(`  Waiting for confirmation...`);
  await implementation.waitForDeployment();
  const implementationAddress = await implementation.getAddress();
  const implDeployTx = implementation.deploymentTransaction();
  const implReceipt = await implDeployTx?.wait();
  
  console.log(`  ✅ Implementation deployed at: ${implementationAddress}`);
  console.log(`     Tx: ${implReceipt?.hash}`);
  console.log(`     Block: ${implReceipt?.blockNumber}`);

  // Load ERC1967Proxy artifact
  // Note: This requires OpenZeppelin contracts to be compiled
  // We'll try to load it from node_modules or artifacts
  const proxyArtifactPath = path.join(
    __dirname,
    '../../../node_modules/@openzeppelin/contracts/build/contracts/ERC1967Proxy.json'
  );
  
  let proxyArtifact;
  if (fs.existsSync(proxyArtifactPath)) {
    proxyArtifact = JSON.parse(fs.readFileSync(proxyArtifactPath, 'utf-8'));
  } else {
    // Try in artifacts if OpenZeppelin was compiled
    const altPath = path.join(__dirname, '../../../artifacts/@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol/ERC1967Proxy.json');
    if (fs.existsSync(altPath)) {
      proxyArtifact = JSON.parse(fs.readFileSync(altPath, 'utf-8'));
    } else {
      // Try to find it in the OpenZeppelin source and compile it
      const ozContractsPath = path.join(__dirname, '../../../node_modules/@openzeppelin/contracts');
      const proxySourcePath = path.join(ozContractsPath, 'proxy/ERC1967/ERC1967Proxy.sol');
      if (fs.existsSync(proxySourcePath)) {
        console.log('  ⚠️  ERC1967Proxy artifact not found, but source exists.');
        console.log('  Please run: npx hardhat compile');
        console.log('  Or use Hardhat upgrades plugin: upgrades.deployProxy()');
      }
      // ERC1967Proxy is not compiled by default in OpenZeppelin 5.x
      // We need to compile it explicitly or use Hardhat's upgrades plugin
      // For now, let's try to compile it on the fly or use a workaround
      console.log('  ⚠️  ERC1967Proxy artifact not found. Compiling it now...');
      
      // Try to compile ERC1967Proxy using Hardhat
      const { execSync } = await import('child_process');
      try {
        execSync('npx hardhat compile --force', { 
          cwd: path.join(__dirname, '../../../'),
          stdio: 'pipe'
        });
        // Try again after compilation
        if (fs.existsSync(altPath)) {
          proxyArtifact = JSON.parse(fs.readFileSync(altPath, 'utf-8'));
        } else {
          throw new Error('ERC1967Proxy still not found after compilation');
        }
      } catch (compileError) {
        throw new Error(
          `ERC1967Proxy artifact not found and compilation failed. ` +
          `Tried: ${proxyArtifactPath} and ${altPath}. ` +
          `Please ensure OpenZeppelin contracts are installed and run: npx hardhat compile`
        );
      }
    }
  }
  
  // Encode initialize function call
  const initializeInterface = new ethers.Interface([
    'function initialize(address _registryContract, address _ownershipContract, address admin) external'
  ]);
  const initData = initializeInterface.encodeFunctionData('initialize', [
    registryAddress,
    ownershipAddress,
    adminAddress,
  ]);

  console.log(`  Deploying proxy...`);
  const proxyFactory = new ethers.ContractFactory(
    proxyArtifact.abi,
    proxyArtifact.bytecode,
    wallet
  );
  
  const proxy = await proxyFactory.deploy(implementationAddress, initData, deployOptions);
  console.log(`  Proxy tx: ${proxy.deploymentTransaction()?.hash}`);
  console.log(`  Waiting for confirmation...`);
  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();
  const proxyDeployTx = proxy.deploymentTransaction();
  const proxyReceipt = await proxyDeployTx?.wait();
  
  console.log(`  ✅ Proxy deployed at: ${proxyAddress}`);
  console.log(`     Tx: ${proxyReceipt?.hash}`);
  console.log(`     Block: ${proxyReceipt?.blockNumber}`);

  // Use proxy receipt as the main deployment receipt
  const block = await provider.getBlock(proxyReceipt!.blockNumber);

  return {
    contractName,
    address: proxyAddress, // Return proxy address as main address
    deployer: wallet.address,
    txHash: proxyReceipt!.hash,
    blockNumber: proxyReceipt!.blockNumber,
    timestamp: block?.timestamp || Math.floor(Date.now() / 1000),
    proxyAddress,
    implementationAddress,
  };
}

/**
 * Deploy all upgradeable contracts
 */
async function deployAllUpgradeableContracts(config: DeploymentConfig): Promise<DeploymentResult[]> {
  const results: DeploymentResult[] = [];
  const chainId = NETWORK_CHAIN_IDS[config.network] || getChainId(config.network);

  // Get required contract addresses
  // Use environment variables or registry, with fallback to known deployed addresses
  let registryAddress = process.env.DID_REGISTRY?.trim();
  let ownershipAddress = process.env.DID_OWNERSHIP?.trim();

  if (!registryAddress || !ownershipAddress) {
    const registryDeployment = getContractDeployment(config.network, 'DIDRegistryV2');
    const ownershipDeployment = getContractDeployment(config.network, 'DIDOwnershipV2');

    if (!registryDeployment || !ownershipDeployment) {
      if (config.network === 'sepolia') {
        console.log('⚠️  Registry lookup failed, using known Sepolia addresses');
        registryAddress = '0x8e5F41f2B8B3E28a8966e37181B257f9E2725bA5';
        ownershipAddress = '0xac5Ad1482d73d0E09ED3960C02EebF428Ad63722';
      } else {
        throw new Error(
          'DIDRegistryV2 must be deployed before upgradeable contracts. Set DID_REGISTRY and DID_OWNERSHIP env vars or ensure registry file is correct.'
        );
      }
    } else {
      registryAddress = getDeploymentPrimaryAddress(registryDeployment);
      ownershipAddress = getDeploymentPrimaryAddress(ownershipDeployment);
    }
  }

  if (!registryAddress || !ownershipAddress) {
    throw new Error('Registry and ownership addresses are required for upgradeable deployment');
  }

  console.log(`\n✅ Using Registry address: ${registryAddress}`);
  console.log(`✅ Using Ownership address: ${ownershipAddress}`);
  
  // Admin address (temporary, will be transferred to Timelock later)
  const adminAddress = config.privateKey 
    ? new ethers.Wallet(config.privateKey).address 
    : ethers.ZeroAddress;

  // Deploy DIDMetadata
  console.log('\n=== Deploying DIDMetadata (UUPS) ===');
  const metadataResult = await deployUpgradeableContract(
    'DIDMetadata',
    config,
    registryAddress,
    ownershipAddress,
    adminAddress
  );
  results.push(metadataResult);
  
  // Update registry
  updateDeploymentRegistry(
    config.network,
    chainId,
    metadataResult.deployer,
    'DIDMetadata',
    {
      proxy: metadataResult.proxyAddress!,
      implementation: metadataResult.implementationAddress!,
      tx: metadataResult.txHash,
      block: metadataResult.blockNumber,
    } as any,
    config.deploymentTag
  );

  // Deploy DIDService
  console.log('\n=== Deploying DIDService (UUPS) ===');
  const serviceResult = await deployUpgradeableContract(
    'DIDService',
    config,
    registryAddress,
    ownershipAddress,
    adminAddress
  );
  results.push(serviceResult);
  
  // Update registry
  updateDeploymentRegistry(
    config.network,
    chainId,
    serviceResult.deployer,
    'DIDService',
    {
      proxy: serviceResult.proxyAddress!,
      implementation: serviceResult.implementationAddress!,
      tx: serviceResult.txHash,
      block: serviceResult.blockNumber,
    } as any,
    config.deploymentTag
  );

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
  console.log('  Upgradeable Contracts Deployment');
  console.log('========================================');
  console.log(`Network: ${network}`);
  console.log(`RPC URL: ${rpcUrl}`);
  console.log(`Force: ${force ? 'YES' : 'NO'}`);
  console.log('========================================\n');

  try {
    // Deploy contracts
    const results = await deployAllUpgradeableContracts(config);
    
    console.log('\n========================================');
    console.log('  Deployment Summary');
    console.log('========================================');
    results.forEach((result) => {
      console.log(`${result.contractName}:`);
      console.log(`  Proxy: ${result.proxyAddress}`);
      console.log(`  Implementation: ${result.implementationAddress}`);
      console.log(`  Tx: ${result.txHash}`);
      console.log(`  Block: ${result.blockNumber}`);
    });
    console.log('========================================\n');

    console.log('\n✅ All upgradeable contracts deployed successfully!');
    console.log('\n📝 Next steps:');
    console.log('  1. Deploy GovernanceTimelock');
    console.log('  2. Run setup-governance.ts to transfer roles to Timelock');
  } catch (error) {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  }
}

// Check if this is the main module
const isMainModule = import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/') || '') ||
  process.argv[1]?.includes('deploy-upgradeable');

if (isMainModule) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { deployAllUpgradeableContracts, deployUpgradeableContract };
