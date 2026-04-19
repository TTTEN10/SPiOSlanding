// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @dev Pulls OpenZeppelin `ERC1967Proxy` into the Hardhat build so tests can use
 * `ethers.getContractFactory("ERC1967Proxy")` (HH700 otherwise).
 */
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
