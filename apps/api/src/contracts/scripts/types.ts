/**
 * Deployment registry types and interfaces
 */

// Standard contract deployment (non-proxy)
export interface ContractDeployment {
  address: string;
  tx: string;
  block: number;
}

// UUPS proxy contract deployment
export interface ProxyContractDeployment {
  proxy: string;
  implementation: string;
  tx: string;
  block: number;
}

// Union type for contract deployments (can be standard or proxy)
export type AnyContractDeployment = ContractDeployment | ProxyContractDeployment;

export function isProxyContractDeployment(d: AnyContractDeployment): d is ProxyContractDeployment {
  return 'proxy' in d && 'implementation' in d;
}

/** Primary on-chain address: UUPS proxy, or direct deployment address. */
export function getDeploymentPrimaryAddress(d: AnyContractDeployment): string {
  return isProxyContractDeployment(d) ? d.proxy : d.address;
}

export function getDeploymentTx(d: AnyContractDeployment): string {
  return d.tx;
}

export function getDeploymentBlock(d: AnyContractDeployment): number {
  return d.block;
}

// Full deployment registry matching the requested format
export interface DeploymentRegistry {
  network: string;
  chainId: number;
  deployer: string;
  contracts: {
    DIDIdentityTokenV2?: ContractDeployment;
    DIDOwnershipV2?: ContractDeployment;
    DIDRegistryV2?: ContractDeployment;
    DIDMetadata?: ProxyContractDeployment;
    DIDService?: ProxyContractDeployment;
    GovernanceTimelock?: ContractDeployment;
  };
  safes: {
    governanceSafe: string;
    emergencySafe: string;
  };
  timelockMinDelaySec: number;
  timestamp: string;
}

// Legacy deployment registry (for backward compatibility)
export interface LegacyDeploymentRegistry {
  network: string;
  chainId: number;
  deployedAt: string;
  contracts: {
    [contractName: string]: ContractDeployment;
  };
}

export interface DeploymentConfig {
  network: string;
  rpcUrl: string;
  privateKey: string;
  gasPrice?: string;
  gasLimit?: number;
  force?: boolean;
  deploymentTag?: string;
}

export interface DeploymentResult {
  contractName: string;
  address: string;
  deployer: string;
  txHash: string;
  blockNumber: number;
  timestamp: number;
  // For UUPS proxies
  proxyAddress?: string;
  implementationAddress?: string;
}
