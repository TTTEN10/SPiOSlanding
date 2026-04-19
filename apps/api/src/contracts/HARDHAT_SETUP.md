# Hardhat Setup for Monorepo

## Root Cause Analysis

### What Caused HardhatContext / Solc Profile Failure

1. **Duplicate Hardhat Installations**: Hardhat was installed in both root `node_modules` and `apps/api/node_modules`, causing module resolution conflicts.

2. **ESM/CJS Module System Conflict**: 
   - `package.json` had `"type": "module"` (ESM)
   - Hardhat 3.x plugins tried to use `require()` on ESM modules (like `chai` in root node_modules)
   - This triggered `ERR_REQUIRE_ESM` errors that Hardhat's error detection incorrectly identified as "config file uses .js extension" errors

3. **Monorepo Dependency Hoisting**: 
   - Dependencies like `chai` and `@typechain/hardhat` were hoisted to root `node_modules`
   - These packages were ESM, causing `require()` failures when Hardhat tried to load them from CommonJS context

4. **Hardhat 3.x EDR/Solc Profile Issues**:
   - Hardhat 3.x uses EDR (Ethereum Development Runtime) by default
   - The "default" build profile doesn't have solc enabled without the toolbox plugin
   - But toolbox plugin caused HardhatContext errors in monorepo ESM setup

## Chosen Strategy: Strategy B (Hardhat 2.x LTS)

**Why Strategy B**: Hardhat 3.x has fundamental compatibility issues with monorepo ESM setups:
- Plugin loading happens before HardhatContext is created
- EDR build profiles require toolbox plugin, which triggers HardhatContext errors
- ESM module resolution conflicts with CommonJS plugin loading

Hardhat 2.x is more stable and works reliably in monorepo setups when configured correctly.

## Solution Implemented

### 1. Downgraded to Hardhat 2.x LTS
- Hardhat: `^2.22.0` → `2.28.4` (latest 2.x)
- Toolbox: `^4.0.0` (compatible with Hardhat 2.x)
- Upgrades: `^3.0.0` (compatible with Hardhat 2.x)

### 2. Removed "type": "module" from package.json
- Hardhat 2.x has issues with ESM projects even with `.cjs` config files
- Removed `"type": "module"` from `apps/api/package.json` to allow CommonJS plugin loading

### 3. Used CommonJS Config File
- Created `hardhat.config.cjs` (CommonJS format)
- Required for Hardhat 2.x when not using ESM

### 4. Ensured Local Dependencies
- Installed `chai` and `@typechain/hardhat` locally in `apps/api` to avoid ESM hoisting issues
- Added yarn resolutions in root `package.json` to ensure single Hardhat instance

### 5. Updated Solidity Version
- Changed from `0.8.20` to `0.8.22` to match OpenZeppelin 5.x requirements

### 6. Fixed OpenZeppelin 5.x Initialization
- Removed `__UUPSUpgradeable_init()` calls (not needed in OpenZeppelin 5.x)

## Version Pins/Resolutions

### Root `package.json`:
```json
"resolutions": {
  "hardhat": "^2.22.0",
  "@nomicfoundation/hardhat-toolbox": "^4.0.0",
  "@openzeppelin/hardhat-upgrades": "^3.0.0"
}
```

### `apps/api/package.json`:
- `hardhat`: `^2.22.0`
- `@nomicfoundation/hardhat-toolbox`: `^4.0.0`
- `@openzeppelin/hardhat-upgrades`: `^3.0.0`
- `chai`: `^4.3.10` (local installation)
- `@typechain/hardhat`: `^9.1.0` (local installation)
- `typechain`: `^8.3.2` (local installation)

## How to Run

### Compile Contracts
```bash
cd apps/api
npx hardhat compile
```

### Run Tests
```bash
cd apps/api
npx hardhat test
```

### Run Diagnostics
```bash
cd apps/api
yarn hh:diag
```

### Deploy Contracts
```bash
cd apps/api
yarn deploy:contracts
```

### Setup Governance
```bash
cd apps/api
yarn setup:governance
```

## Known Gotchas

1. **ESM/CJS**: Hardhat 2.x requires CommonJS config (`hardhat.config.cjs`) when not using ESM. If you need ESM, consider Hardhat 3.x but be aware of plugin compatibility issues.

2. **Single Hardhat Instance**: Ensure Hardhat is only installed in `apps/api`, not in root `node_modules`. Use yarn resolutions to enforce this.

3. **Local Dependencies**: Some dependencies (like `chai`, `@typechain/hardhat`) must be installed locally in `apps/api` to avoid ESM hoisting issues.

4. **Solidity Version**: OpenZeppelin 5.x requires Solidity `^0.8.22`. Update your contracts' pragma if needed.

5. **OpenZeppelin 5.x Changes**: UUPSUpgradeable doesn't require explicit `__UUPSUpgradeable_init()` calls in version 5.x.

## CI-Friendly Commands

All commands are CI-friendly and can be run in non-interactive environments:

```bash
# Compile
npx hardhat compile

# Test
npx hardhat test

# Deploy (dry-run if no keys)
yarn deploy:contracts

# Diagnostics
yarn hh:diag
```

## Troubleshooting

### Error: "HardhatContext is not created"
- **Cause**: Plugin loading before Hardhat context initialization
- **Fix**: Ensure single Hardhat instance, use Hardhat 2.x, ensure dependencies are local

### Error: "No solc version enabled in this profile"
- **Cause**: Hardhat 3.x EDR build profile not configured
- **Fix**: Use Hardhat 2.x or ensure toolbox plugin is properly loaded

### Error: "require() of ES Module not supported"
- **Cause**: ESM dependencies in root node_modules being required from CommonJS
- **Fix**: Install dependencies locally in `apps/api` or remove `"type": "module"`

### Error: "Cannot find module 'hardhat/types/config'"
- **Cause**: `@typechain/hardhat` in root node_modules trying to use Hardhat from apps/api
- **Fix**: Install `@typechain/hardhat` locally in `apps/api`
