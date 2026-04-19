// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/TimelockController.sol";

/**
 * @title GovernanceTimelock
 * @dev Timelock controller for governance operations
 * @notice Wraps OpenZeppelin TimelockController for DID system governance
 * @notice All privileged operations (upgrades, role changes) must pass through this timelock
 * @notice Minimum delay: 72 hours (health/identity-grade compliance)
 * 
 * Governance invariant:
 * - Identity authority is NEVER governed
 * - Governance controls only system rules and upgrades
 * - No single key risk (multisig required)
 * - Upgrade transparency (72h delay)
 * - Emergency containment (separate emergency safe)
 * - Audit-ready governance
 */
contract GovernanceTimelock is TimelockController {
    /**
     * @dev Constructor
     * @param minDelay Minimum delay in seconds (recommended: 72 hours = 259200 seconds)
     * @param proposers Array of addresses that can propose operations (typically Governance Safe)
     * @param executors Array of addresses that can execute operations (empty array = permissionless execution)
     * @param admin Admin address (typically Governance Safe, can be zero address to renounce)
     */
    constructor(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors,
        address admin
    )
        TimelockController(
            minDelay,
            proposers,
            executors,
            admin
        )
    {}
}

