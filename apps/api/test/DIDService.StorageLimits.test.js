/**
 * @title DIDService Storage Limits Tests
 * @notice Tests ensure hard storage limits are enforced and cannot be bypassed
 * @notice Security-critical: All tests must pass for production deployment
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("DIDService Storage Limits", function () {
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

    // Deploy DIDService
    const DIDService = await ethers.getContractFactory("DIDService");
    const service = await DIDService.deploy();
    await service.waitForDeployment();
    await service.initialize(
      await registry.getAddress(),
      await ownership.getAddress(),
      admin.address
    );

    const tokenId = 1;
    const didHash = ethers.id("test-did");

    // Mint a DID for owner
    await registry.connect(admin).mint(owner.address, didHash);

    return {
      service,
      registry,
      ownership,
      owner,
      admin,
      other,
      tokenId,
      didHash,
    };
  }

  describe("Service Endpoint Limits", function () {
    describe("addServiceEndpoint - String Length Limits", function () {
      it("should revert when service ID exceeds MAX_SERVICE_ID_LENGTH", async function () {
        const { service, owner, tokenId } = await loadFixture(deployContractsFixture);
        
        const maxServiceIdLength = await service.MAX_SERVICE_ID_LENGTH();
        const tooLongServiceId = "a".repeat(Number(maxServiceIdLength) + 1);

        await expect(
          service.connect(owner).addServiceEndpoint(
            tokenId,
            tooLongServiceId,
            "ServiceType",
            "https://example.com"
          )
        ).to.be.revertedWithCustomError(service, "StringTooLong")
          .withArgs(ethers.id("SERVICE_ID"), tooLongServiceId.length, maxServiceIdLength);
      });

      it("should revert when endpoint URL exceeds MAX_ENDPOINT_URL_LENGTH", async function () {
        const { service, owner, tokenId } = await loadFixture(deployContractsFixture);
        
        const maxEndpointLength = await service.MAX_ENDPOINT_URL_LENGTH();
        const tooLongEndpoint = "https://" + "a".repeat(Number(maxEndpointLength) - 7);

        await expect(
          service.connect(owner).addServiceEndpoint(
            tokenId,
            "service-id",
            "ServiceType",
            tooLongEndpoint
          )
        ).to.be.revertedWithCustomError(service, "StringTooLong")
          .withArgs(ethers.id("ENDPOINT_URL"), tooLongEndpoint.length, maxEndpointLength);
      });

      it("should succeed when service ID and endpoint URL are within limits", async function () {
        const { service, owner, tokenId } = await loadFixture(deployContractsFixture);
        
        const maxServiceIdLength = await service.MAX_SERVICE_ID_LENGTH();
        const maxEndpointLength = await service.MAX_ENDPOINT_URL_LENGTH();
        const serviceId = "a".repeat(Number(maxServiceIdLength)); // Exactly at max
        // Total length must be <= maxEndpointLength: "https://" is 8 chars, so repeat (max - 8)
        const endpoint = "https://" + "a".repeat(Number(maxEndpointLength) - 8);

        await expect(
          service.connect(owner).addServiceEndpoint(tokenId, serviceId, "ServiceType", endpoint)
        ).to.emit(service, "ServiceEndpointAdded");
      });
    });

    describe("addServiceEndpoint - Max Endpoints Limit", function () {
      it("should succeed when adding up to MAX_SERVICE_ENDPOINTS_PER_DID", async function () {
        const { service, owner, tokenId } = await loadFixture(deployContractsFixture);
        
        const maxEndpoints = await service.MAX_SERVICE_ENDPOINTS_PER_DID();

        // Add max-1 endpoints
        for (let i = 0; i < Number(maxEndpoints) - 1; i++) {
          await service.connect(owner).addServiceEndpoint(
            tokenId,
            `service-${i}`,
            "ServiceType",
            `https://example.com/${i}`
          );
        }

        // Adding the last one should succeed
        await expect(
          service.connect(owner).addServiceEndpoint(
            tokenId,
            `service-${Number(maxEndpoints) - 1}`,
            "ServiceType",
            `https://example.com/${Number(maxEndpoints) - 1}`
          )
        ).to.emit(service, "ServiceEndpointAdded");
      });

      it("should revert when exceeding MAX_SERVICE_ENDPOINTS_PER_DID", async function () {
        const { service, owner, tokenId } = await loadFixture(deployContractsFixture);
        
        const maxEndpoints = await service.MAX_SERVICE_ENDPOINTS_PER_DID();

        // Fill to max
        for (let i = 0; i < Number(maxEndpoints); i++) {
          await service.connect(owner).addServiceEndpoint(
            tokenId,
            `service-${i}`,
            "ServiceType",
            `https://example.com/${i}`
          );
        }

        // Next add should revert
        await expect(
          service.connect(owner).addServiceEndpoint(
            tokenId,
            "new-service",
            "ServiceType",
            "https://example.com/new"
          )
        ).to.be.revertedWithCustomError(service, "MaxItemsReached")
          .withArgs(ethers.id("SERVICE_ENDPOINTS"), maxEndpoints);
      });
    });

    describe("updateServiceEndpoint - String Length Limits", function () {
      it("should revert when updated endpoint URL exceeds MAX_ENDPOINT_URL_LENGTH", async function () {
        const { service, owner, tokenId } = await loadFixture(deployContractsFixture);
        
        // Add a service first
        await service.connect(owner).addServiceEndpoint(
          tokenId,
          "service-id",
          "ServiceType",
          "https://example.com"
        );

        const maxEndpointLength = await service.MAX_ENDPOINT_URL_LENGTH();
        const tooLongEndpoint = "https://" + "a".repeat(Number(maxEndpointLength) - 7);

        await expect(
          service.connect(owner).updateServiceEndpoint(tokenId, "service-id", tooLongEndpoint)
        ).to.be.revertedWithCustomError(service, "StringTooLong")
          .withArgs(ethers.id("ENDPOINT_URL"), tooLongEndpoint.length, maxEndpointLength);
      });

      it("should succeed when updated endpoint URL is within limit", async function () {
        const { service, owner, tokenId } = await loadFixture(deployContractsFixture);
        
        // Add a service first
        await service.connect(owner).addServiceEndpoint(
          tokenId,
          "service-id",
          "ServiceType",
          "https://example.com"
        );

        const maxEndpointLength = await service.MAX_ENDPOINT_URL_LENGTH();
        const validEndpoint = "https://" + "a".repeat(Number(maxEndpointLength) - 8);

        await expect(
          service.connect(owner).updateServiceEndpoint(tokenId, "service-id", validEndpoint)
        ).to.emit(service, "ServiceEndpointUpdated");
      });
    });
  });

  describe("Key Material Reference Limits", function () {
    describe("addKeyMaterialReference - String Length Limits", function () {
      it("should revert when storage location exceeds MAX_STORAGE_LOCATION_LENGTH", async function () {
        const { service, owner, tokenId } = await loadFixture(deployContractsFixture);
        
        const maxLocationLength = await service.MAX_STORAGE_LOCATION_LENGTH();
        const tooLongLocation = "a".repeat(Number(maxLocationLength) + 1);

        await expect(
          service.connect(owner).addKeyMaterialReference(
            tokenId,
            ethers.id("key-id"),
            "Ed25519",
            ethers.id("public-key-hash"),
            tooLongLocation
          )
        ).to.be.revertedWithCustomError(service, "StringTooLong")
          .withArgs(ethers.id("STORAGE_LOCATION"), tooLongLocation.length, maxLocationLength);
      });

      it("should succeed when storage location is within limit", async function () {
        const { service, owner, tokenId } = await loadFixture(deployContractsFixture);
        
        const maxLocationLength = await service.MAX_STORAGE_LOCATION_LENGTH();
        const validLocation = "a".repeat(Number(maxLocationLength)); // Exactly at max

        await expect(
          service.connect(owner).addKeyMaterialReference(
            tokenId,
            ethers.id("key-id"),
            "Ed25519",
            ethers.id("public-key-hash"),
            validLocation
          )
        ).to.emit(service, "KeyMaterialReferenceAdded");
      });
    });

    describe("addKeyMaterialReference - Max Key Refs Limit", function () {
      it("should succeed when adding up to MAX_KEY_MATERIAL_REFS_PER_DID", async function () {
        const { service, owner, tokenId } = await loadFixture(deployContractsFixture);
        
        const maxKeyRefs = await service.MAX_KEY_MATERIAL_REFS_PER_DID();

        // Add max-1 key refs
        for (let i = 0; i < Number(maxKeyRefs) - 1; i++) {
          await service.connect(owner).addKeyMaterialReference(
            tokenId,
            ethers.id(`key-${i}`),
            "Ed25519",
            ethers.id(`hash-${i}`),
            `location-${i}`
          );
        }

        // Adding the last one should succeed
        await expect(
          service.connect(owner).addKeyMaterialReference(
            tokenId,
            ethers.id(`key-${Number(maxKeyRefs) - 1}`),
            "Ed25519",
            ethers.id(`hash-${Number(maxKeyRefs) - 1}`),
            `location-${Number(maxKeyRefs) - 1}`
          )
        ).to.emit(service, "KeyMaterialReferenceAdded");
      });

      it("should revert when exceeding MAX_KEY_MATERIAL_REFS_PER_DID", async function () {
        const { service, owner, tokenId } = await loadFixture(deployContractsFixture);
        
        const maxKeyRefs = await service.MAX_KEY_MATERIAL_REFS_PER_DID();

        // Fill to max
        for (let i = 0; i < Number(maxKeyRefs); i++) {
          await service.connect(owner).addKeyMaterialReference(
            tokenId,
            ethers.id(`key-${i}`),
            "Ed25519",
            ethers.id(`hash-${i}`),
            `location-${i}`
          );
        }

        // Next add should revert
        await expect(
          service.connect(owner).addKeyMaterialReference(
            tokenId,
            ethers.id("new-key"),
            "Ed25519",
            ethers.id("new-hash"),
            "new-location"
          )
        ).to.be.revertedWithCustomError(service, "MaxItemsReached")
          .withArgs(ethers.id("KEY_MATERIAL_REFS"), maxKeyRefs);
      });
    });
  });

  describe("Encrypted Data Pointer Limits", function () {
    describe("storeEncryptedDataPointer - String Length Limits", function () {
      it("should revert when storage location exceeds MAX_STORAGE_LOCATION_LENGTH", async function () {
        const { service, owner, tokenId } = await loadFixture(deployContractsFixture);
        
        const maxLocationLength = await service.MAX_STORAGE_LOCATION_LENGTH();
        const tooLongLocation = "a".repeat(Number(maxLocationLength) + 1);

        await expect(
          service.connect(owner).storeEncryptedDataPointer(
            tokenId,
            ethers.id("data-hash"),
            "chat",
            tooLongLocation,
            ethers.id("key-metadata-hash")
          )
        ).to.be.revertedWithCustomError(service, "StringTooLong")
          .withArgs(ethers.id("STORAGE_LOCATION"), tooLongLocation.length, maxLocationLength);
      });

      it("should succeed when storage location is within limit", async function () {
        const { service, owner, tokenId } = await loadFixture(deployContractsFixture);
        
        const maxLocationLength = await service.MAX_STORAGE_LOCATION_LENGTH();
        const validLocation = "a".repeat(Number(maxLocationLength)); // Exactly at max

        await expect(
          service.connect(owner).storeEncryptedDataPointer(
            tokenId,
            ethers.id("data-hash"),
            "chat",
            validLocation,
            ethers.id("key-metadata-hash")
          )
        ).to.emit(service, "EncryptedDataPointerStored");
      });
    });

    describe("storeEncryptedDataPointer - Max Data Pointers Limit", function () {
      it("should succeed when adding up to MAX_ENCRYPTED_DATA_POINTERS_PER_DID", async function () {
        const { service, owner, tokenId } = await loadFixture(deployContractsFixture);
        
        const maxPointers = await service.MAX_ENCRYPTED_DATA_POINTERS_PER_DID();

        // Add max-1 pointers
        for (let i = 0; i < Number(maxPointers) - 1; i++) {
          await service.connect(owner).storeEncryptedDataPointer(
            tokenId,
            ethers.id(`data-${i}`),
            "chat",
            `location-${i}`,
            ethers.id(`key-${i}`)
          );
        }

        // Adding the last one should succeed
        await expect(
          service.connect(owner).storeEncryptedDataPointer(
            tokenId,
            ethers.id(`data-${Number(maxPointers) - 1}`),
            "chat",
            `location-${Number(maxPointers) - 1}`,
            ethers.id(`key-${Number(maxPointers) - 1}`)
          )
        ).to.emit(service, "EncryptedDataPointerStored");
      });

      it("should revert when exceeding MAX_ENCRYPTED_DATA_POINTERS_PER_DID", async function () {
        const { service, owner, tokenId } = await loadFixture(deployContractsFixture);
        
        const maxPointers = await service.MAX_ENCRYPTED_DATA_POINTERS_PER_DID();

        // Fill to max
        for (let i = 0; i < Number(maxPointers); i++) {
          await service.connect(owner).storeEncryptedDataPointer(
            tokenId,
            ethers.id(`data-${i}`),
            "chat",
            `location-${i}`,
            ethers.id(`key-${i}`)
          );
        }

        // Next add should revert
        await expect(
          service.connect(owner).storeEncryptedDataPointer(
            tokenId,
            ethers.id("new-data"),
            "chat",
            "new-location",
            ethers.id("new-key")
          )
        ).to.be.revertedWithCustomError(service, "MaxItemsReached")
          .withArgs(ethers.id("ENCRYPTED_DATA_POINTERS"), maxPointers);
      });
    });

    describe("updateEncryptedDataPointer - String Length Limits", function () {
      it("should revert when updated storage location exceeds MAX_STORAGE_LOCATION_LENGTH", async function () {
        const { service, owner, tokenId } = await loadFixture(deployContractsFixture);
        
        const dataHash = ethers.id("data-hash");
        
        // Store a pointer first
        await service.connect(owner).storeEncryptedDataPointer(
          tokenId,
          dataHash,
          "chat",
          "location",
          ethers.id("key-metadata-hash")
        );

        const maxLocationLength = await service.MAX_STORAGE_LOCATION_LENGTH();
        const tooLongLocation = "a".repeat(Number(maxLocationLength) + 1);

        await expect(
          service.connect(owner).updateEncryptedDataPointer(
            tokenId,
            dataHash,
            tooLongLocation,
            ethers.id("new-key-metadata-hash")
          )
        ).to.be.revertedWithCustomError(service, "StringTooLong")
          .withArgs(ethers.id("STORAGE_LOCATION"), tooLongLocation.length, maxLocationLength);
      });

      it("should succeed when updated storage location is within limit", async function () {
        const { service, owner, tokenId } = await loadFixture(deployContractsFixture);
        
        const dataHash = ethers.id("data-hash");
        
        // Store a pointer first
        await service.connect(owner).storeEncryptedDataPointer(
          tokenId,
          dataHash,
          "chat",
          "location",
          ethers.id("key-metadata-hash")
        );

        const maxLocationLength = await service.MAX_STORAGE_LOCATION_LENGTH();
        const validLocation = "a".repeat(Number(maxLocationLength)); // Exactly at max

        await expect(
          service.connect(owner).updateEncryptedDataPointer(
            tokenId,
            dataHash,
            validLocation,
            ethers.id("new-key-metadata-hash")
          )
        ).to.emit(service, "EncryptedDataPointerUpdated");
      });
    });
  });

  describe("Bypass Prevention", function () {
    it("cannot bypass service endpoint limit by using different functions", async function () {
      const { service, owner, tokenId } = await loadFixture(deployContractsFixture);
      
      const maxEndpoints = await service.MAX_SERVICE_ENDPOINTS_PER_DID();

      // Fill to max
      for (let i = 0; i < Number(maxEndpoints); i++) {
        await service.connect(owner).addServiceEndpoint(
          tokenId,
          `service-${i}`,
          "ServiceType",
          `https://example.com/${i}`
        );
      }

      // All paths should be blocked
      await expect(
        service.connect(owner).addServiceEndpoint(
          tokenId,
          "new-service",
          "ServiceType",
          "https://example.com/new"
        )
      ).to.be.revertedWithCustomError(service, "MaxItemsReached");
    });

    it("cannot bypass key material ref limit by using different functions", async function () {
      const { service, owner, tokenId } = await loadFixture(deployContractsFixture);
      
      const maxKeyRefs = await service.MAX_KEY_MATERIAL_REFS_PER_DID();

      // Fill to max
      for (let i = 0; i < Number(maxKeyRefs); i++) {
        await service.connect(owner).addKeyMaterialReference(
          tokenId,
          ethers.id(`key-${i}`),
          "Ed25519",
          ethers.id(`hash-${i}`),
          `location-${i}`
        );
      }

      // All paths should be blocked
      await expect(
        service.connect(owner).addKeyMaterialReference(
          tokenId,
          ethers.id("new-key"),
          "Ed25519",
          ethers.id("new-hash"),
          "new-location"
        )
      ).to.be.revertedWithCustomError(service, "MaxItemsReached");
    });

    it("cannot bypass encrypted data pointer limit by using different functions", async function () {
      const { service, owner, tokenId } = await loadFixture(deployContractsFixture);
      
      const maxPointers = await service.MAX_ENCRYPTED_DATA_POINTERS_PER_DID();

      // Fill to max
      for (let i = 0; i < Number(maxPointers); i++) {
        await service.connect(owner).storeEncryptedDataPointer(
          tokenId,
          ethers.id(`data-${i}`),
          "chat",
          `location-${i}`,
          ethers.id(`key-${i}`)
        );
      }

      // All paths should be blocked
      await expect(
        service.connect(owner).storeEncryptedDataPointer(
          tokenId,
          ethers.id("new-data"),
          "chat",
          "new-location",
          ethers.id("new-key")
        )
      ).to.be.revertedWithCustomError(service, "MaxItemsReached");
    });
  });
});

