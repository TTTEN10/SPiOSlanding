// scripts/compile-contract.mjs
// Compile contract using solc directly (workaround for Hardhat/Node 23 issues)
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import solc from 'solc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function compileContract() {
  console.log("📦 Compiling DIDIdentityToken contract...\n");

  const contractPath = path.join(__dirname, '..', 'src', 'contracts', 'DIDIdentityToken.sol');
  const contractSource = fs.readFileSync(contractPath, 'utf8');

  // Read OpenZeppelin contracts (they're in node_modules)
  const openZeppelinPath = path.join(__dirname, '..', 'node_modules', '@openzeppelin');
  
  // Find all OpenZeppelin contracts that might be imported
  const findOpenZeppelinFiles = (dir, fileList = []) => {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isDirectory()) {
        findOpenZeppelinFiles(filePath, fileList);
      } else if (file.endsWith('.sol')) {
        const relativePath = path.relative(openZeppelinPath, filePath);
        fileList.push({
          path: relativePath,
          content: fs.readFileSync(filePath, 'utf8')
        });
      }
    });
    return fileList;
  };

  // For simplicity, let's use a different approach - use Hardhat's compilation via exec
  // since solc compilation with imports is complex
  const { execSync } = await import('child_process');
  
  try {
    console.log("Attempting to compile with Hardhat...");
    // Try to set NODE_OPTIONS to work around the issue
    process.env.NODE_OPTIONS = '--no-warnings';
    execSync('npx hardhat compile', { 
      cwd: path.join(__dirname, '..'), 
      stdio: 'inherit',
      env: { ...process.env, NODE_OPTIONS: '--no-warnings' }
    });
    console.log("✅ Contract compiled successfully!");
    return true;
  } catch (error) {
    console.log("⚠️  Hardhat compilation failed. Trying alternative method...");
    
    // Alternative: Try using solc directly (simplified version)
    // This is a fallback - for production, you should fix Hardhat/Node compatibility
    console.log("❌ Automatic compilation failed.");
    console.log("Please compile manually using one of these methods:");
    console.log("1. Use Node 22 LTS: nvm use 22");
    console.log("2. Or compile on a different machine with compatible Node version");
    console.log("3. Or use Remix IDE to compile and get the bytecode");
    return false;
  }
}

compileContract()
  .then(success => {
    if (success) {
      console.log("\n✅ Ready to deploy!");
    } else {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error("❌ Compilation error:", error);
    process.exit(1);
  });

