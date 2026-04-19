import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import app from '../apps/api/src/index'
import { prisma } from '../apps/api/src/lib/prisma'

describe('Subscribe Route', () => {
  let consoleSpy: any

  beforeEach(async () => {
    // Clean up test data
    await prisma.emailSubscription.deleteMany()
    
    // Mock console.log to capture email service logs
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(async () => {
    // Clean up test data
    await prisma.emailSubscription.deleteMany()
    
    // Restore console mocks
    vi.restoreAllMocks()
  })

  describe('POST /api/subscribe - Happy Path', () => {
    it('should subscribe valid email successfully', async () => {
      const email = 'test@example.com'
      
      const response = await request(app)
        .post('/api/subscribe')
        .send({ email })
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        message: 'Successfully joined our waitlist! We\'ll notify you when SafePsy launches.',
      })

      // Verify email was stored in database
      const subscription = await prisma.emailSubscription.findUnique({
        where: { email },
      })
      expect(subscription).toBeTruthy()
      expect(subscription?.email).toBe(email)
      expect(subscription?.ipHash).toBeDefined()
    })

    it('should handle various valid email formats', async () => {
      const validEmails = [
        'user@example.com',
        'user.name@domain.co.uk',
        'test+tag@example.org',
        'user123@subdomain.example.com',
        'test.email+tag@example-domain.com',
        'a@b.co',
        'user@sub.domain.example.com'
      ]

      for (const email of validEmails) {
        const response = await request(app)
          .post('/api/subscribe')
          .send({ email })
          .expect(200)

        expect(response.body.success).toBe(true)
        
        // Verify email was stored
        const subscription = await prisma.emailSubscription.findUnique({
          where: { email },
        })
        expect(subscription).toBeTruthy()
        expect(subscription?.email).toBe(email)
      }
    })

    it('should normalize email to lowercase and trim whitespace', async () => {
      const email = '  TEST@EXAMPLE.COM  '
      const normalizedEmail = 'test@example.com'
      
      const response = await request(app)
        .post('/api/subscribe')
        .send({ email })
        .expect(200)

      expect(response.body.success).toBe(true)

      // Verify email was stored in normalized format
      const subscription = await prisma.emailSubscription.findUnique({
        where: { email: normalizedEmail },
      })
      expect(subscription).toBeTruthy()
      expect(subscription?.email).toBe(normalizedEmail)
    })

    it('should generate IP hash for tracking', async () => {
      const email = 'test@example.com'
      
      const response = await request(app)
        .post('/api/subscribe')
        .send({ email })
        .expect(200)

      expect(response.body.success).toBe(true)

      const subscription = await prisma.emailSubscription.findUnique({
        where: { email },
      })
      expect(subscription?.ipHash).toBeDefined()
      
      // Check if IP hashing is enabled or disabled
      const ipHashingEnabled = process.env.IP_HASHING_ENABLED === 'true'
      if (ipHashingEnabled) {
        expect(subscription?.ipHash).toMatch(/^[a-f0-9]{64}$/) // SHA-256 hash format
      } else {
        expect(subscription?.ipHash).toBe('IP_HASHING_DISABLED') // Privacy by design default
      }
    })

    it('should handle emails with special characters', async () => {
      const specialEmails = [
        'test+tag@example.com',
        'user.name@example.com',
        'test-email@example.com',
        'user_name@example.com',
        'test.email+tag@example-domain.co.uk'
      ]

      for (const email of specialEmails) {
        const response = await request(app)
          .post('/api/subscribe')
          .send({ email })
          .expect(200)

        expect(response.body.success).toBe(true)
      }
    })
  })

  describe('POST /api/subscribe - Validation Errors', () => {
    it('should reject invalid email format', async () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test.example.com',
        'test@.com',
        'test@example.',
        'test@@example.com',
        'test@example..com',
        'test@example.com.',
        'test@example.com@',
        'test@example@com',
        'test@example.com@test'
      ]

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/subscribe')
          .send({ email })
          .expect(400)

        expect(response.body).toEqual({
          success: false,
          message: 'Please provide a valid email address',
        })
      }
    })

    it('should reject missing email', async () => {
      const response = await request(app)
        .post('/api/subscribe')
        .send({})
        .expect(400)

      expect(response.body).toEqual({
        success: false,
        message: 'Email is required',
      })
    })

    it('should reject null email', async () => {
      const response = await request(app)
        .post('/api/subscribe')
        .send({ email: null })
        .expect(400)

      expect(response.body).toEqual({
        success: false,
        message: 'Email is required',
      })
    })

    it('should reject undefined email', async () => {
      const response = await request(app)
        .post('/api/subscribe')
        .send({ email: undefined })
        .expect(400)

      expect(response.body).toEqual({
        success: false,
        message: 'Email is required',
      })
    })

    it('should reject empty string email', async () => {
      const response = await request(app)
        .post('/api/subscribe')
        .send({ email: '' })
        .expect(400)

      expect(response.body).toEqual({
        success: false,
        message: 'Email is required',
      })
    })

    it('should reject whitespace-only email', async () => {
      const response = await request(app)
        .post('/api/subscribe')
        .send({ email: '   ' })
        .expect(400)

      expect(response.body).toEqual({
        success: false,
        message: 'Email is required',
      })
    })

    it('should reject non-string email', async () => {
      const nonStringEmails = [123, true, false, [], {}, new Date()]

      for (const email of nonStringEmails) {
        const response = await request(app)
          .post('/api/subscribe')
          .send({ email })
          .expect(400)

        expect(response.body.success).toBe(false)
        expect(response.body.message).toContain('valid email address')
      }
    })
  })

  describe('POST /api/subscribe - Duplicate Email Handling', () => {
    it('should reject duplicate email', async () => {
      const email = 'duplicate@example.com'
      
      // First subscription
      await request(app)
        .post('/api/subscribe')
        .send({ email })
        .expect(200)

      // Second subscription with same email
      const response = await request(app)
        .post('/api/subscribe')
        .send({ email })
        .expect(409)

      expect(response.body).toEqual({
        success: false,
        message: 'This email is already on our waitlist',
      })
    })

    it('should handle case-insensitive email deduplication', async () => {
      const email1 = 'test@example.com'
      const email2 = 'TEST@EXAMPLE.COM'
      
      // First subscription
      await request(app)
        .post('/api/subscribe')
        .send({ email: email1 })
        .expect(200)

      // Second subscription with same email (different case)
      const response = await request(app)
        .post('/api/subscribe')
        .send({ email: email2 })
        .expect(409)

      expect(response.body).toEqual({
        success: false,
        message: 'This email is already on our waitlist',
      })
    })

    it('should handle email with different whitespace as duplicate', async () => {
      const email1 = 'test@example.com'
      const email2 = '  test@example.com  '
      
      // First subscription
      await request(app)
        .post('/api/subscribe')
        .send({ email: email1 })
        .expect(200)

      // Second subscription with same email (different whitespace)
      const response = await request(app)
        .post('/api/subscribe')
        .send({ email: email2 })
        .expect(409)

      expect(response.body).toEqual({
        success: false,
        message: 'This email is already on our waitlist',
      })
    })

    it('should handle mixed case email as duplicate', async () => {
      const email1 = 'Test@Example.Com'
      const email2 = 'test@example.com'
      
      // First subscription
      await request(app)
        .post('/api/subscribe')
        .send({ email: email1 })
        .expect(200)

      // Second subscription with same email (lowercase)
      const response = await request(app)
        .post('/api/subscribe')
        .send({ email: email2 })
        .expect(409)

      expect(response.body).toEqual({
        success: false,
        message: 'This email is already on our waitlist',
      })
    })
  })

  describe('POST /api/subscribe - Edge Cases', () => {
    it('should handle very long email addresses', async () => {
      const longEmail = 'a'.repeat(50) + '@' + 'b'.repeat(50) + '.com'
      
      const response = await request(app)
        .post('/api/subscribe')
        .send({ email: longEmail })
        .expect(200)

      expect(response.body.success).toBe(true)
    })

    it('should handle international domain names', async () => {
      const internationalEmails = [
        'test@example.co.uk',
        'test@example.org.uk',
        'test@example.com.au',
        'test@example.de',
        'test@example.fr'
      ]

      for (const email of internationalEmails) {
        const response = await request(app)
          .post('/api/subscribe')
          .send({ email })
          .expect(200)

        expect(response.body.success).toBe(true)
      }
    })

    it('should handle emails with subdomains', async () => {
      const subdomainEmails = [
        'test@mail.example.com',
        'user@sub.domain.example.com',
        'test@a.b.c.example.com'
      ]

      for (const email of subdomainEmails) {
        const response = await request(app)
          .post('/api/subscribe')
          .send({ email })
          .expect(200)

        expect(response.body.success).toBe(true)
      }
    })

    it('should handle rapid consecutive requests', async () => {
      const email = 'rapid@example.com'
      
      // Make multiple rapid requests
      const promises = Array(5).fill(null).map(() =>
        request(app)
          .post('/api/subscribe')
          .send({ email })
      )

      const responses = await Promise.all(promises)
      
      // Only one should succeed, others should be duplicates
      const successCount = responses.filter(r => r.status === 200).length
      const duplicateCount = responses.filter(r => r.status === 409).length
      
      expect(successCount).toBe(1)
      expect(duplicateCount).toBe(4)
    })
  })

  describe('POST /api/subscribe - Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Mock prisma to throw an error
      const originalFindUnique = prisma.emailSubscription.findUnique
      const originalCreate = prisma.emailSubscription.create
      
      vi.spyOn(prisma.emailSubscription, 'findUnique').mockRejectedValueOnce(
        new Error('Database connection failed')
      )

      const response = await request(app)
        .post('/api/subscribe')
        .send({ email: 'test@example.com' })
        .expect(500)

      expect(response.body).toEqual({
        success: false,
        message: 'Something went wrong. Please try again later.',
      })

      // Restore original methods
      prisma.emailSubscription.findUnique = originalFindUnique
      prisma.emailSubscription.create = originalCreate
    })

    it('should handle database creation errors gracefully', async () => {
      // Mock prisma to throw an error on create
      const originalFindUnique = prisma.emailSubscription.findUnique
      const originalCreate = prisma.emailSubscription.create
      
      vi.spyOn(prisma.emailSubscription, 'findUnique').mockResolvedValueOnce(null)
      vi.spyOn(prisma.emailSubscription, 'create').mockRejectedValueOnce(
        new Error('Database write failed')
      )

      const response = await request(app)
        .post('/api/subscribe')
        .send({ email: 'test@example.com' })
        .expect(500)

      expect(response.body).toEqual({
        success: false,
        message: 'Something went wrong. Please try again later.',
      })

      // Restore original methods
      prisma.emailSubscription.findUnique = originalFindUnique
      prisma.emailSubscription.create = originalCreate
    })

    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/subscribe')
        .set('Content-Type', 'application/json')
        .send('{"email": "test@example.com"') // Missing closing brace
        .expect(400)

      expect(response.body.success).toBe(false)
    })

    it('should handle requests with extra fields', async () => {
      const response = await request(app)
        .post('/api/subscribe')
        .send({ 
          email: 'test@example.com',
          extraField: 'should be ignored',
          anotherField: 123
        })
        .expect(200)

      expect(response.body.success).toBe(true)
    })
  })

  describe('POST /api/subscribe - Rate Limiting', () => {
    it('should enforce rate limit of 5 requests per minute', async () => {
      const email = 'ratelimit@example.com'
      
      // Make 5 requests (should all succeed)
      const promises = Array(5).fill(null).map((_, index) =>
        request(app)
          .post('/api/subscribe')
          .send({ email: `ratelimit${index}@example.com` })
      )

      const responses = await Promise.all(promises)
      
      // All 5 should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
      })

      // 6th request should be rate limited
      const rateLimitedResponse = await request(app)
        .post('/api/subscribe')
        .send({ email: 'ratelimit6@example.com' })
        .expect(429)

      expect(rateLimitedResponse.body).toEqual({
        success: false,
        message: 'Too many subscription attempts. Please wait a minute before trying again.',
      })
    })

    it('should return proper rate limit headers', async () => {
      const email = 'headers@example.com'
      
      // Make a request
      const response = await request(app)
        .post('/api/subscribe')
        .send({ email })
        .expect(200)

      // Check for rate limit headers
      expect(response.headers).toHaveProperty('x-ratelimit-limit')
      expect(response.headers).toHaveProperty('x-ratelimit-remaining')
      expect(response.headers).toHaveProperty('x-ratelimit-reset')
      
      expect(response.headers['x-ratelimit-limit']).toBe('5')
      expect(parseInt(response.headers['x-ratelimit-remaining'])).toBeLessThanOrEqual(4)
    })

    it('should handle rate limit with different IPs independently', async () => {
      const email1 = 'ip1@example.com'
      const email2 = 'ip2@example.com'
      
      // Mock different IPs by setting X-Forwarded-For header
      const response1 = await request(app)
        .post('/api/subscribe')
        .set('X-Forwarded-For', '192.168.1.1')
        .send({ email: email1 })
        .expect(200)

      const response2 = await request(app)
        .post('/api/subscribe')
        .set('X-Forwarded-For', '192.168.1.2')
        .send({ email: email2 })
        .expect(200)

      expect(response1.body.success).toBe(true)
      expect(response2.body.success).toBe(true)
    })
  })

  describe('POST /api/subscribe - Security', () => {
    it('should handle SQL injection attempts', async () => {
      const maliciousEmails = [
        "test@example.com'; DROP TABLE emailSubscription; --",
        "test@example.com' OR '1'='1",
        "test@example.com' UNION SELECT * FROM emailSubscription --"
      ]

      for (const email of maliciousEmails) {
        const response = await request(app)
          .post('/api/subscribe')
          .send({ email })
          .expect(400) // Should be rejected as invalid email format

        expect(response.body.success).toBe(false)
      }
    })

    it('should handle XSS attempts in email', async () => {
      const xssEmails = [
        'test@example.com<script>alert("xss")</script>',
        'test@example.com"><script>alert("xss")</script>',
        'test@example.com\';alert("xss");//'
      ]

      for (const email of xssEmails) {
        const response = await request(app)
          .post('/api/subscribe')
          .send({ email })
          .expect(400) // Should be rejected as invalid email format

        expect(response.body.success).toBe(false)
      }
    })

    it('should handle extremely long email addresses', async () => {
      const veryLongEmail = 'a'.repeat(1000) + '@' + 'b'.repeat(1000) + '.com'
      
      const response = await request(app)
        .post('/api/subscribe')
        .send({ email: veryLongEmail })
        .expect(400) // Should be rejected due to length

      expect(response.body.success).toBe(false)
    })
  })

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)

      expect(response.body).toHaveProperty('status', 'ok')
      expect(response.body).toHaveProperty('timestamp')
      expect(typeof response.body.timestamp).toBe('string')
    })
  })

  describe('404 handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/unknown-route')
        .expect(404)

      expect(response.body).toEqual({
        success: false,
        message: 'Endpoint not found',
      })
    })

    it('should return 404 for unknown POST routes', async () => {
      const response = await request(app)
        .post('/unknown-endpoint')
        .send({ email: 'test@example.com' })
        .expect(404)

      expect(response.body).toEqual({
        success: false,
        message: 'Endpoint not found',
      })
    })
  })

  describe('Request Headers and Content-Type', () => {
    it('should accept requests with proper Content-Type', async () => {
      const response = await request(app)
        .post('/api/subscribe')
        .set('Content-Type', 'application/json')
        .send({ email: 'test@example.com' })
        .expect(200)

      expect(response.body.success).toBe(true)
    })

    it('should handle requests without Content-Type header', async () => {
      const response = await request(app)
        .post('/api/subscribe')
        .send({ email: 'test@example.com' })
        .expect(200)

      expect(response.body.success).toBe(true)
    })

    it('should handle requests with wrong Content-Type', async () => {
      const response = await request(app)
        .post('/api/subscribe')
        .set('Content-Type', 'text/plain')
        .send('{"email": "test@example.com"}')
        .expect(400)

      expect(response.body.success).toBe(false)
    })
  })

  describe('POST /api/subscribe - Confirmation Email Integration', () => {
    it('should send confirmation email when ENABLE_CONFIRMATION_EMAIL=true', async () => {
      const originalEnv = process.env.ENABLE_CONFIRMATION_EMAIL
      process.env.ENABLE_CONFIRMATION_EMAIL = 'true'

      const email = 'test@example.com'
      
      const response = await request(app)
        .post('/api/subscribe')
        .send({ email })
        .expect(200)

      expect(response.body.success).toBe(true)

      // Check that confirmation email was logged
      expect(consoleSpy).toHaveBeenCalledWith(`[EMAIL STUB] Confirmation email would be sent to: ${email}`)
      expect(consoleSpy).toHaveBeenCalledWith(`[EMAIL STUB] Email content: Welcome to SafePsy! You've successfully joined our waitlist.`)
      expect(consoleSpy).toHaveBeenCalledWith(`[EMAIL SERVICE] Confirmation email sent successfully to: ${email}`)

      process.env.ENABLE_CONFIRMATION_EMAIL = originalEnv
    })

    it('should skip confirmation email when ENABLE_CONFIRMATION_EMAIL=false', async () => {
      const originalEnv = process.env.ENABLE_CONFIRMATION_EMAIL
      process.env.ENABLE_CONFIRMATION_EMAIL = 'false'

      const email = 'test@example.com'
      
      const response = await request(app)
        .post('/api/subscribe')
        .send({ email })
        .expect(200)

      expect(response.body.success).toBe(true)

      // Check that confirmation email was skipped
      expect(consoleSpy).toHaveBeenCalledWith(`[EMAIL SERVICE] Confirmation email feature is disabled, skipping email to: ${email}`)
      
      // Should not have called the stub provider
      expect(consoleSpy).not.toHaveBeenCalledWith(`[EMAIL STUB] Confirmation email would be sent to: ${email}`)

      process.env.ENABLE_CONFIRMATION_EMAIL = originalEnv
    })

    it('should skip confirmation email when ENABLE_CONFIRMATION_EMAIL is undefined', async () => {
      const originalEnv = process.env.ENABLE_CONFIRMATION_EMAIL
      delete process.env.ENABLE_CONFIRMATION_EMAIL

      const email = 'test@example.com'
      
      const response = await request(app)
        .post('/api/subscribe')
        .send({ email })
        .expect(200)

      expect(response.body.success).toBe(true)

      // Check that confirmation email was skipped (default behavior)
      expect(consoleSpy).toHaveBeenCalledWith(`[EMAIL SERVICE] Confirmation email feature is disabled, skipping email to: ${email}`)

      process.env.ENABLE_CONFIRMATION_EMAIL = originalEnv
    })

    it('should handle email service errors gracefully', async () => {
      const originalEnv = process.env.ENABLE_CONFIRMATION_EMAIL
      process.env.ENABLE_CONFIRMATION_EMAIL = 'true'

      // Mock the email service to throw an error
      const originalCreateEmailService = require('../apps/api/src/lib/emailService').createEmailService
      const mockEmailService = {
        sendConfirmationEmail: vi.fn().mockRejectedValue(new Error('Email service error')),
        isEnabled: () => true
      }
      
      vi.doMock('../apps/api/src/lib/emailService', () => ({
        createEmailService: () => mockEmailService
      }))

      const email = 'test@example.com'
      
      // The subscription should still succeed even if email fails
      const response = await request(app)
        .post('/api/subscribe')
        .send({ email })
        .expect(200)

      expect(response.body.success).toBe(true)

      // Verify email was still stored in database
      const subscription = await prisma.emailSubscription.findUnique({
        where: { email },
      })
      expect(subscription).toBeTruthy()

      process.env.ENABLE_CONFIRMATION_EMAIL = originalEnv
    })

    it('should normalize email before sending confirmation', async () => {
      const originalEnv = process.env.ENABLE_CONFIRMATION_EMAIL
      process.env.ENABLE_CONFIRMATION_EMAIL = 'true'

      const email = '  TEST@EXAMPLE.COM  '
      const normalizedEmail = 'test@example.com'
      
      const response = await request(app)
        .post('/api/subscribe')
        .send({ email })
        .expect(200)

      expect(response.body.success).toBe(true)

      // Check that confirmation email was sent to normalized email
      expect(consoleSpy).toHaveBeenCalledWith(`[EMAIL STUB] Confirmation email would be sent to: ${normalizedEmail}`)
      expect(consoleSpy).toHaveBeenCalledWith(`[EMAIL SERVICE] Confirmation email sent successfully to: ${normalizedEmail}`)

      process.env.ENABLE_CONFIRMATION_EMAIL = originalEnv
    })
  })
})
