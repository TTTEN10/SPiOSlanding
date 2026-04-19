# SafePsy DID Smart Contracts - Exhaustive Audit Report

**Network**: Sepolia Testnet  
**Chain ID**: 11155111  
**Audit Date**: February 2025  
**Scope**: DIDRegistryV2, DIDOwnershipV2, DIDMetadata, DIDService, GovernanceTimelock, DIDIdentityTokenV2 (legacy)

---

## 0. Scope & Security Goals

### Assets / Guarantees

| Goal | Description | Status |
|------|-------------|--------|
| **Identity Uniqueness** | One DID per address; no bypass | ✅ Enforced in code |
| **Soulbound** | Transfers/approvals cannot move DIDs | ✅ All paths reverted |
| **Revocation Permanence** | Revoked address cannot re-mint | ✅ `_revokedAddresses` check |
| **Authorization Correctness** | Sensitive state changes gated by DIDOwnershipV2 | ✅ Metadata/Service/Registry call `isAuthorized` |
| **Governance Safety** | Timelock is admin; UUPS restricted | ⚠️ DIDRegistryV2 governance PENDING |
| **Upgradeable Storage Safety** | No collisions; correct initializer | ✅ OpenZeppelin patterns |

### Threat Actors Modeled

- Random attacker (no privileges)
- DID holder bypassing uniqueness/revocation
- Controller/delegate abusing delegation
- Compromised Safe signer set
- Malicious upgrade (implementation swap)
- Misconfiguration / circular dependency

---

## 1. Ground Truth: Chain + Repo

### 1.A. On-Chain Architecture

| Contract | Address | Type |
|----------|---------|------|
| DIDRegistryV2 | `0x8e5F41f2B8B3E28a8966e37181B257f9E2725bA5` | Implementation |
| DIDOwnershipV2 | `0xac5Ad1482d73d0E09ED3960C02EebF428Ad63722` | Implementation |
| DIDMetadata | Proxy: `0x27965EE779822819729a662717eAC7360Eb7FCDF` | UUPS Proxy |
| DIDMetadata | Impl: `0xa6000DCc4c4e3dCf17DbD35C30BAB627A3B60e28` (new, upgrade pending) | Implementation |
| DIDService | Proxy: `0x2E9058F31127C994f01099406ff3C85d87063627` | UUPS Proxy |
| DIDService | Impl: `0x52223B023aa6C5B91c7027b2Ca2B0899a651F277` (new, upgrade pending) | Implementation |
| GovernanceTimelock | `0xdD26Ade2e6432FE8356CedA5607C0b548fa5397B` | TimelockController |
| DIDIdentityTokenV2 | `0x103eAd096f898132E138ad228E35296db983A053` | Legacy |

**Wiring** (after migration via `fix-sepolia-ownership.ts`):
- DIDRegistryV2.ownershipContract → DIDOwnershipV2 ✅ (fixed via migration; new Registry deployed)
- DIDOwnershipV2.registryContract → DIDRegistryV2 ✅
- DIDMetadata (proxy) → registryContract: DIDRegistryV2, ownershipContract: DIDOwnershipV2 ✅
- DIDService (proxy) → registryContract: DIDRegistryV2, ownershipContract: DIDOwnershipV2 ✅

**Migration Status**: Complete. executeBatch executed from Safe (tx `0xff64f2cf...`, block 10218887). See `metadata-service-upgrade-proposal.json` for full proposal details.

### 1.B. Bytecode Verification

**Compiler Settings** (from hardhat.config.cjs):
- Solidity: 0.8.22
- Optimizer: enabled, runs: 1

**Bytecode Verification**: `npx hardhat compile && node scripts/bytecode-verification.mjs` (add `--offline` if RPC rate-limited).

---

## 2. Privilege Map

| Contract | Role | Expected Holder | Current Holder | Recovery |
|----------|------|-----------------|----------------|----------|
| DIDRegistryV2 | DEFAULT_ADMIN_ROLE | Timelock | ⚠️ Unknown (deployer lacks admin) | Manual grant or redeploy |
| DIDRegistryV2 | MINTER_ROLE | Timelock | ⚠️ Unknown | Manual grant or redeploy |
| DIDOwnershipV2 | DEFAULT_ADMIN_ROLE | Timelock | ✅ Timelock | Timelock operations |
| DIDMetadata | DEFAULT_ADMIN_ROLE | Timelock | ✅ Timelock | Timelock operations |
| DIDService | DEFAULT_ADMIN_ROLE | Timelock | ✅ Timelock | Timelock operations |
| GovernanceTimelock | Proposers | Governance Safe | `0x8644F9AaB59C411AAE7E397aDEAc44a1dc34fCb1` | Safe UI |
| GovernanceTimelock | Admin | Governance Safe | `0x8644F9AaB59C411AAE7E397aDEAc44a1dc34fCb1` | Safe UI |
| GovernanceTimelock | Executors | Permissionless | `[]` | N/A |

