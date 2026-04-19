#!/usr/bin/env bash
# Run from apps/api. Requires ETHERSCAN_API_KEY and optionally SEPOLIA_RPC_URL in .env.
# See documentation/SMART_CONTRACTS_DEPLOYMENT.md §5 and deployments/SEPOLIA_DEPLOYED_CONTRACTS.md.

set -e
cd "$(dirname "$0")/.."
[ -f .env ] && set -a && source .env && set +a

if [ -z "$ETHERSCAN_API_KEY" ]; then
  echo "Set ETHERSCAN_API_KEY in apps/api/.env (copy from .env.example)."
  exit 1
fi

echo "Verifying contracts on Sepolia Etherscan..."
export ETHERSCAN_API_KEY

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

echo "Done."
