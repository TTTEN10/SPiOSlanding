import { Request, Response, NextFunction } from 'express';
import logger from '../lib/logger';

/**
 * Safety middleware configuration
 */
export interface SafetyConfig {
  // Injection filter settings
  injectionFilter: {
    enabled: boolean;
    blockOnDetect: boolean; // If false, sanitize instead of blocking
    logDetections: boolean;
  };
  
  // Moderation settings
  moderation: {
    enabled: boolean;
    blockOnDetect: boolean;
    logDetections: boolean;
    customRules?: string[]; // Additional regex patterns for moderation
  };
  
  // PII redaction settings
  piiRedaction: {
    enabled: boolean;
    redactInLogs: boolean; // Redact PII in logs
    redactInResponses: boolean; // Redact PII in API responses
    preserveForAuth: boolean; // Don't redact in auth-related fields
  };
}

/**
 * Default safety configuration
 */
const defaultConfig: SafetyConfig = {
  injectionFilter: {
    enabled: process.env.SAFETY_INJECTION_FILTER_ENABLED !== 'false',
    blockOnDetect: process.env.SAFETY_INJECTION_BLOCK === 'true',
    logDetections: true,
  },
  moderation: {
    enabled: process.env.SAFETY_MODERATION_ENABLED !== 'false',
    blockOnDetect: process.env.SAFETY_MODERATION_BLOCK === 'true',
    logDetections: true,
  },
  piiRedaction: {
    enabled: process.env.SAFETY_PII_REDACTION_ENABLED !== 'false',
    redactInLogs: process.env.SAFETY_PII_REDACT_LOGS === 'true',
    redactInResponses: process.env.SAFETY_PII_REDACT_RESPONSES === 'true',
    preserveForAuth: true,
  },
};

/**
 * Injection attack patterns
 * Improved patterns with reduced false positives
 */
