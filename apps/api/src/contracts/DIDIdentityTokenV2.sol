// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Compiler settings for Remix IDE:
// - Enable optimization: Yes
// - Runs: 1 (optimize for smaller bytecode size)
// - EVM Version: Paris (or default)
// This ensures the contract stays under the 24KB bytecode limit

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DIDIdentityTokenV2
 * @dev Soulbound ERC-721 token for SafePsy DID identities
 * @notice Each wallet can have exactly one non-transferable identity token
 * 
 * Security Notes:
 * - No delegatecall Risks: UUPS is safer than transparent proxy (but requires trusted admins)
 *   - Contract uses UUPS-compatible storage layout for future upgradeability
 *   - Storage variables are grouped for proxy compatibility
 *   - Consider using UUPS proxy pattern for future upgrades
 * - Input Validation: Strict limits on string/array sizes to prevent DoS attacks
 *   - MAX_STRING_LENGTH: 500 bytes for chat references
 *   - MAX_BYTES_LENGTH: 10000 bytes for encrypted metadata
 *   - MAX_URI_LENGTH: 200 bytes for base URI
 *   - MAX_NAME_LENGTH: 100 bytes for token name
 *   - MAX_SYMBOL_LENGTH: 50 bytes for token symbol
 * - Non-Reentrant: Critical functions are protected with nonReentrant modifier
 *   - createDid, createMyDid, updateChatReference, updateEncryptedKeyMetadata, 
 *     updateChatDataReference, storeEncryptedChatSummary, revokeDid, migrateDid
 * 
 * Storage Model:
 * - tokenId → DidProfile mapping
 * - owner → tokenId mapping (for efficient lookup)
 * 
 * Gas Considerations:
 * - Using uint64 for timestamps saves gas vs uint256
 * - bytes32 for chatDataReference is more gas-efficient than string
 * - Single storage slot for DidProfile (packed struct)
 * - Events are indexed for efficient filtering
 */
