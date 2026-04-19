# SafePsy DID Contracts - Sepolia Testnet Deployment

**Canonical reference**: This is the single source of truth for Sepolia contract addresses and deployment status. All other docs should link here (`apps/api/deployments/SEPOLIA_DEPLOYED_CONTRACTS.md`).

**Network**: Sepolia Testnet  
**Chain ID**: 11155111  
**Deployer**: `0x1F4739e229AdCb1c986C8A8b66f686ddEc29694c`  
**Deployment Date**: February 2025  
**Status**: ✅ All Core Contracts Deployed | Migration: ✅ executeBatch executed (tx `0xff64f2cf...`, block 10218887)

---

## 📋 Contract Overview

| Contract | Type | Address | Status |
|----------|------|---------|--------|
| DIDRegistryV2 | Core | `0x8e5F41f2B8B3E28a8966e37181B257f9E2725bA5` | ✅ Deployed (fixed) |
| DIDOwnershipV2 | Core | `0xac5Ad1482d73d0E09ED3960C02EebF428Ad63722` | ✅ Deployed (fixed) |
| DIDMetadata | UUPS Proxy | `0x27965EE779822819729a662717eAC7360Eb7FCDF` | ✅ Migrated |
| DIDService | UUPS Proxy | `0x2E9058F31127C994f01099406ff3C85d87063627` | ✅ Migrated |
| GovernanceTimelock | Governance | `0xdD26Ade2e6432FE8356CedA5607C0b548fa5397B` | ✅ Deployed |
| DIDIdentityTokenV2 | Legacy | `0x103eAd096f898132E138ad228E35296db983A053` | ✅ Deployed |

**Migration**: scheduleBatch (tx: `0x404bb983...`, block 10217477). **executeBatch** (tx: `0xff64f2cf...`, block 10218887) executed from Safe. Metadata/Service now point to new Registry/Ownership.
**Verify**: `node scripts/verify-timelock-operation.mjs` (use dedicated `SEPOLIA_RPC_URL` if demo RPC returns stale data).

---

## 🔷 Core DID Contracts

### 1. DIDRegistryV2
**Purpose**: ERC721 token representation of DID identity (soulbound token)

- **Address**: `0x8e5F41f2B8B3E28a8966e37181B257f9E2725bA5` (new, correct ownershipContract)
- **Transaction Hash**: `0x61eea6b15b1ab7638f57d401549a2342b30e954240ed148c6c40c4ad518b4fbc`
- **Block Number**: 10204996
- **Etherscan**: https://sepolia.etherscan.io/address/0x8e5F41f2B8B3E28a8966e37181B257f9E2725bA5
- **Features**:
  - Soulbound token (non-transferable)
  - One DID per address enforced
  - Permanent revocation (revoked addresses cannot receive new DIDs)
  - MINTER_ROLE controlled by GovernanceTimelock (after setup)

### 2. DIDOwnershipV2
**Purpose**: Centralized authorization engine for all DID operations

- **Address**: `0xac5Ad1482d73d0E09ED3960C02EebF428Ad63722` (new, correct registryContract)
- **Transaction Hash**: `0xc6a630d983465a56ea229cf926930574580a1453f98f3ec7934478498eb12a83`
- **Block Number**: 10204997
- **Etherscan**: https://sepolia.etherscan.io/address/0xac5Ad1482d73d0E09ED3960C02EebF428Ad63722
- **Features**:
  - Single source of truth for authorization
  - Controller management
  - Delegation support
  - Custom authorization rules
  - DEFAULT_ADMIN_ROLE controlled by GovernanceTimelock (after setup)

---

## 🔄 Upgradeable Contracts (UUPS Proxy Pattern)

### 3. DIDMetadata
**Purpose**: DID document metadata storage and management

- **Proxy Address**: `0x27965EE779822819729a662717eAC7360Eb7FCDF`
- **Implementation Address**: `0xa6000DCc4c4e3dCf17DbD35C30BAB627A3B60e28` (new, with setters; upgrade + setRegistry/setOwnership via executeBatch)
- **Transaction Hash**: `0xf746aad593bb6b8433fac85b96e92d50e8ec59f7c4bd0bb7d6cb92417232cdc4`
- **Block Number**: 10205061
- **Etherscan (Proxy)**: https://sepolia.etherscan.io/address/0x27965EE779822819729a662717eAC7360Eb7FCDF
- **Etherscan (Implementation)**: https://sepolia.etherscan.io/address/0xc4B9C49660DE3B658172D02b96AaA0933Fd2Ac18
- **Features**:
  - UUPS upgradeable (upgrades controlled by GovernanceTimelock)
  - DID document storage
  - Metadata management
  - DEFAULT_ADMIN_ROLE controlled by GovernanceTimelock (after setup)

