// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IDIDRegistry
 * @dev Interface for DIDRegistry contract
 */
interface IDIDRegistry {
    function ownerOf(uint256 tokenId) external view returns (address);
    function exists(uint256 tokenId) external view returns (bool);
    function isRevoked(uint256 tokenId) external view returns (bool);
    function isAddressRevoked(address owner) external view returns (bool);
    function getDidHash(uint256 tokenId) external view returns (bytes32);
    function getTokenIdByAddress(address owner) external view returns (uint256);
}

