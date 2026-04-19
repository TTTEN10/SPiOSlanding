/**
 * Smoke check script for deployed contracts
 * 
 * Performs read-only verification of deployed contracts:
 * - Verifies contract code exists at addresses
 * - Tests critical read paths
 * - Never mutates state
 * 
 * Usage:
 *   yarn smoke-check --network sepolia
 *   npx ts-node src/contracts/scripts/smoke-check.ts --network sepolia
 */

import { ethers } from 'ethers';
import { readDeploymentRegistry, getContractDeployment } from './deployment-registry.js';
import { getDeploymentPrimaryAddress } from './types.js';

// Minimal ABIs for smoke checks (read-only functions only)
const DID_REGISTRY_ABI = [
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function exists(uint256 tokenId) external view returns (bool)',
  'function isRevoked(uint256 tokenId) external view returns (bool)',
  'function isAddressRevoked(address owner) external view returns (bool)',
  'function getDidHash(uint256 tokenId) external view returns (bytes32)',
  'function getTokenIdByAddress(address owner) external view returns (uint256)',
  'function totalSupply() external view returns (uint256)',
  'function ownershipContract() external view returns (address)',
  'function supportsInterface(bytes4 interfaceId) external view returns (bool)',
];

const DID_OWNERSHIP_ABI = [
  'function registryContract() external view returns (address)',
  'function isAuthorized(uint256 tokenId, bytes32 action, address account) external view returns (bool)',
  'function isController(uint256 tokenId, address account) external view returns (bool)',
  'function getControllers(uint256 tokenId) external view returns (address[])',
  'function hasDelegatedAuthority(uint256 tokenId, address account) external view returns (bool)',
  'function MAX_CONTROLLERS() external view returns (uint256)',
  'function supportsInterface(bytes4 interfaceId) external view returns (bool)',
];

interface SmokeCheckResult {
  contractName: string;
  address: string;
  passed: boolean;
  errors: string[];
}

/**
 * Check if contract code exists at address
 */
async function checkContractCode(
  provider: ethers.Provider,
  address: string
): Promise<boolean> {
  try {
    const code = await provider.getCode(address);
    return code !== '0x' && code.length > 2;
  } catch (error) {
    return false;
  }
}

/**
 * Smoke check for DIDRegistry
 */
async function smokeCheckDIDRegistry(
  provider: ethers.Provider,
  address: string
): Promise<SmokeCheckResult> {
  const result: SmokeCheckResult = {
    contractName: 'DIDRegistry',
    address,
    passed: true,
    errors: [],
  };

  try {
    // Check contract code exists
    const hasCode = await checkContractCode(provider, address);
    if (!hasCode) {
      result.passed = false;
      result.errors.push('No contract code at address');
      return result;
    }

    const contract = new ethers.Contract(address, DID_REGISTRY_ABI, provider);

    // Test: totalSupply() should return a number (even if 0)
    try {
      const totalSupply = await contract.totalSupply();
      if (typeof totalSupply !== 'bigint') {
        result.passed = false;
        result.errors.push('totalSupply() returned invalid type');
      }
    } catch (error: any) {
      result.passed = false;
      result.errors.push(`totalSupply() call reverted: ${error.message || error.reason || 'unknown'}`);
    }

    // Test: ownershipContract() should return an address
    try {
      const ownershipContract = await contract.ownershipContract();
      if (!ethers.isAddress(ownershipContract)) {
        result.passed = false;
        result.errors.push('ownershipContract() returned invalid address');
      }
    } catch (error: any) {
      result.passed = false;
      result.errors.push(`ownershipContract() call reverted: ${error.message || error.reason || 'unknown'}`);
    }

    // Test: supportsInterface (ERC165)
    try {
      // ERC721 interface ID: 0x80ac58cd
      const supportsERC721 = await contract.supportsInterface('0x80ac58cd');
      if (typeof supportsERC721 !== 'boolean') {
        result.passed = false;
        result.errors.push('supportsInterface() returned invalid type');
      }
    } catch (error: any) {
      // Not critical, but log it
      result.errors.push(`supportsInterface() call failed: ${error.message || error.reason || 'unknown'}`);
    }

    // Test: isAddressRevoked with zero address (should not revert)
    try {
      const isRevoked = await contract.isAddressRevoked(ethers.ZeroAddress);
      if (typeof isRevoked !== 'boolean') {
        result.passed = false;
        result.errors.push('isAddressRevoked() returned invalid type');
      }
    } catch (error: any) {
      result.passed = false;
      result.errors.push(`isAddressRevoked() call reverted: ${error.message || error.reason || 'unknown'}`);
    }

    // Test: getTokenIdByAddress with zero address (should return 0, not revert)
    try {
      const tokenId = await contract.getTokenIdByAddress(ethers.ZeroAddress);
      if (typeof tokenId !== 'bigint') {
        result.passed = false;
        result.errors.push('getTokenIdByAddress() returned invalid type');
      }
    } catch (error: any) {
      result.passed = false;
      result.errors.push(`getTokenIdByAddress() call reverted: ${error.message || error.reason || 'unknown'}`);
    }

  } catch (error: any) {
    result.passed = false;
    result.errors.push(`Contract interaction failed: ${error.message || error.reason || 'unknown'}`);
  }

  return result;
}

