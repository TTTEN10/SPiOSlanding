const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.22",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337,
    },
    mainnet: {
      url: process.env.RPC_URL || "",
      accounts: process.env.DID_BACKEND_SIGNER_PRIVATE_KEY
        ? [process.env.DID_BACKEND_SIGNER_PRIVATE_KEY]
        : [],
      chainId: 1,
      gasPrice: "auto",
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || process.env.RPC_URL || "",
      accounts: process.env.DID_BACKEND_SIGNER_PRIVATE_KEY || process.env.PRIVATE_KEY
        ? [process.env.DID_BACKEND_SIGNER_PRIVATE_KEY || process.env.PRIVATE_KEY]
        : [],
      chainId: 11155111,
    },
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY || "",
      sepolia: process.env.ETHERSCAN_API_KEY || "",
    },
  },
  paths: {
    sources: "./src/contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 40000,
  },
};
