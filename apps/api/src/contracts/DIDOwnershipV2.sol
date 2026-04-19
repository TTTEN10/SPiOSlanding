// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/IDIDRegistry.sol";
import "./Actions.sol";

/**
 * @title DIDOwnershipV2
 * @dev CENTRALIZED AUTHORIZATION - Single source of truth for all authorization logic
 * @notice All other contracts MUST query this contract for authorization decisions
 * @notice This contract is IMMUTABLE for security (single point of failure risk)
 * @notice Gas-optimized authorization checks with early returns
 * 
 * Security Notes:
 * - Single Point of Failure: If compromised, all DID authorization is at risk (mitigated by immutability and admin delays)
 * - Rule Expiry: Time-limited rules/delegations auto-revoke (delegations have expiry, rules can be extended for time-limited rules)
 * - No Early Bypasses: Even admins/delegates must pass isAuthorized() checks (no role-based bypasses except emergency pause/unpause)
 * - Immutability: registryContract is immutable, preventing proxy-related attacks
 * 
 * Governance invariant:
 * - Identity authority is NEVER governed
 * - Governance only governs rules, not identity actions
 * - DEFAULT_ADMIN_ROLE: Controlled by Governance Timelock (72h delay)
 * - pause/unpause: Controlled by Emergency Safe (break-glass only)
 * - Authorization rules: Via authorized DID actions only
 * - No multisig logic inside DID contracts (governance is orthogonal)
 * - Governance cannot impersonate identities
 */
