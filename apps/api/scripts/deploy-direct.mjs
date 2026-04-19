// scripts/deploy-direct.mjs
// Direct deployment using ethers (bypasses Hardhat plugin issues with Node 23)
import 'dotenv/config';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  // Get network from command line argument or default to sepolia
  const network = process.argv[2] || 'sepolia';
  const networkConfig = {
    sepolia: {
      rpcUrl: process.env.SEPOLIA_RPC_URL,
      chainId: 11155111,
      name: 'Sepolia Testnet',
      explorer: 'https://sepolia.etherscan.io'
    },
    mainnet: {
      rpcUrl: process.env.RPC_URL,
      chainId: 1,
      name: 'Ethereum Mainnet',
      explorer: 'https://etherscan.io'
    }
  };

  const config = networkConfig[network];
  if (!config) {
    throw new Error(`❌ Unknown network: ${network}. Use 'sepolia' or 'mainnet'`);
  }

  console.log(`🚀 Starting DIDIdentityToken deployment to ${config.name}...\n`);

  // Validate environment variables
  if (!config.rpcUrl) {
    throw new Error(`❌ ${network.toUpperCase()}_RPC_URL is not set in .env file`);
  }

  if (!process.env.DID_BACKEND_SIGNER_PRIVATE_KEY) {
    throw new Error("❌ DID_BACKEND_SIGNER_PRIVATE_KEY is not set in .env file");
  }

  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const wallet = new ethers.Wallet(process.env.DID_BACKEND_SIGNER_PRIVATE_KEY, provider);
  
  console.log("📝 Deploying contracts with account:", wallet.address);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  const balanceInEth = ethers.formatEther(balance);
  console.log("💰 Account balance:", balanceInEth, "ETH\n");

  if (balance < ethers.parseEther("0.01")) {
    throw new Error("❌ Insufficient balance. Need at least 0.01 ETH for deployment");
  }

  // Contract configuration
  const contractName = process.env.DID_IDENTITY_TOKEN_NAME || "SafePsy DID Identity";
  const contractSymbol = process.env.DID_IDENTITY_TOKEN_SYMBOL || "SAFEPSY-DID";
  const baseURI = process.env.DID_BASE_URI || "https://api.safepsy.com/metadata/";
  
  let backendSignerAddress = process.env.DID_BACKEND_SIGNER_ADDRESS;
  if (!backendSignerAddress || backendSignerAddress === "0x0000000000000000000000000000000000000000") {
    backendSignerAddress = wallet.address;
    console.log("⚠️  DID_BACKEND_SIGNER_ADDRESS not set, using deployer address as backend signer");
  }
  
  if (!ethers.isAddress(backendSignerAddress)) {
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

  // Read compiled contract
  console.log("📦 Loading compiled contract...");
  const artifactsPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'DIDIdentityToken.sol', 'DIDIdentityToken.json');
  
  if (!fs.existsSync(artifactsPath)) {
    console.log("⚠️  Contract not compiled. Attempting to compile...");
    const { execSync } = await import('child_process');
    try {
      // Try with NODE_OPTIONS to suppress warnings
      const originalEnv = { ...process.env };
      process.env.NODE_OPTIONS = '--no-warnings';
      execSync('npx hardhat compile', { 
        cwd: path.join(__dirname, '..'), 
        stdio: 'inherit',
        env: process.env
      });
      process.env = originalEnv;
      
      // Check if compilation was successful
      if (!fs.existsSync(artifactsPath)) {
        throw new Error("Compilation completed but artifacts not found");
      }
      console.log("✅ Contract compiled successfully!\n");
    } catch (error) {
      console.log("\n❌ Automatic compilation failed due to Node.js version compatibility.");
      console.log("📝 To fix this, you have a few options:");
      console.log("   1. Use Node.js 22 LTS: nvm install 22 && nvm use 22");
      console.log("   2. Compile manually on a machine with Node 22");
      console.log("   3. Use Remix IDE (https://remix.ethereum.org) to compile");
      console.log("   4. Copy compiled artifacts from another environment\n");
      throw new Error("Contract compilation required before deployment");
    }
  }

  const contractArtifact = JSON.parse(fs.readFileSync(artifactsPath, 'utf8'));
  const contractFactory = new ethers.ContractFactory(
    contractArtifact.abi,
    contractArtifact.bytecode,
    wallet
  );

  console.log("🔨 Deploying DIDIdentityToken contract...");
  
  // Deploy contract
  const contract = await contractFactory.deploy(
    contractName,
    contractSymbol,
    baseURI,
    backendSignerAddress,
    allowPublicMinting
  );

  console.log("⏳ Waiting for deployment transaction to be mined...");
  console.log("   Transaction hash:", contract.deploymentTransaction().hash);
  
  // Wait for deployment
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log("✅ DIDIdentityToken deployed successfully!");
  console.log("📍 Contract address:", contractAddress);
  console.log("");

  // Get deployment block info
  const deploymentTxReceipt = await provider.getTransactionReceipt(
    contract.deploymentTransaction().hash
  );
  const blockNumber = deploymentTxReceipt.blockNumber;
  const block = await provider.getBlock(blockNumber);
  const timestamp = block?.timestamp || Math.floor(Date.now() / 1000);

  // Prepare deployment info
  const deploymentInfo = {
    network: network,
    networkName: config.name,
    contractName: "DIDIdentityToken",
    contractAddress: contractAddress,
    deployer: wallet.address,
    backendSigner: backendSignerAddress,
    transactionHash: contract.deploymentTransaction().hash,
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

  // Save deployment info
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, `${network}-${Date.now()}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("💾 Deployment info saved to:", deploymentFile);

  const latestFile = path.join(deploymentsDir, `${network}-latest.json`);
  fs.writeFileSync(latestFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("💾 Latest deployment info saved to:", latestFile);
  console.log("");

  // Display summary
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎉 Deployment Summary");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Network:", config.name);
  console.log("Contract:", contractName);
  console.log("Address:", contractAddress);
  console.log("Deployer:", wallet.address);
  console.log("Backend Signer:", backendSignerAddress);
  console.log("Block Number:", blockNumber);
  console.log("Transaction Hash:", contract.deploymentTransaction().hash);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");

  // Block explorer links
  console.log("🔗 View on Block Explorer:");
  console.log(`   Transaction: ${config.explorer}/tx/${contract.deploymentTransaction().hash}`);
  console.log(`   Contract: ${config.explorer}/address/${contractAddress}`);
  console.log("");

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

