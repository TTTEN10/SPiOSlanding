/**
 * Abstract email service interface for SafePsy landing page
 * 
 * This service provides a clean abstraction layer for email providers,
 * allowing easy switching between SES, Postmark, SendGrid, Resend, Mailgun, etc.
 */

export interface EmailProvider {
  sendConfirmationEmail(email: string): Promise<void>
  sendAdminNotificationEmail(params: {
    to: string
    subject: string
    textBody: string
    htmlBody?: string
  }): Promise<void>
}

export interface EmailServiceConfig {
  provider: EmailProvider
  enabled: boolean
  adminNotificationsEnabled: boolean
  adminNotificationEmail: string
}

/**
 * Stub email provider that logs confirmation emails instead of sending them
 * This is used for development and testing purposes
 */
export class StubEmailProvider implements EmailProvider {
  async sendConfirmationEmail(email: string): Promise<void> {
    console.log(`[EMAIL STUB] Confirmation email would be sent to: ${email}`)
    console.log(`[EMAIL STUB] Email content: Welcome to SafePsy! You've successfully joined our waitlist.`)
    console.log(`[EMAIL STUB] Timestamp: ${new Date().toISOString()}`)
    
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  async sendAdminNotificationEmail(params: {
    to: string
    subject: string
    textBody: string
    htmlBody?: string
  }): Promise<void> {
    console.log(`[EMAIL STUB] Admin notification would be sent to: ${params.to}`)
    console.log(`[EMAIL STUB] Subject: ${params.subject}`)
    console.log(`[EMAIL STUB] Text body:\n${params.textBody}`)
    if (params.htmlBody) {
      console.log(`[EMAIL STUB] HTML body:\n${params.htmlBody}`)
    }
    console.log(`[EMAIL STUB] Timestamp: ${new Date().toISOString()}`)

    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}

/**
 * AWS SES email provider - REMOVED
 * AWS SDK has been removed. Use Postmark or Stub provider instead.
 */

/**
 * Postmark email provider
 * Requires: POSTMARK_API_TOKEN, EMAIL_FROM_ADDRESS
 */
export class PostmarkEmailProvider implements EmailProvider {
  private postmarkClient: any
  private fromAddress: string

  constructor() {
    this.fromAddress = process.env.EMAIL_FROM_ADDRESS || process.env.POSTMARK_FROM_ADDRESS || 'noreply@safepsy.com'
  }

  private async initializePostmark(): Promise<void> {
    if (this.postmarkClient) {
      return // Already initialized
    }

    try {
      const postmark = await import('postmark')
      const apiToken = process.env.POSTMARK_API_TOKEN
      
      if (!apiToken) {
        throw new Error('POSTMARK_API_TOKEN is required')
      }

      this.postmarkClient = new postmark.ServerClient(apiToken)
    } catch (error) {
      console.error('[POSTMARK PROVIDER] Failed to initialize Postmark client:', error)
      throw error
    }
  }

  async sendConfirmationEmail(email: string): Promise<void> {
    await this.initializePostmark()
    
    const emailSubject = 'Welcome to SafePsy - You\'re on the waitlist!'
    const emailBodyHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to SafePsy!</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-top: 0;">Thank you for joining our waitlist!</p>
            <p style="font-size: 16px;">You've successfully signed up to get early access and exclusive updates about SafePsy.</p>
            <p style="font-size: 16px;">We're building a privacy-first therapy platform that combines ethical AI with blockchain security to transform online therapy.</p>
            <p style="font-size: 16px;">We'll keep you updated on our progress and let you know as soon as early access becomes available.</p>
            <p style="font-size: 16px; margin-bottom: 0;">Best regards,<br>The SafePsy Team</p>
          </div>
        </body>
      </html>
    `
    const emailBodyText = `Welcome to SafePsy!\n\nThank you for joining our waitlist! You've successfully signed up to get early access and exclusive updates about SafePsy.\n\nWe're building a privacy-first therapy platform that combines ethical AI with blockchain security to transform online therapy.\n\nWe'll keep you updated on our progress and let you know as soon as early access becomes available.\n\nBest regards,\nThe SafePsy Team`

    await this.postmarkClient.sendEmail({
      From: this.fromAddress,
      To: email,
      Subject: emailSubject,
      HtmlBody: emailBodyHtml,
      TextBody: emailBodyText,
      MessageStream: 'outbound',
    })
  }

  async sendAdminNotificationEmail(params: {
    to: string
    subject: string
    textBody: string
    htmlBody?: string
  }): Promise<void> {
    await this.initializePostmark()

    await this.postmarkClient.sendEmail({
      From: this.fromAddress,
      To: params.to,
      Subject: params.subject,
      HtmlBody: params.htmlBody,
      TextBody: params.textBody,
      MessageStream: 'outbound',
    })
  }
}

/**
 * Email service that manages email operations with feature flagging
 */
export class EmailService {
  private config: EmailServiceConfig

  constructor(config: EmailServiceConfig) {
    this.config = config
  }

  /**
   * Send a confirmation email if the feature is enabled
   */
  async sendConfirmationEmail(email: string): Promise<void> {
    if (!this.config.enabled) {
      console.log(`[EMAIL SERVICE] Confirmation email feature is disabled, skipping email to: ${email}`)
      return
    }

    try {
      await this.config.provider.sendConfirmationEmail(email)
      console.log(`[EMAIL SERVICE] Confirmation email sent successfully to: ${email}`)
    } catch (error) {
      console.error(`[EMAIL SERVICE] Failed to send confirmation email to ${email}:`, error)
      // Don't throw - email failures shouldn't break the subscription flow
    }
  }

  async sendAdminNotificationEmail(params: {
    subject: string
    textBody: string
    htmlBody?: string
  }): Promise<void> {
    if (!this.config.adminNotificationsEnabled) {
      console.log('[EMAIL SERVICE] Admin notifications are disabled, skipping admin notification')
      return
    }

    const to = (this.config.adminNotificationEmail || '').trim()
    if (!to) {
      console.warn('[EMAIL SERVICE] ADMIN_NOTIFICATION_EMAIL is empty; skipping admin notification')
      return
    }

    try {
      await this.config.provider.sendAdminNotificationEmail({
        to,
        subject: params.subject,
        textBody: params.textBody,
        htmlBody: params.htmlBody,
      })
      console.log(`[EMAIL SERVICE] Admin notification sent successfully to: ${to}`)
    } catch (error) {
      console.error(`[EMAIL SERVICE] Failed to send admin notification to ${to}:`, error)
      // Don't throw - admin notification failures shouldn't break the user flow
    }
  }

  /**
   * Check if the email service is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled
  }

  isAdminNotificationsEnabled(): boolean {
    return this.config.adminNotificationsEnabled && !!this.config.adminNotificationEmail
  }
}

/**
 * Factory function to create email service with environment configuration
 * Supports: 'ses', 'postmark', or 'stub' (default)
 */
export function createEmailService(): EmailService {
  const enabled = process.env.ENABLE_CONFIRMATION_EMAIL === 'true'
  const providerType = (process.env.EMAIL_PROVIDER || 'stub').toLowerCase()
  const adminNotificationsEnabled = process.env.ENABLE_ADMIN_NOTIFICATION_EMAIL === 'true'
  const adminNotificationEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'safepsyoff@gmail.com'

  let provider: EmailProvider

  try {
    switch (providerType) {
      case 'ses':
        // AWS SES removed - fallback to stub
        console.warn('[EMAIL SERVICE] AWS SES provider removed, using stub instead')
        provider = new StubEmailProvider()
        break
      case 'postmark':
        provider = new PostmarkEmailProvider()
        break
      case 'stub':
      default:
        provider = new StubEmailProvider()
        break
    }
  } catch (error) {
    console.error(`[EMAIL SERVICE] Failed to initialize ${providerType} provider, falling back to stub:`, error)
    provider = new StubEmailProvider()
  }

  return new EmailService({
    provider,
    enabled,
    adminNotificationsEnabled,
    adminNotificationEmail,
  })
}
