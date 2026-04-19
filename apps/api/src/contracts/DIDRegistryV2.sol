// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/IDIDOwnership.sol";
import "./Actions.sol";

/**
 * @title DIDRegistryV2
 * @dev ERC721 token representation of DID identity
 * @notice The token is a representation mechanism, not the identity itself
 * @notice ALL authorization logic is deferred to DIDOwnershipV2 contract
 * @notice Revocation burns the token and permanently prevents re-minting to the same address
 * 
 * Security Notes:
 * - Reentrancy-protected: Uses nonReentrant for state-changing functions (mint, revoke, revokeByAddress)
 * - Pause mechanism: Emergency stop via DEFAULT_ADMIN_ROLE (break-glass only)
 * - No delegatecall: Safe from proxy-related attacks (immutable ownershipContract, no proxy pattern)
 * - Immutable core: ownershipContract is immutable, preventing proxy-related attacks
 * 
 * Revocation Semantics:
 * - Revocation BURNS the token (token is destroyed, not just flagged)
 * - _addressToTokenId mapping is cleared on revocation
 * - Revoked addresses CANNOT receive new DIDs (permanent ban)
 * - One DID per address enforced: address can only have one active DID at a time
 * - Wallet migration is IMPOSSIBLE: revoked addresses are permanently tracked
 * 
 * Governance invariant:
 * - Identity authority is NEVER governed
 * - Governance controls only system rules and upgrades
 * - MINTER_ROLE: Controlled by Governance Timelock (72h delay)
 * - DEFAULT_ADMIN_ROLE: Controlled by Governance Timelock (72h delay)
 * - pause/unpause: Controlled by Emergency Safe (break-glass only)
 * - No upgrades possible (immutable core)
 * - No role reassignment bypass
 * 
 * Final authority chain: Multisig → Timelock → DIDRegistryV2
 */
