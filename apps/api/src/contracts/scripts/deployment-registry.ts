/**
 * Deployment registry utilities
 * Handles reading and writing deployment state
 * Supports the new format with UUPS proxies, safes, and timelock
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { DeploymentRegistry, ContractDeployment, ProxyContractDeployment, AnyContractDeployment } from './types.js';

// Get the directory relative to this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Point to apps/api/deployments (not src/contracts/deployments)
const DEPLOYMENTS_DIR = path.join(__dirname, '../../../../deployments');

// Network chain IDs
const NETWORK_CHAIN_IDS: Record<string, number> = {
  localhost: 1337,
  hardhat: 1337,
  sepolia: 11155111,
  mainnet: 1,
};

/**
 * Get the path to a deployment registry file for a network
 * Uses deployment tag if provided, otherwise uses network name
 */
export function getDeploymentFilePath(network: string, deploymentTag?: string): string {
  const fileName = deploymentTag || `${network}-latest`;
  return path.join(DEPLOYMENTS_DIR, `${fileName}.json`);
}

/**
 * Read deployment registry for a network
 */
export function readDeploymentRegistry(network: string, deploymentTag?: string): DeploymentRegistry | null {
  const filePath = getDeploymentFilePath(network, deploymentTag);
  
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const registry = JSON.parse(content) as DeploymentRegistry;
    
    // Validate structure
    if (!registry.network || !registry.chainId || !registry.contracts) {
      throw new Error(`Invalid deployment registry structure in ${filePath}`);
    }
    
    return registry;
  } catch (error) {
    throw new Error(`Failed to read deployment registry: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Check if a contract is already deployed
 */
export function isContractDeployed(network: string, contractName: string, deploymentTag?: string): boolean {
  const registry = readDeploymentRegistry(network, deploymentTag);
  if (!registry) {
    return false;
  }
  
  const deployment = registry.contracts[contractName as keyof typeof registry.contracts];
  if (!deployment) {
    return false;
  }
  
  // Check if it's a proxy contract
  if ('proxy' in deployment && 'implementation' in deployment) {
    const proxyDeployment = deployment as ProxyContractDeployment;
    return proxyDeployment.proxy !== undefined && 
           proxyDeployment.proxy !== '0x0000000000000000000000000000000000000000' &&
           proxyDeployment.implementation !== undefined &&
           proxyDeployment.implementation !== '0x0000000000000000000000000000000000000000';
  } else {
    // Standard contract
    const standardDeployment = deployment as ContractDeployment;
    return standardDeployment.address !== undefined && 
           standardDeployment.address !== '0x0000000000000000000000000000000000000000';
  }
}

/**
 * Get deployment info for a contract
 */
export function getContractDeployment(
  network: string, 
  contractName: string, 
  deploymentTag?: string
): AnyContractDeployment | null {
  const registry = readDeploymentRegistry(network, deploymentTag);
  if (!registry) {
    return null;
  }
  
  const deployment = registry.contracts[contractName as keyof typeof registry.contracts];
  return deployment || null;
}

/**
 * Check if contract code exists at address (on-chain verification)
 */
export async function isContractCodePresent(
  rpcUrl: string,
  address: string
): Promise<boolean> {
  try {
    const { ethers } = await import('ethers');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const code = await provider.getCode(address);
    return code !== '0x' && code.length > 2;
  } catch (error) {
    console.warn(`Failed to check contract code at ${address}:`, error);
    return false;
  }
}

/**
 * Write deployment registry atomically
 */
export function writeDeploymentRegistry(registry: DeploymentRegistry, deploymentTag?: string): void {
  // Ensure directory exists
  if (!fs.existsSync(DEPLOYMENTS_DIR)) {
    fs.mkdirSync(DEPLOYMENTS_DIR, { recursive: true });
  }

  const fileName = deploymentTag || `${registry.network}-latest`;
  const filePath = path.join(DEPLOYMENTS_DIR, `${fileName}.json`);
  const tempPath = `${filePath}.tmp`;
  
  // Validate structure
  if (!registry.network || !registry.chainId || !registry.contracts) {
    throw new Error('Invalid deployment registry structure');
  }
  
  // Write to temp file first
  fs.writeFileSync(tempPath, JSON.stringify(registry, null, 2), 'utf-8');
  
  // Atomic rename
  fs.renameSync(tempPath, filePath);
}

/**
 * Update deployment registry with a new contract deployment
 */
export function updateDeploymentRegistry(
  network: string,
  chainId: number,
  deployer: string,
  contractName: string,
  deployment: AnyContractDeployment,
  deploymentTag?: string
): void {
  let registry = readDeploymentRegistry(network, deploymentTag);
  
  if (!registry) {
    // Create new registry with default structure
    registry = {
      network,
      chainId,
      deployer,
      contracts: {},
      safes: {
        governanceSafe: '0x0000000000000000000000000000000000000000',
        emergencySafe: '0x0000000000000000000000000000000000000000',
      },
      timelockMinDelaySec: 3600, // 1 hour default, should be 72h for production
      timestamp: new Date().toISOString(),
    };
  } else {
    // Update deployer if provided
    if (deployer) {
      registry.deployer = deployer;
    }
  }
  
  // Update contract deployment
  registry.contracts[contractName as keyof typeof registry.contracts] = deployment as any;
  registry.timestamp = new Date().toISOString();
  
  // Write atomically
  writeDeploymentRegistry(registry, deploymentTag);
}

/**
 * Update safe addresses in deployment registry
 */
export function updateSafeAddresses(
  network: string,
  governanceSafe: string,
  emergencySafe: string,
  deploymentTag?: string
): void {
  const registry = readDeploymentRegistry(network, deploymentTag);
  if (!registry) {
    throw new Error(`Deployment registry not found for network: ${network}`);
  }
  
  registry.safes.governanceSafe = governanceSafe;
  registry.safes.emergencySafe = emergencySafe;
  registry.timestamp = new Date().toISOString();
  
  writeDeploymentRegistry(registry, deploymentTag);
}

/**
 * Update timelock configuration
 */
export function updateTimelockConfig(
  network: string,
  timelockMinDelaySec: number,
  deploymentTag?: string
): void {
  const registry = readDeploymentRegistry(network, deploymentTag);
  if (!registry) {
    throw new Error(`Deployment registry not found for network: ${network}`);
  }
  
  registry.timelockMinDelaySec = timelockMinDelaySec;
  registry.timestamp = new Date().toISOString();
  
  writeDeploymentRegistry(registry, deploymentTag);
}

/**
 * Get chain ID for a network
 */
export function getChainId(network: string): number {
  return NETWORK_CHAIN_IDS[network] || 1;
}