### 4. DIDService
**Purpose**: DID service endpoint management

- **Proxy Address**: `0x2E9058F31127C994f01099406ff3C85d87063627`
- **Implementation Address**: `0x52223B023aa6C5B91c7027b2Ca2B0899a651F277` (new, with setters; upgrade + setRegistry/setOwnership via executeBatch)
- **Transaction Hash**: `0x471ad1394eafceec9d83166a681208d0025bd5f5c83a2d0612865a79d05ac353`
- **Block Number**: 10205064
- **Etherscan (Proxy)**: https://sepolia.etherscan.io/address/0x2E9058F31127C994f01099406ff3C85d87063627
- **Etherscan (Implementation)**: https://sepolia.etherscan.io/address/0xbaB3EE6446415826f5B0fC779643570f34fFDd79
- **Features**:
  - UUPS upgradeable (upgrades controlled by GovernanceTimelock)
  - Service endpoint management
  - Service discovery
  - DEFAULT_ADMIN_ROLE controlled by GovernanceTimelock (after setup)

---

## ⏰ Governance Contract

### 5. GovernanceTimelock
**Purpose**: Timelock controller for governance operations (72-hour delay for production, 1-hour for testing)

- **Address**: `0xdD26Ade2e6432FE8356CedA5607C0b548fa5397B`
- **Transaction Hash**: `0xd3749d03cd2b50c536fb97b5936307d157022bb3954b89e8a42cfa6792646de4`
- **Block Number**: 10204584
- **Etherscan**: https://sepolia.etherscan.io/address/0xdD26Ade2e6432FE8356CedA5607C0b548fa5397B
- **Configuration**:
  - **minDelay**: 3600 seconds (1 hour for testing, will be 259200 for production)
  - **proposers**: `[0x8644F9AaB59C411AAE7E397aDEAc44a1dc34fCb1]` (Governance Safe)
  - **executors**: `[]` (permissionless execution)
  - **admin**: `0x8644F9AaB59C411AAE7E397aDEAc44a1dc34fCb1` (Governance Safe)
- **Features**:
  - Delayed execution for upgrades and sensitive operations
  - Governance-controlled upgrades (72-hour delay)
  - Emergency pause capability (via Emergency Safe)

---

## 📜 Legacy Contract

### 6. DIDIdentityTokenV2
**Purpose**: Legacy DID identity token (deprecated, replaced by DIDRegistryV2)

- **Address**: `0x103eAd096f898132E138ad228E35296db983A053`
- **Transaction Hash**: `0xa2c7c52684c507087c8a28251069d4f540ba8e3cf5d74379babf333b1395e6d1`
- **Block Number**: 9789472
- **Etherscan**: https://sepolia.etherscan.io/address/0x103eAd096f898132E138ad228E35296db983A053
- **Status**: Legacy contract, not used in current system

---

## 🔐 Governance Safe Addresses

- **Governance Safe**: `0x8644F9AaB59C411AAE7E397aDEAc44a1dc34fCb1` (5 signers, threshold 3)
- **Emergency Safe**: `0x0F630ECB273c391554f88ad756f19a9e9c094983` (3 signers, threshold 2)

**Note**: Safe addresses are registered but should be verified on-chain before use.

---

## 📊 Deployment Statistics

- **Total Contracts Deployed**: 6
- **Core Contracts**: 2 (DIDRegistryV2, DIDOwnershipV2)
- **Upgradeable Contracts**: 2 (DIDMetadata, DIDService)
- **Governance Contracts**: 1 (GovernanceTimelock)
- **Legacy Contracts**: 1 (DIDIdentityTokenV2)
- **Total Transactions**: 6
- **Deployment Blocks**: 9789472 - 10205064

---

## 🔗 Quick Links

