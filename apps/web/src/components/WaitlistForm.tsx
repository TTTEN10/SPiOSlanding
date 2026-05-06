import React, { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { useOffline } from '../hooks/useOffline'
import { useToast } from '../hooks/useToast'
import { fetchWithErrorHandling, getActionableErrorMessage } from '../utils/errorMessages'
import { offlineQueue } from '../utils/queueManager'
import { apiUrl } from '../config/api'

interface SignupResponse {
  success: boolean
  message: string
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function WaitlistForm({
  title = 'Join the waitlist',
  subtitle = 'Secure your spot and receive insider updates.',
}: {
  title?: string
  subtitle?: string
}) {
  const { isOffline } = useOffline()
  const { showToast, ToastContainer } = useToast()

  const [formData, setFormData] = useState({ email: '', consentGiven: false })
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [successTimeout, setSuccessTimeout] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (successTimeout) clearTimeout(successTimeout)
    }
  }, [successTimeout])

  useEffect(() => {
    if (!isOffline && offlineQueue.getQueueSize() > 0) {
      offlineQueue.processQueue().then(({ succeeded }) => {
        if (succeeded > 0) {
          showToast('success', `${succeeded} queued action(s) completed successfully!`)
        }
      })
    }
  }, [isOffline, showToast])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const validate = (): boolean => {
    const email = formData.email.trim()

    if (!email) {
      setStatus('error')
      setMessage('Please enter your email address')
      return false
    }

    if (!isValidEmail(email)) {
      setStatus('error')
      setMessage('Please enter a valid email address')
      return false
    }

    if (!formData.consentGiven) {
      setStatus('error')
      setMessage('You must give consent to join our waitlist')
      return false
    }

    return true
  }

  const submit = async () => {
    const payload = {
      email: formData.email.trim().toLowerCase(),
      consentGiven: true,
    }

    const url = apiUrl('/subscribe')

    if (isOffline) {
      offlineQueue.add(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      showToast('info', "You're offline. Your request has been queued and will be sent when you're back online.")
      setFormData({ email: '', consentGiven: false })
      return
    }

    setIsLoading(true)
    setStatus('idle')

    try {
      const response = await fetchWithErrorHandling(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data: SignupResponse = await response.json()
      setStatus('success')
      setMessage(data.message)
      showToast('success', data.message, 7000)
      setFormData({ email: '', consentGiven: false })

      const timeout = setTimeout(() => {
        setStatus('idle')
        setMessage('')
      }, 10000)
      setSuccessTimeout(timeout)
    } catch (error) {
      const errorMsg = getActionableErrorMessage(error)
      setStatus('error')
      setMessage(errorMsg)
      showToast('error', errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    await submit()
  }

  return (
    <>
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 max-w-2xl mx-auto hover-soft-fade">
        <h2 className="text-xl sm:text-2xl lg:text-3xl text-heading mb-2 text-center px-2">
          <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">{title}</span>
        </h2>
        <p className="text-body text-center mb-6 sm:mb-8">{subtitle}</p>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6" aria-label="Join waitlist form" noValidate>
          <div className="space-y-2">
            <label htmlFor="email" className="block text-base sm:text-lg font-medium text-heading">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              disabled={isLoading || isOffline}
              autoComplete="email"
              aria-required="true"
              aria-invalid={status === 'error' && (!formData.email.trim() || !isValidEmail(formData.email.trim()))}
              aria-describedby="email-error email-help"
              className={`w-full px-4 py-3 text-base sm:text-lg border-2 rounded-xl focus:ring-2 focus:ring-primary-200 focus:outline-none transition-all duration-300 bg-white/80 backdrop-blur-sm disabled:opacity-50 min-h-[44px] hover:border-primary-400/50 ${
                status === 'error' && (!formData.email.trim() || !isValidEmail(formData.email.trim()))
                  ? 'border-red-500 dark:border-red-600 focus:ring-red-500 focus:border-red-500'
                  : 'border-neutral-300 focus:border-primary-500'
              }`}
              placeholder="Enter your email address"
            />
            <span id="email-help" className="sr-only">
              Enter a valid email address to join our waitlist
            </span>
            {status === 'error' && !formData.email.trim() && (
              <div className="form-error" id="email-error" role="alert">
                <AlertCircle className="form-error-icon" />
                <span>Please enter your email address</span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="consentGiven"
                name="consentGiven"
                checked={formData.consentGiven}
                onChange={handleInputChange}
                required
                disabled={isLoading}
                aria-required="true"
                aria-invalid={status === 'error' && !formData.consentGiven}
                className="mt-1 w-5 h-5 text-primary-600 border-2 border-neutral-300 rounded focus:ring-primary-500 focus:ring-2 disabled:opacity-50 min-w-[20px] min-h-[20px]"
              />
              <label htmlFor="consentGiven" className="text-xs sm:text-sm text-body leading-relaxed">
                I consent to SafePsy collecting and processing my personal data for the purpose of joining the waitlist and receiving product updates.
                I have read and agree to the Terms of Service and Security and Privacy Policy. *
              </label>
            </div>
          </div>

          {isOffline && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <span className="text-sm text-yellow-800 dark:text-yellow-300">
                You&apos;re offline. Your request will be queued and sent when you&apos;re back online.
              </span>
            </div>
          )}

          {status !== 'idle' && (
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
              aria-label={isLoading ? 'Submitting your request' : 'Join the SafePsy waitlist'}
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
      <ToastContainer />
    </>
  )
}

