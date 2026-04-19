import React, { useState, useEffect } from 'react'
import { Shield, Heart, Users, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import { useOffline } from '../hooks/useOffline'
import { useToast } from '../hooks/useToast'
import { getActionableErrorMessage, fetchWithErrorHandling } from '../utils/errorMessages'
import { offlineQueue } from '../utils/queueManager'

interface SignupResponse {
  success: boolean
  message: string
}

const Hero: React.FC = () => {
  const navigate = useNavigate()
  const { isOffline } = useOffline()
  const { showToast, ToastContainer } = useToast()
  const [formData, setFormData] = useState({
    email: '',
    consentGiven: false
  })
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [successTimeout, setSuccessTimeout] = useState<NodeJS.Timeout | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const validateForm = (): boolean => {
    if (!formData.email.trim()) {
      setStatus('error')
      setMessage('Please enter your email address')
      return false
    }
    if (!formData.consentGiven) {
      setStatus('error')
      setMessage('You must give consent to join our waitlist')
      return false
    }
    return true
  }

  // Clear success timeout on unmount
  useEffect(() => {
    return () => {
      if (successTimeout) {
        clearTimeout(successTimeout)
      }
    }
  }, [successTimeout])

  // Process offline queue when coming back online
  useEffect(() => {
    if (!isOffline && offlineQueue.getQueueSize() > 0) {
      offlineQueue.processQueue().then(({ succeeded }) => {
        if (succeeded > 0) {
          showToast('success', `${succeeded} queued action(s) completed successfully!`)
        }
      })
    }
  }, [isOffline, showToast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    // Check if offline
    if (isOffline) {
      // Queue the action
      offlineQueue.add(
        `${import.meta.env.VITE_API_URL || '/api'}/subscribe`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email.trim().toLowerCase(),
            consentGiven: formData.consentGiven
          }),
        }
      )
      showToast('info', 'You\'re offline. Your request has been queued and will be sent when you\'re back online.')
      setFormData({
        email: '',
        consentGiven: false
      })
      return
    }

    setIsLoading(true)
    setStatus('idle')

    try {
      const response = await fetchWithErrorHandling(
        `${import.meta.env.VITE_API_URL || '/api'}/subscribe`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email.trim().toLowerCase(),
            consentGiven: formData.consentGiven
          }),
        }
      )

      const data: SignupResponse = await response.json()

      if (response.ok && data.success) {
        setStatus('success')
        setMessage(data.message)
        showToast('success', data.message, 7000)
        setFormData({
          email: '',
          consentGiven: false
        })
        // Persist success message for 10 seconds
        const timeout = setTimeout(() => {
          setStatus('idle')
          setMessage('')
        }, 10000)
        setSuccessTimeout(timeout)
      } else {
        const errorMsg = getActionableErrorMessage(null, {
          status: response.status,
          originalMessage: data.message,
        })
        setStatus('error')
        setMessage(errorMsg)
        showToast('error', errorMsg)
      }
    } catch (error) {
      const errorMsg = getActionableErrorMessage(error)
      setStatus('error')
      setMessage(errorMsg)
      showToast('error', errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="section-padding py-8 lg:py-12 fade-in relative">
      <div className="container-max relative z-10">
        {/* Main Hero Section */}
        <div className="mb-12">
          {/* Headline */}
          <div className="space-y-8 text-center">
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl text-heading leading-tight font-normal fade-in">
                <div className="stagger-item">Transforming</div>
                <div className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent text-[1.32em] font-bold stagger-item">
                  Online-Therapy
                </div>
                <div className="stagger-item">with Ethical AI, Secured by Blockchain</div>
              </h1>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center stagger-item">
              <button 
                onClick={() => navigate('/explore')}
                className="btn-secondary text-lg px-8 py-4 hover:scale-105 active:scale-95 transition-transform duration-200"
                aria-label="Learn more about SafePsy"
              >
                Learn More
              </button>
            </div>
          </div>
        </div>

        {/* Waitlist Form Section */}
        <div className="mb-12 sm:mb-16 fade-in">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 max-w-2xl mx-auto">
            <h2 className="text-xl sm:text-2xl lg:text-3xl text-heading mb-6 sm:mb-8 text-center px-2">
              <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                Get early access and exclusive updates.
              </span>
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6" aria-label="Join waitlist form" noValidate>
              <div className="space-y-4 sm:space-y-6">
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
                    aria-invalid={status === 'error' && !formData.email.trim()}
                    aria-describedby="email-error email-help"
                    className={`w-full px-4 py-3 text-base sm:text-lg border-2 rounded-xl focus:ring-2 focus:ring-primary-200 focus:outline-none transition-all duration-300 bg-white/80 backdrop-blur-sm disabled:opacity-50 min-h-[44px] hover:border-primary-400/50 ${
                      status === 'error' && !formData.email.trim()
                        ? 'border-red-500 dark:border-red-600 focus:ring-red-500 focus:border-red-500'
                        : 'border-neutral-300 focus:border-primary-500'
                    }`}
                    placeholder="Enter your email address"
                  />
                  <span id="email-help" className="sr-only">Enter a valid email address to join our waitlist</span>
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
                      aria-describedby="consent-error consent-help"
                      className="mt-1 w-5 h-5 text-primary-600 border-2 border-neutral-300 rounded focus:ring-primary-500 focus:ring-2 disabled:opacity-50 min-w-[20px] min-h-[20px]"
                    />
                    <label htmlFor="consentGiven" className="text-xs sm:text-sm text-body leading-relaxed">
                      I consent to SafePsy collecting and processing my personal data for the purpose of joining the waitlist and receiving product updates. I have read and agree to the{' '}
                      <Link 
                        to="/tos" 
                        className="text-primary-600 hover:text-primary-700 underline font-medium break-words"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Terms of Service
                      </Link>
                      {' '}and{' '}
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
                </div>
              </div>

              {/* Offline Indicator */}
              {isOffline && (
                <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                  <span className="text-sm text-yellow-800 dark:text-yellow-300">
                    You're offline. Your request will be queued and sent when you're back online.
                  </span>
                </div>
              )}

              {/* Status Message */}
              {status !== 'idle' && (
                <div
                  role="status"
                  aria-live="polite"
                  className={`p-4 rounded-lg flex items-center gap-3 fade-in ${
                    status === 'success'
                      ? 'bg-primary-50 text-primary-800 border border-primary-200 dark:bg-primary-900/20 dark:text-primary-300 dark:border-primary-500/50 animate-pulse'
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
                  aria-label={isLoading ? "Submitting your request" : "Join the SafePsy waitlist"}
                  aria-busy={isLoading}
                  className="flex items-center justify-center gap-2 mx-auto min-h-[44px] w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white rounded-xl font-medium text-sm sm:text-base transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-primary-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                      <span>Joining...</span>
                    </>
                  ) : isOffline ? (
                    'Queue for Later (Offline)'
                  ) : (
                    'Join Waitlist'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Mission Statement Section */}
        <div className="text-center py-12 sm:py-16 lg:py-20 fade-in">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-body leading-relaxed space-y-3">
              <div className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl">
                The future of mental health depends on technology
              </div>
              <div className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl">
                that is both{' '}
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent font-bold">
                  safe{' '}
                </span>
                and{' '}
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent font-bold">
                  user-controlled
                </span>{' '}
              </div>
            </div>
          </div>
        </div>

        {/* Values Section */}
        <div className="text-center py-12 sm:py-16 fade-in">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12 xl:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 card-hover">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl text-heading mb-6 sm:mb-8 px-2">
              <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                Secure. Ethical. Human-centered.
              </span>
            </h2>
            
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 mt-8 sm:mt-12">
              <div className="space-y-4 stagger-item group">
                <div className="w-16 h-16 mx-auto bg-primary-100 rounded-full flex items-center justify-center border border-primary-200 dark:bg-primary-900/30 dark:border-primary-700 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg">
                  <Shield className="w-8 h-8 text-primary-600 dark:text-primary-400 icon-hover" />
                </div>
                <h3 className="text-xl text-heading transition-colors duration-200 group-hover:text-primary-600">Secure</h3>
                <p className="text-body">
                  You own your data — chat and summary data are encrypted at rest using AES-256-GCM (only ciphertext is stored), with keys derived from your wallet and not stored on our servers. To provide AI responses, content is decrypted temporarily in server memory during the request (not strict end-to-end encryption).
                </p>
              </div>
              
              <div className="space-y-4 stagger-item group">
                <div className="w-16 h-16 mx-auto bg-secondary-100 rounded-full flex items-center justify-center border border-secondary-200 dark:bg-secondary-900/30 dark:border-secondary-700 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg">
                  <Heart className="w-8 h-8 text-secondary-600 dark:text-secondary-400 icon-hover" />
                </div>
                <h3 className="text-xl text-heading transition-colors duration-200 group-hover:text-secondary-600">Ethical</h3>
                <p className="text-body">
                  Designed with professional ethics in mind and clear clinical boundaries: the AI assistant is not a substitute for professional care and does not provide medical advice, diagnosis, or treatment. We support HIPAA-style safeguards, but we are not a HIPAA-covered entity and do not hold HIPAA certification.
                </p>
              </div>
              
              <div className="space-y-4 stagger-item group">
                <div className="w-16 h-16 mx-auto bg-accent-100 rounded-full flex items-center justify-center border border-accent-200 dark:bg-accent-900/30 dark:border-accent-700 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg">
                  <Users className="w-8 h-8 text-accent-600 dark:text-accent-400 icon-hover" />
                </div>
                <h3 className="text-xl text-heading transition-colors duration-200 group-hover:text-accent-600">Human-centered</h3>
                <p className="text-body">
                  Enhanced interface and pricing to enable global mental health accessibility
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
      <ToastContainer />
    </section>
  )
}

export default Hero
