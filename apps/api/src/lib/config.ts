/**
 * Configuration Helper with Secret Manager Integration
 * 
 * This module provides a centralized way to access configuration values,
 * with automatic fallback to environment variables when secret manager is disabled.
 * 
 * Secrets are loaded from Scaleway Secret Manager when enabled,
 * otherwise they fall back to environment variables for local development.
 */

import { getSecret, preloadSecrets } from './secret-manager';
import logger from './logger';

// Cache for configuration values
const configCache = new Map<string, string | undefined>();

/**
 * Get a configuration value, checking secret manager first, then environment variables
 * 
 * @param key - Configuration key name
 * @param secretName - Optional secret name in Scaleway Secret Manager (defaults to key)
 * @param defaultValue - Optional default value if not found
 * @returns Configuration value or undefined
 */
export async function getConfig(
  key: string,
  secretName?: string,
  defaultValue?: string
): Promise<string | undefined> {
  // Check cache first
  if (configCache.has(key)) {
    return configCache.get(key);
  }

  // Try secret manager first
  const secretNameToUse = secretName || key.toLowerCase().replace(/_/g, '-');
  const secretValue = await getSecret(secretNameToUse, key);

  if (secretValue) {
    configCache.set(key, secretValue);
    return secretValue;
  }

  // Fallback to environment variable
  const envValue = process.env[key];
  if (envValue) {
    configCache.set(key, envValue);
    return envValue;
  }

  // Use default if provided
  if (defaultValue !== undefined) {
    configCache.set(key, defaultValue);
    return defaultValue;
  }

  return undefined;
}

/**
 * Synchronous version that only checks environment variables (for backwards compatibility)
 * Use this for values that must be available immediately at startup
 */
export function getConfigSync(key: string, defaultValue?: string): string | undefined {
  return process.env[key] || defaultValue;
}

/**
 * Initialize configuration by preloading critical secrets
 * This should be called at application startup
 */
export async function initializeConfig(): Promise<void> {
  const enabled = process.env.SCALEWAY_SECRET_MANAGER_ENABLED === 'true';
  
  if (!enabled) {
    logger.info('Secret Manager disabled. Using environment variables only.');
    return;
  }

  // List of critical secrets to preload
  const criticalSecrets = [
    'scaleway-api-key',
    'postmark-api-token',
    'database-url',
    'postgres-password',
    'ip-salt',
    'openai-api-key',
    'aws-access-key-id',
    'aws-secret-access-key',
    'scaleway-access-key',
    'scaleway-secret-key',
    'redis-url',
    'redis-password',
    'google-sheets-credentials',
    'web3-storage-token',
    'pinata-api-key',
    'pinata-secret-key',
    'rag-admin-api-key',
    'did-backend-signer-private-key',
  ];

  try {
    await preloadSecrets(criticalSecrets);
    logger.info('Configuration initialization completed');
  } catch (error: any) {
    logger.error('Error initializing configuration:', error.message);
    // Don't throw - allow app to continue with environment variables
  }
}

/**
 * Clear configuration cache (useful for testing or after secret rotation)
 */
export function clearConfigCache(): void {
  configCache.clear();
}

// Export commonly used config getters for convenience
export const Config = {
  // Database
  databaseUrl: () => getConfig('DATABASE_URL', 'database-url'),
  postgresPassword: () => getConfig('POSTGRES_PASSWORD', 'postgres-password'),

  // API Keys
  scalewayApiKey: () => getConfig('SCALEWAY_API_KEY', 'scaleway-api-key'),
  openaiApiKey: () => getConfig('OPENAI_API_KEY', 'openai-api-key'),
  
  // Email
  postmarkApiToken: () => getConfig('POSTMARK_API_TOKEN', 'postmark-api-token'),
  emailFromAddress: () => getConfigSync('EMAIL_FROM_ADDRESS', 'noreply@safepsy.com'),
  
  // Security
  ipSalt: () => getConfig('IP_SALT', 'ip-salt'),
  ragAdminApiKey: () => getConfig('RAG_ADMIN_API_KEY', 'rag-admin-api-key'),
  
  // Storage
  scalewayAccessKey: () => getConfig('SCALEWAY_ACCESS_KEY', 'scaleway-access-key'),
  scalewaySecretKey: () => getConfig('SCALEWAY_SECRET_KEY', 'scaleway-secret-key'),
  awsAccessKeyId: () => getConfig('AWS_ACCESS_KEY_ID', 'aws-access-key-id'),
  awsSecretAccessKey: () => getConfig('AWS_SECRET_ACCESS_KEY', 'aws-secret-access-key'),
  
  // Redis
  redisUrl: () => getConfig('REDIS_URL', 'redis-url'),
  redisPassword: () => getConfig('REDIS_PASSWORD', 'redis-password'),
  
  // Blockchain
  didBackendSignerPrivateKey: () => getConfig('DID_BACKEND_SIGNER_PRIVATE_KEY', 'did-backend-signer-private-key'),
  rpcUrl: () => getConfigSync('RPC_URL'),
  
  // Other
  frontendUrl: () => getConfigSync('FRONTEND_URL', 'http://localhost:3000'),
  nodeEnv: () => getConfigSync('NODE_ENV', 'development'),
  port: () => getConfigSync('PORT', '3001'),
};

