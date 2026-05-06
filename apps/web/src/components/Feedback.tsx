import React, { useState } from 'react'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import Header from './Header'
import { useOffline } from '../hooks/useOffline'
import { useToast } from '../hooks/useToast'
import { fetchWithErrorHandling, getActionableErrorMessage } from '../utils/errorMessages'
import { offlineQueue } from '../utils/queueManager'
import { apiUrl } from '../config/api'

interface FeedbackResponse {
  success: boolean
  message: string
}

const Feedback: React.FC = () => {
  const { isOffline } = useOffline()
  const { showToast, ToastContainer } = useToast()

  const [email, setEmail] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const validateForm = () => {
    if (!feedback.trim()) {
      setStatus('error')
      setMessage('Please enter your feedback')
      return false
    }

    if (feedback.trim().length < 10) {
      setStatus('error')
      setMessage('Feedback must be at least 10 characters')
      return false
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus('error')
      setMessage('Please enter a valid email address')
      return false
    }

    return true
  }

  const submitFeedback = async () => {
    setSubmitted(false)
    const payload = {
      email: email.trim() || undefined,
      feedback: feedback.trim(),
    }

    const url = apiUrl('/feedback')

    if (isOffline) {
      offlineQueue.add(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      showToast('info', "You're offline. Your feedback has been queued and will be sent when you're back online.")
      setFeedback('')
      setEmail('')
      setSubmitted(true)
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

      const data: FeedbackResponse = await response.json()
      setStatus('success')
      setMessage(data.message)
      setSubmitted(true)
      showToast('success', data.message, 7000)
      setFeedback('')
      setEmail('')

      setTimeout(() => {
        setStatus('idle')
        setMessage('')
      }, 10000)
    } catch (error) {
      const errorMsg = getActionableErrorMessage(error)
      setStatus('error')
      setMessage(errorMsg)
      showToast('error', errorMsg)
      setSubmitted(false)
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    submitFeedback()
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header showBackButton={true} />
      <main id="main-content" className="flex-1 section-padding py-8 lg:py-12" role="main" aria-label="Beta feedback" tabIndex={-1}>
        <div className="container-max max-w-3xl">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl text-heading mb-4">
            <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent font-bold">
              Beta feedback
            </span>
          </h1>
          <p className="text-body mb-8">
            Help us improve Dr. Safe and the homepage experience. Share what felt clear, confusing, or emotionally helpful.
          </p>

          <form onSubmit={onSubmit} className="bg-white/70 dark:bg-black/30 border border-neutral-dark/20 dark:border-white/20 rounded-2xl p-6 sm:p-8 space-y-4">
            <div>
              <label htmlFor="feedback-email" className="block text-heading mb-2">Email (optional)</label>
              <input
                id="feedback-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading || isOffline}
                className="input-field"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="feedback-content" className="block text-heading mb-2">Your feedback *</label>
              <textarea
                id="feedback-content"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                disabled={isLoading || isOffline}
                className="input-field min-h-36"
                placeholder="What should we improve first?"
                required
                minLength={10}
              />
            </div>

            {isOffline && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                <span className="text-sm text-yellow-800 dark:text-yellow-300">
                  You&apos;re offline. Your feedback will be queued and sent when you&apos;re back online.
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

            <button
              type="submit"
              disabled={isLoading || isOffline || !feedback.trim()}
              className="btn-primary w-full sm:w-auto px-8 flex items-center justify-center gap-2 min-h-[44px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : isOffline ? (
                'Queued for later'
              ) : (
                'Send feedback'
              )}
            </button>

            {submitted && status === 'success' && (
              <p className="text-body">Thank you. Your feedback has been noted for the beta roadmap.</p>
            )}
          </form>
        </div>
      </main>
      <ToastContainer />
    </div>
  )
}

export default Feedback
