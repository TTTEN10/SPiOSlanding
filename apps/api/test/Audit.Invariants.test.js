/**
 * @title Audit Invariant Tests
 * @notice Cross-contract invariants for SafePsy DID system
 * @notice These tests encode security goals from the audit scope
 * 
 * Invariants:
 * - Soulbound: ownership cannot change except via mint/revoke
 * - Uniqueness: one address cannot have >1 DID
 * - Authorization: Metadata/Service require DIDOwnershipV2.authorize
 * - Revocation: revoked subjects cannot regain DID
 * - Upgrade: only DEFAULT_ADMIN_ROLE (timelock) can upgrade UUPS
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("Audit Invariants", function () {
  async function deployFullSystemFixture() {
    const [owner, controller, delegate, other, admin] = await ethers.getSigners();

    // Use MockDIDOwnership to resolve circular dep: Mock(0) -> Registry(Mock) -> Mock.setRegistry(Registry)
    const MockDIDOwnership = await ethers.getContractFactory("MockDIDOwnership");
    const DIDRegistryV2 = await ethers.getContractFactory("DIDRegistryV2");

    const mock = await MockDIDOwnership.deploy(ethers.ZeroAddress);
    await mock.waitForDeployment();

    const registry = await DIDRegistryV2.deploy("SafePsy DID", "SPDID", await mock.getAddress(), admin.address);
    await registry.waitForDeployment();

    await mock.setRegistry(await registry.getAddress());

    const didHash = ethers.id("test-did");
    await registry.connect(admin).mint(owner.address, didHash);
    const tokenId = 1;

    return { registry, ownership: mock, owner, controller, delegate, other, admin, tokenId, didHash };
  }


  describe("Soulbound Invariant", function () {
    it("transferFrom should revert", async function () {
      const { registry, owner, other } = await loadFixture(deployFullSystemFixture);
      await expect(
        registry.connect(owner).transferFrom(owner.address, other.address, 1)
      ).to.be.revertedWith("Soulbound: non-transferable");
    });

    it("approve should revert", async function () {
      const { registry, owner, other } = await loadFixture(deployFullSystemFixture);
      await expect(
        registry.connect(owner).approve(other.address, 1)
      ).to.be.revertedWith("Soulbound: non-transferable");
    });

    it("setApprovalForAll should revert", async function () {
      const { registry, owner, other } = await loadFixture(deployFullSystemFixture);
      await expect(
        registry.connect(owner).setApprovalForAll(other.address, true)
      ).to.be.revertedWith("Soulbound: non-transferable");
    });
  });

  describe("Uniqueness Invariant", function () {
    it("cannot mint second DID to same address", async function () {
      const { registry, owner, admin } = await loadFixture(deployFullSystemFixture);
      const didHash2 = ethers.id("test-did-2");
      await expect(
        registry.connect(admin).mint(owner.address, didHash2)
      ).to.be.revertedWith("Already has DID");
    });

    it("revoked address cannot mint again", async function () {
      const { registry, ownership, owner, admin } = await loadFixture(deployFullSystemFixture);
      await registry.connect(owner).revoke(1);
      const didHash2 = ethers.id("test-did-2");
      await expect(
        registry.connect(admin).mint(owner.address, didHash2)
      ).to.be.revertedWith("Address revoked, cannot mint");
    });
  });

  describe("Authorization Invariant", function () {
    it("metadata setAttribute requires isAuthorized from DIDOwnership", async function () {
      const { registry, ownership, other, admin } = await loadFixture(deployFullSystemFixture);
      const DIDMetadata = await ethers.getContractFactory("DIDMetadata");
      const metadataImpl = await DIDMetadata.deploy();
      await metadataImpl.waitForDeployment();

      const ProxyFactory = await ethers.getContractFactory("ERC1967Proxy");
      const initData = metadataImpl.interface.encodeFunctionData("initialize", [
        await registry.getAddress(),
        await ownership.getAddress(),
        admin.address,
      ]);
      const proxy = await ProxyFactory.deploy(await metadataImpl.getAddress(), initData);
      await proxy.waitForDeployment();

      const metadata = DIDMetadata.attach(await proxy.getAddress());
      await expect(
        metadata.connect(other).setAttribute(1, "test", "value")
      ).to.be.revertedWith("Not authorized");
    });
  });

  describe("Revocation Invariant", function () {
    it("isAddressRevoked true after revoke", async function () {
      const { registry, owner } = await loadFixture(deployFullSystemFixture);
      await registry.connect(owner).revoke(1);
      expect(await registry.isAddressRevoked(owner.address)).to.be.true;
    });

    it("getTokenIdByAddress returns 0 for revoked", async function () {
      const { registry, owner } = await loadFixture(deployFullSystemFixture);
      await registry.connect(owner).revoke(1);
      expect(await registry.getTokenIdByAddress(owner.address)).to.equal(0);
    });
  });
});
