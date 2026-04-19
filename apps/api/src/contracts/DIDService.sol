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
 * @title DIDService
 * @dev Service endpoint and data pointer storage
 * @notice Stores service endpoints (plaintext URLs) and data pointers (hashes only). User content is not stored on-chain.
 * @notice Queries DIDOwnership for authorization
 * @notice Reads DIDRegistry for existence checks
 * 
 * Governance invariant:
 * - Identity authority is NEVER governed
 * - Governance controls only system rules and upgrades
 * - Upgrade (UUPS): Controlled by Governance Timelock (72h minimum delay)
 * - Service edits: Controlled by DIDOwnership (identity authority)
 * - Emergency pause: Controlled by Emergency Safe (break-glass)
 * - Timelock delay: 72h minimum (health/identity-grade compliance)
 */
contract DIDService is AccessControl, ReentrancyGuard, UUPSUpgradeable, Initializable {

    // Maximum batch size
    uint256 public constant MAX_BATCH_SIZE = 50;

    // Storage limits (hard bounds to prevent gas blowup / DoS)
    uint256 public constant MAX_SERVICE_ENDPOINTS_PER_DID = 20;
    uint256 public constant MAX_KEY_MATERIAL_REFS_PER_DID = 10;
    uint256 public constant MAX_ENCRYPTED_DATA_POINTERS_PER_DID = 50;
    uint256 public constant MAX_SERVICE_ID_LENGTH = 100;
    uint256 public constant MAX_ENDPOINT_URL_LENGTH = 500;
    uint256 public constant MAX_STORAGE_LOCATION_LENGTH = 500;

    // Custom errors for limit violations (gas-efficient)
    error StringTooLong(bytes32 field, uint256 length, uint256 max);
    error ArrayTooLarge(bytes32 field, uint256 length, uint256 max);
    error MaxItemsReached(bytes32 field, uint256 max);

    // Contract references
    address public registryContract;    // DIDRegistry contract address
    address public ownershipContract;   // DIDOwnership contract address

    // Structs
    struct ServiceEndpoint {
        string id;                      // Service identifier
        string serviceType;             // Type of service
        string serviceEndpoint;         // Endpoint URL
        uint64 updatedAt;               // Last update timestamp
    }

    struct KeyMaterialReference {
        bytes32 keyId;                  // Key identifier
        string keyType;                 // Type of key (e.g., "Ed25519", "Secp256k1")
        bytes32 publicKeyHash;          // Hash of public key (NOT the key itself)
        string keyLocation;             // Off-chain location (IPFS CID, S3 key)
        uint64 addedAt;                 // Addition timestamp
        bool revoked;                   // Revocation status
    }

    struct EncryptedDataPointer {
        bytes32 dataHash;               // Hash of encrypted data (NOT the data itself)
        string dataType;                // Type of data (e.g., "chat", "profile")
        string storageLocation;         // Off-chain location (IPFS CID, S3 key)
        bytes32 encryptedKeyMetadataHash; // Hash of encrypted key metadata (NOT the keys)
        uint64 updatedAt;               // Last update timestamp
    }

    // Storage
    mapping(uint256 => mapping(string => ServiceEndpoint)) private _serviceEndpoints;
    mapping(uint256 => string[]) private _serviceIds; // For enumeration
    
    mapping(uint256 => mapping(bytes32 => KeyMaterialReference)) private _keyMaterials;
    mapping(uint256 => bytes32[]) private _keyIds; // For enumeration
    
    mapping(uint256 => mapping(bytes32 => EncryptedDataPointer)) private _encryptedData;
    mapping(uint256 => bytes32[]) private _dataHashes; // For enumeration

    // Events
    event ServiceEndpointAdded(uint256 indexed tokenId, string indexed serviceId, string serviceType, string serviceEndpoint);
    event ServiceEndpointUpdated(uint256 indexed tokenId, string indexed serviceId, string serviceEndpoint);
    event ServiceEndpointRemoved(uint256 indexed tokenId, string indexed serviceId);
    event KeyMaterialReferenceAdded(uint256 indexed tokenId, bytes32 indexed keyId, string keyType);
    event KeyMaterialReferenceRemoved(uint256 indexed tokenId, bytes32 indexed keyId);
    event EncryptedDataPointerStored(uint256 indexed tokenId, bytes32 indexed dataHash, string dataType);
    event EncryptedDataPointerUpdated(uint256 indexed tokenId, bytes32 indexed dataHash);
    event EncryptedDataPointerRemoved(uint256 indexed tokenId, bytes32 indexed dataHash);

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

    // ============ Service Endpoints ============

    /**
     * @dev Add service endpoint
     * @param tokenId The token ID
     * @param serviceId Service identifier
     * @param serviceType Type of service
     * @param serviceEndpoint Endpoint URL
     * @notice Enforces MAX_SERVICE_ID_LENGTH, MAX_ENDPOINT_URL_LENGTH, and MAX_SERVICE_ENDPOINTS_PER_DID limits
     */
    function addServiceEndpoint(
        uint256 tokenId,
        string calldata serviceId,
        string calldata serviceType,
        string calldata serviceEndpoint
    )
        external
        nonReentrant
    {
        require(
            IDIDOwnership(ownershipContract).isAuthorized(tokenId, Actions.ADD_SERVICE, msg.sender),
            "Not authorized"
        );
        
        require(IDIDRegistry(registryContract).exists(tokenId), "DID does not exist");
        require(bytes(_serviceEndpoints[tokenId][serviceId].id).length == 0, "Service exists");
        
        // Enforce string length limits
        if (bytes(serviceId).length > MAX_SERVICE_ID_LENGTH) {
            revert StringTooLong(keccak256(bytes("SERVICE_ID")), bytes(serviceId).length, MAX_SERVICE_ID_LENGTH);
        }
        if (bytes(serviceEndpoint).length > MAX_ENDPOINT_URL_LENGTH) {
            revert StringTooLong(keccak256(bytes("ENDPOINT_URL")), bytes(serviceEndpoint).length, MAX_ENDPOINT_URL_LENGTH);
        }
        
        // Enforce max service endpoints limit
        if (_serviceIds[tokenId].length >= MAX_SERVICE_ENDPOINTS_PER_DID) {
            revert MaxItemsReached(keccak256(bytes("SERVICE_ENDPOINTS")), MAX_SERVICE_ENDPOINTS_PER_DID);
        }
        
        _serviceEndpoints[tokenId][serviceId] = ServiceEndpoint({
            id: serviceId,
            serviceType: serviceType,
            serviceEndpoint: serviceEndpoint,
            updatedAt: uint64(block.timestamp)
        });
        
        _serviceIds[tokenId].push(serviceId);
        
        emit ServiceEndpointAdded(tokenId, serviceId, serviceType, serviceEndpoint);
    }

    /**
     * @dev Update service endpoint
     * @param tokenId The token ID
     * @param serviceId Service identifier
     * @param serviceEndpoint New endpoint URL
     * @notice Enforces MAX_ENDPOINT_URL_LENGTH limit
     */
    function updateServiceEndpoint(
        uint256 tokenId,
        string calldata serviceId,
        string calldata serviceEndpoint
    )
        external
        nonReentrant
    {
        require(
            IDIDOwnership(ownershipContract).isAuthorized(tokenId, Actions.UPDATE_SERVICE, msg.sender),
            "Not authorized"
        );
        
        require(IDIDRegistry(registryContract).exists(tokenId), "DID does not exist");
        require(bytes(_serviceEndpoints[tokenId][serviceId].id).length > 0, "Service does not exist");
        
        // Enforce endpoint URL length limit
        if (bytes(serviceEndpoint).length > MAX_ENDPOINT_URL_LENGTH) {
            revert StringTooLong(keccak256(bytes("ENDPOINT_URL")), bytes(serviceEndpoint).length, MAX_ENDPOINT_URL_LENGTH);
        }
        
        _serviceEndpoints[tokenId][serviceId].serviceEndpoint = serviceEndpoint;
        _serviceEndpoints[tokenId][serviceId].updatedAt = uint64(block.timestamp);
        
        emit ServiceEndpointUpdated(tokenId, serviceId, serviceEndpoint);
    }

    /**
     * @dev Remove service endpoint
     * @param tokenId The token ID
     * @param serviceId Service identifier
     */
    function removeServiceEndpoint(uint256 tokenId, string calldata serviceId)
        external
        nonReentrant
    {
        require(
            IDIDOwnership(ownershipContract).isAuthorized(tokenId, Actions.REMOVE_SERVICE, msg.sender),
            "Not authorized"
        );
        
        require(IDIDRegistry(registryContract).exists(tokenId), "DID does not exist");
        
        delete _serviceEndpoints[tokenId][serviceId];
        
        // Remove from enumeration array
        string[] storage serviceIds = _serviceIds[tokenId];
        uint256 length = serviceIds.length;
        for (uint256 i = 0; i < length; i++) {
            if (keccak256(bytes(serviceIds[i])) == keccak256(bytes(serviceId))) {
                serviceIds[i] = serviceIds[length - 1];
                serviceIds.pop();
                break;
            }
        }
        
        emit ServiceEndpointRemoved(tokenId, serviceId);
    }

    /**
     * @dev Get service endpoint
     * @param tokenId The token ID
     * @param serviceId Service identifier
     * @return ServiceEndpoint The service endpoint
     */
    function getServiceEndpoint(uint256 tokenId, string calldata serviceId)
        external
        view
        returns (ServiceEndpoint memory)
    {
        return _serviceEndpoints[tokenId][serviceId];
    }

    /**
     * @dev Get all service endpoint IDs
     * @param tokenId The token ID
     * @return string[] Array of service IDs
     */
    function getServiceEndpointIds(uint256 tokenId)
        external
        view
        returns (string[] memory)
    {
        return _serviceIds[tokenId];
    }

    // ============ Key Material References ============

    /**
     * @dev Add key material reference (stores hash only, NOT the key)
     * @param tokenId The token ID
     * @param keyId Key identifier
     * @param keyType Type of key
     * @param publicKeyHash Hash of public key (NOT the key itself)
     * @param keyLocation Off-chain location (IPFS CID, S3 key)
     * @notice Enforces MAX_STORAGE_LOCATION_LENGTH and MAX_KEY_MATERIAL_REFS_PER_DID limits
     */
    function addKeyMaterialReference(
        uint256 tokenId,
        bytes32 keyId,
        string calldata keyType,
        bytes32 publicKeyHash,
        string calldata keyLocation
    )
        external
        nonReentrant
    {
        require(
            IDIDOwnership(ownershipContract).isAuthorized(tokenId, Actions.ADD_SERVICE, msg.sender),
            "Not authorized"
        );
        
        require(IDIDRegistry(registryContract).exists(tokenId), "DID does not exist");
        require(_keyMaterials[tokenId][keyId].keyId == bytes32(0), "Key exists");
        
        // Enforce storage location length limit
        if (bytes(keyLocation).length > MAX_STORAGE_LOCATION_LENGTH) {
            revert StringTooLong(keccak256(bytes("STORAGE_LOCATION")), bytes(keyLocation).length, MAX_STORAGE_LOCATION_LENGTH);
        }
        
        // Enforce max key material refs limit
        if (_keyIds[tokenId].length >= MAX_KEY_MATERIAL_REFS_PER_DID) {
            revert MaxItemsReached(keccak256(bytes("KEY_MATERIAL_REFS")), MAX_KEY_MATERIAL_REFS_PER_DID);
        }
        
        _keyMaterials[tokenId][keyId] = KeyMaterialReference({
            keyId: keyId,
            keyType: keyType,
            publicKeyHash: publicKeyHash, // Hash only, NOT the key
            keyLocation: keyLocation,
            addedAt: uint64(block.timestamp),
            revoked: false
        });
        
        _keyIds[tokenId].push(keyId);
        
        emit KeyMaterialReferenceAdded(tokenId, keyId, keyType);
    }

    /**
     * @dev Remove key material reference
     * @param tokenId The token ID
     * @param keyId Key identifier
     */
    function removeKeyMaterialReference(uint256 tokenId, bytes32 keyId)
        external
        nonReentrant
    {
        require(
            IDIDOwnership(ownershipContract).isAuthorized(tokenId, Actions.REMOVE_SERVICE, msg.sender),
            "Not authorized"
        );
        
        require(IDIDRegistry(registryContract).exists(tokenId), "DID does not exist");
        
        delete _keyMaterials[tokenId][keyId];
        
        // Remove from enumeration array
        bytes32[] storage keyIds = _keyIds[tokenId];
        uint256 length = keyIds.length;
        for (uint256 i = 0; i < length; i++) {
            if (keyIds[i] == keyId) {
                keyIds[i] = keyIds[length - 1];
                keyIds.pop();
                break;
            }
        }
        
        emit KeyMaterialReferenceRemoved(tokenId, keyId);
    }

    /**
     * @dev Get key material reference
     * @param tokenId The token ID
     * @param keyId Key identifier
     * @return KeyMaterialReference The key material reference
     */
    function getKeyMaterialReference(uint256 tokenId, bytes32 keyId)
        external
        view
        returns (KeyMaterialReference memory)
    {
        return _keyMaterials[tokenId][keyId];
    }

    /**
     * @dev Get all key IDs
     * @param tokenId The token ID
     * @return bytes32[] Array of key IDs
     */
    function getKeyIds(uint256 tokenId)
        external
        view
        returns (bytes32[] memory)
    {
        return _keyIds[tokenId];
    }

    // ============ Encrypted Data Pointers ============

    /**
     * @dev Store encrypted data pointer (stores hash only, NOT the data)
     * @notice Only stores hash and location - user content is not stored on-chain
     * @param tokenId The token ID
     * @param dataHash Hash of encrypted data (NOT the data itself)
     * @param dataType Type of data (e.g., "chat", "profile")
     * @param storageLocation Off-chain location (IPFS CID, S3 key)
     * @param encryptedKeyMetadataHash Hash of encrypted key metadata (NOT the keys)
     * @notice Enforces MAX_STORAGE_LOCATION_LENGTH and MAX_ENCRYPTED_DATA_POINTERS_PER_DID limits
     */
    function storeEncryptedDataPointer(
        uint256 tokenId,
        bytes32 dataHash,
        string calldata dataType,
        string calldata storageLocation,
        bytes32 encryptedKeyMetadataHash
    )
        external
        nonReentrant
    {
        require(
            IDIDOwnership(ownershipContract).isAuthorized(tokenId, Actions.STORE_DATA, msg.sender),
            "Not authorized"
        );
        
        require(IDIDRegistry(registryContract).exists(tokenId), "DID does not exist");
        
        // Enforce storage location length limit
        if (bytes(storageLocation).length > MAX_STORAGE_LOCATION_LENGTH) {
            revert StringTooLong(keccak256(bytes("STORAGE_LOCATION")), bytes(storageLocation).length, MAX_STORAGE_LOCATION_LENGTH);
        }
        
        // Enforce max encrypted data pointers limit
        if (_dataHashes[tokenId].length >= MAX_ENCRYPTED_DATA_POINTERS_PER_DID) {
            revert MaxItemsReached(keccak256(bytes("ENCRYPTED_DATA_POINTERS")), MAX_ENCRYPTED_DATA_POINTERS_PER_DID);
        }
        
        // Store only hash and pointer - NO sensitive data
        _encryptedData[tokenId][dataHash] = EncryptedDataPointer({
            dataHash: dataHash,
            dataType: dataType,
            storageLocation: storageLocation,
            encryptedKeyMetadataHash: encryptedKeyMetadataHash, // Hash only, NOT the keys
            updatedAt: uint64(block.timestamp)
        });
        
        // Track data hashes for enumeration
        _dataHashes[tokenId].push(dataHash);
        
        emit EncryptedDataPointerStored(tokenId, dataHash, dataType);
    }

    /**
     * @dev Get encrypted data pointer (returns hash and location only)
     * @param tokenId The token ID
     * @param dataHash Hash of encrypted data
     * @return EncryptedDataPointer The encrypted data pointer
     */
    function getEncryptedDataPointer(uint256 tokenId, bytes32 dataHash)
        external
        view
        returns (EncryptedDataPointer memory)
    {
        return _encryptedData[tokenId][dataHash];
    }

    /**
     * @dev Update encrypted data pointer
     * @param tokenId The token ID
     * @param dataHash Hash of encrypted data
     * @param newStorageLocation New off-chain location
     * @param newEncryptedKeyMetadataHash New hash of encrypted key metadata (NOT the keys)
     * @notice Enforces MAX_STORAGE_LOCATION_LENGTH limit
     */
    function updateEncryptedDataPointer(
        uint256 tokenId,
        bytes32 dataHash,
        string calldata newStorageLocation,
        bytes32 newEncryptedKeyMetadataHash
    )
        external
        nonReentrant
    {
        require(
            IDIDOwnership(ownershipContract).isAuthorized(tokenId, Actions.UPDATE_DATA, msg.sender),
            "Not authorized"
        );
        
        require(IDIDRegistry(registryContract).exists(tokenId), "DID does not exist");
        
        EncryptedDataPointer storage pointer = _encryptedData[tokenId][dataHash];
        require(pointer.dataHash != bytes32(0), "Pointer does not exist");
        
        // Enforce storage location length limit
        if (bytes(newStorageLocation).length > MAX_STORAGE_LOCATION_LENGTH) {
            revert StringTooLong(keccak256(bytes("STORAGE_LOCATION")), bytes(newStorageLocation).length, MAX_STORAGE_LOCATION_LENGTH);
        }
        
        pointer.storageLocation = newStorageLocation;
        pointer.encryptedKeyMetadataHash = newEncryptedKeyMetadataHash; // Hash only
        pointer.updatedAt = uint64(block.timestamp);
        
        emit EncryptedDataPointerUpdated(tokenId, dataHash);
    }

    /**
     * @dev Remove encrypted data pointer
     * @param tokenId The token ID
     * @param dataHash Hash of encrypted data
     */
    function removeEncryptedDataPointer(uint256 tokenId, bytes32 dataHash)
        external
        nonReentrant
    {
        require(
            IDIDOwnership(ownershipContract).isAuthorized(tokenId, Actions.REMOVE_DATA, msg.sender),
            "Not authorized"
        );
        
        require(IDIDRegistry(registryContract).exists(tokenId), "DID does not exist");
        
        delete _encryptedData[tokenId][dataHash];
        
        // Remove from enumeration array
        bytes32[] storage dataHashes = _dataHashes[tokenId];
        uint256 length = dataHashes.length;
        for (uint256 i = 0; i < length; i++) {
            if (dataHashes[i] == dataHash) {
                dataHashes[i] = dataHashes[length - 1];
                dataHashes.pop();
                break;
            }
        }
        
        emit EncryptedDataPointerRemoved(tokenId, dataHash);
    }

    /**
     * @dev Get all data hashes
     * @param tokenId The token ID
     * @return bytes32[] Array of data hashes
     */
    function getDataHashes(uint256 tokenId)
        external
        view
        returns (bytes32[] memory)
    {
        return _dataHashes[tokenId];
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

