import { Request, Response, NextFunction } from 'express';
import logger from '../lib/logger';
import { redactLogObject } from './log-redaction';

/**
 * Global error handler middleware
 * Sanitizes error messages to prevent information leakage in production
 * Redacts sensitive data from error logs (prompts, messages, keys, etc.)
 */
export function errorHandlerMiddleware(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = req.id || 'unknown';
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Prepare error log data with redaction
  const errorLogData = redactLogObject({
    error: {
      name: err.name,
      message: err.message, // May contain sensitive data - will be redacted
      stack: isDevelopment ? err.stack : '<REDACTED: stack>', // Only log stack in dev
    },
    requestId,
    method: req.method,
    path: req.path,
    // IP address is hashed/redacted if IP_HASHING_ENABLED is true, otherwise logged
    // For maximum privacy, consider redacting IP in production
    ip: process.env.NODE_ENV === 'production' ? '<REDACTED: ip>' : req.ip,
  });

  // Log detailed error server-side only (with redaction)
  logger.error('Error occurred', errorLogData);

  // Don't expose internal errors in production
  const errorMessage = isDevelopment
    ? err.message
    : 'An error occurred. Please try again.';

  // Determine status code
  let statusCode = 500;
  if ('status' in err && typeof err.status === 'number') {
    statusCode = err.status;
  } else if ('statusCode' in err && typeof err.statusCode === 'number') {
    statusCode = err.statusCode;
  }

  // Send sanitized error response
  res.status(statusCode).json({
    success: false,
    message: errorMessage,
    error: isDevelopment ? err.name : 'INTERNAL_ERROR',
    requestId, // Include request ID for support/debugging
  });
}

/**
 * Async error wrapper to catch errors in async route handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