/**
 * Smoke check for DIDOwnership
 */
async function smokeCheckDIDOwnership(
  provider: ethers.Provider,
  address: string
): Promise<SmokeCheckResult> {
  const result: SmokeCheckResult = {
    contractName: 'DIDOwnership',
    address,
    passed: true,
    errors: [],
  };

  try {
    // Check contract code exists
    const hasCode = await checkContractCode(provider, address);
    if (!hasCode) {
      result.passed = false;
      result.errors.push('No contract code at address');
      return result;
    }

    const contract = new ethers.Contract(address, DID_OWNERSHIP_ABI, provider);

    // Test: registryContract() should return an address
    try {
      const registryContract = await contract.registryContract();
      if (!ethers.isAddress(registryContract)) {
        result.passed = false;
        result.errors.push('registryContract() returned invalid address');
      }
    } catch (error: any) {
      result.passed = false;
      result.errors.push(`registryContract() call reverted: ${error.message || error.reason || 'unknown'}`);
    }

    // Test: MAX_CONTROLLERS() should return a number
    try {
      const maxControllers = await contract.MAX_CONTROLLERS();
      if (typeof maxControllers !== 'bigint') {
        result.passed = false;
        result.errors.push('MAX_CONTROLLERS() returned invalid type');
      }
    } catch (error: any) {
      result.passed = false;
      result.errors.push(`MAX_CONTROLLERS() call reverted: ${error.message || error.reason || 'unknown'}`);
    }

    // Test: isAuthorized with non-existent token (should not revert, return false)
    try {
      const isAuthorized = await contract.isAuthorized(
        999999, // Non-existent token ID
        ethers.id('TEST_ACTION'), // Random action
        ethers.ZeroAddress // Zero address
      );
      if (typeof isAuthorized !== 'boolean') {
        result.passed = false;
        result.errors.push('isAuthorized() returned invalid type');
      }
    } catch (error: any) {
      result.passed = false;
      result.errors.push(`isAuthorized() call reverted: ${error.message || error.reason || 'unknown'}`);
    }

    // Test: isController with non-existent token (should not revert)
    try {
      const isController = await contract.isController(999999, ethers.ZeroAddress);
      if (typeof isController !== 'boolean') {
        result.passed = false;
        result.errors.push('isController() returned invalid type');
      }
    } catch (error: any) {
      result.passed = false;
      result.errors.push(`isController() call reverted: ${error.message || error.reason || 'unknown'}`);
    }

    // Test: getControllers with non-existent token (should return empty array, not revert)
    try {
      const controllers = await contract.getControllers(999999);
      if (!Array.isArray(controllers)) {
        result.passed = false;
        result.errors.push('getControllers() returned invalid type');
      }
    } catch (error: any) {
      result.passed = false;
      result.errors.push(`getControllers() call reverted: ${error.message || error.reason || 'unknown'}`);
    }

    // Test: supportsInterface (ERC165)
    try {
      // AccessControl interface ID: 0x7965db0b
      const supportsAccessControl = await contract.supportsInterface('0x7965db0b');
      if (typeof supportsAccessControl !== 'boolean') {
        result.passed = false;
        result.errors.push('supportsInterface() returned invalid type');
      }
    } catch (error: any) {
      // Not critical, but log it
      result.errors.push(`supportsInterface() call failed: ${error.message || error.reason || 'unknown'}`);
    }

  } catch (error: any) {
    result.passed = false;
    result.errors.push(`Contract interaction failed: ${error.message || error.reason || 'unknown'}`);
  }

  return result;
}

