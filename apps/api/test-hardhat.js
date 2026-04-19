// Test script to check Hardhat config detection
const fs = require('fs');
const path = require('path');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
console.log('Package type:', pkg.type);

const configFiles = fs.readdirSync('.').filter(f => f.startsWith('hardhat.config'));
console.log('Config files:', configFiles);

// Check what Hardhat would find
const possibleConfigs = ['hardhat.config.js', 'hardhat.config.ts', 'hardhat.config.cjs', 'hardhat.config.mjs'];
for (const cfg of possibleConfigs) {
  if (fs.existsSync(cfg)) {
    console.log(`Found: ${cfg}`);
  }
}
