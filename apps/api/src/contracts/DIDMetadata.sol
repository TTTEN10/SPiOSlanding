// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "./interfaces/IDIDRegistry.sol";
import "./interfaces/IDIDOwnership.sol";
import "./Actions.sol";

/**
 * @title DIDMetadata
 * @dev DID Document data storage (upgradeable)
 * @notice Queries DIDOwnership for authorization
 * @notice Reads DIDRegistry for existence checks
 * 
 * Governance invariant:
 * - Identity authority is NEVER governed
 * - Governance controls only system rules and upgrades
 * - Upgrade (UUPS): Controlled by Governance Timelock (72h minimum delay)
 * - Metadata edits: Controlled by DIDOwnership (identity authority)
 * - Emergency pause: Controlled by Emergency Safe (optional, break-glass)
 * - Timelock delay: 72h minimum (health/identity-grade compliance)
 */
contract DIDMetadata is AccessControl, ReentrancyGuard, UUPSUpgradeable, Initializable {

    // Maximum batch size
    uint256 public constant MAX_BATCH_SIZE = 50;

    // Storage limits (hard bounds to prevent gas blowup / DoS)
    uint256 public constant MAX_ATTRIBUTES_PER_DID = 100;
    uint256 public constant MAX_CREDENTIAL_REFS_PER_DID = 50;
    uint256 public constant MAX_ATTRIBUTE_KEY_LENGTH = 100;
    uint256 public constant MAX_ATTRIBUTE_VALUE_LENGTH = 1000;
    uint256 public constant MAX_CONTEXTS = 10;
    uint256 public constant MAX_CONTROLLERS = 10;

    // Custom errors for limit violations (gas-efficient)
    error StringTooLong(bytes32 field, uint256 length, uint256 max);
    error ArrayTooLarge(bytes32 field, uint256 length, uint256 max);
    error MaxItemsReached(bytes32 field, uint256 max);

    // Contract references
    address public registryContract;    // DIDRegistry contract address
    address public ownershipContract;   // DIDOwnership contract address

    // Structs
    struct DidDocument {
        string[] contexts;              // JSON-LD contexts
        string id;                      // DID identifier
        string[] controller;            // Controller DIDs
        uint64 updated;                 // Last update timestamp
    }

    struct CredentialReference {
        bytes32 credentialHash;         // Hash of credential
        string credentialType;          // Type of credential
        address issuer;                 // Issuer address
        uint64 issuedAt;                // Issue timestamp
        bool revoked;                   // Revocation status
    }

    // Storage
    mapping(uint256 => DidDocument) private _didDocuments;
    mapping(uint256 => CredentialReference[]) private _credentials;
    mapping(uint256 => mapping(string => string)) private _attributes;
    mapping(uint256 => string[]) private _attributeKeys; // For enumeration

    // Events
    event DidDocumentUpdated(uint256 indexed tokenId, DidDocument document);
    event CredentialReferenceAdded(uint256 indexed tokenId, bytes32 indexed credentialHash);
    event CredentialReferenceRemoved(uint256 indexed tokenId, bytes32 indexed credentialHash);
    event AttributeSet(uint256 indexed tokenId, string indexed key, string value);
    event AttributeRemoved(uint256 indexed tokenId, string indexed key);

    /**
     * @dev Initializer (replaces constructor for upgradeable contracts)
     * @param _registryContract DIDRegistry contract address
     * @param _ownershipContract DIDOwnership contract address
     * @param admin Admin address (gets DEFAULT_ADMIN_ROLE)
     */
    function initialize(
        address _registryContract,
        address _ownershipContract,
        address admin
    ) external initializer {
        require(_registryContract != address(0), "Zero address");
        require(_ownershipContract != address(0), "Zero address");
        require(admin != address(0), "Zero address");
        
        registryContract = _registryContract;
        ownershipContract = _ownershipContract;
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        // OpenZeppelin 5.x UUPSUpgradeable doesn't require explicit initialization
    }

    /**
     * @dev Update registry contract reference (for migration)
     * @param _registryContract New DIDRegistry address
     */
    function setRegistryContract(address _registryContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_registryContract != address(0), "Zero address");
        registryContract = _registryContract;
    }

    /**
     * @dev Update ownership contract reference (for migration)
     * @param _ownershipContract New DIDOwnership address
     */
    function setOwnershipContract(address _ownershipContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_ownershipContract != address(0), "Zero address");
        ownershipContract = _ownershipContract;
    }

    /**
     * @dev Set DID Document
     * @param tokenId The token ID
     * @param document The DID Document
     * @notice Enforces MAX_CONTEXTS and MAX_CONTROLLERS limits
     */
    function setDidDocument(uint256 tokenId, DidDocument calldata document)
        external
        nonReentrant
    {
        require(
            IDIDOwnership(ownershipContract).isAuthorized(tokenId, Actions.SET_ATTRIBUTE, msg.sender),
            "Not authorized"
        );
        
        require(IDIDRegistry(registryContract).exists(tokenId), "DID does not exist");
        
        // Enforce context array limit
        if (document.contexts.length > MAX_CONTEXTS) {
            revert ArrayTooLarge(keccak256(bytes("CONTEXTS")), document.contexts.length, MAX_CONTEXTS);
        }
        
        // Enforce controller array limit
        if (document.controller.length > MAX_CONTROLLERS) {
            revert ArrayTooLarge(keccak256(bytes("CONTROLLERS")), document.controller.length, MAX_CONTROLLERS);
        }
        
        _didDocuments[tokenId] = DidDocument({
            contexts: document.contexts,
            id: document.id,
            controller: document.controller,
            updated: uint64(block.timestamp)
        });
        
        emit DidDocumentUpdated(tokenId, _didDocuments[tokenId]);
    }

    /**
     * @dev Get DID Document
     * @param tokenId The token ID
     * @return DidDocument The DID Document
     */
    function getDidDocument(uint256 tokenId)
        external
        view
        returns (DidDocument memory)
    {
        return _didDocuments[tokenId];
    }

    /**
     * @dev Set public attribute
     * @param tokenId The token ID
     * @param key The attribute key
     * @param value The attribute value
     * @notice Enforces MAX_ATTRIBUTE_KEY_LENGTH, MAX_ATTRIBUTE_VALUE_LENGTH, and MAX_ATTRIBUTES_PER_DID limits
     */
    function setAttribute(
        uint256 tokenId,
        string calldata key,
        string calldata value
    )
        external
        nonReentrant
    {
        require(
            IDIDOwnership(ownershipContract).isAuthorized(tokenId, Actions.SET_ATTRIBUTE, msg.sender),
            "Not authorized"
        );
        
        require(IDIDRegistry(registryContract).exists(tokenId), "DID does not exist");
        
        // Enforce string length limits
        if (bytes(key).length > MAX_ATTRIBUTE_KEY_LENGTH) {
            revert StringTooLong(keccak256(bytes("ATTRIBUTE_KEY")), bytes(key).length, MAX_ATTRIBUTE_KEY_LENGTH);
        }
        if (bytes(value).length > MAX_ATTRIBUTE_VALUE_LENGTH) {
            revert StringTooLong(keccak256(bytes("ATTRIBUTE_VALUE")), bytes(value).length, MAX_ATTRIBUTE_VALUE_LENGTH);
        }
        
        // Check if key already exists
        bool keyExists = bytes(_attributes[tokenId][key]).length > 0;
        if (!keyExists) {
            // Enforce max attributes limit (only for new keys)
            if (_attributeKeys[tokenId].length >= MAX_ATTRIBUTES_PER_DID) {
                revert MaxItemsReached(keccak256(bytes("ATTRIBUTES")), MAX_ATTRIBUTES_PER_DID);
            }
            _attributeKeys[tokenId].push(key);
        }
        
        _attributes[tokenId][key] = value;
        emit AttributeSet(tokenId, key, value);
    }

    /**
     * @dev Batch update attributes (gas-optimized)
     * @param tokenId The token ID
     * @param keys Array of attribute keys
     * @param values Array of attribute values
     * @notice Enforces MAX_ATTRIBUTE_KEY_LENGTH, MAX_ATTRIBUTE_VALUE_LENGTH, and MAX_ATTRIBUTES_PER_DID limits
     * @notice Validates final array size to prevent exceeding MAX_ATTRIBUTES_PER_DID via batch
     */
    function batchUpdateAttributes(
        uint256 tokenId,
        string[] calldata keys,
        string[] calldata values
    ) external nonReentrant {
        require(keys.length == values.length, "Length mismatch");
        require(keys.length <= MAX_BATCH_SIZE, "Too many");
        
        // Single authorization check for batch
        require(
            IDIDOwnership(ownershipContract).isAuthorized(tokenId, Actions.SET_ATTRIBUTE, msg.sender),
            "Not authorized"
        );
        
        require(IDIDRegistry(registryContract).exists(tokenId), "DID does not exist");
        
        // Count new keys (not already existing)
        uint256 newKeyCount = 0;
        for (uint256 i = 0; i < keys.length; i++) {
            // Validate string lengths
            if (bytes(keys[i]).length > MAX_ATTRIBUTE_KEY_LENGTH) {
                revert StringTooLong(keccak256(bytes("ATTRIBUTE_KEY")), bytes(keys[i]).length, MAX_ATTRIBUTE_KEY_LENGTH);
            }
            if (bytes(values[i]).length > MAX_ATTRIBUTE_VALUE_LENGTH) {
                revert StringTooLong(keccak256(bytes("ATTRIBUTE_VALUE")), bytes(values[i]).length, MAX_ATTRIBUTE_VALUE_LENGTH);
            }
            
            // Count new keys
            if (bytes(_attributes[tokenId][keys[i]]).length == 0) {
                newKeyCount++;
            }
        }
        
        // Enforce max attributes limit (check final size)
        uint256 currentCount = _attributeKeys[tokenId].length;
        if (currentCount + newKeyCount > MAX_ATTRIBUTES_PER_DID) {
            revert MaxItemsReached(keccak256(bytes("ATTRIBUTES")), MAX_ATTRIBUTES_PER_DID);
        }
        
        // Batch update (saves gas on transaction overhead)
        for (uint256 i = 0; i < keys.length; i++) {
            bool keyExists = bytes(_attributes[tokenId][keys[i]]).length > 0;
            if (!keyExists) {
                _attributeKeys[tokenId].push(keys[i]);
            }
            _attributes[tokenId][keys[i]] = values[i];
            emit AttributeSet(tokenId, keys[i], values[i]);
        }
    }

    /**
     * @dev Get public attribute
     * @param tokenId The token ID
     * @param key The attribute key
     * @return string The attribute value
     */
    function getAttribute(uint256 tokenId, string calldata key)
        external
        view
        returns (string memory)
    {
        return _attributes[tokenId][key];
    }

    /**
     * @dev Remove attribute
     * @param tokenId The token ID
     * @param key The attribute key
     */
    function removeAttribute(uint256 tokenId, string calldata key)
        external
        nonReentrant
    {
        require(
            IDIDOwnership(ownershipContract).isAuthorized(tokenId, Actions.REMOVE_ATTRIBUTE, msg.sender),
            "Not authorized"
        );
        
        require(IDIDRegistry(registryContract).exists(tokenId), "DID does not exist");
        
        delete _attributes[tokenId][key];
        
        // Remove from keys array
        string[] storage keys = _attributeKeys[tokenId];
        for (uint256 i = 0; i < keys.length; i++) {
            if (keccak256(bytes(keys[i])) == keccak256(bytes(key))) {
                keys[i] = keys[keys.length - 1];
                keys.pop();
                break;
            }
        }
        
        emit AttributeRemoved(tokenId, key);
    }

    /**
     * @dev Get all attribute keys
     * @param tokenId The token ID
     * @return string[] Array of attribute keys
     */
    function getAttributeKeys(uint256 tokenId)
        external
        view
        returns (string[] memory)
    {
        return _attributeKeys[tokenId];
    }

    /**
     * @dev Add verifiable credential reference
     * @param tokenId The token ID
     * @param credentialHash Hash of credential
     * @param credentialType Type of credential
     * @param issuer Issuer address
     * @notice Enforces MAX_CREDENTIAL_REFS_PER_DID limit
     */
    function addCredentialReference(
        uint256 tokenId,
        bytes32 credentialHash,
        string calldata credentialType,
        address issuer
    )
        external
        nonReentrant
    {
        require(
            IDIDOwnership(ownershipContract).isAuthorized(tokenId, Actions.ADD_CREDENTIAL, msg.sender),
            "Not authorized"
        );
        
        require(IDIDRegistry(registryContract).exists(tokenId), "DID does not exist");
        require(issuer != address(0), "Zero address");
        
        // Enforce max credential refs limit
        if (_credentials[tokenId].length >= MAX_CREDENTIAL_REFS_PER_DID) {
            revert MaxItemsReached(keccak256(bytes("CREDENTIAL_REFS")), MAX_CREDENTIAL_REFS_PER_DID);
        }
        
        _credentials[tokenId].push(CredentialReference({
            credentialHash: credentialHash,
            credentialType: credentialType,
            issuer: issuer,
            issuedAt: uint64(block.timestamp),
            revoked: false
        }));
        
        emit CredentialReferenceAdded(tokenId, credentialHash);
    }

    /**
     * @dev Remove credential reference
     * @param tokenId The token ID
     * @param credentialHash Hash of credential
     */
    function removeCredentialReference(uint256 tokenId, bytes32 credentialHash)
        external
        nonReentrant
    {
        require(
            IDIDOwnership(ownershipContract).isAuthorized(tokenId, Actions.REMOVE_CREDENTIAL, msg.sender),
            "Not authorized"
        );
        
        require(IDIDRegistry(registryContract).exists(tokenId), "DID does not exist");
        
        CredentialReference[] storage credentials = _credentials[tokenId];
        uint256 length = credentials.length;
        for (uint256 i = 0; i < length; i++) {
            if (credentials[i].credentialHash == credentialHash) {
                credentials[i] = credentials[length - 1];
                credentials.pop();
                emit CredentialReferenceRemoved(tokenId, credentialHash);
                break;
            }
        }
    }

    /**
     * @dev Get all credential references
     * @param tokenId The token ID
     * @return CredentialReference[] Array of credential references
     */
    function getCredentialReferences(uint256 tokenId)
        external
        view
        returns (CredentialReference[] memory)
    {
        return _credentials[tokenId];
    }

    // ============ Admin Functions ============

    /**
     * @dev Authorize upgrade (UUPS pattern)
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    {}

    /**
     * @dev Supports interface
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

