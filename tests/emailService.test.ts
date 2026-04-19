import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { EmailService, StubEmailProvider, createEmailService } from '../apps/api/src/lib/emailService'

describe('EmailService', () => {
  let consoleSpy: any
  let consoleErrorSpy: any

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('StubEmailProvider', () => {
    it('should log confirmation email details', async () => {
      const provider = new StubEmailProvider()
      const email = 'test@example.com'

      await provider.sendConfirmationEmail(email)

      expect(consoleSpy).toHaveBeenCalledWith(`[EMAIL STUB] Confirmation email would be sent to: ${email}`)
      expect(consoleSpy).toHaveBeenCalledWith(`[EMAIL STUB] Email content: Welcome to SafePsy! You've successfully joined our waitlist.`)
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/\[EMAIL STUB\] Timestamp: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/))
    })

    it('should simulate async operation', async () => {
      const provider = new StubEmailProvider()
      const startTime = Date.now()

      await provider.sendConfirmationEmail('test@example.com')

      const endTime = Date.now()
      expect(endTime - startTime).toBeGreaterThanOrEqual(100) // Should take at least 100ms
    })
  })

  describe('EmailService', () => {
    it('should send confirmation email when enabled', async () => {
      const mockProvider = {
        sendConfirmationEmail: vi.fn().mockResolvedValue(undefined)
      }
      
      const emailService = new EmailService({
        provider: mockProvider,
        enabled: true
      })

      const email = 'test@example.com'
      await emailService.sendConfirmationEmail(email)

      expect(mockProvider.sendConfirmationEmail).toHaveBeenCalledWith(email)
      expect(consoleSpy).toHaveBeenCalledWith(`[EMAIL SERVICE] Confirmation email sent successfully to: ${email}`)
    })

    it('should skip sending email when disabled', async () => {
      const mockProvider = {
        sendConfirmationEmail: vi.fn()
      }
      
      const emailService = new EmailService({
        provider: mockProvider,
        enabled: false
      })

      const email = 'test@example.com'
      await emailService.sendConfirmationEmail(email)

      expect(mockProvider.sendConfirmationEmail).not.toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith(`[EMAIL SERVICE] Confirmation email feature is disabled, skipping email to: ${email}`)
    })

    it('should handle provider errors gracefully', async () => {
      const mockProvider = {
        sendConfirmationEmail: vi.fn().mockRejectedValue(new Error('Provider error'))
      }
      
      const emailService = new EmailService({
        provider: mockProvider,
        enabled: true
      })

      const email = 'test@example.com'
      
      // Should not throw
      await expect(emailService.sendConfirmationEmail(email)).resolves.toBeUndefined()
      
      expect(mockProvider.sendConfirmationEmail).toHaveBeenCalledWith(email)
      expect(consoleErrorSpy).toHaveBeenCalledWith(`[EMAIL SERVICE] Failed to send confirmation email to ${email}:`, expect.any(Error))
    })

    it('should return correct enabled status', () => {
      const enabledService = new EmailService({
        provider: new StubEmailProvider(),
        enabled: true
      })

      const disabledService = new EmailService({
        provider: new StubEmailProvider(),
        enabled: false
      })

      expect(enabledService.isEnabled()).toBe(true)
      expect(disabledService.isEnabled()).toBe(false)
    })
  })

  describe('createEmailService', () => {
    it('should create service with ENABLE_CONFIRMATION_EMAIL=true', () => {
      const originalEnv = process.env.ENABLE_CONFIRMATION_EMAIL
      process.env.ENABLE_CONFIRMATION_EMAIL = 'true'

      const emailService = createEmailService()

      expect(emailService.isEnabled()).toBe(true)

      process.env.ENABLE_CONFIRMATION_EMAIL = originalEnv
    })

    it('should create service with ENABLE_CONFIRMATION_EMAIL=false', () => {
      const originalEnv = process.env.ENABLE_CONFIRMATION_EMAIL
      process.env.ENABLE_CONFIRMATION_EMAIL = 'false'

      const emailService = createEmailService()

      expect(emailService.isEnabled()).toBe(false)

      process.env.ENABLE_CONFIRMATION_EMAIL = originalEnv
    })

    it('should create service with ENABLE_CONFIRMATION_EMAIL undefined (default false)', () => {
      const originalEnv = process.env.ENABLE_CONFIRMATION_EMAIL
      delete process.env.ENABLE_CONFIRMATION_EMAIL

      const emailService = createEmailService()

      expect(emailService.isEnabled()).toBe(false)

      process.env.ENABLE_CONFIRMATION_EMAIL = originalEnv
    })

    it('should create service with invalid ENABLE_CONFIRMATION_EMAIL value (default false)', () => {
      const originalEnv = process.env.ENABLE_CONFIRMATION_EMAIL
      process.env.ENABLE_CONFIRMATION_EMAIL = 'invalid'

      const emailService = createEmailService()

      expect(emailService.isEnabled()).toBe(false)

      process.env.ENABLE_CONFIRMATION_EMAIL = originalEnv
    })
  })
})
