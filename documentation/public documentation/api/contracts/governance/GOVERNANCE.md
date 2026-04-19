# DID System Governance Documentation

## Quick Reference

- **GovernanceTimelock.sol** - OpenZeppelin TimelockController wrapper (72h delay)
- **GOVERNANCE.md** - This document
- **setup-governance.ts** - Automated governance role setup script

**Key Invariants:** DID identity ≠ governance | No single key risk | 72h upgrade delay | Emergency pause via separate Safe

## Overview

This document describes the governance architecture for the DID (Decentralized Identifier) smart contract system. The governance model is designed to preserve:

- ✅ **Immutability guarantees** - Core contracts are immutable
- ✅ **Centralized authorization in DIDOwnership** - Single source of truth
- ✅ **UUPS upgrade boundaries** - Controlled upgrades with timelock
- ✅ **Privacy-first design** - Governance cannot access identity data

## Governance Architecture

### Governance Components

| Component | Purpose | Scope |
|-----------|---------|-------|
| **Gnosis Safe (Multisig)** | Collective authority | All privileged roles |
| **TimelockController (OZ)** | Delayed execution | Upgrades + sensitive ops |
| **Emergency Safe (small multisig)** | Break-glass | Pause only |

### Key Principles

⚠️ **No multisig logic inside DID contracts**  
⚠️ **Governance is orthogonal, not entangled**

Governance operates externally to the DID contracts. The DID contracts themselves contain no governance logic - they only respond to role-based access control.

## Role Mapping

### 1. DIDRegistry.sol (Immutable Core)

**Current State:**
- `MINTER_ROLE` - Controls DID minting
- `DEFAULT_ADMIN_ROLE` - Controls admin functions
- `pause/unpause` - Emergency pause functionality

**Governance Mapping:**

| Capability | Who Controls It |
|------------|----------------|
| `MINTER_ROLE` | Governance Timelock |
| `pause/unpause` | Emergency Safe |
| Admin role | Timelock only |

**Final Authority Chain:** `Multisig → Timelock → DIDRegistry`

**What NEVER Changes:**
- ❌ No upgrades
- ❌ No migration
- ❌ No role reassignment bypass

### 2. DIDOwnership.sol (Authorization Brain – Immutable)

**Current State:**
- Single source of truth for authorization
- No multisig logic
- No upgradeability

**Governance Mapping:**

| Capability | Who |
|------------|-----|
| `DEFAULT_ADMIN_ROLE` | Timelock |
| `pause/unpause` | Emergency Safe |
| Authorization rules | Via authorized DID actions only |

**Key Invariants:**
- 🔐 Governance cannot impersonate identities
- 🔐 Governance only governs rules, not identity actions

### 3. DIDMetadata.sol (UUPS Upgradeable)

**Current State:**
- `_authorizeUpgrade()` guarded by admin
- Uses Ownership for auth

**Governance Mapping:**

| Capability | Who |
|------------|-----|
| Upgrade (UUPS) | Timelock only |
| Metadata edits | DIDOwnership |
| Emergency pause | Emergency Safe (optional) |

**Timelock Delay Recommendation:** 72h minimum (health / identity-grade)

### 4. DIDService.sol (UUPS Upgradeable)

**Same model as DIDMetadata:**

| Capability | Who |
|------------|-----|
| Upgrade | Timelock |
| Service edits | DIDOwnership |
| Pause | Emergency Safe |

## Governance Execution Flow

### Standard Governance Proposal Flow

```
1. Proposal Drafted
   └─> Upgrade / role change proposal created

2. Submitted via Governance Safe
   └─> Proposal submitted to Gnosis Safe (5 signers, threshold 3)

3. Approved by ≥3 Signers
   └─> Multisig approval process

4. Queued in Timelock
   └─> Proposal queued with 72h delay

5. 72h Delay
   └─> Community review period

6. Anyone Executes
   └─> Permissionless execution after delay

7. Events Emitted
   └─> Audit trail created
```

### Emergency Pause Flow

