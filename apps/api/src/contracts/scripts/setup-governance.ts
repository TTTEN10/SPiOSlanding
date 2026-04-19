import 'dotenv/config';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import { readDeploymentRegistry, getContractDeployment } from './deployment-registry.js';

/**
 * Governance Setup Script
 * 
 * This script wires governance roles to contracts after deployment.
 * 
 * Prerequisites:
 * 1. Deploy GovernanceTimelock contract
 * 2. Deploy Gnosis Safe (off-chain via Safe UI) - 5 signers, threshold 3
 * 3. Deploy Emergency Safe (off-chain via Safe UI) - smaller multisig for pause only
 * 4. Deploy all DID contracts (DIDRegistry, DIDOwnership, DIDMetadata, DIDService)
 * 
 * Usage:
 *   Set environment variables:
 *   - PRIVATE_KEY: Deployer private key (will be revoked after setup)
 *   - RPC_URL: RPC endpoint
 *   - GOVERNANCE_TIMELOCK: Timelock contract address
 *   - GOVERNANCE_SAFE: Gnosis Safe address (multisig)
 *   - EMERGENCY_SAFE: Emergency Safe address (small multisig)
 *   - DID_REGISTRY: DIDRegistry contract address
 *   - DID_OWNERSHIP: DIDOwnership contract address
 *   - DID_METADATA: DIDMetadata contract address
 *   - DID_SERVICE: DIDService contract address
 * 
 *   Run: npx ts-node src/contracts/scripts/setup-governance.ts
 */

interface GovernanceConfig {
  network: string;
  rpcUrl: string;
  privateKey: string;
  governanceTimelock: string;
  governanceSafe: string;
  emergencySafe: string;
  didRegistry: string;
  didOwnership: string;
  didMetadata: string;
  didService: string;
}

interface GovernanceSetupResult {
  network: string;
  blockNumber: number;
  timestamp: number;
  rolesTransferred: {
    didRegistry: boolean;
    didOwnership: boolean;
    didMetadata: boolean;
    didService: boolean;
  };
}

// AccessControl ABI (for role management)
const ACCESS_CONTROL_ABI = [
  'function DEFAULT_ADMIN_ROLE() external view returns (bytes32)',
  'function MINTER_ROLE() external view returns (bytes32)',
  'function PAUSER_ROLE() external view returns (bytes32)',
  'function grantRole(bytes32 role, address account) external',
  'function revokeRole(bytes32 role, address account) external',
  'function hasRole(bytes32 role, address account) external view returns (bool)',
];

// UUPSUpgradeable ABI (for upgrade authorization)
const UUPS_ABI = [
  'function upgradeTo(address newImplementation) external',
  'function upgradeToAndCall(address newImplementation, bytes memory data) external',
];

/**
 * Setup governance roles for DIDRegistry
 */