### Etherscan Explorer
- **Network**: [Sepolia Testnet Explorer](https://sepolia.etherscan.io/)
- **Deployer Address**: https://sepolia.etherscan.io/address/0x1F4739e229AdCb1c986C8A8b66f686ddEc29694c

### Contract Verification

**Status**: Verification was attempted; Etherscan may return a deprecation message for API V1. Use an Etherscan API key in `apps/api/.env` as `ETHERSCAN_API_KEY` (do not commit the key; rotate if exposed). For API V2 migration see [Etherscan V2 Migration](https://docs.etherscan.io/v2-migration).

**Exact commands** (run from `apps/api` with `ETHERSCAN_API_KEY` set):

```bash
cd apps/api

# DIDOwnershipV2: constructor(registryContract, admin) — deployed with 0x0 then setRegistryContract
npx hardhat verify --network sepolia 0xac5Ad1482d73d0E09ED3960C02EebF428Ad63722 "0x0000000000000000000000000000000000000000" "0x1F4739e229AdCb1c986C8A8b66f686ddEc29694c"

# DIDRegistryV2: constructor(name, symbol, ownershipContract, admin)
npx hardhat verify --network sepolia 0x8e5F41f2B8B3E28a8966e37181B257f9E2725bA5 "SafePsy DID Identity" "SAFEPSY-DID" "0xac5Ad1482d73d0E09ED3960C02EebF428Ad63722" "0x1F4739e229AdCb1c986C8A8b66f686ddEc29694c"

# DIDMetadata implementation (no constructor args)
npx hardhat verify --network sepolia 0xa6000DCc4c4e3dCf17DbD35C30BAB627A3B60e28

# DIDService implementation (no constructor args)
npx hardhat verify --network sepolia 0x52223B023aa6C5B91c7027b2Ca2B0899a651F277

# GovernanceTimelock: constructor(minDelay, proposers, executors, admin)
npx hardhat verify --network sepolia 0xdD26Ade2e6432FE8356CedA5607C0b548fa5397B 3600 "[0x8644F9AaB59C411AAE7E397aDEAc44a1dc34fCb1]" "[]" "0x8644F9AaB59C411AAE7E397aDEAc44a1dc34fCb1"
```

For UUPS proxies (DIDMetadata, DIDService), verify the proxy contract on Etherscan using "Proxy" contract type and implementation address. DIDIdentityTokenV2 (legacy) verify with constructor args matching deployment.

---

## ⚠️ Important Notes

1. **Circular Dependency**: DIDRegistryV2 was deployed with a temporary ownership address due to circular dependency. DIDOwnershipV2 has the correct Registry address, so authorization checks will work correctly.

2. **Governance Setup**: 
   - ✅ **COMPLETED**: Roles transferred to GovernanceTimelock for DIDOwnershipV2, DIDMetadata, and DIDService
   - ⚠️ **PENDING**: DIDRegistryV2 governance setup (deployer doesn't have admin role due to circular dependency)
   - **Action Required**: Manually grant DEFAULT_ADMIN_ROLE and MINTER_ROLE to Timelock on DIDRegistryV2, or redeploy with correct ownership address

3. **Testing Configuration**: GovernanceTimelock is configured with 1-hour delay for testing. For production mainnet deployment, use 259200 seconds (72 hours).

4. **Proxy Contracts**: DIDMetadata and DIDService use UUPS proxy pattern. Always interact with the proxy address, not the implementation address.

5. **Role Status**:
   - **DIDOwnershipV2**: ✅ Timelock has DEFAULT_ADMIN_ROLE, deployer role revoked
   - **DIDMetadata**: ✅ Timelock has DEFAULT_ADMIN_ROLE, deployer role revoked
   - **DIDService**: ✅ Timelock has DEFAULT_ADMIN_ROLE, deployer role revoked
   - **DIDRegistryV2**: ⚠️ Timelock does NOT have roles yet (needs manual setup)

---

## 📝 Next Steps

1. ✅ **Deploy Core Contracts** - COMPLETED
2. ✅ **Deploy Upgradeable Contracts** - COMPLETED
3. ✅ **Deploy GovernanceTimelock** - COMPLETED
4. ✅ **Run setup-governance.ts** - COMPLETED (roles transferred to Timelock)
   - ⚠️ **Note**: DIDRegistryV2 skipped (deployer doesn't have admin role due to circular dependency)
   - ✅ DIDOwnershipV2: Roles transferred to Timelock
   - ✅ DIDMetadata: Roles transferred to Timelock
   - ✅ DIDService: Roles transferred to Timelock
5. ⏳ **Fix DIDRegistryV2 Governance** - PENDING (manual role grant or redeploy)
6. ⏳ **Verify Contracts on Etherscan** - PENDING
7. ⏳ **Comprehensive Testing** - PENDING
8. ⏳ **Security Audit** - PENDING (required for mainnet)
9. ⏳ **Mainnet Deployment** - PENDING (after audit)

---

## 🔐 Governance Setup Status

**Setup Date**: February 6, 2025  
**Setup Block**: 10205110

### Role Transfer Summary

| Contract | DEFAULT_ADMIN_ROLE | MINTER_ROLE | Status |
|----------|-------------------|-------------|--------|
| DIDRegistryV2 | ⚠️ Not transferred | ⚠️ Not transferred | ⚠️ **SKIPPED** (deployer lacks admin role) |
| DIDOwnershipV2 | ✅ Transferred to Timelock | N/A | ✅ **COMPLETED** |
| DIDMetadata | ✅ Transferred to Timelock | N/A | ✅ **COMPLETED** |
| DIDService | ✅ Transferred to Timelock | N/A | ✅ **COMPLETED** |

### ⚠️ DIDRegistryV2 Governance Issue

**Problem**: DIDRegistryV2 was deployed with a temporary ownership address (deployer address) due to circular dependency between DIDRegistryV2 and DIDOwnershipV2. As a result, the deployer does not have DEFAULT_ADMIN_ROLE on DIDRegistryV2.

**Impact**: 
- GovernanceTimelock does NOT have DEFAULT_ADMIN_ROLE or MINTER_ROLE on DIDRegistryV2
- DIDRegistryV2 cannot be controlled by governance until this is fixed

**Solutions**:
1. **Option A (Recommended)**: Run the wiring script with the deployer key (if deployer has admin):
   ```bash
   cd apps/api
   export PRIVATE_KEY=<deployer_private_key>
   export SEPOLIA_RPC_URL=<your_sepolia_rpc_url>
   node scripts/wire-registry-governance-only.mjs
   ```
   Or run full governance setup (only Registry/Ownership will be updated if others already wired):
   ```bash
   node scripts/setup-governance.mjs
   ```
2. **Option B**: Redeploy DIDRegistryV2 with correct ownership address (requires redeploying both contracts)

**Manual Role Grant** (if deployer has admin and you prefer to call from Etherscan/Safe):
```solidity
// On DIDRegistryV2 contract (0x8e5F41f2B8B3E28a8966e37181B257f9E2725bA5)
grantRole(DEFAULT_ADMIN_ROLE, 0xdD26Ade2e6432FE8356CedA5607C0b548fa5397B); // Timelock
grantRole(MINTER_ROLE, 0xdD26Ade2e6432FE8356CedA5607C0b548fa5397B); // Timelock
```

### ✅ Successfully Configured Contracts

- **DIDOwnershipV2**: Timelock has DEFAULT_ADMIN_ROLE, deployer role revoked
- **DIDMetadata**: Timelock has DEFAULT_ADMIN_ROLE, deployer role revoked  
- **DIDService**: Timelock has DEFAULT_ADMIN_ROLE, deployer role revoked

---

## 📄 Deployment Registry

All deployment information is stored in:
- **File**: `apps/api/deployments/sepolia-latest.json`
- **Format**: JSON with contract addresses, transaction hashes, and block numbers

---

---

## 📋 Audit Summary (February 2025)

**Report**: `documentation/SMART_CONTRACTS_AUDIT_REPORT.md`

**Tests**: `npx hardhat test test/Audit.Invariants.test.js test/UUPS.Upgrade.test.js` (12 passing). Optional: add `test/DIDOwnership.Authorization.test.js test/DIDMetadata.StorageLimits.test.js test/DIDService.StorageLimits.test.js` for 53 more (**65 total passing**).

**Scripts**:
- `node scripts/audit-on-chain-verification.mjs` – wiring, roles
- `node scripts/bytecode-verification.mjs` – compiled vs on-chain bytecode (use `--offline` if RPC rate-limited)
- `npx tsx src/contracts/scripts/fix-sepolia-ownership.ts` – deploy new Registry+Ownership with correct wiring

**Fix**: Deploy script uses two-phase deploy. `fix-sepolia-ownership.mjs` was run; new Registry+Ownership deployed. New impls deployed; governance proposal in `metadata-service-upgrade-proposal.json`—**Safe executed scheduleBatch** (tx `0x404bb983...`). **executeBatch** ready 1h after 12:33:48 UTC—run `node scripts/execute-timelock-batch.mjs`.

**API Configuration** (after executeBatch): Set `DID_REGISTRY_ADDRESS=0x8e5F41f2B8B3E28a8966e37181B257f9E2725bA5` and `DID_OWNERSHIP_ADDRESS=0xac5Ad1482d73d0E09ED3960C02EebF428Ad63722` in `.env` for Sepolia. See `apps/api/.env.example`.

**Verify Timelock**: `node scripts/verify-timelock-operation.mjs` — checks operation state and Metadata/Service wiring.

---

**Last Updated**: February 2025  
**Maintained By**: SafePsy Development Team
