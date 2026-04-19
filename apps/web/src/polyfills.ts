// Polyfills for WalletConnect and ethers.js compatibility
import { Buffer } from 'buffer';
// Import process - Vite will use browser.js automatically via package.json browser field
import process from 'process';

// Make Buffer and process available globally
if (typeof window !== 'undefined') {
  (window as any).Buffer = Buffer;
  (window as any).process = process;
  (window as any).global = window;
}

// Export for use in other modules
export { Buffer, process };