async function setupDIDRegistry(
  contract: ethers.Contract,
  timelock: string,
  emergencySafe: string,
  deployer: string
): Promise<void> {
  console.log('\n📋 Setting up DIDRegistry governance...');

  // Get role constants
  const DEFAULT_ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();
  const MINTER_ROLE = await contract.MINTER_ROLE();

  // Check if deployer has admin role before granting
  const deployerHasAdmin = await contract.hasRole(DEFAULT_ADMIN_ROLE, deployer);
  console.log(`  📊 Deployer has DEFAULT_ADMIN_ROLE: ${deployerHasAdmin}`);
  
  if (!deployerHasAdmin) {
    console.log('  ⚠️  WARNING: Deployer does not have DEFAULT_ADMIN_ROLE');
    console.log('  ⚠️  This may be due to circular dependency during deployment');
    console.log('  ⚠️  DIDRegistryV2 was deployed with temporary ownership address');
    console.log('  ⚠️  Skipping role transfers for DIDRegistryV2');
    console.log('  ⚠️  You may need to manually grant roles or redeploy with correct ownership address');
    return;
  }

  // Grant roles to Timelock
  console.log('  → Granting DEFAULT_ADMIN_ROLE to Timelock...');
  let tx = await contract.grantRole(DEFAULT_ADMIN_ROLE, timelock);
  await tx.wait();
  console.log('    ✅ Transaction confirmed');

  console.log('  → Granting MINTER_ROLE to Timelock...');
  tx = await contract.grantRole(MINTER_ROLE, timelock);
  await tx.wait();
  console.log('    ✅ Transaction confirmed');

  // Revoke deployer roles (only if deployer has the role)
  console.log('  → Revoking DEFAULT_ADMIN_ROLE from deployer...');
  const hasAdminRole = await contract.hasRole(DEFAULT_ADMIN_ROLE, deployer);
  if (hasAdminRole) {
    tx = await contract.revokeRole(DEFAULT_ADMIN_ROLE, deployer);
    await tx.wait();
    console.log('    ✅ Transaction confirmed');
  } else {
    console.log('    ⚠️  Deployer does not have DEFAULT_ADMIN_ROLE (already revoked or never granted)');
  }

  console.log('  → Revoking MINTER_ROLE from deployer...');
  const hasMinterRole = await contract.hasRole(MINTER_ROLE, deployer);
  if (hasMinterRole) {
    tx = await contract.revokeRole(MINTER_ROLE, deployer);
    await tx.wait();
    console.log('    ✅ Transaction confirmed');
  } else {
    console.log('    ⚠️  Deployer does not have MINTER_ROLE (already revoked or never granted)');
  }

  // Note: Current implementation uses DEFAULT_ADMIN_ROLE for pause
  // For true separation, consider adding PAUSER_ROLE to contracts
  // Then grant PAUSER_ROLE to Emergency Safe via Timelock
  console.log('  ⚠️  Note: Pause capability should be granted to Emergency Safe via Timelock');
  console.log('  ⚠️  Consider implementing PAUSER_ROLE for true pause-only separation');
}

/**
 * Setup governance roles for DIDOwnership
 */
async function setupDIDOwnership(
  contract: ethers.Contract,
  timelock: string,
  emergencySafe: string,
  deployer: string
): Promise<void> {
  console.log('\n📋 Setting up DIDOwnership governance...');

  const DEFAULT_ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();

  // Grant admin role to Timelock
  console.log('  → Granting DEFAULT_ADMIN_ROLE to Timelock...');
  let tx = await contract.grantRole(DEFAULT_ADMIN_ROLE, timelock);
  await tx.wait();
  console.log('    ✅ Transaction confirmed');

  // Revoke deployer role (only if deployer has the role)
  console.log('  → Revoking DEFAULT_ADMIN_ROLE from deployer...');
  const hasAdminRole = await contract.hasRole(DEFAULT_ADMIN_ROLE, deployer);
  if (hasAdminRole) {
    tx = await contract.revokeRole(DEFAULT_ADMIN_ROLE, deployer);
    await tx.wait();
    console.log('    ✅ Transaction confirmed');
  } else {
    console.log('    ⚠️  Deployer does not have DEFAULT_ADMIN_ROLE (already revoked or never granted)');
  }

  // Note: Current implementation uses DEFAULT_ADMIN_ROLE for pause
  // For true separation, consider adding PAUSER_ROLE to contracts
  console.log('  ⚠️  Note: Pause capability should be granted to Emergency Safe via Timelock');
  console.log('  ⚠️  Consider implementing PAUSER_ROLE for true pause-only separation');
}

/**
 * Setup governance roles for UUPS upgradeable contracts (Metadata, Service)
 */
