// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IDIDOwnership
 * @dev Interface for DIDOwnership contract (centralized authorization)
 */
interface IDIDOwnership {
    function isAuthorized(uint256 tokenId, bytes32 action, address account) external view returns (bool);
    function addController(uint256 tokenId, address controller) external;
    function removeController(uint256 tokenId, address controller) external;
    function isController(uint256 tokenId, address account) external view returns (bool);
    function getControllers(uint256 tokenId) external view returns (address[] memory);
    function delegate(uint256 tokenId, address delegatee, uint256 expiry) external;
    function revokeDelegation(uint256 tokenId, address delegatee) external;
    function hasDelegatedAuthority(uint256 tokenId, address account) external view returns (bool);
}

