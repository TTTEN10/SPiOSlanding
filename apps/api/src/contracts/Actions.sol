// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Actions
 * @dev Canonical action constants for authorization (gas-optimized)
 * @notice All actions must use these canonical bytes32 constants
 */
library Actions {
    bytes32 public constant REVOKE = keccak256("REVOKE");
    bytes32 public constant ADD_CONTROLLER = keccak256("ADD_CONTROLLER");
    bytes32 public constant REMOVE_CONTROLLER = keccak256("REMOVE_CONTROLLER");
    bytes32 public constant SET_ATTRIBUTE = keccak256("SET_ATTRIBUTE");
    bytes32 public constant REMOVE_ATTRIBUTE = keccak256("REMOVE_ATTRIBUTE");
    bytes32 public constant STORE_DATA = keccak256("STORE_DATA");
    bytes32 public constant UPDATE_DATA = keccak256("UPDATE_DATA");
    bytes32 public constant REMOVE_DATA = keccak256("REMOVE_DATA");
    bytes32 public constant ADD_SERVICE = keccak256("ADD_SERVICE");
    bytes32 public constant UPDATE_SERVICE = keccak256("UPDATE_SERVICE");
    bytes32 public constant REMOVE_SERVICE = keccak256("REMOVE_SERVICE");
    bytes32 public constant DELEGATE = keccak256("DELEGATE");
    bytes32 public constant REVOKE_DELEGATION = keccak256("REVOKE_DELEGATION");
    bytes32 public constant ADD_CREDENTIAL = keccak256("ADD_CREDENTIAL");
    bytes32 public constant REMOVE_CREDENTIAL = keccak256("REMOVE_CREDENTIAL");
}

