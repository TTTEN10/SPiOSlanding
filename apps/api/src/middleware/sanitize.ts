import { Request, Response, NextFunction } from 'express';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * Uses DOMPurify for server-side sanitization
 */

// Create DOMPurify instance for server-side use
let DOMPurify: ReturnType<typeof createDOMPurify>;
try {
  const window = new JSDOM('').window;
  DOMPurify = createDOMPurify(window as any);
} catch (error) {
  // Fallback if DOMPurify initialization fails
  console.error('Failed to initialize DOMPurify:', error);
  // Create a mock DOMPurify that just returns the input
  DOMPurify = {
    sanitize: (input: string) => input.replace(/<[^>]*>/g, ''),
  } as any;
}

/**
 * Configuration for sanitization
 */
export interface SanitizeOptions {
  allowedTags?: string[];
  allowedAttributes?: string[];
  allowedSchemes?: string[];
}

const defaultOptions: SanitizeOptions = {
  allowedTags: [], // No HTML tags allowed by default
  allowedAttributes: [],
  allowedSchemes: [],
};

/**
 * Sanitize a string to remove all HTML and prevent XSS
 */
export function sanitizeInput(input: string, options?: SanitizeOptions): string {
  if (typeof input !== 'string') {
    return String(input);
  }

  const sanitizeOptions = { ...defaultOptions, ...options };
  
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: sanitizeOptions.allowedTags || [],
    ALLOWED_ATTR: sanitizeOptions.allowedAttributes || [],
    ALLOWED_URI_REGEXP: sanitizeOptions.allowedSchemes
      ? new RegExp(`^(${sanitizeOptions.allowedSchemes.join('|')}):`)
      : /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    KEEP_CONTENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_TRUSTED_TYPE: false,
  });
}

/**
 * Middleware to sanitize request body, query, and params
 */
export function sanitizeMiddleware(options?: SanitizeOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Sanitize body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body, options);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query, options);
    }

    // Sanitize params
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params, options);
    }

    next();
  };
}

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj: any, options?: SanitizeOptions): any {
  if (typeof obj === 'string') {
    return sanitizeInput(obj, options);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, options));
  }

  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeObject(obj[key], options);
      }
    }
    return sanitized;
  }

  return obj;
}