/**
 * Run smoke checks for all deployed contracts
 */
export async function runSmokeCheck(
  network: string,
  rpcUrl: string
): Promise<boolean> {
  console.log(`\nRunning smoke checks for network: ${network}`);
  console.log(`RPC URL: ${rpcUrl}\n`);

  // Read deployment registry
  const registry = readDeploymentRegistry(network);
  if (!registry) {
    console.error(`[FAIL] No deployment registry found for network: ${network}`);
    console.error(`       Expected file: src/contracts/deployments/${network}.json`);
    return false;
  }

  // Initialize provider
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  // Verify chain ID matches
  const networkChainId = await provider.getNetwork().then(n => Number(n.chainId));
  if (networkChainId !== registry.chainId) {
    console.error(`[FAIL] Chain ID mismatch:`);
    console.error(`       Registry: ${registry.chainId}`);
    console.error(`       Network: ${networkChainId}`);
    return false;
  }

  const results: SmokeCheckResult[] = [];

  // Check DIDRegistry
  const registryDeployment = getContractDeployment(network, 'DIDRegistry');
  if (registryDeployment) {
    const regAddr = getDeploymentPrimaryAddress(registryDeployment);
    console.log(`Checking DIDRegistry at ${regAddr}...`);
    const result = await smokeCheckDIDRegistry(provider, regAddr);
    results.push(result);
  } else {
    console.log(`[SKIP] DIDRegistry not found in deployment registry`);
  }

  // Check DIDOwnership
  const ownershipDeployment = getContractDeployment(network, 'DIDOwnership');
  if (ownershipDeployment) {
    const ownAddr = getDeploymentPrimaryAddress(ownershipDeployment);
    console.log(`Checking DIDOwnership at ${ownAddr}...`);
    const result = await smokeCheckDIDOwnership(provider, ownAddr);
    results.push(result);
  } else {
    console.log(`[SKIP] DIDOwnership not found in deployment registry`);
  }

  // Print results
  console.log('\n=== Smoke Check Results ===');
  let allPassed = true;

  for (const result of results) {
    if (result.passed) {
      console.log(`[PASS] ${result.contractName} reachable at ${result.address}`);
    } else {
      console.log(`[FAIL] ${result.contractName} at ${result.address}:`);
      result.errors.forEach((error) => {
        console.log(`       - ${error}`);
      });
      allPassed = false;
    }
  }

  if (results.length === 0) {
    console.log('[WARN] No contracts found in deployment registry');
    return false;
  }

  if (allPassed) {
    console.log('\n[PASS] All smoke checks succeeded');
    return true;
  } else {
    console.log('\n[FAIL] Some smoke checks failed');
    return false;
  }
}

/**
 * Main function for standalone execution
 */
async function main() {
  const args = process.argv.slice(2);
  const networkIndex = args.indexOf('--network');
  const network = networkIndex >= 0 && args[networkIndex + 1]
    ? args[networkIndex + 1]
    : process.env.NETWORK || 'localhost';

  const rpcUrl = process.env.RPC_URL || 
    (network === 'sepolia' ? process.env.SEPOLIA_RPC_URL : '') ||
    (network === 'localhost' ? 'http://localhost:8545' : '');

  if (!rpcUrl) {
    console.error(`RPC_URL environment variable is required for network: ${network}`);
    process.exit(1);
  }

  const passed = await runSmokeCheck(network, rpcUrl);
  process.exit(passed ? 0 : 1);
}

// Check if this is the main module (ES modules)
// When run via tsx/node, import.meta.url will match the script being executed
const isMainModule = import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/') || '') ||
  process.argv[1]?.includes('smoke-check');

if (isMainModule) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

