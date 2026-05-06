/**
 * Google Sheets integration for waitlist email storage
 *
 * Setup:
 * 1. Create a tab (default name "Subscriptions") or set GOOGLE_SHEETS_TAB_NAME to an existing tab.
 * 2. Share the spreadsheet with the service account email from the JSON key (Editor).
 * 3. Set either:
 *    - GOOGLE_SHEETS_CREDENTIALS_FILE — absolute path to the service account JSON (best for Docker: mount a secret file), or
 *    - GOOGLE_SHEETS_CREDENTIALS — full JSON string, or path to a JSON file (private_key may use \n for newlines in .env)
 * 4. Optionally set GOOGLE_SHEETS_ID (defaults in code if unset).
 */

import fs from 'fs'
import path from 'path'

import logger from './logger'

/** Default spreadsheet when GOOGLE_SHEETS_ID is not set. */
export const DEFAULT_WAITLIST_SPREADSHEET_ID =
  '1SgLzzBLluvvgF-k55jVC8Om8JxK6Ookyp-r6KXAL-D0'

export interface EmailSubscriptionData {
  email: string
  consentGiven: boolean
  timestamp: Date
}

export type WaitlistUpsertResult = 'created' | 'exists'

export class GoogleSheetsService {
  private sheets: any
  private spreadsheetId: string
  private tabName: string
  private enabled: boolean

  constructor() {
    const id = (process.env.GOOGLE_SHEETS_ID || '').trim()
    this.spreadsheetId = id || DEFAULT_WAITLIST_SPREADSHEET_ID
    this.tabName = process.env.GOOGLE_SHEETS_TAB_NAME || 'Subscriptions'

    const fileEnv = (process.env.GOOGLE_SHEETS_CREDENTIALS_FILE || '').trim()
    const inlineOrPath = (process.env.GOOGLE_SHEETS_CREDENTIALS || '').trim()

    let hasCreds = false
    if (fileEnv) {
      const abs = path.resolve(fileEnv)
      if (fs.existsSync(abs)) {
        hasCreds = true
      } else {
        logger.warn(
          `[GOOGLE SHEETS] GOOGLE_SHEETS_CREDENTIALS_FILE points to a missing file: ${abs}. ` +
            'Waitlist will fall back to the database only.'
        )
      }
    } else if (inlineOrPath) {
      hasCreds = true
    }

    this.enabled = hasCreds && !!this.spreadsheetId

    if ((process.env.GOOGLE_SHEETS_API_KEY || '').trim()) {
      logger.warn(
        '[GOOGLE SHEETS] GOOGLE_SHEETS_API_KEY is set, but API keys are not supported for write access. ' +
          'Use GOOGLE_SHEETS_CREDENTIALS (service account JSON or path) and share the sheet with the service account email.'
      )
    }

    if (!hasCreds) {
      logger.warn(
        '[GOOGLE SHEETS] No credentials: set GOOGLE_SHEETS_CREDENTIALS_FILE (recommended in Docker) or ' +
          'GOOGLE_SHEETS_CREDENTIALS. Without them, /api/subscribe stores signups in Postgres only.'
      )
    }
  }

