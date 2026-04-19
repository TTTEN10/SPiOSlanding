/**
 * Google Sheets integration for logging email subscriptions
 * 
 * This service logs email addresses to a Google Sheet for easy tracking and management.
 * 
 * Setup instructions:
 * 1. Create a Google Sheet and share it with the service account email
 * 2. Get the Sheet ID from the URL: https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit
 * 3. Create a service account in Google Cloud Console
 * 4. Download the service account JSON key file
 * 5. Set GOOGLE_SHEETS_CREDENTIALS to the JSON content or path to the file
 * 6. Set GOOGLE_SHEETS_ID to the Sheet ID
 * 7. Set GOOGLE_SHEETS_TAB_NAME to the tab name (default: "Subscriptions")
 */

import logger from './logger'

export interface EmailSubscriptionData {
  email: string
  fullName?: string | null
  role?: string | null
  consentGiven: boolean
  timestamp: Date
}

export class GoogleSheetsService {
  private sheets: any
  private spreadsheetId: string | null
  private tabName: string
  private enabled: boolean

  constructor() {
    this.enabled = process.env.GOOGLE_SHEETS_ENABLED === 'true'
    this.spreadsheetId = process.env.GOOGLE_SHEETS_ID || null
    this.tabName = process.env.GOOGLE_SHEETS_TAB_NAME || 'Subscriptions'

    if (!this.enabled) {
      logger.info('[GOOGLE SHEETS] Service is disabled')
      return
    }

    if (!this.spreadsheetId) {
      logger.warn('[GOOGLE SHEETS] GOOGLE_SHEETS_ID not set, service will be disabled')
      this.enabled = false
      return
    }

    // Lazy initialization - will be done on first use
  }

  private async initializeSheets(): Promise<void> {
    if (this.sheets) {
      return // Already initialized
    }

    try {
      const { google } = await import('googleapis')
      const auth = await this.getAuth()
      this.sheets = google.sheets({ version: 'v4', auth })
      logger.info('[GOOGLE SHEETS] Service initialized successfully')
    } catch (error) {
      logger.error('[GOOGLE SHEETS] Failed to initialize:', error)
      this.enabled = false
      throw error
    }
  }

  private async getAuth(): Promise<any> {
    const { google } = await import('googleapis')
    const credentials = await this.getCredentials()

    if (!credentials) {
      throw new Error('Google Sheets credentials not found. Set GOOGLE_SHEETS_CREDENTIALS environment variable.')
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })

    return auth
  }

  private async getCredentials(): Promise<any> {
    const credentialsEnv = process.env.GOOGLE_SHEETS_CREDENTIALS

    if (!credentialsEnv) {
      return null
    }

    try {
      // Try to parse as JSON first (if it's a JSON string)
      return JSON.parse(credentialsEnv)
    } catch {
      // If not JSON, try to read as file path
      try {
        const fs = await import('fs')
        const path = await import('path')
        const credentialsPath = path.resolve(credentialsEnv)
        return JSON.parse(fs.readFileSync(credentialsPath, 'utf8'))
      } catch (error) {
        logger.error('[GOOGLE SHEETS] Failed to load credentials:', error)
        return null
      }
    }
  }

  /**
   * Log an email subscription to Google Sheets
   */
  async logSubscription(data: EmailSubscriptionData): Promise<void> {
    if (!this.enabled || !this.spreadsheetId) {
      return
    }

    try {
      // Initialize if not already done
      await this.initializeSheets()
      
      if (!this.sheets) {
        return
      }

      // Check if headers exist, if not, create them
      await this.ensureHeaders()

      // Append the row
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${this.tabName}!A:E`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [[
            data.timestamp.toISOString(),
            data.email,
            data.fullName || '',
            data.role || '',
            data.consentGiven ? 'Yes' : 'No',
          ]],
        },
      })

      logger.info(`[GOOGLE SHEETS] Logged subscription for ${data.email}`)
    } catch (error: any) {
      // Don't throw - Google Sheets logging failures shouldn't break the subscription flow
      logger.error(`[GOOGLE SHEETS] Failed to log subscription for ${data.email}:`, error.message || error)
    }
  }

  /**
   * Ensure the sheet has headers
   */
  private async ensureHeaders(): Promise<void> {
    if (!this.sheets || !this.spreadsheetId) {
      await this.initializeSheets()
      if (!this.sheets || !this.spreadsheetId) {
        return
      }
    }

    try {
      // Check if first row exists and has headers
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.tabName}!A1:E1`,
      })

      const rows = response.data.values

      // If no rows or headers don't match, create headers
      if (!rows || rows.length === 0 || rows[0][0] !== 'Timestamp') {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${this.tabName}!A1:E1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[
              'Timestamp',
              'Email',
              'Full Name',
              'Role',
              'Consent Given',
            ]],
          },
        })
        logger.info('[GOOGLE SHEETS] Created headers in sheet')
      }
    } catch (error: any) {
      // If the sheet doesn't exist or tab doesn't exist, try to create headers anyway
      // This will fail gracefully if permissions are wrong
      logger.warn(`[GOOGLE SHEETS] Could not check/create headers: ${error.message || error}`)
    }
  }

  /**
   * Check if the service is enabled
   */
  isEnabled(): boolean {
    return this.enabled
  }
}

/**
 * Factory function to create Google Sheets service
 */
export function createGoogleSheetsService(): GoogleSheetsService {
  return new GoogleSheetsService()
}