contract DIDIdentityTokenV2 is ERC721, Ownable, ReentrancyGuard {
    // ============ Constants ============
    
    /**
     * @dev Maximum string length for chat data references
     * @notice Prevents DoS attacks via excessive string operations
     */
    uint256 public constant MAX_STRING_LENGTH = 500;
    
    /**
     * @dev Maximum bytes length for encrypted key metadata
     * @notice Prevents DoS attacks via excessive storage operations
     */
    uint256 public constant MAX_BYTES_LENGTH = 10000;
    
    /**
     * @dev Maximum string length for base URI
     * @notice Prevents DoS attacks via excessive URI operations
     */
    uint256 public constant MAX_URI_LENGTH = 200;
    
    /**
     * @dev Maximum string length for token name and symbol
     * @notice Prevents DoS attacks via excessive string operations
     */
    uint256 public constant MAX_NAME_LENGTH = 100;
    uint256 public constant MAX_SYMBOL_LENGTH = 50;
    
    // ============ Storage ============
    
    /**
     * @dev DID Profile structure
     * Packed to optimize gas (fits in 3 storage slots)
     */
    struct DidProfile {
        address owner;                    // 20 bytes (slot 1)
        uint64 createdAt;                 // 8 bytes (slot 1, packed)
        uint64 lastUpdatedAt;             // 8 bytes (slot 1, packed)
        bytes32 chatDataReference;        // 32 bytes (slot 2)
        bytes encryptedKeyMetadata;       // Variable length (slot 3+)
    }

    // Mapping from tokenId to DidProfile
    mapping(uint256 => DidProfile) private _tokenProfiles;
    
    // Mapping from owner address to tokenId (for efficient lookup)
    mapping(address => uint256) private _ownerToTokenId;
    
    // Mapping to check if address has a DID
    mapping(address => bool) private _hasDid;
    
    // Mapping to track revoked DIDs (separate mapping to preserve storage layout)
    mapping(uint256 => bool) private _revokedTokens;
    mapping(address => bool) private _revokedAddresses;
    
    // Token counter (starts at 1)
    uint256 private _tokenCounter;
    
    // Backend signer for minting (optional)
    address public backendSigner;
    
    // Whether public minting is allowed
    bool public allowPublicMinting;
    
    // Base URI for token metadata
    string private _baseTokenURI;

    // ============ Events ============
    
    /**
     * @dev Emitted when a DID is created
     */
    event DidCreated(
        address indexed user,
        uint256 indexed tokenId,
        uint64 timestamp
    );
    
    /**
     * @dev Emitted when chat data reference is updated
     */
    event DidChatReferenceUpdated(
        address indexed user,
        uint256 indexed tokenId,
        bytes32 indexed chatDataReference,
        uint64 timestamp
    );
    
    /**
     * @dev Emitted when encrypted key metadata is updated
     */
    event DidKeyMetadataUpdated(
        address indexed user,
        uint256 indexed tokenId,
        uint64 timestamp
    );
    
    /**
     * @dev Emitted when backend signer is updated
     */
    event BackendSignerUpdated(address indexed newSigner);
    
    /**
     * @dev Emitted when public minting is toggled
     */
    event PublicMintingToggled(bool enabled);
    
    /**
     * @dev Emitted when a DID is revoked
     */
    event DidRevoked(
        address indexed user,
        uint256 indexed tokenId,
        uint64 timestamp
    );
    
    /**
     * @dev Emitted when a DID is migrated to a new wallet
     */
    event DidMigrated(
        address indexed oldWallet,
        address indexed newWallet,
        uint256 indexed tokenId,
        uint64 timestamp
    );

    // ============ Modifiers ============
    
    /**
     * @dev Modifier to check if caller is backend signer or public minting is allowed
     */
    modifier onlyMinter() {
        require(
            msg.sender == backendSigner || allowPublicMinting || msg.sender == owner(),
            "Not authorized"
        );
        _;
    }
    
    /**
     * @dev Modifier to check if user has a DID
     */
    modifier onlyDidOwner(address user) {
        require(_hasDid[user], "No DID");
        require(msg.sender == user, "Not owner");
        _;
    }
    
    /**
     * @dev Modifier to check if DID is not revoked
     */
    modifier notRevoked(address user) {
        require(_hasDid[user], "No DID");
        uint256 tokenId = _ownerToTokenId[user];
        require(!_revokedTokens[tokenId], "Revoked");
        _;
    }
    
    /**
     * @dev Modifier to check if DID is not revoked (by token ID)
     */
    modifier notRevokedById(uint256 tokenId) {
        require(_exists(tokenId), "No token");
        require(!_revokedTokens[tokenId], "Revoked");
        _;
    }

    // ============ Constructor ============
    
    /**
     * @dev Constructor
     * @param name Token name (e.g., "SafePsy DID Identity")
     * @param symbol Token symbol (e.g., "SAFEPSY-DID")
     * @param baseURI Base URI for token metadata
     * @param _backendSigner Address of backend signer (can be zero address)
     * @param _allowPublicMinting Whether to allow public minting
     */
    constructor(
        string memory name,
        string memory symbol,
        string memory baseURI,
        address _backendSigner,
        bool _allowPublicMinting
    ) ERC721(name, symbol) Ownable(msg.sender) {
        // Input validation: strict limits on string sizes
        require(bytes(name).length > 0 && bytes(name).length <= MAX_NAME_LENGTH, "Invalid name length");
        require(bytes(symbol).length > 0 && bytes(symbol).length <= MAX_SYMBOL_LENGTH, "Invalid symbol length");
        require(bytes(baseURI).length <= MAX_URI_LENGTH, "Invalid URI length");
        
        _baseTokenURI = baseURI;
        backendSigner = _backendSigner;
        allowPublicMinting = _allowPublicMinting;
        _tokenCounter = 0; // Will start at 1
    }

    // ============ Soulbound Implementation ============
    
    /**
     * @dev Override _update to prevent transfers (soulbound token)
     * @notice This hook is called by all transfer operations in OpenZeppelin v5
     * @notice Only allows transfers from address(0) (minting) or to address(0) (burning)
     */
    function _update(address to, uint256 tokenId, address auth) 
        internal 
        override 
        returns (address) 
    {
        address from = _ownerOf(tokenId);
        
        // Allow minting (from == address(0)) and burning (to == address(0))
        // But prevent all other transfers
        if (from != address(0) && to != address(0)) {
            revert("Soulbound");
        }
        
        return super._update(to, tokenId, auth);
    }
    
    /**
     * @dev Override approve to prevent approvals (token is non-transferable)
     * @notice This function always reverts to prevent approvals
     */
    function approve(address, uint256) public pure override {
        revert("Soulbound");
    }
    
    /**
     * @dev Override setApprovalForAll to prevent approvals (token is non-transferable)
     * @notice This function always reverts to prevent approvals
     */
    function setApprovalForAll(address, bool) public pure override {
        revert("Soulbound");
    }

    // ============ Minting Functions ============
    
    /**
     * @dev Create a DID for a user (backend signer or owner only, or public if enabled)
     * @param user The wallet address to create DID for
     * @return tokenId The created token ID
     */
    function createDid(address user) external onlyMinter nonReentrant returns (uint256) {
        require(!_hasDid[user], "Has DID");
        require(user != address(0), "Zero addr");

        _tokenCounter++;
        uint256 tokenId = _tokenCounter;

        // Create profile
        DidProfile memory profile = DidProfile({
            owner: user,
            createdAt: uint64(block.timestamp),
            lastUpdatedAt: uint64(block.timestamp),
            chatDataReference: bytes32(0),
            encryptedKeyMetadata: bytes("")
        });

        _tokenProfiles[tokenId] = profile;
        _ownerToTokenId[user] = tokenId;
        _hasDid[user] = true;

        // Mint ERC-721 token
        _safeMint(user, tokenId);

        emit DidCreated(user, tokenId, uint64(block.timestamp));

        return tokenId;
    }
    
    /**
     * @dev Create a DID for the caller (public minting)
     * @return tokenId The created token ID
     */
    function createMyDid() external nonReentrant returns (uint256) {
        require(allowPublicMinting, "No public mint");
        require(!_hasDid[msg.sender], "Has DID");

        _tokenCounter++;
        uint256 tokenId = _tokenCounter;

        // Create profile
        DidProfile memory profile = DidProfile({
            owner: msg.sender,
            createdAt: uint64(block.timestamp),
            lastUpdatedAt: uint64(block.timestamp),
            chatDataReference: bytes32(0),
            encryptedKeyMetadata: bytes("")
        });

        _tokenProfiles[tokenId] = profile;
        _ownerToTokenId[msg.sender] = tokenId;
        _hasDid[msg.sender] = true;

        // Mint ERC-721 token
        _safeMint(msg.sender, tokenId);

        emit DidCreated(msg.sender, tokenId, uint64(block.timestamp));

        return tokenId;
    }

    // ============ Profile Functions ============
    
    /**
     * @dev Get profile by owner address (efficient lookup)
     * @param user The wallet address
     * @return profile The DidProfile struct
     */
    function getProfileByOwner(address user) external view returns (DidProfile memory) {
        require(_hasDid[user], "No DID");
        uint256 tokenId = _ownerToTokenId[user];
        return _tokenProfiles[tokenId];
    }
    
    /**
     * @dev Get profile by token ID
     * @param tokenId The token ID
     * @return profile The DidProfile struct
     */
    function getProfile(uint256 tokenId) external view returns (DidProfile memory) {
        require(_exists(tokenId), "No token");
        return _tokenProfiles[tokenId];
    }
    
    /**
     * @dev Update chat data reference and encrypted key metadata
     * @param newRef New chat data reference (hash/CID/DB key)
     * @param newEncryptedKeyMetadata New encrypted key metadata
     * @notice Only callable by DID owner, and DID must not be revoked
     * @notice Input validation: strict limits on string/array sizes
     */
    function updateChatReference(
        string calldata newRef,
        bytes calldata newEncryptedKeyMetadata
    ) external onlyDidOwner(msg.sender) notRevoked(msg.sender) nonReentrant {
        // Input validation: strict limits on string/array sizes
        require(bytes(newRef).length > 0 && bytes(newRef).length <= MAX_STRING_LENGTH, "Invalid ref length");
        require(newEncryptedKeyMetadata.length <= MAX_BYTES_LENGTH, "Invalid metadata length");
        
        uint256 tokenId = _ownerToTokenId[msg.sender];
        DidProfile storage profile = _tokenProfiles[tokenId];
        
        // Convert string to bytes32 using hash (simpler, smaller bytecode)
        bytes32 refHash = keccak256(bytes(newRef));
        profile.chatDataReference = refHash;
        profile.encryptedKeyMetadata = newEncryptedKeyMetadata;
        profile.lastUpdatedAt = uint64(block.timestamp);
        
        emit DidChatReferenceUpdated(msg.sender, tokenId, refHash, uint64(block.timestamp));
        emit DidKeyMetadataUpdated(msg.sender, tokenId, uint64(block.timestamp));
    }
    
    /**
     * @dev Update only encrypted key metadata (preserve chat reference)
     * @param newEncryptedKeyMetadata New encrypted key metadata
     * @notice Only callable by DID owner, and DID must not be revoked
     * @notice Input validation: strict limits on array sizes
     */
    function updateEncryptedKeyMetadata(
        bytes calldata newEncryptedKeyMetadata
    ) external onlyDidOwner(msg.sender) notRevoked(msg.sender) nonReentrant {
        // Input validation: strict limits on array sizes
        require(newEncryptedKeyMetadata.length <= MAX_BYTES_LENGTH, "Invalid metadata length");
        
        uint256 tokenId = _ownerToTokenId[msg.sender];
        DidProfile storage profile = _tokenProfiles[tokenId];
        
        profile.encryptedKeyMetadata = newEncryptedKeyMetadata;
        profile.lastUpdatedAt = uint64(block.timestamp);
        
        emit DidKeyMetadataUpdated(msg.sender, tokenId, uint64(block.timestamp));
    }
    
    /**
     * @dev Update only chat data reference (preserve encrypted key)
     * @param newRef New chat data reference
     * @notice Only callable by DID owner, and DID must not be revoked
     * @notice Input validation: strict limits on string sizes
     */
    function updateChatDataReference(
        string calldata newRef
    ) external onlyDidOwner(msg.sender) notRevoked(msg.sender) nonReentrant {
        // Input validation: strict limits on string sizes
        require(bytes(newRef).length > 0 && bytes(newRef).length <= MAX_STRING_LENGTH, "Invalid ref length");
        
        uint256 tokenId = _ownerToTokenId[msg.sender];
        DidProfile storage profile = _tokenProfiles[tokenId];
        
        // Convert string to bytes32 using hash (simpler, smaller bytecode)
        bytes32 refHash = keccak256(bytes(newRef));
        profile.chatDataReference = refHash;
        profile.lastUpdatedAt = uint64(block.timestamp);
        
        emit DidChatReferenceUpdated(msg.sender, tokenId, refHash, uint64(block.timestamp));
    }
    
    /**
     * @dev Encrypt & store chat summary reference
     * @param encryptedSummaryRef Encrypted chat summary reference (IPFS CID, S3 key, or storage location)
     * @param encryptedKeyMetadata Optional encrypted key metadata for decryption
     * @notice Only callable by DID owner, and DID must not be revoked
     * @notice Encryption is performed off-chain before calling this function
     * @notice The encryptedSummaryRef should point to the encrypted summary stored in S3/IPFS
     * @notice Input validation: strict limits on string/array sizes
     */
    function storeEncryptedChatSummary(
        string calldata encryptedSummaryRef,
        bytes calldata encryptedKeyMetadata
    ) external onlyDidOwner(msg.sender) notRevoked(msg.sender) nonReentrant {
        // Input validation: strict limits on string/array sizes
        require(bytes(encryptedSummaryRef).length > 0 && bytes(encryptedSummaryRef).length <= MAX_STRING_LENGTH, "Invalid ref length");
        require(encryptedKeyMetadata.length <= MAX_BYTES_LENGTH, "Invalid metadata length");
        
        uint256 tokenId = _ownerToTokenId[msg.sender];
        DidProfile storage profile = _tokenProfiles[tokenId];
        
        // Convert encrypted summary reference to bytes32 using hash
        bytes32 summaryRefHash = keccak256(bytes(encryptedSummaryRef));
        profile.chatDataReference = summaryRefHash;
        profile.encryptedKeyMetadata = encryptedKeyMetadata;
        profile.lastUpdatedAt = uint64(block.timestamp);
        
        emit DidChatReferenceUpdated(msg.sender, tokenId, summaryRefHash, uint64(block.timestamp));
        emit DidKeyMetadataUpdated(msg.sender, tokenId, uint64(block.timestamp));
    }

    // ============ View Functions ============
    
    /**
     * @dev Check if a wallet has a DID
     * @param user The wallet address
     * @return Whether the wallet has a DID
     */
    function hasDid(address user) external view returns (bool) {
        return _hasDid[user];
    }
    
    /**
     * @dev Get token ID for a wallet address
     * @param user The wallet address
     * @return tokenId The token ID (0 if no DID)
     */
    function getDidId(address user) external view returns (uint256) {
        return _ownerToTokenId[user];
    }
    
    /**
     * @dev Get chat data reference for a wallet
     * @param user The wallet address
     * @return The chat data reference (bytes32)
     */
    function getChatDataReference(address user) external view returns (bytes32) {
        require(_hasDid[user], "No DID");
        uint256 tokenId = _ownerToTokenId[user];
        return _tokenProfiles[tokenId].chatDataReference;
    }
    
    /**
     * @dev Get encrypted key metadata for a wallet
     * @param user The wallet address
     * @return The encrypted key metadata (bytes)
     */
    function getEncryptedKeyMetadata(address user) external view returns (bytes memory) {
        require(_hasDid[user], "No DID");
        uint256 tokenId = _ownerToTokenId[user];
        return _tokenProfiles[tokenId].encryptedKeyMetadata;
    }
    
    /**
     * @dev Get total number of DIDs created
     * @return The total count
     */
    function totalSupply() external view returns (uint256) {
        return _tokenCounter;
    }
    
    /**
     * @dev Get base URI for token metadata
     * @return The base URI
     */
    function _baseURI() internal view override(ERC721) returns (string memory) {
        return _baseTokenURI;
    }
    
    /**
     * @dev Set base URI (only owner)
     * @param baseURI New base URI
     * @notice Input validation: strict limits on string sizes
     */
    function setBaseURI(string memory baseURI) external onlyOwner {
        // Input validation: strict limits on string sizes
        require(bytes(baseURI).length <= MAX_URI_LENGTH, "Invalid URI length");
        _baseTokenURI = baseURI;
    }

    // ============ Admin Functions ============
    
    /**
     * @dev Update backend signer (only owner)
     * @param newSigner New backend signer address
     */
    function updateBackendSigner(address newSigner) external onlyOwner {
        require(newSigner != address(0), "Zero addr");
        backendSigner = newSigner;
        emit BackendSignerUpdated(newSigner);
    }
    
    /**
     * @dev Toggle public minting (only owner)
     * @param _allow Whether to allow public minting
     */
    function setAllowPublicMinting(bool _allow) external onlyOwner {
        allowPublicMinting = _allow;
        emit PublicMintingToggled(_allow);
    }
    
    /**
     * @dev Check if token exists (override for ERC721)
     * @param tokenId The token ID
     * @return Whether the token exists
     */
    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    // ============ Revocation Functions ============
    
    /**
     * @dev Check if a DID is revoked
     * @param user The wallet address
     * @return Whether the DID is revoked
     */
    function isRevoked(address user) external view returns (bool) {
        if (!_hasDid[user]) {
            return false;
        }
        uint256 tokenId = _ownerToTokenId[user];
        return _revokedTokens[tokenId];
    }
    
    /**
     * @dev Check if a DID is revoked by token ID
     * @param tokenId The token ID
     * @return Whether the DID is revoked
     */
    function isRevokedById(uint256 tokenId) external view returns (bool) {
        return _revokedTokens[tokenId];
    }
    
    /**
     * @dev Revoke a DID (mark as revoked, optionally clear chat reference)
     * @param clearChatReference Whether to clear the chat data reference
     * @notice Only callable by DID owner
     * @notice Revoked DIDs cannot be updated, but token remains in existence
     */
    function revokeDid(bool clearChatReference) external onlyDidOwner(msg.sender) nonReentrant {
        _revokeDidInternal(msg.sender, clearChatReference);
    }
    
    /**
     * @dev Revoke a DID (convenience function, clears chat reference by default)
     * @notice Only callable by DID owner
     */
    function revokeDid() external onlyDidOwner(msg.sender) nonReentrant {
        _revokeDidInternal(msg.sender, true);
    }
    
    /**
     * @dev Internal function to revoke a DID
     * @param user The user address whose DID should be revoked
     * @param clearChatReference Whether to clear the chat data reference
     */
    function _revokeDidInternal(address user, bool clearChatReference) internal {
        uint256 tokenId = _ownerToTokenId[user];
        require(!_revokedTokens[tokenId], "Revoked");
        
        // Mark as revoked
        _revokedTokens[tokenId] = true;
        _revokedAddresses[user] = true;
        
        // Optionally clear chat reference
        if (clearChatReference) {
            DidProfile storage profile = _tokenProfiles[tokenId];
            profile.chatDataReference = bytes32(0);
            profile.encryptedKeyMetadata = bytes("");
            profile.lastUpdatedAt = uint64(block.timestamp);
        }
        
        emit DidRevoked(user, tokenId, uint64(block.timestamp));
    }

    // ============ Migration Functions ============
    
    /**
     * @dev Migrate DID from old wallet to new wallet (admin/backend only)
     * @param oldWallet The old wallet address
     * @param newWallet The new wallet address
     * @param clearChatReference Whether to clear chat reference during migration
     * @notice This is a support-driven process for wallet migration
     * @notice Only callable by contract owner or backend signer
     * @notice Old wallet's DID is revoked, new wallet gets a new DID
     */
    function migrateDid(
        address oldWallet,
        address newWallet,
        bool clearChatReference
    ) external nonReentrant {
        require(
            msg.sender == owner() || msg.sender == backendSigner,
            "Not authorized"
        );
        require(oldWallet != address(0), "Zero addr");
        require(newWallet != address(0), "Zero addr");
        require(oldWallet != newWallet, "Same wallet");
        require(_hasDid[oldWallet], "No DID");
        require(!_hasDid[newWallet], "Has DID");
        
        uint256 oldTokenId = _ownerToTokenId[oldWallet];
        require(!_revokedTokens[oldTokenId], "Revoked");
        
        // Revoke old DID
        _revokedTokens[oldTokenId] = true;
        _revokedAddresses[oldWallet] = true;
        
        // Create new DID for new wallet
        _tokenCounter++;
        uint256 newTokenId = _tokenCounter;
        
        // Copy profile data if not clearing
        DidProfile memory oldProfile = _tokenProfiles[oldTokenId];
        DidProfile memory newProfile = DidProfile({
            owner: newWallet,
            createdAt: uint64(block.timestamp),
            lastUpdatedAt: uint64(block.timestamp),
            chatDataReference: clearChatReference ? bytes32(0) : oldProfile.chatDataReference,
            encryptedKeyMetadata: clearChatReference ? bytes("") : oldProfile.encryptedKeyMetadata
        });
        
        _tokenProfiles[newTokenId] = newProfile;
        _ownerToTokenId[newWallet] = newTokenId;
        _hasDid[newWallet] = true;
        
        // Mint new ERC-721 token
        _safeMint(newWallet, newTokenId);
        
        emit DidRevoked(oldWallet, oldTokenId, uint64(block.timestamp));
        emit DidCreated(newWallet, newTokenId, uint64(block.timestamp));
        emit DidMigrated(oldWallet, newWallet, newTokenId, uint64(block.timestamp));
    }
}