const INJECTION_PATTERNS = {
  // SQL Injection patterns - more specific to avoid false positives
  sql: [
    // SQL keywords in suspicious contexts
    /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\s+.*\b(FROM|INTO|TABLE|DATABASE|WHERE|VALUES)\b/gi,
    // SQL injection attempts with quotes and operators
    /('|(\\')|(;)|(\|))\s*(\bOR\b|\bAND\b|\bUNION\b)/gi,
    // Classic SQL injection patterns
    /(\bOR\b\s+\d+\s*=\s*\d+)/gi,
    /(\bAND\b\s+\d+\s*=\s*\d+)/gi,
    /(\bOR\b\s+['"]\w+['"]\s*=\s*['"]\w+['"])/gi,
    /(\bAND\b\s+['"]\w+['"]\s*=\s*['"]\w+['"])/gi,
    // UNION-based injection
    /(\bUNION\b.*\bSELECT\b)/gi,
    // Stored procedure execution
    /(\bEXEC\b.*\b\(|\bEXECUTE\b.*\b\()/gi,
    // SQL Server extended procedures
    /(\bxp_\w+)/gi,
    // MySQL file operations
    /(\bLOAD_FILE\b|\bINTO\s+OUTFILE\b|\bINTO\s+DUMPFILE\b)/gi,
    // PostgreSQL functions
    /(\bCOPY\b.*\bFROM\b|\bpg_read_file\b)/gi,
    // Comment-based injection
    /(--|\#|\/\*|\*\/).*(\bOR\b|\bAND\b|\bUNION\b)/gi,
  ],
  
  // XSS patterns - enhanced coverage
  xss: [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /javascript:/gi,
    /data:text\/html/gi,
    /vbscript:/gi,
    // Event handlers
    /on\w+\s*=\s*["'][^"']*["']/gi,
    // HTML5 event handlers
    /on(load|error|click|focus|blur|mouseover|mouseout|keypress|keydown|keyup)\s*=/gi,
    // Dangerous HTML tags
    /<img[^>]*src[^>]*=.*javascript:/gi,
    /<svg[^>]*onload/gi,
    /<body[^>]*onload/gi,
    /<input[^>]*onfocus/gi,
    /<marquee[^>]*>/gi,
    /<link[^>]*href[^>]*=.*javascript:/gi,
    /<meta[^>]*http-equiv[^>]*=.*refresh/gi,
    // Expression injection
    /<style[^>]*>.*expression\s*\(/gi,
    // Base64 encoded scripts
    /data:text\/html;base64/gi,
  ],
  
  // Command injection patterns - more context-aware
  commandInjection: [
    // Command chaining with suspicious commands
    /[;&|]\s*(cat|ls|pwd|whoami|id|uname|ps|kill|rm|mv|cp|chmod|chown|wget|curl|nc|netcat|bash|sh|python|perl|ruby)\b/gi,
    // Command substitution
    /\$\{.*\}/g,
    /`[^`]*`/g,
    /\([^)]*\)/g,
    // Pipes with commands
    /\|\s*(cat|ls|grep|awk|sed|cut|sort|uniq|head|tail|less|more)\b/gi,
    // Command chaining operators
    /;\s*(cat|ls|pwd|whoami|id|uname|ps|kill|rm|mv|cp|chmod|chown)\b/gi,
    /\|\|\s*(cat|ls|pwd|whoami|id|uname|ps|kill|rm|mv|cp|chmod|chown)\b/gi,
    /&&\s*(cat|ls|pwd|whoami|id|uname|ps|kill|rm|mv|cp|chmod|chown)\b/gi,
    // Redirection operators with commands
    />\s*\w+|<\s*\w+/g,
  ],
  
  // Path traversal patterns
  pathTraversal: [
    /\.\.(\/|\\)/g,
    /\.\.%2[Ff]/g,
    /\.\.%5[Cc]/g,
    /%2[Ee]%2[Ee](\/|\\)/g,
    /\.\.%252[Ff]/g,
    /\.\.%255[Cc]/g,
    // System directories
    /\/(etc|proc|sys|dev|boot|root|home|usr|var|tmp|windows|win32|system32)\//gi,
    // Encoded path traversal
    /%2e%2e%2f|%2e%2e%5c/gi,
  ],
  
  // NoSQL injection patterns
  nosql: [
    /\$where/gi,
    /\$ne/gi,
    /\$gt/gi,
    /\$lt/gi,
    /\$gte/gi,
    /\$lte/gi,
    /\$regex/gi,
    /\$exists/gi,
    /\$in\s*\[/gi,
    /\$nin\s*\[/gi,
    /\$or\s*\[/gi,
    /\$and\s*\[/gi,
    /\$not/gi,
    /\$nor\s*\[/gi,
    /\$elemMatch/gi,
    /\$size/gi,
  ],
  
  // LDAP injection patterns
  ldap: [
    /[\(\)&|!]/g,
    /\*\)/g,
    /\(&/g,
    /\|\|/g,
    /&&/g,
  ],
  
  // XML/XXE injection patterns
  xxe: [
    /<!ENTITY/gi,
    /SYSTEM\s+["']/gi,
    /PUBLIC\s+["']/gi,
    /<!DOCTYPE.*SYSTEM/gi,
    /<!DOCTYPE.*PUBLIC/gi,
    /%[a-f0-9]{2}/gi, // URL encoded entities
  ],
};

/**
 * Moderation patterns (profanity, hate speech, etc.)
 * Enhanced with more comprehensive detection
 */
const MODERATION_PATTERNS = {
  // Common profanity - expanded list
  profanity: [
    /\b(fuck|fck|f\*\*k|f\*\*\*)\w*\b/gi,
    /\b(sh\*t|shit|s\*\*t)\w*\b/gi,
    /\b(damn|d\*mn|d\*\*\*)\w*\b/gi,
    /\b(b\*tch|bitch|b\*\*\*\*)\w*\b/gi,
    /\b(asshole|a\*\*hole|a\*\*\*\*\*)\w*\b/gi,
    /\b(bastard|b\*stard|b\*\*\*\*\*\*)\w*\b/gi,
    /\b(c\*nt|cunt|c\*\*\*)\w*\b/gi,
    /\b(p\*ssy|pussy|p\*\*\*\*)\w*\b/gi,
    /\b(d\*ck|dick|d\*\*\*)\w*\b/gi,
    /\b(w\*nker|wanker|w\*\*\*\*\*)\w*\b/gi,
    /\b(t\*at|twat|t\*\*\*)\w*\b/gi,
  ],
  
  // Hate speech indicators - expanded
  hateSpeech: [
    // Self-harm encouragement
    /\b(kill|die|murder|suicide|harm|hurt)\s+(yourself|myself|himself|herself|themselves|urself)\b/gi,
    // Extremist groups
    /\b(terrorist|nazi|kkk|isis|isil|al\s*qaeda)\b/gi,
    // Racial slurs (common patterns)
    /\b(n\*gg\*r|n\*\*\*\*\*r)\w*\b/gi,
    // Discriminatory language
    /\b(you\s+(jew|muslim|christian|black|white|asian|gay|lesbian|trans))\b/gi,
    /\b(all\s+(jews|muslims|blacks|whites|asians|gays))\s+(are|should)\b/gi,
  ],
  
  // Threatening language - enhanced
  threats: [
    // Direct threats
    /\b(i\s+will|i'll|i'm\s+going\s+to|i\s+am\s+going\s+to)\s+(kill|hurt|harm|attack|destroy|assault|beat|stab|shoot)\s+(you|them|him|her|it|u)\b/gi,
    // Weapon mentions in threatening context
    /\b(i\s+have|i\s+got|i'm\s+bringing)\s+(a\s+)?(bomb|explosive|weapon|gun|knife|rifle|pistol|bomb|grenade)\b/gi,
    // Violence threats
    /\b(going\s+to\s+)(kill|hurt|harm|attack|destroy|assault|beat)\s+(you|them|him|her)\b/gi,
    // Bomb threats
    /\b(bomb|explosive|detonate|blow\s+up)\s+(the|this|that|your|their)\b/gi,
    // School/workplace violence
    /\b(going\s+to\s+)(shoot|attack)\s+(up|the\s+school|the\s+office|the\s+building)\b/gi,
  ],
  
  // Spam and phishing indicators
  spam: [
    /\b(click\s+here|limited\s+time|act\s+now|urgent|guaranteed|free\s+money|make\s+\$\d+)\b/gi,
    /\b(viagra|cialis|pharmacy|pills|medication)\s+(online|cheap|discount)\b/gi,
    /\b(winner|congratulations|you\s+won|claim\s+your|prize)\b/gi,
    /\b(nigerian\s+prince|inheritance|lottery|sweepstakes)\b/gi,
  ],
};

/**
 * PII detection patterns
 * Enhanced with better accuracy and international formats
 */
const PII_PATTERNS = {
  // Email addresses - improved pattern
  email: /\b[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}\b/g,
  
  // Phone numbers - international formats
  phone: /(\+?\d{1,4}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}\b/g,
  // US/Canada specific format
  phoneUS: /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  // International with country code
  phoneInternational: /\+\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}\b/g,
  
  // Credit card numbers - improved validation (13-19 digits, common formats)
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{1,4}\b/g,
  // Credit card without separators (13-19 digits)
  creditCardNoSeparator: /\b\d{13,19}\b/g,
  // AMEX format (15 digits: 4-6-5)
  creditCardAmex: /\b\d{4}[-\s]?\d{6}[-\s]?\d{5}\b/g,
  
  // SSN (US Social Security Number) - strict format
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  // SSN without dashes (less common but possible)
  ssnNoDashes: /\b(?!000|666|9\d{2})\d{3}(?!00)\d{2}(?!0000)\d{4}\b/g,
  
  // IP addresses - IPv4 (more accurate validation)
  ipAddress: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
  // IPv6 addresses
  ipAddressIPv6: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,
  
  // MAC addresses
  macAddress: /\b(?:[0-9A-Fa-f]{2}[:-]){5}(?:[0-9A-Fa-f]{2})\b/g,
  
  // Passport numbers (various formats)
  passport: /\b[A-Z]{1,2}\d{6,9}\b/g,
  // US Passport
  passportUS: /\b\d{9}\b/g,
  
  // Driver's license (US format varies by state, common patterns)
  driversLicense: /\b[A-Z]\d{6,12}\b/g,
  // Common US DL format
  driversLicenseUS: /\b\d{1,2}[A-Z]{1,3}\d{2,6}\b/g,
  
  // Date of birth patterns (common formats)
  dateOfBirth: /\b(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12][0-9]|3[01])[\/\-](19|20)\d{2}\b/g,
  // European date format
  dateOfBirthEU: /\b(0?[1-9]|[12][0-9]|3[01])[\/\-](0?[1-9]|1[0-2])[\/\-](19|20)\d{2}\b/g,
  
  // IBAN (International Bank Account Number)
  iban: /\b[A-Z]{2}\d{2}[A-Z0-9]{4,30}\b/g,
  
  // Bitcoin/Ethereum addresses
  cryptoAddress: /\b(1|3)[a-km-zA-HJ-NP-Z1-9]{25,34}\b|\b0x[a-fA-F0-9]{40}\b/g,
};

/**
 * Redaction replacement strings
 */
const REDACTION_REPLACEMENTS = {
  email: '[EMAIL_REDACTED]',
  phone: '[PHONE_REDACTED]',
  phoneUS: '[PHONE_REDACTED]',
  phoneInternational: '[PHONE_REDACTED]',
  creditCard: '[CARD_REDACTED]',
  creditCardNoSeparator: '[CARD_REDACTED]',
  creditCardAmex: '[CARD_REDACTED]',
  ssn: '[SSN_REDACTED]',
  ssnNoDashes: '[SSN_REDACTED]',
  ipAddress: '[IP_REDACTED]',
  ipAddressIPv6: '[IP_REDACTED]',
  macAddress: '[MAC_REDACTED]',
  passport: '[PASSPORT_REDACTED]',
  passportUS: '[PASSPORT_REDACTED]',
  driversLicense: '[DL_REDACTED]',
  driversLicenseUS: '[DL_REDACTED]',
  dateOfBirth: '[DOB_REDACTED]',
  dateOfBirthEU: '[DOB_REDACTED]',
  iban: '[IBAN_REDACTED]',
  cryptoAddress: '[CRYPTO_ADDRESS_REDACTED]',
  default: '[REDACTED]',
};

/**
 * Check if a string contains injection patterns
 * Optimized with early exit and pattern ordering
 */
function detectInjection(text: string): { detected: boolean; type: string; pattern: string } | null {
  // Early exit for empty or very short strings
  if (!text || text.length < 3) {
    return null;
  }
  
  // Check patterns in order of severity/commonality
  // SQL and XSS are most common, so check them first
  const orderedCategories = ['sql', 'xss', 'commandInjection', 'pathTraversal', 'nosql', 'ldap', 'xxe'];
  
  for (const category of orderedCategories) {
    const patterns = INJECTION_PATTERNS[category as keyof typeof INJECTION_PATTERNS];
    if (!patterns) continue;
    
    for (const pattern of patterns) {
      // Reset regex lastIndex to ensure consistent matching
      pattern.lastIndex = 0;
      if (pattern.test(text)) {
        return {
          detected: true,
          type: category,
          pattern: pattern.toString(),
        };
      }
    }
  }
  
  return null;
}

/**
 * Sanitize injection patterns from text
 * Enhanced with better sanitization strategies
 */
function sanitizeInjection(text: string): string {
  let sanitized = text;
  
  for (const [category, patterns] of Object.entries(INJECTION_PATTERNS)) {
    for (const pattern of patterns) {
      sanitized = sanitized.replace(pattern, (match) => {
        // Category-specific sanitization
        switch (category) {
          case 'xss':
            // HTML encode dangerous characters
            return match
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#x27;')
              .replace(/\//g, '&#x2F;');
          
          case 'sql':
            // Remove or neutralize SQL injection attempts
            return match.replace(/[';]/g, '').replace(/\b(OR|AND|UNION)\b/gi, '[FILTERED]');
          
          case 'commandInjection':
            // Remove shell metacharacters
            return match.replace(/[;&|`$(){}[\]]/g, '').replace(/\b(cat|ls|pwd|whoami|id|uname|ps|kill|rm|mv|cp|chmod|chown)\b/gi, '[FILTERED]');
          
          case 'pathTraversal':
            // Remove path traversal sequences
            return match.replace(/\.\./g, '').replace(/[\/\\]/g, '');
          
          case 'nosql':
            // Remove NoSQL operators
            return match.replace(/\$/g, '').replace(/\b(where|ne|gt|lt|gte|lte|regex|exists|in|nin|or|and|not|nor)\b/gi, '[FILTERED]');
          
          case 'ldap':
            // Remove LDAP special characters
            return match.replace(/[\(\)&|!*]/g, '');
          
          case 'xxe':
            // Remove XML entity declarations
            return match.replace(/<!ENTITY/gi, '').replace(/SYSTEM|PUBLIC/gi, '[FILTERED]');
          
          default:
            return '[FILTERED]';
        }
      });
    }
  }
  
  return sanitized;
}