contract DIDRegistryV2 is ERC721, AccessControl, ReentrancyGuard, Pausable {

    // Roles
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    // Storage
    mapping(uint256 => bytes32) private _didHashes;           // tokenId → DID hash
    mapping(address => uint256) private _addressToTokenId;    // owner → tokenId (cleared on revocation)
    mapping(address => bool) private _revokedAddresses;        // address → revoked (permanent, prevents re-minting)
    uint256 private _tokenCounter;                            // Token counter (starts at 1)
    
    // Contract references (immutable)
    address public immutable ownershipContract;                // DIDOwnershipV2 contract address
    
    // Events
    event DidMinted(address indexed owner, uint256 indexed tokenId, bytes32 indexed didHash);
    event DidRevoked(address indexed owner, uint256 indexed tokenId);  // Revocation tied to DID (tokenId)

    /**
     * @dev Constructor
     * @param name Token name
     * @param symbol Token symbol
     * @param _ownershipContract DIDOwnershipV2 contract address
     * @param admin Admin address (gets DEFAULT_ADMIN_ROLE)
     */
    constructor(
        string memory name,
        string memory symbol,
        address _ownershipContract,
        address admin
    ) ERC721(name, symbol) {
        require(_ownershipContract != address(0), "Zero address");
        require(admin != address(0), "Zero address");
        
        ownershipContract = _ownershipContract;
        _tokenCounter = 0; // Starts at 0, first token is 1
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
    }

    /**
     * @dev Mint DID (backend/admin only)
     * @notice Enforces one DID per address and prevents minting to revoked addresses
     * @param to Address to mint to
     * @param didHash DID hash (bytes32)
     * @return tokenId The minted token ID
     */
    function mint(address to, bytes32 didHash) 
        external 
        onlyRole(MINTER_ROLE)
        nonReentrant
        whenNotPaused
        returns (uint256)
    {
        require(to != address(0), "Zero address");
        require(_addressToTokenId[to] == 0, "Already has DID");
        require(!_revokedAddresses[to], "Address revoked, cannot mint");
        
        _tokenCounter++;
        uint256 tokenId = _tokenCounter;
        
        _didHashes[tokenId] = didHash;
        _addressToTokenId[to] = tokenId;
        
        _safeMint(to, tokenId);
        
        emit DidMinted(to, tokenId, didHash);
        
        return tokenId;
    }

    /**
     * @dev Revoke DID - defers authorization to DIDOwnershipV2
     * @notice Revocation BURNS the token and permanently prevents re-minting to the same address
     * @notice This makes wallet migration impossible - revoked addresses cannot receive new DIDs
     * @param tokenId The token ID to revoke
     */
    function revoke(uint256 tokenId) 
        public 
        nonReentrant
        whenNotPaused
    {
        // Get owner BEFORE burning (needed for event and mapping clearing)
        address owner = ownerOf(tokenId);
        require(owner != address(0), "Token does not exist");
        
        // Defer authorization check to DIDOwnershipV2 (must check before burning)
        require(
            IDIDOwnership(ownershipContract).isAuthorized(tokenId, Actions.REVOKE, msg.sender),
            "Not authorized"
        );
        
        // Check if already revoked (check address, not tokenId since token will be burned)
        require(!_revokedAddresses[owner], "Address already revoked");
        
        // Perform revocation:
        // 1. Clear address-to-tokenId mapping
        delete _addressToTokenId[owner];
        
        // 2. Mark address as permanently revoked (prevents re-minting)
        _revokedAddresses[owner] = true;
        
        // 3. BURN the token (token is destroyed, not just flagged)
        _burn(tokenId);
        
        emit DidRevoked(owner, tokenId);
    }

    /**
     * @dev Revoke by owner address - convenience function, still revokes by tokenId
     * @param owner Address of DID owner
     */
    function revokeByAddress(address owner) 
        external 
        nonReentrant
        whenNotPaused
    {
        uint256 tokenId = _addressToTokenId[owner];
        require(tokenId != 0, "No DID");
        
        revoke(tokenId); // Revokes the DID (tokenId), not the address
    }

    /**
     * @dev Check if address is revoked (permanent ban from receiving DIDs)
     * @param owner The address to check
     * @return bool Whether the address is revoked
     */
    function isAddressRevoked(address owner) external view returns (bool) {
        return _revokedAddresses[owner];
    }

    /**
     * @dev Check if DID is revoked (by tokenId)
     * @notice Since revocation burns the token, this checks if the token exists
     * @notice If token doesn't exist, it was either never minted or was revoked (burned)
     * @param tokenId The token ID
     * @return bool Whether the DID is revoked (true if token doesn't exist)
     */
    function isRevoked(uint256 tokenId) external view returns (bool) {
        // If token doesn't exist, it was either never minted or was revoked (burned)
        return !_exists(tokenId);
    }

    /**
     * @dev Get DID hash
     * @param tokenId The token ID
     * @return bytes32 The DID hash
     */
    function getDidHash(uint256 tokenId) external view returns (bytes32) {
        require(_exists(tokenId), "Token does not exist");
        return _didHashes[tokenId];
    }

    /**
     * @dev Get DID hash by owner address
     * @param owner The owner address
     * @return bytes32 The DID hash
     */
    function getDidHashByAddress(address owner) external view returns (bytes32) {
        uint256 tokenId = _addressToTokenId[owner];
        require(tokenId != 0, "No DID");
        return _didHashes[tokenId];
    }

    /**
     * @dev Get token ID by owner address
     * @notice Returns 0 if address has no active DID or if DID was revoked
     * @param owner The owner address
     * @return uint256 The token ID (0 if no active DID)
     */
    function getTokenIdByAddress(address owner) external view returns (uint256) {
        // If address is revoked, return 0 (even if mapping wasn't cleared)
        if (_revokedAddresses[owner]) {
            return 0;
        }
        return _addressToTokenId[owner];
    }

    /**
     * @dev Get total supply
     * @return uint256 Total number of DIDs
     */
    function totalSupply() external view returns (uint256) {
        return _tokenCounter;
    }

    /**
     * @dev Check if token exists
     * @param tokenId The token ID
     * @return bool Whether the token exists
     */
    function exists(uint256 tokenId) external view returns (bool) {
        return _exists(tokenId);
    }

    /**
     * @dev Internal function to check if token exists
     */
    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    // ============ Soulbound Implementation (Hardened) ============

    /**
     * @dev Override _update to prevent transfers (soulbound)
     * @notice Prevents ALL transfers except minting/burning
     */
    function _update(address to, uint256 tokenId, address auth)
        internal 
        override 
        returns (address) 
    {
        address from = _ownerOf(tokenId);
        
        // Allow minting (from == address(0)) and burning (to == address(0))
        // But prevent ALL other transfers
        if (from != address(0) && to != address(0)) {
            revert("Soulbound: non-transferable");
        }
        
        return super._update(to, tokenId, auth);
    }
    
    /**
     * @dev Override approve to prevent approvals (token is non-transferable)
     */
    function approve(address, uint256) public pure override {
        revert("Soulbound: non-transferable");
    }
    
    /**
     * @dev Override setApprovalForAll to prevent approvals (token is non-transferable)
     */
    function setApprovalForAll(address, bool) public pure override {
        revert("Soulbound: non-transferable");
    }

    /**
     * @dev Override transferFrom to prevent transfers (soulbound token)
     * This prevents all transfers including via safeTransferFrom
     */
    function transferFrom(address, address, uint256) public pure override {
        revert("Soulbound: non-transferable");
    }

    /**
     * @dev Override safeTransferFrom (with data) to prevent transfers
     */
    function safeTransferFrom(address, address, uint256, bytes memory) public pure override {
        revert("Soulbound: non-transferable");
    }

    // ============ Admin Functions ============

    /**
     * @dev Pause contract
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause contract
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Supports interface
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