```
1. Emergency Detected
   └─> Security issue identified

2. Emergency Safe Approval
   └─> Small multisig (2-3 signers) approves pause

3. Immediate Pause
   └─> Contract paused (no timelock delay)

4. Investigation Period
   └─> Issue investigated

5. Unpause via Timelock
   └─> Unpause requires full governance (72h delay)
```

## Deployment Instructions

### Step 0: Add Dependencies

```bash
npm install @openzeppelin/contracts @openzeppelin/contracts-upgradeable
```

### Step 1: Deploy GovernanceTimelock

**File:** `apps/api/src/contracts/governance/GovernanceTimelock.sol`

**Parameters:**
- `minDelay`: 72 hours (259200 seconds)
- `proposers`: `[GOVERNANCE_SAFE]`
- `executors`: `[address(0)]` (permissionless execution)
- `admin`: `GOVERNANCE_SAFE`

**Label address:** `GOVERNANCE_TIMELOCK`

### Step 2: Deploy Governance Safe (OFF-CHAIN via Safe UI)

**Required Configuration:**
- **Network:** Sepolia Testnet (for testing) / Ethereum Mainnet (for production)
- **Signers:** 5 addresses (5-of-5 owners)
- **Threshold:** 3 signatures required (3-of-5)
- **Label:** `GOVERNANCE_SAFE`

#### Detailed Safe UI Instructions for Governance Safe