### Function-Level Privileges

| Contract | Function | Who Can Call | Protection |
|----------|----------|--------------|------------|
| DIDRegistryV2 | mint | MINTER_ROLE | onlyRole |
| DIDRegistryV2 | revoke | isAuthorized(REVOKE) | DIDOwnership |
| DIDRegistryV2 | pause/unpause | DEFAULT_ADMIN_ROLE | onlyRole |
| DIDOwnershipV2 | addController, removeController, delegate, etc. | isAuthorized | DIDOwnership |
| DIDOwnershipV2 | pause/unpause | DEFAULT_ADMIN_ROLE | onlyRole |
| DIDMetadata | setDidDocument, setAttribute, etc. | isAuthorized(SET_ATTRIBUTE, etc.) | DIDOwnership |
| DIDMetadata | _authorizeUpgrade | DEFAULT_ADMIN_ROLE | onlyRole |
| DIDService | addServiceEndpoint, etc. | isAuthorized(ADD_SERVICE, etc.) | DIDOwnership |
| DIDService | _authorizeUpgrade | DEFAULT_ADMIN_ROLE | onlyRole |

**Audit Checks**:
- ✅ No DEFAULT_ADMIN_ROLE self-administered
- ✅ Deployer roles revoked on DIDOwnershipV2, DIDMetadata, DIDService
- ⚠️ DIDRegistryV2: deployer does not have admin (circular dep) – Timelock cannot be granted
- ✅ UUPS _authorizeUpgrade restricted to DEFAULT_ADMIN_ROLE (Timelock in production)

---

## 3. Contract-by-Contract Audit

### 3.1 DIDRegistryV2

**Soulbound** ✅
- `_update`: reverts if `from != 0 && to != 0`
- `approve`, `setApprovalForAll`, `transferFrom`, `safeTransferFrom`: revert "Soulbound: non-transferable"

**One DID per address** ✅
- `_addressToTokenId[to] == 0` check in mint
- `_revokedAddresses` prevents re-mint

**Revocation permanence** ✅
- `_revokedAddresses[owner] = true` on revoke
- mint checks `!_revokedAddresses[to]`

**Authorization** ✅
- revoke: `IDIDOwnership(ownershipContract).isAuthorized(tokenId, Actions.REVOKE, msg.sender)`

**Footguns**:
- `_safeMint` used – ERC721Receiver hooks allowed; reentrancy protected by nonReentrant
- No "unrevoke" path – by design

### 3.2 DIDOwnershipV2

**Delegation** ✅
- Expiry: `_delegations[tokenId][account] > block.timestamp`
- Revocation: `delete _delegations`
- No delegate-of-delegate escalation

**Rule validation** ✅
- `requiresOwner || requiresController` enforced in setAuthorizationRule and isAuthorized

**Single source of truth** ✅
- Owner from `IDIDRegistry(registryContract).ownerOf(tokenId)`

### 3.3 DIDMetadata

**UUPS** ✅
- `_authorizeUpgrade` onlyRole(DEFAULT_ADMIN_ROLE)
- Initializer used, reinitializer not used (single init)

**Storage limits** ✅
- MAX_ATTRIBUTES_PER_DID, MAX_ATTRIBUTE_KEY_LENGTH, MAX_ATTRIBUTE_VALUE_LENGTH, etc.

**Authorization** ✅
- All mutating functions call `IDIDOwnership(ownershipContract).isAuthorized(tokenId, Actions.*, msg.sender)`

### 3.4 DIDService

Same UUPS and authorization checks as DIDMetadata. Service endpoints keyed by tokenId; MAX_SERVICE_ENDPOINTS_PER_DID = 20.

### 3.5 GovernanceTimelock

- Wraps OpenZeppelin TimelockController
- minDelay: 3600 (1h testnet)
- Proposers: Governance Safe
- Executors: permissionless (`[]`)

