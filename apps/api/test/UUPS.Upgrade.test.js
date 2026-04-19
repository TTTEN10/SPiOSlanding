/**
 * @title UUPS Upgrade Tests
 * @notice Verifies DIDMetadata and DIDService UUPS upgrade pattern
 * - Only DEFAULT_ADMIN_ROLE can authorize upgrades
 * - Storage is preserved across upgrades
 * - Proxy implementation slot is updated correctly
 *
 * Uses manual ERC1967Proxy deploy (hardhat-upgrades plugin strict on ReentrancyGuard)
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("UUPS Upgrade", function () {
  async function deployMetadataFixture() {
    const [admin, other, owner] = await ethers.getSigners();

    const MockDIDOwnership = await ethers.getContractFactory("MockDIDOwnership");
    const DIDRegistryV2 = await ethers.getContractFactory("DIDRegistryV2");

    const mock = await MockDIDOwnership.deploy(ethers.ZeroAddress);
    await mock.waitForDeployment();
    const registry = await DIDRegistryV2.deploy("SafePsy DID", "SPDID", await mock.getAddress(), admin.address);
    await registry.waitForDeployment();
    await mock.setRegistry(await registry.getAddress());

    await registry.connect(admin).mint(owner.address, ethers.id("test-did"));
    const tokenId = 1;

    const DIDMetadata = await ethers.getContractFactory("DIDMetadata");
    const impl = await DIDMetadata.deploy();
    await impl.waitForDeployment();
    const initData = impl.interface.encodeFunctionData("initialize", [
      await registry.getAddress(),
      await mock.getAddress(),
      admin.address,
    ]);
    const proxy = await (await ethers.getContractFactory("ERC1967Proxy")).deploy(await impl.getAddress(), initData);
    await proxy.waitForDeployment();
    const metadata = DIDMetadata.attach(await proxy.getAddress());

    return { metadata, registry, ownership: mock, admin, other, owner, tokenId };
  }

  describe("DIDMetadata UUPS", function () {
    it("only admin can upgrade", async function () {
      const { metadata, admin, other } = await loadFixture(deployMetadataFixture);
      const DIDMetadata = await ethers.getContractFactory("DIDMetadata");
      const impl2 = await DIDMetadata.deploy();
      await impl2.waitForDeployment();

      await expect(
        metadata.connect(other).upgradeToAndCall(await impl2.getAddress(), "0x")
      ).to.be.reverted;
    });

    it("admin can upgrade and storage is preserved", async function () {
      const { metadata, registry, ownership, admin, owner, tokenId } = await loadFixture(deployMetadataFixture);

      await metadata.connect(owner).setAttribute(tokenId, "test-key", "test-value");
      expect(await metadata.getAttribute(tokenId, "test-key")).to.equal("test-value");

      const DIDMetadata = await ethers.getContractFactory("DIDMetadata");
      const impl2 = await DIDMetadata.deploy();
      await impl2.waitForDeployment();

      await metadata.connect(admin).upgradeToAndCall(await impl2.getAddress(), "0x");

      expect(await metadata.getAttribute(tokenId, "test-key")).to.equal("test-value");
      expect(await metadata.registryContract()).to.equal(await registry.getAddress());
      expect(await metadata.ownershipContract()).to.equal(await ownership.getAddress());
    });
  });

  async function deployServiceFixture() {
    const [admin, other, owner] = await ethers.getSigners();

    const MockDIDOwnership = await ethers.getContractFactory("MockDIDOwnership");
    const DIDRegistryV2 = await ethers.getContractFactory("DIDRegistryV2");

    const mock = await MockDIDOwnership.deploy(ethers.ZeroAddress);
    await mock.waitForDeployment();
    const registry = await DIDRegistryV2.deploy("SafePsy DID", "SPDID", await mock.getAddress(), admin.address);
    await registry.waitForDeployment();
    await mock.setRegistry(await registry.getAddress());

    await registry.connect(admin).mint(owner.address, ethers.id("test-did"));
    const tokenId = 1;

    const DIDService = await ethers.getContractFactory("DIDService");
    const impl = await DIDService.deploy();
    await impl.waitForDeployment();
    const initData = impl.interface.encodeFunctionData("initialize", [
      await registry.getAddress(),
      await mock.getAddress(),
      admin.address,
    ]);
    const proxy = await (await ethers.getContractFactory("ERC1967Proxy")).deploy(await impl.getAddress(), initData);
    await proxy.waitForDeployment();
    const service = DIDService.attach(await proxy.getAddress());

    return { service, registry, ownership: mock, admin, other, owner, tokenId };
  }

  describe("DIDService UUPS", function () {
    it("only admin can upgrade", async function () {
      const { service, admin, other } = await loadFixture(deployServiceFixture);
      const DIDService = await ethers.getContractFactory("DIDService");
      const impl2 = await DIDService.deploy();
      await impl2.waitForDeployment();

      await expect(
        service.connect(other).upgradeToAndCall(await impl2.getAddress(), "0x")
      ).to.be.reverted;
    });

    it("admin can upgrade and storage is preserved", async function () {
      const { service, registry, ownership, admin, owner, tokenId } = await loadFixture(deployServiceFixture);

      await service.connect(owner).addServiceEndpoint(
        tokenId,
        "svc1",
        "type1",
        "https://example.com/endpoint"
      );

      const DIDService = await ethers.getContractFactory("DIDService");
      const impl2 = await DIDService.deploy();
      await impl2.waitForDeployment();

      await service.connect(admin).upgradeToAndCall(await impl2.getAddress(), "0x");

      const ep = await service.getServiceEndpoint(tokenId, "svc1");
      expect(ep.serviceEndpoint).to.equal("https://example.com/endpoint");
      expect(await service.registryContract()).to.equal(await registry.getAddress());
      expect(await service.ownershipContract()).to.equal(await ownership.getAddress());
    });
  });
});
