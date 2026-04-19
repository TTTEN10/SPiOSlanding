// scripts/compile-solc.mjs
// Compile contract using solc directly (workaround for Hardhat/Node 23)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import solc from 'solc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findImports(importPath) {
  try {
    // Handle OpenZeppelin imports - importPath is like "@openzeppelin/contracts/token/ERC721/ERC721.sol"
    if (importPath.startsWith('@openzeppelin/contracts/')) {
      // Remove @openzeppelin/contracts/ prefix to get the relative path
      const relativePath = importPath.replace('@openzeppelin/contracts/', '');
      
      // Try from root node_modules (workspace setup) - apps/api/../../node_modules
      const rootPath = path.join(__dirname, '..', '..', '..', 'node_modules', '@openzeppelin', 'contracts', relativePath);
      if (fs.existsSync(rootPath)) {
        console.log(`   Found: ${importPath} -> ${rootPath}`);
        return { contents: fs.readFileSync(rootPath, 'utf8') };
      }
      
      // Try from local node_modules
      const localPath = path.join(__dirname, '..', 'node_modules', '@openzeppelin', 'contracts', relativePath);
      if (fs.existsSync(localPath)) {
        console.log(`   Found: ${importPath} -> ${localPath}`);
        return { contents: fs.readFileSync(localPath, 'utf8') };
      }
      
      console.log(`   Not found: ${importPath} (tried ${rootPath} and ${localPath})`);
    }
    
    // Try relative path
    const relativePath = path.join(__dirname, '..', 'src', 'contracts', importPath);
    if (fs.existsSync(relativePath)) {
      return { contents: fs.readFileSync(relativePath, 'utf8') };
    }
    
    return { error: `File not found: ${importPath}` };
  } catch (error) {
    return { error: error.message };
  }
}

async function compile() {
  console.log('📦 Compiling DIDIdentityToken with solc...\n');
  
  const contractPath = path.join(__dirname, '..', 'src', 'contracts', 'DIDIdentityToken.sol');
  const contractSource = fs.readFileSync(contractPath, 'utf8');
  
  const input = {
    language: 'Solidity',
    sources: {
      'DIDIdentityToken.sol': {
        content: contractSource,
      },
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode'],
        },
      },
      optimizer: {
        enabled: true,
        runs: 1, // Optimize for smaller bytecode size (lower = smaller contract, higher gas per call)
      },
      evmVersion: 'paris',
    },
  };
  
  console.log('Compiling...');
  const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
  
  if (output.errors) {
    const errors = output.errors.filter(e => e.severity === 'error');
    if (errors.length > 0) {
      console.error('❌ Compilation errors:');
      errors.forEach(error => {
        console.error(`   ${error.message}`);
      });
      throw new Error('Compilation failed');
    }
    
    // Show warnings
    const warnings = output.errors.filter(e => e.severity === 'warning');
    if (warnings.length > 0) {
      console.log('⚠️  Warnings:');
      warnings.forEach(warning => {
        console.log(`   ${warning.message}`);
      });
    }
  }
  
  if (!output.contracts || !output.contracts['DIDIdentityToken.sol'] || !output.contracts['DIDIdentityToken.sol'].DIDIdentityToken) {
    throw new Error('Compilation output missing contract');
  }
  
  const contract = output.contracts['DIDIdentityToken.sol'].DIDIdentityToken;
  
  // Create artifacts directory structure
  const artifactsDir = path.join(__dirname, '..', 'artifacts', 'contracts', 'DIDIdentityToken.sol');
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }
  
  // Save artifact
  const artifact = {
    contractName: 'DIDIdentityToken',
    abi: contract.abi,
    bytecode: contract.evm.bytecode.object,
  };
  
  const artifactPath = path.join(artifactsDir, 'DIDIdentityToken.json');
  fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));
  
  console.log('✅ Contract compiled successfully!');
  console.log(`   Artifact saved to: ${artifactPath}\n`);
  
  return artifact;
}

compile()
  .then(() => {
    console.log('✅ Ready to deploy!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Compilation failed:', error.message);
    process.exit(1);
  });

