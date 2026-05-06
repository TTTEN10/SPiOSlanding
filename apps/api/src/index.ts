import dotenv from "dotenv";
import path from "path";

import logger from "./lib/logger";
import { initializeConfig } from "./lib/config";
import { createGoogleSheetsService } from "./lib/googleSheets";
import { cryptoPaymentService } from "./lib/crypto-payment.service";
import { startLlmUpstreamHealthPoller } from "./lib/llm-upstream-health";
import { createApp } from "./app";

// Load environment variables from monorepo root (single .env; avoids Prisma vs apps/api duplicate)
// Source path: apps/api/src/index.ts → monorepo root is three levels up.
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

// Initialize secret manager configuration (async, but don't block startup)
initializeConfig().catch((error) => {
  logger.error('Failed to initialize secret manager configuration:', error);
  // Continue startup - will fall back to environment variables
});

// Register error handlers IMMEDIATELY to catch any errors during initialization
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  if (reason instanceof Error) {
    console.error('Error stack:', reason.stack);
    console.error('Error message:', reason.message);
  }
  // Don't exit in development - let the server continue for debugging
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  console.error('Error stack:', error.stack);
  console.error('Error message:', error.message);
  // Always exit on uncaught exceptions
  process.exit(1);
});

const app = createApp();

const PORT = Number(process.env.PORT || 3001);

// Wrap server startup in try-catch to catch any synchronous errors
logger.info('About to start server...');
let server: any;
try {
  logger.info(`Attempting to start server on port ${PORT}...`);
  server = app.listen(PORT, () => {
    try {
      logger.info(`SafePsy API listening on :${PORT}`);
      startLlmUpstreamHealthPoller();
      
      // Validate IP_SALT on startup if hashing is enabled
      if (process.env.IP_HASHING_ENABLED === 'true') {
        const salt = process.env.IP_SALT;
        if (!salt || salt.length < 32) {
          logger.error('ERROR: IP_SALT must be at least 32 characters for security');
          logger.error('Generate a secure salt with: openssl rand -hex 32');
          process.exit(1);
        }
        logger.info('IP hashing enabled with secure salt');
      } else {
        logger.info('IP hashing disabled (privacy by default)');
      }

      // Validate Scaleway API key (check environment variables)
      const scalewayApiKey = process.env.SCALEWAY_API_KEY;
      if (scalewayApiKey) {
        logger.info('Scaleway API key configured');
      } else {
        logger.warn('WARNING: SCALEWAY_API_KEY not found. Chat functionality will not work.');
        logger.info('Set SCALEWAY_API_KEY in your .env file to enable chat functionality.');
      }

      // Validate Crypto Payment Service configuration
      const rpcUrl = process.env.RPC_URL || process.env.ETH_RPC_URL;
      const paymentAddress = process.env.CRYPTO_PAYMENT_CONTRACT_ADDRESS;
      
      if (cryptoPaymentService.isConfigured()) {
        logger.info('✅ Crypto payment service fully configured');
        logger.info(`   Payment recipient: ${paymentAddress}`);
        logger.info(`   RPC endpoint: ${rpcUrl ? 'configured' : 'not set'}`);
      } else {
        logger.warn('⚠️  WARNING: Crypto payment service not fully configured');
        if (!rpcUrl) {
          logger.warn('   Missing: RPC_URL or ETH_RPC_URL (required for blockchain interactions)');
          logger.info('   Set RPC_URL in your .env file (e.g., RPC_URL=https://eth.llamarpc.com)');
        }
        if (!paymentAddress) {
          logger.warn('   Missing: CRYPTO_PAYMENT_CONTRACT_ADDRESS (required for receiving payments)');
          logger.info('   Set CRYPTO_PAYMENT_CONTRACT_ADDRESS in your .env file');
        }
        logger.warn('   Crypto payments will not work until both are configured.');
      }

      const sheets = createGoogleSheetsService();
      if (sheets.isEnabled()) {
        logger.warn(
          "[GOOGLE SHEETS] Enabled — waitlist signups are written to Google Sheets (falls back to Postgres if the API errors)."
        );
      } else {
        logger.warn(
          "[GOOGLE SHEETS] Disabled — waitlist emails only go to Postgres. Set GOOGLE_SHEETS_CREDENTIALS_FILE or GOOGLE_SHEETS_CREDENTIALS and share the spreadsheet with the service account email."
        );
      }
    } catch (callbackError) {
      logger.error('Error in server callback:', callbackError);
      if (callbackError instanceof Error) {
        logger.error('Callback error stack:', callbackError.stack);
      }
    }
  });

  // Handle server errors
  server.on('error', (error: Error) => {
    logger.error('Server error:', error);
    if (error.message.includes('EADDRINUSE')) {
      logger.error(`Port ${PORT} is already in use. Please stop the other process or use a different port.`);
    }
    process.exit(1);
  });
  
  // Keep process alive
  server.on('listening', () => {
    logger.info(`Server successfully started on port ${PORT}`);
  });
} catch (error: any) {
  logger.error('Failed to start server:', error);
  if (error.stack) {
    logger.error('Stack trace:', error.stack);
  }
  if (error.message) {
    logger.error('Error message:', error.message);
  }
  process.exit(1);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  } else {
    logger.warn('Server not initialized, exiting directly.');
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  } else {
    logger.warn('Server not initialized, exiting directly.');
    process.exit(0);
  }
});