contract DIDOwnershipV2 is AccessControl, ReentrancyGuard, Pausable {

    // Maximum controllers per DID
    uint256 public constant MAX_CONTROLLERS = 10;

    // Storage
    mapping(uint256 => address[]) private _controllers;                       // tokenId → controllers[]
    mapping(uint256 => mapping(address => bool)) private _isController;       // tokenId → controller → bool
    mapping(uint256 => mapping(address => uint256)) private _delegations;     // tokenId → delegatee → expiry
    mapping(uint256 => mapping(bytes32 => AuthorizationRule)) private _authRules; // tokenId → action → rule

    // Contract reference (set once to resolve circular deployment dependency)
    address public registryContract;  // DIDRegistryV2 contract address

    // Structs
    struct AuthorizationRule {
        bool requiresOwner;
        bool requiresController;
        uint256 expiry; // Optional expiry for time-limited rules
    }

    // Events
    event ControllerAdded(uint256 indexed tokenId, address indexed controller);
    event ControllerRemoved(uint256 indexed tokenId, address indexed controller);
    event DelegationGranted(uint256 indexed tokenId, address indexed delegatee, uint256 expiry);
    event DelegationRevoked(uint256 indexed tokenId, address indexed delegatee);
    event AuthorizationRuleSet(uint256 indexed tokenId, bytes32 indexed action, bool requiresOwner, bool requiresController);

    /**
     * @dev Constructor
     * @param _registryContract DIDRegistryV2 contract address
     * @param admin Admin address (gets DEFAULT_ADMIN_ROLE)
     */
    constructor(
        address _registryContract,
        address admin
    ) {
        require(admin != address(0), "Zero address");
        
        registryContract = _registryContract;  // May be address(0) for two-phase deploy
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /**
     * @dev One-time setter for registryContract (resolves circular deployment dependency)
     * @notice Can only be called when registryContract is address(0)
     * @param _registryContract DIDRegistryV2 contract address
     */
    function setRegistryContract(address _registryContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(registryContract == address(0), "Registry already set");
        require(_registryContract != address(0), "Zero address");
        registryContract = _registryContract;
    }

    /**
     * @dev CENTRAL authorization check - called by all other contracts
     * @notice Implements canonical authorization model with single, unambiguous semantics
     * @notice All callers (Owner, Controller, Delegate) are evaluated against the same rule logic
     * @notice No early role-based bypasses except explicit Admin exclusions
     * @notice Delegates cannot bypass custom rules
     * @notice Invalid rules (requiresOwner=false, requiresController=false) revert
     * 
     * Authorization Algorithm (Normative):
     * 1. If rule exists and rule.expiry < now → DENY
     * 2. Resolve actor roles: isOwner, isController, isDelegate (and delegation valid)
     * 3. If rule.requiresOwner == false AND rule.requiresController == false → REVERT (invalid rule)
     * 4. If rule.requiresOwner == true AND isOwner → ALLOW
     * 5. If rule.requiresController == true AND (isController OR isDelegate) → ALLOW
     * 6. Otherwise → DENY
     * 
     * Rule Composition Truth Table:
     * - requiresOwner=true, requiresController=false: Owner only
     * - requiresOwner=false, requiresController=true: Controller-level (Owner, Controller, Delegate*)
     * - requiresOwner=true, requiresController=true: Owner OR Controller (Owner, Controller, Delegate*)
     * - requiresOwner=false, requiresController=false: INVALID → REVERT
     * 
     * * Delegate condition: Delegate authorized only if delegation valid AND requiresController == true
     * 
     * @param tokenId The DID token ID
     * @param action The action being performed (canonical bytes32 constant from Actions library)
     * @param account The account requesting authorization
     * @return bool Whether the account is authorized
     * @custom:security This function is security-critical. Any changes must maintain single semantics.
     */
    function isAuthorized(
        uint256 tokenId,
        bytes32 action,
        address account
    )
        public
        view
        returns (bool    )
    {
        if (registryContract == address(0)) {
            return false;  // Two-phase deploy not complete
        }
        // Get owner from registry (single storage read, cached)
        address owner = IDIDRegistry(registryContract).ownerOf(tokenId);
        if (owner == address(0)) {
            return false; // DID does not exist
        }
        
        // Resolve actor roles (no early returns - all evaluated against same rules)
        bool isOwner = (account == owner);
        bool isControllerAccount = _isController[tokenId][account];
        bool isDelegate = (_delegations[tokenId][account] > block.timestamp);
        
        // Get authorization rule for this action
        AuthorizationRule memory rule = _authRules[tokenId][action];
        
        // Step 1: Check rule expiry (if rule exists)
        if (rule.expiry > 0 && rule.expiry < block.timestamp) {
            return false; // Rule expired
        }
        
        // Step 2 & 3: Handle rule existence and validation
        // If no rule exists (all fields zero), owner has implicit permission, others denied
        bool ruleExists = (rule.expiry > 0 || rule.requiresOwner || rule.requiresController);
        
        if (!ruleExists) {
            // No rule set - owner has implicit permission, all others denied
            return isOwner;
        }
        
        // Step 3: Validate rule configuration (invalid rules revert)
        // If both flags are false but rule exists, this is invalid
        require(
            rule.requiresOwner || rule.requiresController,
            "Invalid authorization rule: both requiresOwner and requiresController are false"
        );
        
        // Step 4: Check requiresOwner condition
        if (rule.requiresOwner && isOwner) {
            return true; // Owner authorized
        }
        
        // Step 5: Check requiresController condition
        // Delegates can satisfy requiresController, but only if delegation is valid
        // AND requiresController is true (delegates never satisfy requiresOwner)
        if (rule.requiresController && (isControllerAccount || isDelegate)) {
            return true; // Controller or Delegate authorized
        }
        
        // Step 6: Default deny
        return false;
    }

    /**
     * @dev Add controller to DID
     * @param tokenId The token ID
     * @param controller The controller address
     */
    function addController(uint256 tokenId, address controller)
        external
        nonReentrant
        whenNotPaused
    {
        require(registryContract != address(0), "Registry not set");
        // Check authorization using canonical action constant
        require(
            isAuthorized(tokenId, Actions.ADD_CONTROLLER, msg.sender),
            "Not authorized"
        );
        
        require(controller != address(0), "Zero address");
        require(!_isController[tokenId][controller], "Already controller");
        
        // Get owner from registry
        address owner = IDIDRegistry(registryContract).ownerOf(tokenId);
        require(owner != address(0), "DID does not exist");
        
        // Enforce maximum controllers limit
        require(_controllers[tokenId].length < MAX_CONTROLLERS, "Max controllers");
        
        _controllers[tokenId].push(controller);
        _isController[tokenId][controller] = true;
        
        emit ControllerAdded(tokenId, controller);
    }

    /**
     * @dev Remove controller from DID
     * @param tokenId The token ID
     * @param controller The controller address
     */
    function removeController(uint256 tokenId, address controller)
        external
        nonReentrant
        whenNotPaused
    {
        require(
            isAuthorized(tokenId, Actions.REMOVE_CONTROLLER, msg.sender),
            "Not authorized"
        );
        
        require(_isController[tokenId][controller], "Not controller");
        
        // Remove from array (gas-optimized - swap and pop)
        address[] storage controllers = _controllers[tokenId];
        uint256 length = controllers.length;
        for (uint256 i = 0; i < length; i++) {
            if (controllers[i] == controller) {
                controllers[i] = controllers[length - 1];
                controllers.pop();
                break;
            }
        }
        
        _isController[tokenId][controller] = false;
        
        emit ControllerRemoved(tokenId, controller);
    }

    /**
     * @dev Get all controllers for a DID
     * @param tokenId The token ID
     * @return address[] Array of controller addresses
     */
    function getControllers(uint256 tokenId) 
        external 
        view 
        returns (address[] memory)
    {
        return _controllers[tokenId];
    }

    /**
     * @dev Check if address is controller
     * @param tokenId The token ID
     * @param account The account to check
     * @return bool Whether the account is a controller
     */
    function isController(uint256 tokenId, address account)
        external
        view
        returns (bool)
    {
        return _isController[tokenId][account];
    }

    /**
     * @dev Delegate authority to another address (temporary)
     * @notice Delegates cannot bypass custom rules - they are evaluated against the same rule logic
     * @notice Delegates can only satisfy requiresController, never requiresOwner
     * @notice Delegation is time-limited and subject to rule expiry
     * @param tokenId The token ID
     * @param delegatee The delegatee address
     * @param expiry Expiry timestamp (must be in the future)
     */
    function delegate(uint256 tokenId, address delegatee, uint256 expiry)
        external
        nonReentrant
        whenNotPaused
    {
        require(
            isAuthorized(tokenId, Actions.DELEGATE, msg.sender),
            "Not authorized"
        );
        
        require(delegatee != address(0), "Zero address");
        require(expiry > block.timestamp, "Invalid expiry");
        
        _delegations[tokenId][delegatee] = expiry;
        emit DelegationGranted(tokenId, delegatee, expiry);
    }

    /**
     * @dev Revoke delegation
     * @param tokenId The token ID
     * @param delegatee The delegatee address
     */
    function revokeDelegation(uint256 tokenId, address delegatee)
        external
        nonReentrant
        whenNotPaused
    {
        require(
            isAuthorized(tokenId, Actions.REVOKE_DELEGATION, msg.sender),
            "Not authorized"
        );
        
        delete _delegations[tokenId][delegatee];
        emit DelegationRevoked(tokenId, delegatee);
    }

    /**
     * @dev Check if address has delegated authority
     * @param tokenId The token ID
     * @param account The account to check
     * @return bool Whether the account has delegated authority
     */
    function hasDelegatedAuthority(uint256 tokenId, address account)
        external
        view
        returns (bool)
    {
        return _delegations[tokenId][account] > block.timestamp;
    }

    /**
     * @dev Set authorization rule for specific action
     * @notice Invalid rule configurations (both flags false) will revert
     * @notice See isAuthorized() documentation for rule composition truth table
     * @notice Even admins must pass isAuthorized() checks - no early bypasses
     * @param tokenId The token ID
     * @param action The action (canonical bytes32 constant from Actions library)
     * @param requiresOwner Whether owner is required
     * @param requiresController Whether controller is required
     * @custom:security Invalid rules (requiresOwner=false, requiresController=false) revert
     * @custom:security No early bypasses - even admins/delegates must pass isAuthorized() checks
     */
    function setAuthorizationRule(
        uint256 tokenId,
        bytes32 action,
        bool requiresOwner,
        bool requiresController
    )
        external
        nonReentrant
        whenNotPaused
    {
        // Must be authorized to set rules (use DELEGATE action for rule setting)
        // Even admins must pass isAuthorized() checks - no early bypasses
        require(
            isAuthorized(tokenId, Actions.DELEGATE, msg.sender),
            "Not authorized"
        );
        
        // Validate rule configuration - invalid rules revert
        require(
            requiresOwner || requiresController,
            "Invalid authorization rule: both requiresOwner and requiresController cannot be false"
        );
        
        _authRules[tokenId][action] = AuthorizationRule({
            requiresOwner: requiresOwner,
            requiresController: requiresController,
            expiry: 0 // Can be extended for time-limited rules (currently no expiry, but delegations have expiry)
        });
        
        emit AuthorizationRuleSet(tokenId, action, requiresOwner, requiresController);
    }

    /**
     * @dev Get authorization rule
     * @param tokenId The token ID
     * @param action The action
     * @return AuthorizationRule The authorization rule
     */
    function getAuthorizationRule(uint256 tokenId, bytes32 action)
        external
        view
        returns (AuthorizationRule memory)
    {
        return _authRules[tokenId][action];
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
        override(AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

