/**
 * Log Redaction Security Tests
 * 
 * Verifies that log functions never receive plaintext fields and that
 * sensitive data is properly redacted before logging.
 */

import { describe, it, expect } from 'vitest';
import { redactLogMessage, redactLogObject } from '../middleware/log-redaction';

describe('Log Redaction Security', () => {
  describe('redactLogMessage', () => {
    it('should redact chat message content', () => {
      const message = 'User sent message: {"content": "Hello, I need help with anxiety"}';
      const redacted = redactLogMessage(message);
      expect(redacted).toContain('<REDACTED: content>');
      expect(redacted).not.toContain('Hello, I need help with anxiety');
    });

    it('should redact prompts', () => {
      const message = 'Processing prompt: {"prompt": "Tell me about therapy"}';
      const redacted = redactLogMessage(message);
      expect(redacted).toContain('<REDACTED: content>');
      expect(redacted).not.toContain('Tell me about therapy');
    });

    it('should redact encryption keys', () => {
      const message = 'Using key: {"key": "abc123def456"}';
      const redacted = redactLogMessage(message);
      expect(redacted).toContain('<REDACTED: key>');
      expect(redacted).not.toContain('abc123def456');
    });

    it('should redact wallet addresses', () => {
      const message = 'Wallet: {"walletAddress": "0x1234567890123456789012345678901234567890"}';
      const redacted = redactLogMessage(message);
      expect(redacted).toContain('<REDACTED: wallet>');
      expect(redacted).not.toContain('0x1234567890123456789012345678901234567890');
    });

    it('should redact email addresses', () => {
      const message = 'User email: {"email": "user@example.com"}';
      const redacted = redactLogMessage(message);
      expect(redacted).toContain('<REDACTED: email>');
      expect(redacted).not.toContain('user@example.com');
    });

    it('should preserve safe metadata', () => {
      const message = 'Request completed: {"requestId": "req-123", "status": 200, "model": "llama-3-70b-instruct", "size": 1024}';
      const redacted = redactLogMessage(message);
      expect(redacted).toContain('req-123');
      expect(redacted).toContain('200');
      expect(redacted).toContain('llama-3-70b-instruct');
      expect(redacted).toContain('1024');
    });

    it('should handle empty strings', () => {
      const redacted = redactLogMessage('');
      expect(redacted).toBe('');
    });

    it('should handle messages without sensitive data', () => {
      const message = 'Request processed successfully';
      const redacted = redactLogMessage(message);
      expect(redacted).toBe(message);
    });
  });

  describe('redactLogObject', () => {
    it('should redact sensitive fields from objects', () => {
      const obj = {
        requestId: 'req-123',
        content: 'User message here',
        message: 'Another message',
        key: 'secret-key-123',
        walletAddress: '0x1234567890123456789012345678901234567890',
        email: 'user@example.com',
        status: 200,
        model: 'llama-3-70b-instruct',
      };

      const redacted = redactLogObject(obj);

      // Safe fields should be preserved
      expect(redacted.requestId).toBe('req-123');
      expect(redacted.status).toBe(200);
      expect(redacted.model).toBe('llama-3-70b-instruct');

      // Sensitive fields should be redacted
      expect(redacted.content).toBe('<REDACTED>');
      expect(redacted.message).toBe('<REDACTED>');
      expect(redacted.key).toBe('<REDACTED>');
      expect(redacted.walletAddress).toBe('<REDACTED>');
      expect(redacted.email).toBe('<REDACTED>');
    });

    it('should redact nested objects', () => {
      const obj = {
        requestId: 'req-123',
        error: {
          message: 'Error with user content',
          content: 'Sensitive data here',
        },
        metadata: {
          model: 'llama-3-70b-instruct',
          size: 1024,
        },
      };

      const redacted = redactLogObject(obj);

      expect(redacted.requestId).toBe('req-123');
      expect(redacted.metadata.model).toBe('llama-3-70b-instruct');
      expect(redacted.metadata.size).toBe(1024);
      expect(redacted.error.message).toBe('<REDACTED>');
      expect(redacted.error.content).toBe('<REDACTED>');
    });

    it('should handle null and undefined', () => {
      expect(redactLogObject(null)).toBe(null);
      expect(redactLogObject(undefined)).toBe(undefined);
    });

    it('should handle arrays', () => {
      const obj = {
        messages: [
          { role: 'user', content: 'Sensitive message' },
          { role: 'assistant', content: 'Response' },
        ],
        requestId: 'req-123',
      };

      const redacted = redactLogObject(obj);
      expect(redacted.requestId).toBe('req-123');
      // Arrays with sensitive fields should be redacted
      expect(redacted.messages).toBe('<REDACTED>');
    });
  });

  describe('Security Guarantees', () => {
    it('should never log plaintext chat content', () => {
      const testCases = [
        'User message: Hello world',
        'Chat content: {"content": "I need help"}',
        'Prompt: Tell me about therapy',
        'Response: Here is some advice',
      ];

      testCases.forEach((testCase) => {
        const redacted = redactLogMessage(testCase);
        // Should not contain actual message content
        expect(redacted).not.toMatch(/Hello world|I need help|Tell me about therapy|Here is some advice/);
      });
    });

    it('should never log encryption keys', () => {
      const testCases = [
        'Key: abc123def456',
        'Encryption key: {"key": "secret"}',
        'Using symmetricKey: xyz789',
      ];

      testCases.forEach((testCase) => {
        const redacted = redactLogMessage(testCase);
        expect(redacted).not.toMatch(/abc123|secret|xyz789/);
        expect(redacted).toContain('<REDACTED');
      });
    });

    it('should preserve safe metadata for observability', () => {
      const safeMetadata = {
        requestId: 'req-123',
        tokenId: 'token-456',
        model: 'llama-3-70b-instruct',
        responseSize: 2048,
        duration: 150,
        status: 200,
      };

      const redacted = redactLogObject(safeMetadata);
      expect(redacted).toEqual(safeMetadata);
    });
  });
});

