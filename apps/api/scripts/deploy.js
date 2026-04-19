// scripts/deploy.js
import 'dotenv/config';
import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Deployment script for DIDIdentityToken contract to Ethereum Mainnet
 * 
 * Prerequisites:
 * 1. Set RPC_URL in .env file
 * 2. Set DID_BACKEND_SIGNER_PRIVATE_KEY in .env file (the private key of the deployer)
 * 3. Optional: Set contract configuration in .env (name, symbol, baseURI, etc.)
 * 
 * Usage:
 *   npx hardhat run scripts/deploy.js --network mainnet
 * 
 * Or for local testing:
 *   npx hardhat run scripts/deploy.js --network localhost
 */

async function main() {
  console.log("🚀 Starting DIDIdentityToken deployment...\n");

  // Validate environment variables
  if (!process.env.RPC_URL) {
    throw new Error("❌ RPC_URL is not set in .env file");
  }

  if (!process.env.DID_BACKEND_SIGNER_PRIVATE_KEY) {
    throw new Error("❌ DID_BACKEND_SIGNER_PRIVATE_KEY is not set in .env file");
  }

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);

  // Check deployer balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  const balanceInEth = hre.ethers.formatEther(balance);
  console.log("💰 Account balance:", balanceInEth, "ETH\n");

  if (balance < hre.ethers.parseEther("0.01")) {
    throw new Error("❌ Insufficient balance. Need at least 0.01 ETH for deployment");
  }

  // Contract configuration (from .env or defaults)
  const contractName = process.env.DID_IDENTITY_TOKEN_NAME || "SafePsy DID Identity";
  const contractSymbol = process.env.DID_IDENTITY_TOKEN_SYMBOL || "SAFEPSY-DID";
  const baseURI = process.env.DID_BASE_URI || "https://api.safepsy.com/metadata/";
  
  // Backend signer address (can be zero address if not set)
  let backendSignerAddress = process.env.DID_BACKEND_SIGNER_ADDRESS;
  if (!backendSignerAddress || backendSignerAddress === "0x0000000000000000000000000000000000000000") {
    // If not set, use deployer address as backend signer
    backendSignerAddress = deployer.address;
    console.log("⚠️  DID_BACKEND_SIGNER_ADDRESS not set, using deployer address as backend signer");
  }
  
  // Validate backend signer address
  if (!hre.ethers.isAddress(backendSignerAddress)) {
    throw new Error("❌ Invalid DID_BACKEND_SIGNER_ADDRESS in .env file");
  }

  const allowPublicMinting = process.env.DID_ALLOW_PUBLIC_MINTING === "true" || false;

  console.log("📋 Contract Configuration:");
  console.log("   Name:", contractName);
  console.log("   Symbol:", contractSymbol);
  console.log("   Base URI:", baseURI);
  console.log("   Backend Signer:", backendSignerAddress);
  console.log("   Allow Public Minting:", allowPublicMinting);
  console.log("");

  // Get contract factory
  console.log("📦 Compiling contracts...");
  await hre.run("compile");
  console.log("✅ Contracts compiled successfully\n");

  console.log("🔨 Deploying DIDIdentityToken contract...");
  const DIDToken = await hre.ethers.getContractFactory("DIDIdentityToken");

  // Deploy contract
  const deploymentTx = await DIDToken.deploy(
    contractName,
    contractSymbol,
    baseURI,
    backendSignerAddress,
    allowPublicMinting
  );

  console.log("⏳ Waiting for deployment transaction to be mined...");
  console.log("   Transaction hash:", deploymentTx.deploymentTransaction().hash);
  
  // Wait for deployment
  const didToken = await deploymentTx.waitForDeployment();
  const contractAddress = await didToken.getAddress();

  console.log("✅ DIDIdentityToken deployed successfully!");
  console.log("📍 Contract address:", contractAddress);
  console.log("");

  // Get deployment block info
  const deploymentTxReceipt = await hre.ethers.provider.getTransactionReceipt(
    deploymentTx.deploymentTransaction().hash
  );
  const blockNumber = deploymentTxReceipt.blockNumber;
  const block = await hre.ethers.provider.getBlock(blockNumber);
  const timestamp = block?.timestamp || Math.floor(Date.now() / 1000);

  // Prepare deployment info
  const deploymentInfo = {
    network: hre.network.name,
    contractName: "DIDIdentityToken",
    contractAddress: contractAddress,
    deployer: deployer.address,
    backendSigner: backendSignerAddress,
    transactionHash: deploymentTx.deploymentTransaction().hash,
    blockNumber: blockNumber,
    timestamp: timestamp,
    configuration: {
      name: contractName,
      symbol: contractSymbol,
      baseURI: baseURI,
      allowPublicMinting: allowPublicMinting,
    },
    deployedAt: new Date(timestamp * 1000).toISOString(),
  };

  // Save deployment info to file
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, `${hre.network.name}-${Date.now()}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("💾 Deployment info saved to:", deploymentFile);

  // Also save to a latest file for easy access
  const latestFile = path.join(deploymentsDir, `${hre.network.name}-latest.json`);
  fs.writeFileSync(latestFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("💾 Latest deployment info saved to:", latestFile);
  console.log("");

  // Verify contract on Etherscan (if API key is provided and network is mainnet)
  if (process.env.ETHERSCAN_API_KEY && hre.network.name === "mainnet") {
    console.log("🔍 Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [
          contractName,
          contractSymbol,
          baseURI,
          backendSignerAddress,
          allowPublicMinting,
        ],
      });
      console.log("✅ Contract verified on Etherscan!");
    } catch (error) {
      console.log("⚠️  Contract verification failed:", error.message);
      console.log("   You can verify manually later using:");
      console.log(`   npx hardhat verify --network mainnet ${contractAddress} "${contractName}" "${contractSymbol}" "${baseURI}" ${backendSignerAddress} ${allowPublicMinting}`);
    }
    console.log("");
  } else if (hre.network.name === "mainnet" && !process.env.ETHERSCAN_API_KEY) {
    console.log("ℹ️  To verify contract on Etherscan, set ETHERSCAN_API_KEY in .env file");
    console.log("   Then run:");
    console.log(`   npx hardhat verify --network mainnet ${contractAddress} "${contractName}" "${contractSymbol}" "${baseURI}" ${backendSignerAddress} ${allowPublicMinting}`);
    console.log("");
  }

  // Display summary
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎉 Deployment Summary");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Network:", hre.network.name);
  console.log("Contract:", contractName);
  console.log("Address:", contractAddress);
  console.log("Deployer:", deployer.address);
  console.log("Backend Signer:", backendSignerAddress);
  console.log("Block Number:", blockNumber);
  console.log("Transaction Hash:", deploymentTx.deploymentTransaction().hash);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");

  // Important reminder
  console.log("⚠️  IMPORTANT: Update your .env file with the deployed contract address:");
  console.log(`   DID_IDENTITY_TOKEN_ADDRESS=${contractAddress}`);
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exitCode = 1;
  });