  private async initializeSheets(): Promise<void> {
    if (this.sheets) return

    try {
      const { google } = await import('googleapis')
      const auth = await this.getAuth()
      this.sheets = google.sheets({ version: 'v4', auth })
      logger.info('[GOOGLE SHEETS] Service initialized successfully')
    } catch (error) {
      logger.error('[GOOGLE SHEETS] Failed to initialize:', error)
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
    const validate = (creds: any) => {
      if (creds?.private_key && typeof creds.private_key === 'string') {
        // .env one-line JSON often stores newlines as the two-char sequence \n
        creds.private_key = creds.private_key.replace(/\\n/g, '\n')
      }

      const type = String(creds?.type || '')
      const projectId = String(creds?.project_id || '')
      const clientEmail = String(creds?.client_email || '')
      const privateKey = String(creds?.private_key || '')

      if (type !== 'service_account') {
        throw new Error(
          'Invalid GOOGLE_SHEETS_CREDENTIALS: expected a Google service account JSON (type=service_account).'
        )
      }

      if (!clientEmail.includes('@') || !clientEmail.endsWith('.gserviceaccount.com')) {
        throw new Error(
          'Invalid GOOGLE_SHEETS_CREDENTIALS: client_email must be a service account email ending with .gserviceaccount.com.'
        )
      }

      // Common misconfigurations observed:
      // - People paste the Spreadsheet ID into project_id
      if (projectId === DEFAULT_WAITLIST_SPREADSHEET_ID) {
        throw new Error(
          'Invalid GOOGLE_SHEETS_CREDENTIALS: project_id is a GCP project id, not the Google Sheet ID.'
        )
      }

      // - People paste an API key (AIza...) instead of a PEM private key
      if (privateKey.startsWith('AIza')) {
        throw new Error(
          'Invalid GOOGLE_SHEETS_CREDENTIALS: private_key looks like a Google API key (AIza...). ' +
            'You must provide the service account PRIVATE KEY block (-----BEGIN PRIVATE KEY----- ...).'
        )
      }

      if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        throw new Error(
          'Invalid GOOGLE_SHEETS_CREDENTIALS: private_key must contain a PEM block starting with "-----BEGIN PRIVATE KEY-----".'
        )
      }
    }

    const fileFromEnv = (process.env.GOOGLE_SHEETS_CREDENTIALS_FILE || '').trim()
    if (fileFromEnv) {
      try {
        const credentialsPath = path.resolve(fileFromEnv)
        const raw = fs.readFileSync(credentialsPath, 'utf8')
        const creds = JSON.parse(raw)
        validate(creds)
        return creds
      } catch (error) {
        logger.error('[GOOGLE SHEETS] Failed to load GOOGLE_SHEETS_CREDENTIALS_FILE:', error)
        return null
      }
    }

    const credentialsEnv = (process.env.GOOGLE_SHEETS_CREDENTIALS || '').trim()
    if (!credentialsEnv) {
      return null
    }

    try {
      const creds = JSON.parse(credentialsEnv)
      validate(creds)
      return creds
    } catch {
      try {
        const credentialsPath = path.resolve(credentialsEnv)
        const raw = fs.readFileSync(credentialsPath, 'utf8')
        const creds = JSON.parse(raw)
        validate(creds)
        return creds
      } catch (error) {
        logger.error('[GOOGLE SHEETS] Failed to load credentials (not valid JSON and not a readable file path):', error)
        return null
      }
    }
  }

  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * Idempotent waitlist write: returns `exists` if email already appears in column B (data rows).
   * Throws on API / configuration errors (caller should map to 5xx).
   */
  async upsertWaitlistSignup(data: EmailSubscriptionData): Promise<WaitlistUpsertResult> {
    if (!this.enabled) {
      throw new Error('Google Sheets waitlist storage is not configured')
    }

    await this.initializeSheets()
    if (!this.sheets) {
      throw new Error('Google Sheets client failed to initialize')
    }

    await this.ensureHeaders()

    const normalized = data.email.trim().toLowerCase()
    const exists = await this.emailExistsInSheet(normalized)
    if (exists) {
      return 'exists'
    }

    await this.appendRow(data)
    logger.info(`[GOOGLE SHEETS] Saved waitlist signup for ${normalized}`)
    return 'created'
  }

  private async emailExistsInSheet(normalizedEmail: string): Promise<boolean> {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${this.tabName}!B2:B50000`,
    })

    const rows = response.data.values
    if (!rows?.length) return false

    for (const row of rows) {
      const cell = row[0]
      if (cell == null || cell === '') continue
      if (String(cell).trim().toLowerCase() === normalizedEmail) return true
    }
    return false
  }

  private async appendRow(data: EmailSubscriptionData): Promise<void> {
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${this.tabName}!A:C`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [
          [
            data.timestamp.toISOString(),
            data.email,
            data.consentGiven ? 'Yes' : 'No',
          ],
        ],
      },
    })
  }

  private async ensureHeaders(): Promise<void> {
    if (!this.sheets) {
      await this.initializeSheets()
      if (!this.sheets) return
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.tabName}!A1:E1`,
      })

      const rows = response.data.values

      const expectedAtoE = ['Timestamp', 'Email', 'Consent Given', '', '']
      const actualRow = rows?.[0] || []

      const actualAtoE = [
        actualRow[0] ?? '',
        actualRow[1] ?? '',
        actualRow[2] ?? '',
        actualRow[3] ?? '',
        actualRow[4] ?? '',
      ]

      const matches = expectedAtoE.every((v, i) => String(actualAtoE[i] || '') === v)

      if (!matches) {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${this.tabName}!A1:E1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [
              expectedAtoE,
            ],
          },
        })
        logger.info('[GOOGLE SHEETS] Created headers in sheet')
      }
    } catch (error: any) {
      logger.warn(`[GOOGLE SHEETS] Could not check/create headers: ${error.message || error}`)
      throw error
    }
  }
}

export function createGoogleSheetsService(): GoogleSheetsService {
  return new GoogleSheetsService()
}