/**
 * Check if content violates moderation rules
 * Optimized with early exit and pattern ordering
 */
function detectModerationViolation(
  text: string,
  customRules?: string[]
): { detected: boolean; type: string; pattern: string } | null {
  // Early exit for empty strings
  if (!text || text.length < 2) {
    return null;
  }
  
  // Check built-in patterns in order of severity
  // Threats are most serious, so check first
  const orderedCategories = ['threats', 'hateSpeech', 'profanity', 'spam'];
  
  for (const category of orderedCategories) {
    const patterns = MODERATION_PATTERNS[category as keyof typeof MODERATION_PATTERNS];
    if (!patterns) continue;
    
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      if (pattern.test(text)) {
        return {
          detected: true,
          type: category,
          pattern: pattern.toString(),
        };
      }
    }
  }
  
  // Check custom rules
  if (customRules && customRules.length > 0) {
    for (const rule of customRules) {
      try {
        const regex = new RegExp(rule, 'gi');
        regex.lastIndex = 0;
        if (regex.test(text)) {
          return {
            detected: true,
            type: 'custom',
            pattern: rule,
          };
        }
      } catch (error) {
        logger.warn(`Invalid custom moderation rule: ${rule}`, error);
      }
    }
  }
  
  return null;
}

/**
 * Redact PII from text
 * Enhanced with better pattern matching and additional PII types
 * Optimized to avoid double-redaction and improve performance
 */
