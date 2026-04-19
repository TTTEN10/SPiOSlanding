import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import logger from '../lib/logger';
import { SUPPORTED_CHAIN_ID, SUPPORTED_NETWORK_NAME } from '../lib/constants';

/**
 * Validation middleware factory
 * Creates a middleware that validates request body, query, or params using Joi schema
 * 
 * @param schema Joi validation schema
 * @param source 'body' | 'query' | 'params' - where to validate
 * @returns Express middleware
 */
export function validate(
  schema: Joi.ObjectSchema,
  source: 'body' | 'query' | 'params' = 'body'
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      logger.warn(`Validation failed for ${source}:`, errors);

      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors,
      });
      return;
    }

    // Replace request data with validated and sanitized data
    req[source] = value;
    next();
  };
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // Ethereum address validation
  ethereumAddress: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid Ethereum address format',
    }),

  // DID hash validation (bytes32)
  didHash: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{64}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid DID hash format (must be bytes32 hex)',
    }),

  // Signature validation
  signature: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{130}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid signature format',
    }),

  // Message validation
  message: Joi.string().min(1).max(10000).required(),

  // Nonce validation
  nonce: Joi.string().min(1).max(100).required(),

  // Chain ID validation - only supported network (Sepolia) is allowed
  chainId: Joi.number().integer().valid(SUPPORTED_CHAIN_ID).messages({
    'any.only': `Only ${SUPPORTED_NETWORK_NAME} (Chain ID: ${SUPPORTED_CHAIN_ID}) is supported`,
  }),

  // Email validation
  email: Joi.string().email().max(255).required(),

  // Pagination
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
  },
};

/**
 * Validation schemas for specific endpoints
 */
export const validationSchemas = {
  // Wallet connection validation
  walletConnect: Joi.object({
    address: commonSchemas.ethereumAddress,
    chainId: commonSchemas.chainId.optional(),
  }),

  // Wallet signature validation
  walletSignature: Joi.object({
    address: commonSchemas.ethereumAddress,
    message: commonSchemas.message,
    signature: commonSchemas.signature,
    chainId: commonSchemas.chainId.optional(),
  }),

  // DID verification validation
  didVerify: Joi.object({
    didHash: commonSchemas.didHash,
    address: commonSchemas.ethereumAddress.optional(),
  }),

  // DID creation validation
  didCreate: Joi.object({
    did: Joi.string().min(1).max(500).required(),
    didHash: commonSchemas.didHash,
  }),
};

/**
 * Middleware to validate wallet connection request
 */
export const validateWalletConnect = validate(
  validationSchemas.walletConnect,
  'body'
);

/**
 * Middleware to validate wallet signature request
 */
export const validateWalletSignature = validate(
  validationSchemas.walletSignature,
  'body'
);

/**
 * Middleware to validate DID verification request
 */
export const validateDIDVerify = validate(
  validationSchemas.didVerify,
  'body'
);

/**
 * Middleware to validate DID creation request
 */
export const validateDIDCreate = validate(
  validationSchemas.didCreate,
  'body'
);