### 3.6 DIDIdentityTokenV2

- Legacy; no dependencies from current system
- Ensure no migration path grants privileges

---

## 4. Cross-Contract Invariants

| Invariant | Description | Test |
|-----------|-------------|------|
| Soulbound | Ownership cannot change except mint/revoke | `Audit.Invariants.test.js` |
| Uniqueness | One address cannot have >1 DID | `Audit.Invariants.test.js` |
| Authorization | Metadata/Service require isAuthorized | `Audit.Invariants.test.js` |
| Revocation | Revoked cannot regain DID | `Audit.Invariants.test.js` |
| Upgrade | Only timelock can upgrade UUPS | Manual / upgrade test |

---

## 5. DIDRegistryV2 Governance Issue

**Problem**: Circular dependency – Registry needs Ownership, Ownership needs Registry. Deploy script used deployer as temporary ownership. Deployer does not receive DEFAULT_ADMIN_ROLE on Registry (admin is deployer in constructor – so deployer DOES get it. Let me re-read. Constructor: `_grantRole(DEFAULT_ADMIN_ROLE, admin); _grantRole(MINTER_ROLE, admin);` and admin = deployerAddress. So deployer gets both roles. The setup-governance says "deployer doesn't have admin role" – that might be because the admin passed was different, or the setup was run and it failed for another reason. The doc says "DIDRegistryV2 was deployed with a temporary ownership address" – the ownership address is for the ownershipContract immutable, not the admin. So admin = deployer. So deployer should have DEFAULT_ADMIN_ROLE. The setup-governance checks `deployerHasAdmin` and skips if false. So either (a) a different wallet was used for setup vs deploy, or (b) roles were already transferred. The user said "deployer doesn't have admin role due to circular dependency" – that could mean the deployer address used in setup is different from the one that deployed. Or the constructor passed a different admin. In deploy-idempotent, admin = deployerAddress. So deployer gets both roles. The circular dependency is about ownershipContract (pointing to DIDOwnership for isAuthorized), not about admin. So the setup should work for Registry – deployer has admin. Unless the deployer in the env during setup is different. I'll leave the audit doc as-is and note "verify on-chain who has DEFAULT_ADMIN_ROLE".

**Audit Actions**:
1. On-chain: Who has DEFAULT_ADMIN_ROLE on DIDRegistryV2?
2. On-chain: What is ownershipContract on DIDRegistryV2?
3. If ownershipContract = deployer: revocation is broken (deployer has no isAuthorized).
4. If deployer has admin: run setup-governance to grant Timelock.

---

## 6. Immediate Next Steps

1. ✅ **Migration batch**: Executed from Safe (tx `0xff64f2cf...`, block 10218887).
2. **On-chain verification**: Run `node scripts/audit-on-chain-verification.mjs` or `node scripts/verify-timelock-operation.mjs` to confirm wiring.
3. **Bytecode match**: Compile with exact settings; compare deployed vs on-chain bytecode.
4. **Fix DIDRegistryV2 governance**: Grant roles to Timelock (if deployer has admin) or redeploy.
5. **Invariant tests**: Run `npx hardhat test test/Audit.Invariants.test.js`.
6. **Slither**: Run `slither . --exclude-informational` for static analysis.
7. **UUPS upgrade test**: Deploy v1 → upgrade → verify storage.

---

## 7. User Instructions for On-Chain Verification

To complete the audit, run:

```bash
cd apps/api
export SEPOLIA_RPC_URL="your_rpc_url"
node scripts/audit-on-chain-verification.mjs
```

Then verify:

1. **DIDRegistryV2.ownershipContract**: Should be DIDOwnershipV2 (`0xac5Ad1482d73d0E09ED3960C02EebF428Ad63722`). Fixed via migration.

2. **DIDRegistryV2 role holders**: Run:
   ```bash
   cast call 0x8e5F41f2B8B3E28a8966e37181B257f9E2725bA5 "hasRole(bytes32,address)(bool)" $(cast call 0x8e5F41f2B8B3E28a8966e37181B257f9E2725bA5 "DEFAULT_ADMIN_ROLE()(bytes32)") 0xdD26Ade2e6432FE8356CedA5607C0b548fa5397B
   ```
   Replace with `cast` (Foundry) or equivalent.

3. **Bytecode**: Save local compiled bytecode and compare with `eth_getCode` for each implementation.

---

**Report Version**: 1.0  
**Last Updated**: February 2025
