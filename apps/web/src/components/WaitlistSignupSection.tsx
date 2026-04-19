import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { useOffline } from '../hooks/useOffline'
import { useToast } from '../hooks/useToast'
import { getActionableErrorMessage, fetchWithErrorHandling } from '../utils/errorMessages'

interface SignupResponse {
  success: boolean
  message: string
}

function isValidEmail(email: string): boolean {
  const trimmed = email.trim()
  if (!trimmed) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
}

export type WaitlistSignupSectionProps = {
  /** Prefix for stable input / aria ids (e.g. `landing`, `almost`). */
  idPrefix: string
  /** Subtitle under “Join the waitlist” (e.g. hide on `/almost-there` when the page intro covers it). */
  showBetaTagline?: boolean
}

export default function WaitlistSignupSection({ idPrefix, showBetaTagline = true }: WaitlistSignupSectionProps) {
  const { isOffline } = useOffline()
  const { showToast, ToastContainer } = useToast()
  const [formData, setFormData] = useState({ email: '', consentGiven: false })
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [fieldError, setFieldError] = useState<'empty' | 'invalid' | 'consent' | null>(null)

  const emailId = `${idPrefix}-email`
  const consentId = `${idPrefix}-consent`
  const emailHelpId = `${idPrefix}-email-help`
  const emailErrorId = `${idPrefix}-email-error`

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
    if (name === 'email' || name === 'consentGiven') {
      setFieldError(null)
      if (status !== 'idle') {
        setStatus('idle')
        setMessage('')
      }
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFieldError(null)

    if (!formData.email.trim()) {
      setStatus('idle')
      setFieldError('empty')
      setMessage('')
      return
    }
    if (!isValidEmail(formData.email)) {
      setStatus('idle')
      setFieldError('invalid')
      setMessage('')
      return
    }
    if (!formData.consentGiven) {
      setStatus('idle')
      setFieldError('consent')
      setMessage('Please confirm your consent to join the waitlist.')
      return
    }
    if (isOffline) {
      showToast('info', "You're offline. Try again when connected.")
      return
    }

    setIsLoading(true)
    setStatus('idle')
    try {
      const response = await fetchWithErrorHandling(
        `${import.meta.env.VITE_API_URL || '/api'}/subscribe`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email.trim().toLowerCase(),
            consentGiven: formData.consentGiven,
          }),
        }
      )
      const data: SignupResponse = await response.json()
      if (response.ok && data.success) {
        setStatus('success')
        setMessage(data.message)
        showToast('success', data.message)
        setFormData({ email: '', consentGiven: false })
      } else {
        setStatus('error')
        setMessage(getActionableErrorMessage(null, { status: response.status, originalMessage: data.message }))
      }
    } catch (err) {
      setStatus('error')
      setMessage(getActionableErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  const emailInvalid = fieldError === 'empty' || fieldError === 'invalid'

  return (
    <>
      <section className="scroll-reveal" data-reveal>
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 max-w-2xl mx-auto hover-soft-fade">
          <h2
            className={`text-xl sm:text-2xl lg:text-3xl text-heading text-center px-2 ${
              showBetaTagline ? 'mb-2' : 'mb-6 sm:mb-8'
            }`}
          >
            <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              Join the waitlist
            </span>
          </h2>
          {showBetaTagline ? (
            <p className="text-body text-center mb-6 sm:mb-8">Stay updated about our beta launch</p>
          ) : null}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6" aria-label="Join waitlist form" noValidate>
            <div className="space-y-2">
              <label htmlFor={emailId} className="block text-base sm:text-lg font-medium text-heading">
                Email Address *
              </label>
              <input
                type="email"
                id={emailId}
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                disabled={isLoading || isOffline}
                autoComplete="email"
                aria-required="true"
                aria-invalid={emailInvalid}
                aria-describedby={`${emailHelpId} ${emailInvalid ? emailErrorId : ''}`.trim()}
                className={`w-full px-4 py-3 text-base sm:text-lg border-2 rounded-xl focus:ring-2 focus:ring-primary-200 focus:outline-none transition-all duration-300 bg-white/80 backdrop-blur-sm disabled:opacity-50 min-h-[44px] hover:border-primary-400/50 ${
                  emailInvalid
                    ? 'border-red-500 dark:border-red-600 focus:ring-red-500 focus:border-red-500'
                    : 'border-neutral-300 focus:border-primary-500'
                }`}
                placeholder="Enter your email address"
              />
              <p id={emailHelpId} className="text-sm text-body">
                Enter a valid email address to join our waitlist
              </p>
              {fieldError === 'empty' && (
                <div className="form-error" id={emailErrorId} role="alert">
                  <AlertCircle className="form-error-icon" />
                  <span>Enter your email address</span>
                </div>
              )}
              {fieldError === 'invalid' && (
                <div className="form-error" id={emailErrorId} role="alert">
                  <AlertCircle className="form-error-icon" />
                  <span>Enter a valid email address to join our waitlist</span>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id={consentId}
                  name="consentGiven"
                  checked={formData.consentGiven}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                  aria-required="true"
                  aria-invalid={fieldError === 'consent'}
                  className="mt-1 w-5 h-5 text-primary-600 border-2 border-neutral-300 rounded focus:ring-primary-500 focus:ring-2 disabled:opacity-50 min-w-[20px] min-h-[20px]"
                />
                <label htmlFor={consentId} className="text-xs sm:text-sm text-body leading-relaxed">
                  I consent to SafePsy collecting and processing my personal data for the purpose of joining the waitlist
                  and receiving product updates. I have read and agree to the{' '}
                  <Link
                    to="/tos"
                    className="text-primary-600 hover:text-primary-700 underline font-medium break-words"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link
                    to="/sap-policy"
                    className="text-primary-600 hover:text-primary-700 underline font-medium break-words"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Security and Privacy Policy
                  </Link>
                  . *
                </label>
              </div>
              {fieldError === 'consent' && (
                <div className="form-error" role="alert">
                  <AlertCircle className="form-error-icon" />
                  <span>{message}</span>
                </div>
              )}
            </div>
            {isOffline && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                <span className="text-sm text-yellow-800 dark:text-yellow-300">
                  You&apos;re offline. Your request will be queued and sent when you&apos;re back online.
                </span>
              </div>
            )}
            {(status === 'success' || (status === 'error' && message)) && (
              <div
                role="status"
                aria-live="polite"
                className={`p-4 rounded-lg flex items-center gap-3 fade-in ${
                  status === 'success'
                    ? 'bg-primary-50 text-primary-800 border border-primary-200 dark:bg-primary-900/20 dark:text-primary-300 dark:border-primary-500/50'
                    : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-500/50'
                }`}
              >
                {status === 'success' ? (
                  <CheckCircle className="w-5 h-5 flex-shrink-0 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                )}
                <span className="text-sm font-medium">{message}</span>
              </div>
            )}
            <div className="text-center">
              <button
                type="submit"
                disabled={isLoading || isOffline}
                aria-label={isLoading ? 'Submitting your request' : 'Join waitlist'}
                aria-busy={isLoading}
                className="flex items-center justify-center gap-2 mx-auto min-h-[44px] w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white rounded-xl font-medium text-sm sm:text-base transition-all duration-300 shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-primary-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none btn-gentle-scale"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                    <span>Joining...</span>
                  </>
                ) : isOffline ? (
                  'Queue for later'
                ) : (
                  'Join waitlist'
                )}
              </button>
            </div>
          </form>
        </div>
      </section>
      <ToastContainer />
    </>
  )
}
