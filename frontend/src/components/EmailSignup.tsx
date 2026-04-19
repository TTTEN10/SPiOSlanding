import React, { useState, useEffect } from 'react'
import { Mail, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface SignupResponse {
  success: boolean
  message: string
}

const EmailSignup: React.FC = () => {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [emailError, setEmailError] = useState('')
  const [hasSubmitted, setHasSubmitted] = useState(false)

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Inline validation with debouncing
  useEffect(() => {
    if (!hasSubmitted) return

    const timeoutId = setTimeout(() => {
      if (!email.trim()) {
        setEmailError('Please enter your email address')
      } else if (!validateEmail(email)) {
        setEmailError('Please enter a valid email address')
      } else {
        setEmailError('')
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [email, hasSubmitted])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setHasSubmitted(true)
    
    // Clear previous errors
    setStatus('idle')
    setMessage('')
    setEmailError('')

    // Validate email
    if (!email.trim()) {
      setEmailError('Please enter your email address')
      setStatus('error')
      setMessage('Please enter your email address')
      return
    }

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address')
      setStatus('error')
      setMessage('Please enter a valid email address')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })

      const data: SignupResponse = await response.json()

      if (response.ok && data.success) {
        setStatus('success')
        setMessage(data.message)
        setEmail('')
        setEmailError('')
      } else if (response.status === 429) {
        // Handle rate limiting specifically
        setStatus('error')
        setMessage('Too many attempts. Please wait a minute before trying again.')
        setEmailError('Too many attempts. Please wait a minute before trying again.')
      } else {
        setStatus('error')
        setMessage(data.message || 'Something went wrong. Please try again.')
        setEmailError(data.message || 'Something went wrong. Please try again.')
      }
    } catch (error) {
      setStatus('error')
      setMessage('Network error. Please check your connection and try again.')
      setEmailError('Network error. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Success state component
  if (status === 'success') {
    return (
      <section className="section-padding py-16 lg:py-20 bg-white/40 backdrop-blur-sm">
        <div className="container-max">
          <div className="max-w-4xl mx-auto text-center">
            <div className="space-y-8">
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                </div>
                <div className="space-y-4">
                  <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
                    You're all set!
                  </h2>
                  <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                    Thank you for joining our waitlist. We'll be in touch soon with 
                    updates about SafePsy's launch and early access opportunities.
                  </p>
                </div>
              </div>

              {/* Success Message */}
              <div
                role="status"
                aria-live="polite"
                className="max-w-md mx-auto p-4 rounded-lg bg-green-50 text-green-800 border border-green-200 flex items-center gap-3"
              >
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{message}</span>
              </div>

              <p className="text-sm text-gray-500 max-w-md mx-auto">
                We respect your privacy. Your email will only be used to notify you 
                about SafePsy updates and early access opportunities.
              </p>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="section-padding py-16 lg:py-20 bg-white/40 backdrop-blur-sm">
      <div className="container-max">
        <div className="max-w-4xl mx-auto text-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
                Be the first to know
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Join our waitlist to get early access to SafePsy and be part of the 
                privacy-first therapy revolution.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="max-w-md mx-auto" noValidate>
              <div className="space-y-4">
                <div className="relative">
                  <label htmlFor="email" className="sr-only">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className={`input-field pl-12 pr-4 ${
                        emailError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                      }`}
                      disabled={isLoading}
                      aria-describedby={emailError ? 'email-error' : undefined}
                      aria-invalid={!!emailError}
                      required
                    />
                  </div>
                  {/* Inline validation error */}
                  {emailError && (
                    <div
                      id="email-error"
                      role="alert"
                      aria-live="polite"
                      className="mt-2 text-sm text-red-600 flex items-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{emailError}</span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !!emailError}
                  className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-describedby={isLoading ? 'loading-status' : undefined}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span id="loading-status" className="sr-only">Submitting your email...</span>
                      Joining...
                    </>
                  ) : (
                    'Join Waitlist'
                  )}
                </button>
              </div>

              {/* Status Message */}
              {status !== 'idle' && (
                <div
                  role="status"
                  aria-live="polite"
                  className={`mt-4 p-4 rounded-lg flex items-center gap-3 ${
                    status === 'success'
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {status === 'success' ? (
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  )}
                  <span className="text-sm font-medium">{message}</span>
                </div>
              )}
            </form>

            <p className="text-sm text-gray-500 max-w-md mx-auto">
              We respect your privacy. Your email will only be used to notify you 
              about SafePsy updates and early access opportunities.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default EmailSignup