1. **Navigate to Safe UI:**
   - Go to [https://app.safe.global/](https://app.safe.global/)
   - Connect your wallet (MetaMask, WalletConnect, etc.)

2. **Select Network:**
   - Click the network selector (top right)
   - Select **Sepolia Testnet** (for testing) or **Ethereum Mainnet** (for production)
   - Ensure you have sufficient ETH for deployment (deployment costs ~0.01-0.02 ETH)

3. **Create New Safe:**
   - Click **"Create Safe"** button
   - Read and accept the terms of service
   - Click **"Continue"**

4. **Configure Owners:**
   - Add **5 owner addresses** (one at a time)
   - For each owner:
     - Click **"Add owner"**
     - Enter the wallet address (or scan QR code)
     - Add a name/label for identification (e.g., "Governance Signer 1", "Governance Signer 2", etc.)
   - Verify all 5 addresses are correct before proceeding

5. **Set Threshold:**
   - Set **"Threshold"** to **3**
   - This means 3 out of 5 signatures are required for transactions
   - Confirm the setup: "3 out of 5 owners"

6. **Review Configuration:**
   - Review all 5 owners and their addresses
   - Verify threshold is set to 3
   - Verify network is correct (Sepolia or Mainnet)
   - Click **"Next"**

7. **Deploy Safe:**
   - Review the Safe deployment transaction
   - Click **"Create"** or **"Deploy Safe"**
   - Sign the transaction with your wallet
   - Wait for deployment confirmation (~30-60 seconds)

8. **Export Safe Address:**
   - After deployment, the Safe address will be displayed
   - Copy the Safe address (starts with `0x...`)
   - **Verify the address** by:
     - Checking it on Etherscan/Sepolia Explorer
     - Confirming it matches the address shown in Safe UI
     - Verifying network is correct
   - Save this address as `GOVERNANCE_SAFE` address

9. **Verify Safe Deployment:**
   - Open the Safe in Safe UI
   - Click **"Settings"** → **"Safe Details"**
   - Verify:
     - Number of owners: 5
     - Threshold: 3
     - Network: Sepolia (or Mainnet)
     - Safe address matches what you copied

10. **Save Safe Configuration:**
    - Note the Safe address for this network
    - Update the deployment JSON file (see below)

### Step 3: Deploy Emergency Safe (OFF-CHAIN via Safe UI)

**Required Configuration:**
- **Network:** Sepolia Testnet (for testing) / Ethereum Mainnet (for production)
- **Signers:** 3 addresses (3-of-3 owners)
- **Threshold:** 2 signatures required (2-of-3)
- **Label:** `EMERGENCY_SAFE`

#### Detailed Safe UI Instructions for Emergency Safe

1. **Navigate to Safe UI:**
   - Go to [https://app.safe.global/](https://app.safe.global/)
   - Connect your wallet
   - Ensure you're on the same network as Governance Safe

2. **Select Network:**
   - Click the network selector (top right)
   - Select **Sepolia Testnet** (for testing) or **Ethereum Mainnet** (for production)

3. **Create New Safe:**
   - Click **"Create Safe"** button
   - Accept terms of service
   - Click **"Continue"**

4. **Configure Owners:**
   - Add **3 owner addresses** (one at a time)
   - For each owner:
     - Click **"Add owner"**
     - Enter the wallet address (or scan QR code)
     - Add a name/label for identification (e.g., "Emergency Signer 1", "Emergency Signer 2", "Emergency Signer 3")
   - Verify all 3 addresses are correct

5. **Set Threshold:**
   - Set **"Threshold"** to **2**
   - This means 2 out of 3 signatures are required for transactions
   - Confirm the setup: "2 out of 3 owners"

6. **Review Configuration:**
   - Review all 3 owners and their addresses
   - Verify threshold is set to 2
   - Verify network is correct
   - Click **"Next"**

7. **Deploy Safe:**
   - Review the Safe deployment transaction
   - Click **"Create"** or **"Deploy Safe"**
   - Sign the transaction with your wallet
   - Wait for deployment confirmation

8. **Export Safe Address:**
   - After deployment, copy the Safe address
   - **Verify the address** by:
     - Checking it on Etherscan/Sepolia Explorer
     - Confirming it matches the address shown in Safe UI
     - Verifying network is correct
   - Save this address as `EMERGENCY_SAFE` address

9. **Verify Safe Deployment:**
   - Open the Safe in Safe UI
   - Click **"Settings"** → **"Safe Details"**
   - Verify:
     - Number of owners: 3
     - Threshold: 2
     - Network: Sepolia (or Mainnet)
     - Safe address matches what you copied

10. **Save Safe Configuration:**
    - Note the Safe address for this network
    - Update the deployment JSON file (see below)

#### How to Export Safe Address for Documentation

1. **From Safe UI:**
   - Open the Safe in Safe UI
   - The Safe address is displayed at the top (copy icon available)
   - Also visible in Settings → Safe Details

2. **From Blockchain Explorer:**
   - Search for the Safe address on Etherscan/Sepolia Explorer
   - Verify it's a Safe contract (check contract code)
   - Copy the address from the explorer

3. **Verify Safe Configuration On-Chain:**
   ```bash
   # Using ethers.js or web3
   # Check Safe owners and threshold
   # Address: <SAFE_ADDRESS>
   # Contract: Gnosis Safe Proxy (verified on Etherscan)
   ```

4. **Update Deployment Files:**
   - Add `governanceSafe` and `emergencySafe` addresses to:
     - `apps/api/deployments/sepolia-latest.json` (for Sepolia)
     - `apps/api/deployments/local-latest.json` (for local testing)
     - Create `apps/api/deployments/mainnet-latest.json` (for mainnet)
   - See example format below

#### Deployment JSON Format

Add the Safe addresses to your deployment JSON files:

```json
{
  "network": "sepolia",
  "networkName": "Sepolia Testnet",
  "contractName": "DIDIdentityToken",
  "contractAddress": "0x...",
  "governanceSafe": "0x...",  // Governance Safe address (5-of-5, threshold 3)
  "emergencySafe": "0x...",   // Emergency Safe address (3-of-3, threshold 2)
  "governanceSafeConfig": {
    "signers": 5,
    "threshold": 3,
    "description": "Governance Safe - controls timelock proposals"
  },
  "emergencySafeConfig": {
    "signers": 3,
    "threshold": 2,
    "description": "Emergency Safe - break-glass pause functionality"
  },
  ...
}
```

#### Verification Checklist

Before proceeding to Step 4, verify:

- [ ] Governance Safe deployed on correct network
- [ ] Governance Safe has 5 owners configured
- [ ] Governance Safe threshold is 3
- [ ] Governance Safe address exported and saved
- [ ] Emergency Safe deployed on correct network
- [ ] Emergency Safe has 3 owners configured
- [ ] Emergency Safe threshold is 2
- [ ] Emergency Safe address exported and saved
- [ ] Both Safe addresses added to deployment JSON file
- [ ] Both Safes verified on blockchain explorer

### Step 4: Wire DIDRegistry Roles

After deployment, execute (via Timelock):

```solidity
// Grant roles to Timelock
grantRole(DEFAULT_ADMIN_ROLE, GOVERNANCE_TIMELOCK);
grantRole(MINTER_ROLE, GOVERNANCE_TIMELOCK);

// Revoke deployer
revokeRole(DEFAULT_ADMIN_ROLE, DEPLOYER);
```

⚠️ **All via Timelock, not direct calls.**

### Step 5: Wire DIDOwnership Roles

```solidity
grantRole(DEFAULT_ADMIN_ROLE, GOVERNANCE_TIMELOCK);
revokeRole(DEFAULT_ADMIN_ROLE, DEPLOYER);

// Optional: Grant pause role to Emergency Safe
grantRole(PAUSER_ROLE, EMERGENCY_SAFE);
```

### Step 6: Secure UUPS Upgrades (Metadata + Service)

**Verify `_authorizeUpgrade`:**

Your code already does this correctly:

```solidity
function _authorizeUpgrade(address)
    internal
    override
    onlyRole(DEFAULT_ADMIN_ROLE)
{}
```

**Assign admin role:**

```solidity
grantRole(DEFAULT_ADMIN_ROLE, GOVERNANCE_TIMELOCK);
revokeRole(DEFAULT_ADMIN_ROLE, DEPLOYER);
```

### Step 7: Emergency Pause Wiring

**Note:** Current contracts use `DEFAULT_ADMIN_ROLE` for pause/unpause, not a separate `PAUSER_ROLE`.

**Option A: Grant DEFAULT_ADMIN_ROLE to Emergency Safe (Current Implementation)**
```solidity
// This grants full admin powers, not just pause
grantRole(DEFAULT_ADMIN_ROLE, EMERGENCY_SAFE);
```

**Option B: Add PAUSER_ROLE to Contracts (Recommended for Production)**

To achieve true separation (pause-only for Emergency Safe), modify contracts to use a custom `PAUSER_ROLE`:

```solidity
bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

function pause() external onlyRole(PAUSER_ROLE) {
    _pause();
}

function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
    _unpause();
}
```

Then grant roles:
```solidity
grantRole(PAUSER_ROLE, EMERGENCY_SAFE);  // Pause only
// DEFAULT_ADMIN_ROLE remains with Timelock for unpause
```

**Rules:**
- Emergency Safe should have pause capability
- Unpause requires full governance (Timelock with 72h delay)
- Consider implementing PAUSER_ROLE for true separation

### Step 8: Automated Setup Script

Use the provided setup script:

```bash
# Set environment variables
export PRIVATE_KEY="your_deployer_key"
export RPC_URL="https://your-rpc-endpoint"
export GOVERNANCE_TIMELOCK="0x..."
export GOVERNANCE_SAFE="0x..."
export EMERGENCY_SAFE="0x..."
export DID_REGISTRY="0x..."
export DID_OWNERSHIP="0x..."
export DID_METADATA="0x..."
export DID_SERVICE="0x..."

# Run setup
npx ts-node apps/api/src/contracts/scripts/setup-governance.ts
```

## Governance Invariants (Formal)

The system must guarantee:

### ✅ DID identity ≠ governance
- Identity authority is separate from governance
- Governance cannot impersonate or control identities
- Only DID owners control their identity data

### ✅ No single key risk
- Multisig required for all privileged operations
- Minimum 3-of-5 for governance
- Minimum 2-of-3 for emergency

### ✅ Upgrade transparency
- All upgrades require 72h timelock delay
- Community can review before execution
- Permissionless execution after delay

### ✅ Emergency containment
- Emergency pause available (no delay)
- Unpause requires full governance (72h delay)
- Prevents permanent lockout

### ✅ Audit-ready governance
- All operations emit events
- Full audit trail on-chain
- Transparent proposal and execution history

### ✅ Health-grade compliance posture
- 72h minimum delay for identity-grade systems
- Multisig for critical operations
- Separation of concerns (governance vs identity)

## Threat Model

### Protected Against

1. **Single Point of Failure**
   - Multisig prevents single key compromise
   - Timelock prevents immediate malicious actions

2. **Governance Impersonation**
   - Governance cannot control identities
   - DIDOwnership enforces identity authority

3. **Rapid Malicious Upgrades**
   - 72h delay allows community review
   - Permissionless execution enables community response

4. **Emergency Lockout**
   - Emergency pause available without delay
   - Unpause requires full governance process

5. **Role Bypass**
   - All roles managed through AccessControl
   - No direct admin functions bypass

### Not Protected Against

1. **Multisig Compromise**
   - If 3+ signers compromised, governance can be controlled
   - Mitigation: Use hardware wallets, geographic distribution

2. **Timelock Admin Compromise**
   - If Timelock admin compromised, roles can be reassigned
   - Mitigation: Use multisig as admin, consider renouncing

3. **Emergency Safe Compromise**
   - If Emergency Safe compromised, contracts can be paused
   - Mitigation: Unpause requires full governance (72h delay)

## Best Practices

### For Governance Safe Signers

1. Use hardware wallets
2. Geographic distribution
3. Regular key rotation
4. Monitor for suspicious proposals

### For Emergency Safe Signers

1. Keep keys secure and accessible
2. Test pause/unpause flow regularly
3. Document emergency procedures

### For Contract Upgrades

1. Always test on testnet first
2. Provide detailed upgrade notes
3. Allow full 72h review period
4. Monitor events after execution

## Monitoring and Alerts

### Key Events to Monitor

1. **Role Changes**
   - `RoleGranted` / `RoleRevoked` events
   - Alert on unexpected role changes

2. **Upgrade Proposals**
   - Timelock `CallScheduled` events
   - Alert on all upgrade proposals

3. **Emergency Actions**
   - `Paused` / `Unpaused` events
   - Immediate alert on pause

4. **Governance Actions**
   - All Timelock operations
   - Track proposal → execution flow

## Verification and Recreation Guide

### How to Verify Existing Safe Configuration

1. **Verify Safe Address:**
   ```bash
   # Check Safe on blockchain explorer
   # Sepolia: https://sepolia.etherscan.io/address/<SAFE_ADDRESS>
   # Mainnet: https://etherscan.io/address/<SAFE_ADDRESS>
   
   # Verify it's a Safe contract
   # - Check contract code (should show Safe Proxy contract)
   # - Verify owners and threshold match expected values
   ```

2. **Verify Safe Configuration via Safe UI:**
   - Open [https://app.safe.global/](https://app.safe.global/)
   - Search for Safe address
   - Navigate to **Settings** → **Safe Details**
   - Verify:
     - Number of owners matches expected (5 for Governance, 3 for Emergency)
     - Threshold matches expected (3 for Governance, 2 for Emergency)
     - Network is correct
     - Safe address matches deployment JSON

3. **Verify via Smart Contract (Programmatic):**
   ```solidity
   // Using ethers.js
   const safeABI = [
     "function getOwners() external view returns (address[] memory)",
     "function getThreshold() external view returns (uint256)",
     "function isOwner(address owner) external view returns (bool)"
   ];
   
   const safeContract = new ethers.Contract(safeAddress, safeABI, provider);
   const owners = await safeContract.getOwners();
   const threshold = await safeContract.getThreshold();
   
   console.log("Owners:", owners);
   console.log("Threshold:", threshold.toString());
   ```

### How to Recreate Safe Configuration

If you need to recreate the Safes (e.g., for a new network or after verification):

1. **For Governance Safe:**
   - Follow Step 2 instructions in "Deployment Instructions"
   - Use **5 signers**, **threshold 3**
   - Deploy on target network (Sepolia/Mainnet)
   - Export address and update deployment JSON

2. **For Emergency Safe:**
   - Follow Step 3 instructions in "Deployment Instructions"
   - Use **3 signers**, **threshold 2**
   - Deploy on target network (Sepolia/Mainnet)
   - Export address and update deployment JSON

3. **Update Deployment JSON:**
   - Open `apps/api/deployments/<network>-latest.json`
   - Replace placeholder addresses:
     - `governanceSafe`: Replace `0x0000...` with actual Governance Safe address
     - `emergencySafe`: Replace `0x0000...` with actual Emergency Safe address
   - Update `deployedAt` timestamps in config objects
   - Update `safeUrl` with Safe UI link (e.g., `https://app.safe.global/eth:0x...`)

4. **Verify After Recreation:**
   - Run verification steps above
   - Confirm addresses match in deployment JSON
   - Test Safe functionality (create test transaction)

### Safe Address Export Checklist

When exporting Safe addresses, ensure you capture:

- [ ] Safe address (0x... format)
- [ ] Network (Sepolia/Mainnet)
- [ ] Number of owners (5 for Governance, 3 for Emergency)
- [ ] Threshold (3 for Governance, 2 for Emergency)
- [ ] Owner addresses (all signer addresses)
- [ ] Safe URL (Safe UI link)
- [ ] Deployment transaction hash
- [ ] Deployment block number
- [ ] Deployment timestamp

### Example: Complete Safe Deployment Record

```json
{
  "governanceSafe": "0x1234567890123456789012345678901234567890",
  "emergencySafe": "0x0987654321098765432109876543210987654321",
  "governanceSafeConfig": {
    "signers": 5,
    "threshold": 3,
    "description": "Governance Safe - controls timelock proposals",
    "deployedAt": "2025-01-15T10:00:00.000Z",
    "safeUrl": "https://app.safe.global/eth:0x1234567890123456789012345678901234567890",
    "owners": [
      "0x1111111111111111111111111111111111111111",
      "0x2222222222222222222222222222222222222222",
      "0x3333333333333333333333333333333333333333",
      "0x4444444444444444444444444444444444444444",
      "0x5555555555555555555555555555555555555555"
    ],
    "deploymentTx": "0xabcdef...",
    "deploymentBlock": 12345678
  },
  "emergencySafeConfig": {
    "signers": 3,
    "threshold": 2,
    "description": "Emergency Safe - break-glass pause functionality",
    "deployedAt": "2025-01-15T10:30:00.000Z",
    "safeUrl": "https://app.safe.global/eth:0x0987654321098765432109876543210987654321",
    "owners": [
      "0xAAAA111111111111111111111111111111111111",
      "0xBBBB222222222222222222222222222222222222",
      "0xCCCC333333333333333333333333333333333333"
    ],
    "deploymentTx": "0xfedcba...",
    "deploymentBlock": 12345679
  }
}
```

## Deployment Checklist

- [ ] Deploy GovernanceTimelock (72h delay, proposers=[Safe], executors=[])
- [ ] Deploy Gnosis Safe (5 signers, threshold 3) - OFF-CHAIN
- [ ] Deploy Emergency Safe (2-3 signers, threshold 2) - OFF-CHAIN
- [ ] Deploy all DID contracts
- [ ] Run `setup-governance.ts` to wire roles
- [ ] Grant pause capability to Emergency Safe via Timelock
- [ ] Verify all roles are correctly assigned
- [ ] Test governance flow with test proposal
- [ ] Document all addresses

## Troubleshooting

### Common Issues

**Issue:** Cannot execute after timelock delay
- **Solution:** Check if proposal was cancelled or already executed

**Issue:** Emergency pause not working
- **Solution:** Verify PAUSER_ROLE is granted to Emergency Safe

**Issue:** Upgrade failing
- **Solution:** Verify DEFAULT_ADMIN_ROLE is granted to Timelock

**Issue:** Safe address not found in deployment JSON
- **Solution:** Follow "Verification and Recreation Guide" to verify and update addresses

**Issue:** Safe configuration mismatch
- **Solution:** Use Safe UI to verify owners and threshold, update deployment JSON if needed

## References

- [OpenZeppelin TimelockController](https://docs.openzeppelin.com/contracts/4.x/api/governance#TimelockController)
- [Gnosis Safe Documentation](https://docs.safe.global/)
- [UUPS Upgrade Pattern](https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable)

## Support

For governance questions or issues, contact the development team or open an issue in the repository.