function redactPII(
  text: string,
  config: SafetyConfig['piiRedaction']
): { redacted: string; detected: Array<{ type: string; count: number }> } {
  // Early exit for empty strings
  if (!text || text.length === 0) {
    return { redacted: text, detected: [] };
  }
  
  let redacted = text;
  const detected: Array<{ type: string; count: number }> = [];
  
  /**
   * Helper to redact a pattern and track it
   * Uses simple replace which handles overlapping matches automatically
   */
  function redactPattern(
    pattern: RegExp,
    replacement: string,
    type: string
  ): void {
    // Reset regex lastIndex to ensure fresh matching
    pattern.lastIndex = 0;
    const matches = redacted.match(pattern);
    
    if (matches && matches.length > 0) {
      redacted = redacted.replace(pattern, replacement);
      detected.push({ type, count: matches.length });
    }
  }
  
  // Redact in order of priority and specificity (most specific first)
  // This helps avoid false positives and ensures more specific patterns match first
  
  // Redact emails (high priority - most common, very specific pattern)
  redactPattern(PII_PATTERNS.email, REDACTION_REPLACEMENTS.email, 'email');
  
  // Redact credit cards (high priority - sensitive financial data)
  // Check formatted versions first (more specific)
  redactPattern(PII_PATTERNS.creditCardAmex, REDACTION_REPLACEMENTS.creditCardAmex, 'creditCard');
  redactPattern(PII_PATTERNS.creditCard, REDACTION_REPLACEMENTS.creditCard, 'creditCard');
  // Check unformatted last (less specific, may have false positives)
  redactPattern(PII_PATTERNS.creditCardNoSeparator, REDACTION_REPLACEMENTS.creditCardNoSeparator, 'creditCard');
  
  // Redact SSN (high priority - very sensitive)
  redactPattern(PII_PATTERNS.ssn, REDACTION_REPLACEMENTS.ssn, 'ssn');
  redactPattern(PII_PATTERNS.ssnNoDashes, REDACTION_REPLACEMENTS.ssnNoDashes, 'ssn');
  
  // Redact passport numbers
  redactPattern(PII_PATTERNS.passportUS, REDACTION_REPLACEMENTS.passportUS, 'passport');
  redactPattern(PII_PATTERNS.passport, REDACTION_REPLACEMENTS.passport, 'passport');
  
  // Redact driver's license
  redactPattern(PII_PATTERNS.driversLicenseUS, REDACTION_REPLACEMENTS.driversLicenseUS, 'driversLicense');
  redactPattern(PII_PATTERNS.driversLicense, REDACTION_REPLACEMENTS.driversLicense, 'driversLicense');
  
  // Redact IBAN
  redactPattern(PII_PATTERNS.iban, REDACTION_REPLACEMENTS.iban, 'iban');
  
  // Redact phone numbers (check most specific formats first)
  redactPattern(PII_PATTERNS.phoneInternational, REDACTION_REPLACEMENTS.phoneInternational, 'phone');
  redactPattern(PII_PATTERNS.phoneUS, REDACTION_REPLACEMENTS.phoneUS, 'phone');
  redactPattern(PII_PATTERNS.phone, REDACTION_REPLACEMENTS.phone, 'phone');
  
  // Redact date of birth
  redactPattern(PII_PATTERNS.dateOfBirth, REDACTION_REPLACEMENTS.dateOfBirth, 'dateOfBirth');
  redactPattern(PII_PATTERNS.dateOfBirthEU, REDACTION_REPLACEMENTS.dateOfBirthEU, 'dateOfBirth');
  
  // Redact IP addresses (lower priority - may be legitimate in some contexts)
  redactPattern(PII_PATTERNS.ipAddressIPv6, REDACTION_REPLACEMENTS.ipAddressIPv6, 'ipAddress');
  redactPattern(PII_PATTERNS.ipAddress, REDACTION_REPLACEMENTS.ipAddress, 'ipAddress');
  
  // Redact MAC addresses
  redactPattern(PII_PATTERNS.macAddress, REDACTION_REPLACEMENTS.macAddress, 'macAddress');
  
  // Redact crypto addresses (optional - may be legitimate in some contexts)
  redactPattern(PII_PATTERNS.cryptoAddress, REDACTION_REPLACEMENTS.cryptoAddress, 'cryptoAddress');
  
  return { redacted, detected };
}

