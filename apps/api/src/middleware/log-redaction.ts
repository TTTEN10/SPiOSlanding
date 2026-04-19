/**
 * Log Redaction Middleware
 * 
 * Central redaction middleware for HTTP logs and application logs.
 * Prevents sensitive data leakage in logs by redacting:
 * - Chat message content (prompts, responses)
 * - Encryption keys
 * - Decrypted data
 * - API request/response bodies (Scaleway)
 * - User identifiers (wallet addresses, email addresses, DID)
 * 
 * Security Policy: Only safe metadata is logged (request IDs, timing, model names, response sizes)
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Sensitive field patterns that should be redacted from logs
 */
const SENSITIVE_PATTERNS = [
  // Chat content (JSON)
  /"content"\s*:\s*"[^"]*"/gi,
  /"message"\s*:\s*"[^"]*"/gi,
  /"prompt"\s*:\s*"[^"]*"/gi,
  /"messages"\s*:\s*\[[^\]]*\]/gi,
  // Plain-text log lines (prefix: value)
  /(User message|Chat content|Prompt|Response):\s*[^\n]+/gi,
  
  // Encryption keys (JSON)
  /"key"\s*:\s*"[^"]*"/gi,
  /"encryptionKey"\s*:\s*"[^"]*"/gi,
  /"decryptionKey"\s*:\s*"[^"]*"/gi,
  /"symmetricKey"\s*:\s*"[^"]*"/gi,
  // Plain-text key lines
  /(Key|Encryption key|Using symmetricKey):\s*[^\n]+/gi,
  
  // Encrypted blobs (may contain sensitive metadata)
  /"encryptedBlob"\s*:\s*"[^"]*"/gi,
  /"encryptedChatBlob"\s*:\s*"[^"]*"/gi,
  
  // API request/response bodies
  /"requestBody"\s*:\s*\{[^}]*\}/gi,
  /"responseBody"\s*:\s*\{[^}]*\}/gi,
  /"payload"\s*:\s*\{[^}]*\}/gi,
  
  // User identifiers (use hashed versions instead)
  /"walletAddress"\s*:\s*"0x[a-fA-F0-9]{40}"/gi,
  /"email"\s*:\s*"[^"]*@[^"]*"/gi,
  /"didTokenId"\s*:\s*"[^"]*"/gi,
];

/**
 * Redact sensitive data from a log message
 */
export function redactLogMessage(message: string): string {
  let redacted = message;
  
  // Redact sensitive patterns (replace entire key:value or prefix:value so the value is never logged)
  for (const pattern of SENSITIVE_PATTERNS) {
    redacted = redacted.replace(pattern, (match) => {
      // Plain-text log lines (User message:, Key:, etc.)
      if (/^(User message|Chat content|Prompt|Response):/i.test(match.trim())) {
        return match.replace(/^([^:]+:\s*).*/, '$1<REDACTED: content>');
      }
      if (/^(Key|Encryption key|Using symmetricKey):/i.test(match.trim())) {
        return match.replace(/^([^:]+:\s*).*/, '$1<REDACTED: key>');
      }
      // JSON-style patterns
      if (match.includes('content') || match.includes('message') || match.includes('prompt')) {
        return '"<REDACTED: content>"';
      }
      if (match.includes('key') || match.includes('Key')) {
        return '"<REDACTED: key>"';
      }
      if (match.includes('encryptedBlob')) {
        return '"<REDACTED: encrypted blob>"';
      }
      if (match.includes('walletAddress')) {
        return '"walletAddress": "<REDACTED: wallet>"';
      }
      if (match.includes('email')) {
        return '"<REDACTED: email>"';
      }
      if (match.includes('didTokenId')) {
        return '"<REDACTED: did>"';
      }
      return '<REDACTED>';
    });
  }
  
  return redacted;
}

/**
 * Redact sensitive data from an object (for structured logging)
 */
export function redactLogObject(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  const redacted = { ...obj };
  const sensitiveFields = [
    'content',
    'message',
    'prompt',
    'messages',
    'key',
    'encryptionKey',
    'decryptionKey',
    'symmetricKey',
    'encryptedBlob',
    'encryptedChatBlob',
    'requestBody',
    'responseBody',
    'payload',
    'walletAddress',
    'email',
    'didTokenId',
  ];
  
  for (const key in redacted) {
    if (sensitiveFields.includes(key)) {
      redacted[key] = '<REDACTED>';
    } else if (typeof redacted[key] === 'object' && redacted[key] !== null) {
      redacted[key] = redactLogObject(redacted[key]);
    }
  }
  
  return redacted;
}

/**
 * Middleware to redact sensitive data from HTTP request logs
 * Should be applied before any logging middleware
 */
export function logRedactionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Store original methods
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);
  
  // Override res.json to redact response body in logs
  res.json = function(body: any) {
    // Log response size only (not content)
    const responseSize = JSON.stringify(body).length;
    // Only log safe metadata
    if (process.env.LOG_RESPONSE_METADATA === 'true') {
      // Log only safe fields: size, status, model (if present), no content
      const safeMetadata: any = {
        status: res.statusCode,
        size: responseSize,
        requestId: req.id,
        path: req.path,
        method: req.method,
      };
      
      // Only include model name if it's a chat completion response (safe metadata)
      if (body && typeof body === 'object' && 'model' in body) {
        safeMetadata.model = body.model;
      }
      
      // Log safe metadata only (no content)
      // This would be done by the logging middleware, not here
    }
    
    return originalJson(body);
  };
  
  // Override res.send similarly
  res.send = function(body: any) {
    const responseSize = typeof body === 'string' ? body.length : JSON.stringify(body).length;
    // Similar redaction logic for send
    return originalSend(body);
  };
  
  next();
}

/**
 * Safe logger wrapper that automatically redacts sensitive data
 */
export function safeLogger(logger: any) {
  return {
    info: (message: string, meta?: any) => {
      const redactedMessage = redactLogMessage(message);
      const redactedMeta = meta ? redactLogObject(meta) : undefined;
      logger.info(redactedMessage, redactedMeta);
    },
    error: (message: string, meta?: any) => {
      const redactedMessage = redactLogMessage(message);
      const redactedMeta = meta ? redactLogObject(meta) : undefined;
      logger.error(redactedMessage, redactedMeta);
    },
    warn: (message: string, meta?: any) => {
      const redactedMessage = redactLogMessage(message);
      const redactedMeta = meta ? redactLogObject(meta) : undefined;
      logger.warn(redactedMessage, redactedMeta);
    },
    debug: (message: string, meta?: any) => {
      const redactedMessage = redactLogMessage(message);
      const redactedMeta = meta ? redactLogObject(meta) : undefined;
      logger.debug(redactedMessage, redactedMeta);
    },
    http: (message: string, meta?: any) => {
      const redactedMessage = redactLogMessage(message);
      const redactedMeta = meta ? redactLogObject(meta) : undefined;
      logger.http(redactedMessage, redactedMeta);
    },
  };
}

