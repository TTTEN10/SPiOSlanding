// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IDIDRegistry.sol";
import "../Actions.sol";

/**
 * @title MockDIDOwnership
 * @dev Mock for testing - isAuthorized returns true for owner of tokenId from registry
 */
contract MockDIDOwnership {
    address public registryContract;  // Mutable for test fixture setup

    constructor(address _registry) {
        registryContract = _registry;
    }

    function setRegistry(address _registry) external {
        registryContract = _registry;
    }

    function isAuthorized(uint256 tokenId, bytes32, address account) external view returns (bool) {
        address owner = IDIDRegistry(registryContract).ownerOf(tokenId);
        return account == owner;
    }
}