/**
 * Recursively scan and process object for safety checks
 */
function processObject(
  obj: any,
  config: SafetyConfig,
  path: string = '',
  isAuthField: boolean = false
): { 
  processed: any; 
  violations: Array<{ path: string; type: string; details: any }>;
  redactions: Array<{ path: string; types: Array<{ type: string; count: number }> }>;
} {
  const violations: Array<{ path: string; type: string; details: any }> = [];
  const redactions: Array<{ path: string; types: Array<{ type: string; count: number }> }> = [];
  let processed: any;
  
  if (typeof obj === 'string') {
    let text = obj;
    const fieldPath = path || 'root';
    const shouldPreserve = isAuthField && config.piiRedaction.preserveForAuth;
    
    // Check for injection
    if (config.injectionFilter.enabled) {
      const injection = detectInjection(text);
      if (injection) {
        violations.push({
          path: fieldPath,
          type: 'injection',
          details: injection,
        });
        
        if (config.injectionFilter.blockOnDetect) {
          // Will be handled by middleware
        } else {
          text = sanitizeInjection(text);
        }
      }
    }
    
    // Check for moderation violations
    if (config.moderation.enabled) {
      const moderation = detectModerationViolation(text, config.moderation.customRules);
      if (moderation) {
        violations.push({
          path: fieldPath,
          type: 'moderation',
          details: moderation,
        });
      }
    }
    
    // Redact PII
    if (config.piiRedaction.enabled && !shouldPreserve) {
      const piiResult = redactPII(text, config.piiRedaction);
      if (piiResult.detected.length > 0) {
        redactions.push({
          path: fieldPath,
          types: piiResult.detected,
        });
        text = piiResult.redacted;
      }
    }
    
    processed = text;
  } else if (Array.isArray(obj)) {
    processed = [];
    for (let i = 0; i < obj.length; i++) {
      const result = processObject(
        obj[i],
        config,
        `${path}[${i}]`,
        isAuthField
      );
      processed.push(result.processed);
      violations.push(...result.violations);
      redactions.push(...result.redactions);
    }
  } else if (obj !== null && typeof obj === 'object') {
    processed = {};
    for (const [key, value] of Object.entries(obj)) {
      const fieldPath = path ? `${path}.${key}` : key;
      // Check if this is an auth-related field
      const isAuth = isAuthField || 
        // Preserve identity/routing fields from redaction so business logic keeps working.
        // (Redaction for logs is handled separately; this avoids breaking subscribe/contact flows.)
        ['password', 'token', 'secret', 'key', 'signature', 'address', 'wallet', 'email'].some(
          authTerm => key.toLowerCase().includes(authTerm)
        );
      
      const result = processObject(value, config, fieldPath, isAuth);
      processed[key] = result.processed;
      violations.push(...result.violations);
      redactions.push(...result.redactions);
    }
  } else {
    processed = obj;
  }
  
  return { processed, violations, redactions };
}