async function setupUUPSContract(
  contractName: string,
  contract: ethers.Contract,
  timelock: string,
  deployer: string
): Promise<void> {
  console.log(`\n📋 Setting up ${contractName} governance...`);

  const DEFAULT_ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();

  // Grant admin role to Timelock (controls upgrades)
  console.log('  → Granting DEFAULT_ADMIN_ROLE to Timelock...');
  let tx = await contract.grantRole(DEFAULT_ADMIN_ROLE, timelock);
  await tx.wait();
  console.log('    ✅ Transaction confirmed');

  // Revoke deployer role (only if deployer has the role)
  console.log('  → Revoking DEFAULT_ADMIN_ROLE from deployer...');
  const hasAdminRole = await contract.hasRole(DEFAULT_ADMIN_ROLE, deployer);
  if (hasAdminRole) {
    tx = await contract.revokeRole(DEFAULT_ADMIN_ROLE, deployer);
    await tx.wait();
    console.log('    ✅ Transaction confirmed');
  } else {
    console.log('    ⚠️  Deployer does not have DEFAULT_ADMIN_ROLE (already revoked or never granted)');
  }

  console.log(`  ✅ ${contractName} governance setup complete`);
}

/**
 * Main governance setup function
 */
async function setupGovernance(config: GovernanceConfig): Promise<GovernanceSetupResult> {
  // Initialize provider
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const wallet = new ethers.Wallet(config.privateKey, provider);

  console.log(`\n🔐 Setting up governance on ${config.network}...`);
  console.log(`Deployer address: ${wallet.address}`);
  console.log(`Governance Timelock: ${config.governanceTimelock}`);
  console.log(`Governance Safe: ${config.governanceSafe}`);
  console.log(`Emergency Safe: ${config.emergencySafe}`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log(`Deployer balance: ${ethers.formatEther(balance)} ETH`);

  if (balance < ethers.parseEther('0.01')) {
    throw new Error('Insufficient balance for governance setup');
  }

  // Create contract instances
  const didRegistry = new ethers.Contract(
    config.didRegistry,
    ACCESS_CONTROL_ABI,
    wallet
  );

  const didOwnership = new ethers.Contract(
    config.didOwnership,
    ACCESS_CONTROL_ABI,
    wallet
  );

  const didMetadata = new ethers.Contract(
    config.didMetadata,
    ACCESS_CONTROL_ABI,
    wallet
  );

  const didService = new ethers.Contract(
    config.didService,
    ACCESS_CONTROL_ABI,
    wallet
  );

  // Setup each contract
  await setupDIDRegistry(didRegistry, config.governanceTimelock, config.emergencySafe, wallet.address);
  await setupDIDOwnership(didOwnership, config.governanceTimelock, config.emergencySafe, wallet.address);
  await setupUUPSContract('DIDMetadata', didMetadata, config.governanceTimelock, wallet.address);
  await setupUUPSContract('DIDService', didService, config.governanceTimelock, wallet.address);

  const blockNumber = await provider.getBlockNumber();
  const block = await provider.getBlock(blockNumber);

  return {
    network: config.network,
    blockNumber,
    timestamp: block?.timestamp || Math.floor(Date.now() / 1000),
    rolesTransferred: {
      didRegistry: true,
      didOwnership: true,
      didMetadata: true,
      didService: true,
    },
  };
}

function saveGovernanceSetup(result: GovernanceSetupResult, network: string) {
  const deploymentsDir = path.join(process.cwd(), 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const filePath = path.join(deploymentsDir, `governance-${network}.json`);
  fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
  console.log(`\n✅ Governance setup info saved to: ${filePath}`);
}

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const networkIndex = args.indexOf('--network');
  const network = networkIndex >= 0 && args[networkIndex + 1]
    ? args[networkIndex + 1]
    : process.env.NETWORK || 'localhost';
  
  const rpcUrl = (network === 'sepolia' ? process.env.SEPOLIA_RPC_URL : '') ||
    process.env.RPC_URL ||
    (network === 'localhost' ? 'http://localhost:8545' : '');
  const privateKey = process.env.PRIVATE_KEY || process.env.DID_BACKEND_SIGNER_PRIVATE_KEY || '';

  // Try to read addresses from deployment registry if not provided via env vars
  let governanceTimelock = process.env.GOVERNANCE_TIMELOCK || '';
  let governanceSafe = process.env.GOVERNANCE_SAFE || '';
  let emergencySafe = process.env.EMERGENCY_SAFE || '';
  let didRegistry = process.env.DID_REGISTRY || '';
  let didOwnership = process.env.DID_OWNERSHIP || '';
  let didMetadata = process.env.DID_METADATA || '';
  let didService = process.env.DID_SERVICE || '';

  // If addresses not provided, try to read from deployment registry
  if (!governanceTimelock || !didRegistry || !didOwnership || !didMetadata || !didService) {
    console.log('📖 Reading contract addresses from deployment registry...');
    const registry = readDeploymentRegistry(network);
    
    if (registry) {
      console.log(`  📋 Available contracts in registry:`, Object.keys(registry.contracts));
      
      if (!governanceTimelock && registry.contracts.GovernanceTimelock && 'address' in registry.contracts.GovernanceTimelock) {
        governanceTimelock = registry.contracts.GovernanceTimelock.address;
        console.log(`  ✅ Found GovernanceTimelock: ${governanceTimelock}`);
      }
      
      const registryV2 = registry.contracts.DIDRegistryV2;
      const ownershipV2 = registry.contracts.DIDOwnershipV2;
      
      if (!didRegistry && registryV2) {
        if ('address' in registryV2) {
          didRegistry = registryV2.address;
          console.log(`  ✅ Found DIDRegistryV2: ${didRegistry}`);
        } else {
          console.log(`  ⚠️  DIDRegistryV2 found but no address field:`, registryV2);
        }
      } else if (!didRegistry) {
        // Fallback: use known deployed addresses for Sepolia
        if (network === 'sepolia') {
          didRegistry = '0x8e5F41f2B8B3E28a8966e37181B257f9E2725bA5';
          console.log(`  ⚠️  Using known Sepolia DIDRegistryV2 address: ${didRegistry}`);
        }
      }
      
      if (!didOwnership && ownershipV2) {
        if ('address' in ownershipV2) {
          didOwnership = ownershipV2.address;
          console.log(`  ✅ Found DIDOwnershipV2: ${didOwnership}`);
        } else {
          console.log(`  ⚠️  DIDOwnershipV2 found but no address field:`, ownershipV2);
        }
      } else if (!didOwnership) {
        // Fallback: use known deployed addresses for Sepolia
        if (network === 'sepolia') {
          didOwnership = '0xac5Ad1482d73d0E09ED3960C02EebF428Ad63722';
          console.log(`  ⚠️  Using known Sepolia DIDOwnershipV2 address: ${didOwnership}`);
        }
      }
      
      if (!didMetadata && registry.contracts.DIDMetadata && 'proxy' in registry.contracts.DIDMetadata) {
        didMetadata = registry.contracts.DIDMetadata.proxy;
        console.log(`  ✅ Found DIDMetadata (proxy): ${didMetadata}`);
      }
      if (!didService && registry.contracts.DIDService && 'proxy' in registry.contracts.DIDService) {
        didService = registry.contracts.DIDService.proxy;
        console.log(`  ✅ Found DIDService (proxy): ${didService}`);
      }
    } else {
      // Fallback: use known deployed addresses for Sepolia if registry not found
      if (network === 'sepolia') {
        console.log('  ⚠️  Registry not found, using known Sepolia addresses');
        if (!governanceTimelock) governanceTimelock = '0xdD26Ade2e6432FE8356CedA5607C0b548fa5397B';
        if (!didRegistry) didRegistry = '0x8e5F41f2B8B3E28a8966e37181B257f9E2725bA5';
        if (!didOwnership) didOwnership = '0xac5Ad1482d73d0E09ED3960C02EebF428Ad63722';
        if (!didMetadata) didMetadata = '0x27965EE779822819729a662717eAC7360Eb7FCDF';
        if (!didService) didService = '0x2E9058F31127C994f01099406ff3C85d87063627';
      }
    }
  }

  // Read Safe addresses from safe-addresses-registry.json
  if (!governanceSafe || !emergencySafe) {
    const safeRegistryPath = path.resolve(__dirname, '../../../deployments/safe-addresses-registry.json');
    console.log(`  📂 Looking for Safe registry at: ${safeRegistryPath}`);
    if (fs.existsSync(safeRegistryPath)) {
      const safeRegistry = JSON.parse(fs.readFileSync(safeRegistryPath, 'utf-8'));
      const chainId = network === 'sepolia' ? 11155111 : network === 'mainnet' ? 1 : 1;
      console.log(`  🔍 Searching for Safes on chainId: ${chainId}`);
      
      const govSafeEntry = safeRegistry.find((entry: any) => 
        (entry.name === 'Gov Safe' || entry.name === 'Governance Safe') && entry.chainId === chainId
      );
      const emergencySafeEntry = safeRegistry.find((entry: any) => 
        entry.name === 'Emergency Safe' && entry.chainId === chainId
      );
      
      if (!governanceSafe && govSafeEntry) {
        governanceSafe = govSafeEntry.address;
        console.log(`  ✅ Found Governance Safe: ${governanceSafe}`);
      } else if (!governanceSafe) {
        console.log(`  ⚠️  Governance Safe not found in registry for chainId ${chainId}`);
      }
      if (!emergencySafe && emergencySafeEntry) {
        emergencySafe = emergencySafeEntry.address;
        console.log(`  ✅ Found Emergency Safe: ${emergencySafe}`);
      } else if (!emergencySafe) {
        console.log(`  ⚠️  Emergency Safe not found in registry for chainId ${chainId}`);
      }
    } else {
      console.log(`  ⚠️  Safe registry file not found at: ${safeRegistryPath}`);
    }
  }

  // Validate required environment variables
  if (!privateKey) {
    throw new Error('PRIVATE_KEY or DID_BACKEND_SIGNER_PRIVATE_KEY environment variable is required');
  }
  if (!rpcUrl) {
    throw new Error(`RPC_URL or ${network === 'sepolia' ? 'SEPOLIA_RPC_URL' : 'RPC_URL'} environment variable is required`);
  }
  if (!governanceTimelock) {
    throw new Error('GOVERNANCE_TIMELOCK environment variable is required or contract must be in deployment registry');
  }
  if (!governanceSafe) {
    throw new Error('GOVERNANCE_SAFE environment variable is required or Safe must be in safe-addresses-registry.json');
  }
  if (!emergencySafe) {
    throw new Error('EMERGENCY_SAFE environment variable is required or Safe must be in safe-addresses-registry.json');
  }
  if (!didRegistry || !didOwnership || !didMetadata || !didService) {
    throw new Error('All contract addresses (DID_REGISTRY, DID_OWNERSHIP, DID_METADATA, DID_SERVICE) are required or must be in deployment registry');
  }

  const config: GovernanceConfig = {
    network,
    rpcUrl,
    privateKey,
    governanceTimelock,
    governanceSafe,
    emergencySafe,
    didRegistry,
    didOwnership,
    didMetadata,
    didService,
  };

  try {
    console.log('\n⚠️  WARNING: This script will transfer admin roles to Timelock.');
    console.log('Make sure you have deployed all contracts and have the correct addresses.\n');

    const result = await setupGovernance(config);
    saveGovernanceSetup(result, network);

    console.log('\n✅ Governance setup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('  1. Grant pause capability to Emergency Safe via Timelock');
    console.log('     (Current: DEFAULT_ADMIN_ROLE, Recommended: Add PAUSER_ROLE)');
    console.log('  2. Verify all roles are correctly assigned');
    console.log('  3. Test governance flow with a test proposal');
    console.log('  4. Document governance addresses for team');
  } catch (error) {
    console.error('\n❌ Governance setup failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { setupGovernance, GovernanceConfig, GovernanceSetupResult };

