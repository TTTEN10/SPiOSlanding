/**
 * @title DIDMetadata Storage Limits Tests
 * @notice Tests ensure hard storage limits are enforced and cannot be bypassed
 * @notice Security-critical: All tests must pass for production deployment
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("DIDMetadata Storage Limits", function () {
  // Deploy contracts fixture
  async function deployContractsFixture() {
    const [owner, admin, other] = await ethers.getSigners();

    // Deploy DIDOwnershipV2 (registry set in two-phase to break circular dep)
    const DIDOwnershipV2 = await ethers.getContractFactory("DIDOwnershipV2");
    const ownership = await DIDOwnershipV2.deploy(ethers.ZeroAddress, admin.address);
    await ownership.waitForDeployment();

    // Deploy DIDRegistryV2
    const DIDRegistryV2 = await ethers.getContractFactory("DIDRegistryV2");
    const registry = await DIDRegistryV2.deploy(
      "SafePsy DID",
      "SPDID",
      await ownership.getAddress(),
      admin.address
    );
    await registry.waitForDeployment();

    // Wire ownership.registryContract to registry (two-phase deploy; admin only)
    await (await ownership.connect(admin).setRegistryContract(await registry.getAddress())).wait();

    // Deploy DIDMetadata
    const DIDMetadata = await ethers.getContractFactory("DIDMetadata");
    const metadata = await DIDMetadata.deploy();
    await metadata.waitForDeployment();
    await metadata.initialize(
      await registry.getAddress(),
      await ownership.getAddress(),
      admin.address
    );

    const tokenId = 1;
    const didHash = ethers.id("test-did");

    // Mint a DID for owner
    await registry.connect(admin).mint(owner.address, didHash);

    return {
      metadata,
      registry,
      ownership,
      owner,
      admin,
      other,
      tokenId,
      didHash,
    };
  }

  describe("Attribute Limits", function () {
    describe("setAttribute - String Length Limits", function () {
      it("should revert when attribute key exceeds MAX_ATTRIBUTE_KEY_LENGTH", async function () {
        const { metadata, owner, tokenId } = await loadFixture(deployContractsFixture);
        
        const maxKeyLength = await metadata.MAX_ATTRIBUTE_KEY_LENGTH();
        const tooLongKey = "a".repeat(Number(maxKeyLength) + 1);
        const value = "test-value";

        await expect(
          metadata.connect(owner).setAttribute(tokenId, tooLongKey, value)
        ).to.be.revertedWithCustomError(metadata, "StringTooLong")
          .withArgs(ethers.id("ATTRIBUTE_KEY"), tooLongKey.length, maxKeyLength);
      });

      it("should revert when attribute value exceeds MAX_ATTRIBUTE_VALUE_LENGTH", async function () {
        const { metadata, owner, tokenId } = await loadFixture(deployContractsFixture);
        
        const maxValueLength = await metadata.MAX_ATTRIBUTE_VALUE_LENGTH();
        const key = "test-key";
        const tooLongValue = "a".repeat(Number(maxValueLength) + 1);

        await expect(
          metadata.connect(owner).setAttribute(tokenId, key, tooLongValue)
        ).to.be.revertedWithCustomError(metadata, "StringTooLong")
          .withArgs(ethers.id("ATTRIBUTE_VALUE"), tooLongValue.length, maxValueLength);
      });

      it("should succeed when key and value are within limits", async function () {
        const { metadata, owner, tokenId } = await loadFixture(deployContractsFixture);
        
        const maxKeyLength = await metadata.MAX_ATTRIBUTE_KEY_LENGTH();
        const maxValueLength = await metadata.MAX_ATTRIBUTE_VALUE_LENGTH();
        const key = "a".repeat(Number(maxKeyLength)); // Exactly at max
        const value = "a".repeat(Number(maxValueLength)); // Exactly at max

        await expect(
          metadata.connect(owner).setAttribute(tokenId, key, value)
        ).to.emit(metadata, "AttributeSet");
      });
    });

    describe("setAttribute - Max Attributes Limit", function () {
      it("should succeed when adding up to MAX_ATTRIBUTES_PER_DID", async function () {
        const { metadata, owner, tokenId } = await loadFixture(deployContractsFixture);
        
        const maxAttributes = await metadata.MAX_ATTRIBUTES_PER_DID();

        // Add max-1 attributes
        for (let i = 0; i < Number(maxAttributes) - 1; i++) {
          await metadata.connect(owner).setAttribute(tokenId, `key-${i}`, `value-${i}`);
        }

        // Adding the last one should succeed
        await expect(
          metadata.connect(owner).setAttribute(tokenId, `key-${Number(maxAttributes) - 1}`, `value-${Number(maxAttributes) - 1}`)
        ).to.emit(metadata, "AttributeSet");
      });

      it("should revert when exceeding MAX_ATTRIBUTES_PER_DID", async function () {
        const { metadata, owner, tokenId } = await loadFixture(deployContractsFixture);
        
        const maxAttributes = await metadata.MAX_ATTRIBUTES_PER_DID();

        // Fill to max
        for (let i = 0; i < Number(maxAttributes); i++) {
          await metadata.connect(owner).setAttribute(tokenId, `key-${i}`, `value-${i}`);
        }

        // Next add should revert
        await expect(
          metadata.connect(owner).setAttribute(tokenId, "new-key", "new-value")
        ).to.be.revertedWithCustomError(metadata, "MaxItemsReached")
          .withArgs(ethers.id("ATTRIBUTES"), maxAttributes);
      });

      it("should not fail when updating existing attribute (count unchanged)", async function () {
        const { metadata, owner, tokenId } = await loadFixture(deployContractsFixture);
        
        const maxAttributes = await metadata.MAX_ATTRIBUTES_PER_DID();

        // Fill to max
        for (let i = 0; i < Number(maxAttributes); i++) {
          await metadata.connect(owner).setAttribute(tokenId, `key-${i}`, `value-${i}`);
        }

        // Update existing attribute should succeed (doesn't increase count)
        await expect(
          metadata.connect(owner).setAttribute(tokenId, "key-0", "updated-value")
        ).to.emit(metadata, "AttributeSet");
      });
    });

    describe("batchUpdateAttributes - Limits", function () {
      it("should revert when batch would exceed MAX_ATTRIBUTES_PER_DID", async function () {
        const { metadata, owner, tokenId } = await loadFixture(deployContractsFixture);
        
        const maxAttributes = await metadata.MAX_ATTRIBUTES_PER_DID();

        // Add existing attributes so that one batch (<= MAX_BATCH_SIZE) would exceed MAX_ATTRIBUTES_PER_DID
        const maxBatchSize = await metadata.MAX_BATCH_SIZE();
        const existingCount = Number(maxAttributes) - Number(maxBatchSize) + 1; // e.g. 100-50+1=51
        for (let i = 0; i < existingCount; i++) {
          await metadata.connect(owner).setAttribute(tokenId, `existing-key-${i}`, `value-${i}`);
        }
        const batchSize = Number(maxBatchSize);
        const keys = Array.from({ length: batchSize }, (_, i) => `new-key-${i}`);
        const values = Array.from({ length: batchSize }, (_, i) => `value-${i}`);

        await expect(
          metadata.connect(owner).batchUpdateAttributes(tokenId, keys, values)
        ).to.be.revertedWithCustomError(metadata, "MaxItemsReached")
          .withArgs(ethers.id("ATTRIBUTES"), maxAttributes);
      });

      it("should revert when batch contains key exceeding MAX_ATTRIBUTE_KEY_LENGTH", async function () {
        const { metadata, owner, tokenId } = await loadFixture(deployContractsFixture);
        
        const maxKeyLength = await metadata.MAX_ATTRIBUTE_KEY_LENGTH();
        const tooLongKey = "a".repeat(Number(maxKeyLength) + 1);

        await expect(
          metadata.connect(owner).batchUpdateAttributes(
            tokenId,
            [tooLongKey],
            ["value"]
          )
        ).to.be.revertedWithCustomError(metadata, "StringTooLong")
          .withArgs(ethers.id("ATTRIBUTE_KEY"), tooLongKey.length, maxKeyLength);
      });

      it("should revert when batch contains value exceeding MAX_ATTRIBUTE_VALUE_LENGTH", async function () {
        const { metadata, owner, tokenId } = await loadFixture(deployContractsFixture);
        
        const maxValueLength = await metadata.MAX_ATTRIBUTE_VALUE_LENGTH();
        const tooLongValue = "a".repeat(Number(maxValueLength) + 1);

        await expect(
          metadata.connect(owner).batchUpdateAttributes(
            tokenId,
            ["key"],
            [tooLongValue]
          )
        ).to.be.revertedWithCustomError(metadata, "StringTooLong")
          .withArgs(ethers.id("ATTRIBUTE_VALUE"), tooLongValue.length, maxValueLength);
      });

      it("should succeed when batch exactly reaches MAX_ATTRIBUTES_PER_DID", async function () {
        const { metadata, owner, tokenId } = await loadFixture(deployContractsFixture);
        
        const maxAttributes = await metadata.MAX_ATTRIBUTES_PER_DID();
        const maxBatchSize = await metadata.MAX_BATCH_SIZE();
        // batchUpdateAttributes has MAX_BATCH_SIZE (50); do one batch of 50 then add rest via setAttribute
        const batchSize = Math.min(Number(maxAttributes), Number(maxBatchSize));
        const keys = Array.from({ length: batchSize }, (_, i) => `key-${i}`);
        const values = Array.from({ length: batchSize }, (_, i) => `value-${i}`);

        await expect(
          metadata.connect(owner).batchUpdateAttributes(tokenId, keys, values)
        ).to.emit(metadata, "AttributeSet");
        // Fill to max with setAttribute if maxAttributes > batchSize
        for (let i = batchSize; i < Number(maxAttributes); i++) {
          await metadata.connect(owner).setAttribute(tokenId, `key-${i}`, `value-${i}`);
        }
      });
    });
  });

  describe("Credential Reference Limits", function () {
    it("should succeed when adding up to MAX_CREDENTIAL_REFS_PER_DID", async function () {
      const { metadata, owner, tokenId } = await loadFixture(deployContractsFixture);
      
      const maxCreds = await metadata.MAX_CREDENTIAL_REFS_PER_DID();

      // Add max-1 credentials
      for (let i = 0; i < Number(maxCreds) - 1; i++) {
        await metadata.connect(owner).addCredentialReference(
          tokenId,
          ethers.id(`cred-${i}`),
          "TestCredential",
          owner.address
        );
      }

      // Adding the last one should succeed
      await expect(
        metadata.connect(owner).addCredentialReference(
          tokenId,
          ethers.id(`cred-${Number(maxCreds) - 1}`),
          "TestCredential",
          owner.address
        )
      ).to.emit(metadata, "CredentialReferenceAdded");
    });

    it("should revert when exceeding MAX_CREDENTIAL_REFS_PER_DID", async function () {
      const { metadata, owner, tokenId } = await loadFixture(deployContractsFixture);
      
      const maxCreds = await metadata.MAX_CREDENTIAL_REFS_PER_DID();

      // Fill to max
      for (let i = 0; i < Number(maxCreds); i++) {
        await metadata.connect(owner).addCredentialReference(
          tokenId,
          ethers.id(`cred-${i}`),
          "TestCredential",
          owner.address
        );
      }

      // Next add should revert
      await expect(
        metadata.connect(owner).addCredentialReference(
          tokenId,
          ethers.id("new-cred"),
          "TestCredential",
          owner.address
        )
      ).to.be.revertedWithCustomError(metadata, "MaxItemsReached")
        .withArgs(ethers.id("CREDENTIAL_REFS"), maxCreds);
    });
  });

  describe("DID Document Limits", function () {
    it("should revert when contexts array exceeds MAX_CONTEXTS", async function () {
      const { metadata, owner, tokenId } = await loadFixture(deployContractsFixture);
      
      const maxContexts = await metadata.MAX_CONTEXTS();
      const tooManyContexts = Array.from({ length: Number(maxContexts) + 1 }, (_, i) => `context-${i}`);

      const document = {
        contexts: tooManyContexts,
        id: "did:test:123",
        controller: [],
        updated: 0,
      };

      await expect(
        metadata.connect(owner).setDidDocument(tokenId, document)
      ).to.be.revertedWithCustomError(metadata, "ArrayTooLarge")
        .withArgs(ethers.id("CONTEXTS"), tooManyContexts.length, maxContexts);
    });

    it("should revert when controllers array exceeds MAX_CONTROLLERS", async function () {
      const { metadata, owner, tokenId } = await loadFixture(deployContractsFixture);
      
      const maxControllers = await metadata.MAX_CONTROLLERS();
      const tooManyControllers = Array.from({ length: Number(maxControllers) + 1 }, (_, i) => `did:test:${i}`);

      const document = {
        contexts: [],
        id: "did:test:123",
        controller: tooManyControllers,
        updated: 0,
      };

      await expect(
        metadata.connect(owner).setDidDocument(tokenId, document)
      ).to.be.revertedWithCustomError(metadata, "ArrayTooLarge")
        .withArgs(ethers.id("CONTROLLERS"), tooManyControllers.length, maxControllers);
    });

    it("should succeed when contexts and controllers are within limits", async function () {
      const { metadata, owner, tokenId } = await loadFixture(deployContractsFixture);
      
      const maxContexts = await metadata.MAX_CONTEXTS();
      const maxControllers = await metadata.MAX_CONTROLLERS();

      const document = {
        contexts: Array.from({ length: Number(maxContexts) }, (_, i) => `context-${i}`),
        id: "did:test:123",
        controller: Array.from({ length: Number(maxControllers) }, (_, i) => `did:test:${i}`),
        updated: 0,
      };

      await expect(
        metadata.connect(owner).setDidDocument(tokenId, document)
      ).to.emit(metadata, "DidDocumentUpdated");
    });
  });

  describe("Bypass Prevention", function () {
    it("cannot bypass limits via batchUpdateAttributes after reaching max", async function () {
      const { metadata, owner, tokenId } = await loadFixture(deployContractsFixture);
      
      const maxAttributes = await metadata.MAX_ATTRIBUTES_PER_DID();

      // Fill to max via setAttribute
      for (let i = 0; i < Number(maxAttributes); i++) {
        await metadata.connect(owner).setAttribute(tokenId, `key-${i}`, `value-${i}`);
      }

      // Attempt to add more via batch should revert
      await expect(
        metadata.connect(owner).batchUpdateAttributes(
          tokenId,
          ["new-key"],
          ["new-value"]
        )
      ).to.be.revertedWithCustomError(metadata, "MaxItemsReached");
    });

    it("cannot bypass limits by mixing setAttribute and batchUpdateAttributes", async function () {
      const { metadata, owner, tokenId } = await loadFixture(deployContractsFixture);
      
      const maxAttributes = await metadata.MAX_ATTRIBUTES_PER_DID();
      const maxBatchSize = await metadata.MAX_BATCH_SIZE();

      // Add some via setAttribute
      const viaSetAttribute = 10;
      for (let i = 0; i < viaSetAttribute; i++) {
        await metadata.connect(owner).setAttribute(tokenId, `key-${i}`, `value-${i}`);
      }

      // Add rest via batch (batch size must be <= MAX_BATCH_SIZE) then setAttribute to reach max
      const batchSize = Math.min(Number(maxAttributes) - viaSetAttribute, Number(maxBatchSize));
      const keys = Array.from({ length: batchSize }, (_, i) => `key-${viaSetAttribute + i}`);
      const values = Array.from({ length: batchSize }, (_, i) => `value-${viaSetAttribute + i}`);
      await metadata.connect(owner).batchUpdateAttributes(tokenId, keys, values);
      for (let i = viaSetAttribute + batchSize; i < Number(maxAttributes); i++) {
        await metadata.connect(owner).setAttribute(tokenId, `key-${i}`, `value-${i}`);
      }

      // Now both paths should be blocked
      await expect(
        metadata.connect(owner).setAttribute(tokenId, "new-key", "new-value")
      ).to.be.revertedWithCustomError(metadata, "MaxItemsReached");

      await expect(
        metadata.connect(owner).batchUpdateAttributes(tokenId, ["another-key"], ["another-value"])
      ).to.be.revertedWithCustomError(metadata, "MaxItemsReached");
    });
  });
});

