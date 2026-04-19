import rateLimit from 'express-rate-limit'
import { Request, Response } from 'express'

// General rate limiting for API endpoints
export const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
})

// Specific rate limiting for email subscription endpoint
export const subscriptionRateLimitMiddleware = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 requests per minute
  message: {
    success: false,
    message: 'Too many subscription attempts. Please wait a minute before trying again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Rate limiting for wallet authentication endpoints (strict for security)
export const walletAuthRateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Reduced to 10 requests per 15 minutes for better security
  message: {
    success: false,
    message: 'Too many wallet authentication attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use wallet address if available, otherwise fall back to IP
    const walletAddress = req.headers['x-wallet-address'] as string;
    return walletAddress || req.ip || 'unknown';
  },
})

// Strict rate limiting for sensitive auth endpoints
export const strictAuthRateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 requests per 15 minutes
  message: {
    success: false,
    message: 'Too many authentication attempts. Please wait before trying again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const walletAddress = req.headers['x-wallet-address'] as string;
    return walletAddress || req.ip || 'unknown';
  },
})

// Strict rate limiting for payment endpoints
export const paymentRateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 payment requests per 15 minutes
  message: {
    success: false,
    message: 'Too many payment requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const walletAddress = req.headers['x-wallet-address'] as string;
    return walletAddress || req.ip || 'unknown';
  },
})

// Rate limiting for DID verification endpoints
export const didVerifyRateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 DID verification requests per 15 minutes
  message: {
    success: false,
    message: 'Too many DID verification requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use wallet address if available, otherwise fall back to IP
    const walletAddress = req.headers['x-wallet-address'] as string;
    return walletAddress || req.ip || 'unknown';
  },
})

// Rate limiting for testing endpoints
export const testingRateLimitMiddleware = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per minute
  message: {
    success: false,
    message: 'Too many requests to testing endpoint. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Rate limiting for chat completion endpoints
export const chatRateLimitMiddleware = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // limit each IP to 20 chat requests per minute
  message: {
    success: false,
    message: 'Too many chat requests. Please wait a moment before trying again.',
    error: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use wallet address if authenticated, otherwise use IP
    const walletAddress = req.headers['x-wallet-address'] as string;
    if (walletAddress) {
      return `wallet:${walletAddress.toLowerCase()}`;
    }
    return req.ip || 'unknown';
  },
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/healthz';
  },
})