/**
 * Safety middleware factory
 * Creates middleware with configurable safety checks
 */
export function safetyMiddleware(config?: Partial<SafetyConfig>) {
  const finalConfig: SafetyConfig = {
    ...defaultConfig,
    ...config,
    injectionFilter: { ...defaultConfig.injectionFilter, ...config?.injectionFilter },
    moderation: { ...defaultConfig.moderation, ...config?.moderation },
    piiRedaction: { ...defaultConfig.piiRedaction, ...config?.piiRedaction },
  };
  
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Process request body
      if (req.body && typeof req.body === 'object') {
        const bodyResult = processObject(req.body, finalConfig, 'body');
        
        // Log violations
        if (bodyResult.violations.length > 0) {
          const violationSummary = bodyResult.violations.map(v => ({
            path: v.path,
            type: v.type,
            details: v.details,
          }));
          
          if (finalConfig.injectionFilter.logDetections || finalConfig.moderation.logDetections) {
            const clientInfo = {
              ip: req.ip,
              userAgent: req.get('user-agent'),
              method: req.method,
              path: req.path,
            };
            
            logger.warn('Safety violation detected', {
              violations: violationSummary,
              client: finalConfig.piiRedaction.redactInLogs 
                ? redactPII(JSON.stringify(clientInfo), finalConfig.piiRedaction).redacted
                : clientInfo,
            });
          }
          
          // Block if configured
          const shouldBlock = bodyResult.violations.some(v => {
            if (v.type === 'injection' && finalConfig.injectionFilter.blockOnDetect) {
              return true;
            }
            if (v.type === 'moderation' && finalConfig.moderation.blockOnDetect) {
              return true;
            }
            return false;
          });
          
          if (shouldBlock) {
            res.status(400).json({
              success: false,
              message: 'Request contains prohibited content',
              error: 'SAFETY_VIOLATION',
              violations: violationSummary.map(v => ({
                path: v.path,
                type: v.type,
              })),
            });
            return;
          }
        }
        
        // Log PII redactions
        if (bodyResult.redactions.length > 0 && finalConfig.piiRedaction.redactInLogs) {
          logger.info('PII redacted in request', {
            redactions: bodyResult.redactions,
            path: req.path,
          });
        }
        
        // Replace body with processed version
        req.body = bodyResult.processed;
      }
      
      // Process query parameters
      if (req.query && typeof req.query === 'object') {
        const queryResult = processObject(req.query, finalConfig, 'query');
        
        if (queryResult.violations.length > 0) {
          const violationSummary = queryResult.violations.map(v => ({
            path: v.path,
            type: v.type,
          }));
          
          if (finalConfig.injectionFilter.logDetections || finalConfig.moderation.logDetections) {
            logger.warn('Safety violation in query parameters', {
              violations: violationSummary,
              path: req.path,
            });
          }
          
          const shouldBlock = queryResult.violations.some(v => {
            if (v.type === 'injection' && finalConfig.injectionFilter.blockOnDetect) {
              return true;
            }
            if (v.type === 'moderation' && finalConfig.moderation.blockOnDetect) {
              return true;
            }
            return false;
          });
          
          if (shouldBlock) {
            res.status(400).json({
              success: false,
              message: 'Query parameters contain prohibited content',
              error: 'SAFETY_VIOLATION',
            });
            return;
          }
        }
        
        req.query = queryResult.processed;
      }
      
      // Process URL parameters
      if (req.params && typeof req.params === 'object') {
        const paramsResult = processObject(req.params, finalConfig, 'params');
        
        if (paramsResult.violations.length > 0) {
          const violationSummary = paramsResult.violations.map(v => ({
            path: v.path,
            type: v.type,
          }));
          
          if (finalConfig.injectionFilter.logDetections || finalConfig.moderation.logDetections) {
            logger.warn('Safety violation in URL parameters', {
              violations: violationSummary,
              path: req.path,
            });
          }
          
          const shouldBlock = paramsResult.violations.some(v => {
            if (v.type === 'injection' && finalConfig.injectionFilter.blockOnDetect) {
              return true;
            }
            if (v.type === 'moderation' && finalConfig.moderation.blockOnDetect) {
              return true;
            }
            return false;
          });
          
          if (shouldBlock) {
            res.status(400).json({
              success: false,
              message: 'URL parameters contain prohibited content',
              error: 'SAFETY_VIOLATION',
            });
            return;
          }
        }
        
        req.params = paramsResult.processed;
      }
      
      // Store redaction info in response locals for potential use in response processing
      res.locals.safetyConfig = finalConfig;
      
      next();
    } catch (error) {
      logger.error('Safety middleware error:', error);
      // Don't block on middleware errors, but log them
      next();
    }
  };
}

/**
 * Response interceptor to redact PII from responses
 */
export function safetyResponseInterceptor(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const originalJson = res.json.bind(res);
  const config: SafetyConfig = (res.locals.safetyConfig as SafetyConfig) || defaultConfig;
  
  res.json = function (body: any): Response {
    if (config.piiRedaction.redactInResponses && body && typeof body === 'object') {
      const result = processObject(body, config, 'response');
      if (result.redactions.length > 0) {
        logger.debug('PII redacted in response', {
          redactions: result.redactions,
          path: req.path,
        });
        body = result.processed;
      }
    }
    return originalJson(body);
  };
  
  next();
}

/**
 * Utility function to redact PII from a string
 */
export function redactPIIFromText(text: string): string {
  return redactPII(text, defaultConfig.piiRedaction).redacted;
}

/**
 * Utility function to check for injection patterns
 */
export function checkInjection(text: string): boolean {
  return detectInjection(text) !== null;
}

/**
 * Utility function to check for moderation violations
 */
export function checkModeration(text: string, customRules?: string[]): boolean {
  return detectModerationViolation(text, customRules) !== null;
}

