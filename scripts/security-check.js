#!/usr/bin/env node
/**
 * Security Check Script
 * Validates security configurations and environment variables
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

let hasErrors = false;
let hasWarnings = false;

function log(message, type = 'info') {
  const prefix = type === 'error' ? `${colors.red}✗` : type === 'warning' ? `${colors.yellow}⚠` : `${colors.green}✓`;
  console.log(`${prefix} ${message}${colors.reset}`);
}

function checkEnvFile() {
  log('Checking environment configuration...', 'info');
  
  const envPath = path.join(process.cwd(), '.env');
  const envExamplePath = path.join(process.cwd(), 'env.example');
  
  if (!fs.existsSync(envPath)) {
    log('.env file not found. Using env.example as reference.', 'warning');
    hasWarnings = true;
  }
  
  // Check for common security issues in env files
  const envContent = fs.existsSync(envPath) 
    ? fs.readFileSync(envPath, 'utf8')
    : fs.existsSync(envExamplePath)
      ? fs.readFileSync(envExamplePath, 'utf8')
      : '';
  
  if (envContent) {
    // Check for hardcoded secrets
    const secretPatterns = [
      /password\s*=\s*['"]?[^'"]{1,10}['"]?/i,
      /secret\s*=\s*['"]?[^'"]{1,10}['"]?/i,
      /api[_-]?key\s*=\s*['"]?[^'"]{1,10}['"]?/i,
    ];
    
    secretPatterns.forEach((pattern, index) => {
      if (pattern.test(envContent)) {
        log('Potential weak secret detected in environment file', 'warning');
        hasWarnings = true;
      }
    });
    
    // Check for IP_SALT length if hashing is enabled
    if (envContent.includes('IP_HASHING_ENABLED=true')) {
      const saltMatch = envContent.match(/IP_SALT\s*=\s*(.+)/);
      if (saltMatch && saltMatch[1].trim().length < 32) {
        log('IP_SALT must be at least 32 characters when IP hashing is enabled', 'error');
        hasErrors = true;
      }
    }
  }
}

function checkPackageJson() {
  log('Checking package.json files...', 'info');
  
  const packagePaths = [
    'package.json',
    'apps/api/package.json',
    'apps/web/package.json',
    'backend/package.json',
    'frontend/package.json',
  ];
  
  packagePaths.forEach(pkgPath => {
    const fullPath = path.join(process.cwd(), pkgPath);
    if (fs.existsSync(fullPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        
        // Check for known vulnerable packages
        const vulnerablePackages = {
          'express': { min: '4.18.0', reason: 'Security updates' },
          'helmet': { min: '7.0.0', reason: 'Security headers' },
        };
        
        Object.keys(vulnerablePackages).forEach(pkgName => {
          if (pkg.dependencies?.[pkgName] || pkg.devDependencies?.[pkgName]) {
            const version = (pkg.dependencies?.[pkgName] || pkg.devDependencies?.[pkgName]).replace(/[\^~]/, '');
            const minVersion = vulnerablePackages[pkgName].min;
            if (version < minVersion) {
              log(`${pkgName} version ${version} may have security issues. Minimum recommended: ${minVersion}`, 'warning');
              hasWarnings = true;
            }
          }
        });
      } catch (error) {
        log(`Error reading ${pkgPath}: ${error.message}`, 'error');
        hasErrors = true;
      }
    }
  });
}

function checkSecurityHeaders() {
  log('Checking security headers configuration...', 'info');
  
  const apiIndexPath = path.join(process.cwd(), 'apps/api/src/index.ts');
  const backendServerPath = path.join(process.cwd(), 'backend/src/server.ts');
  
  [apiIndexPath, backendServerPath].forEach(filePath => {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for helmet usage
      if (!content.includes('helmet')) {
        log(`${path.basename(filePath)}: Helmet not found. Security headers may be missing.`, 'warning');
        hasWarnings = true;
      }
      
      // Check for CORS configuration
      if (!content.includes('cors')) {
        log(`${path.basename(filePath)}: CORS not configured.`, 'warning');
        hasWarnings = true;
      }
      
      // Check for rate limiting
      if (!content.includes('rate') && !content.includes('rateLimit')) {
        log(`${path.basename(filePath)}: Rate limiting may not be configured.`, 'warning');
        hasWarnings = true;
      }
    }
  });
}

function main() {
  console.log(`${colors.blue}🔒 Running Security Check...${colors.reset}\n`);
  
  checkEnvFile();
  checkPackageJson();
  checkSecurityHeaders();
  
  console.log('\n' + '='.repeat(50));
  
  if (hasErrors) {
    log('Security check completed with ERRORS. Please fix the issues above.', 'error');
    process.exit(1);
  } else if (hasWarnings) {
    log('Security check completed with WARNINGS. Review the warnings above.', 'warning');
    process.exit(0);
  } else {
    log('Security check passed!', 'info');
    process.exit(0);
  }
}

main();

