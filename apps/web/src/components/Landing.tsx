import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Shield, Heart, Users, AlertCircle, CheckCircle, Loader2, ArrowRight, Sparkles, BadgeCheck } from 'lucide-react'
import Header from './Header'
import Footer from './Footer'
import { useOffline } from '../hooks/useOffline'
import { useToast } from '../hooks/useToast'
import { getActionableErrorMessage, fetchWithErrorHandling } from '../utils/errorMessages'
import { FAQ_ITEMS } from '../data/faq'
import FAQAccordion from './FAQAccordion'
import { useScrollReveal } from '../hooks/useScrollReveal.ts'

interface SignupResponse {
  success: boolean
  message: string
}

export default function Landing() {
  const { isOffline } = useOffline()
  const { showToast, ToastContainer } = useToast()
  const [formData, setFormData] = useState({ email: '', consentGiven: false })
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const ctaLabel = useMemo(() => (isOffline ? 'Queue for later' : 'Try beta'), [isOffline])

  useScrollReveal()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.email.trim() || !formData.consentGiven) {
      setStatus('error')
      setMessage('Please enter your email and give consent.')
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
          body: JSON.stringify({ email: formData.email.trim().toLowerCase(), consentGiven: formData.consentGiven }),
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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main id="main-content" className="flex-1" role="main" aria-label="Landing" tabIndex={-1}>
        <div className="container-max section-padding py-8 lg:py-12 space-y-14 lg:space-y-20 relative overflow-hidden">
          <div className="pointer-events-none absolute -top-28 -left-20 w-72 h-72 rounded-full bg-primary-400/20 blur-3xl animate-pulse" />
          <div className="pointer-events-none absolute top-64 -right-24 w-72 h-72 rounded-full bg-secondary-400/20 blur-3xl animate-pulse" />

          <section className="mb-6 scroll-reveal" data-reveal>
            <div className="max-w-5xl mx-auto bg-white/70 dark:bg-black/30 backdrop-blur-sm rounded-3xl border border-neutral-dark/20 dark:border-white/20 p-6 sm:p-8 lg:p-12 hover-soft-fade">
              <p className="inline-flex items-center gap-2 text-sm sm:text-base text-heading mb-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700 rounded-full px-4 py-2">
                <Sparkles className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                Private reflection · You-first onboarding
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl text-heading leading-tight font-normal fade-in">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent font-bold">
                  A private space to understand what you feel
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-body leading-relaxed mt-6 max-w-3xl">
                Talk with Dr.Safe without signing in. When you want continuity, your wallet becomes an ownership and
                privacy tool — encrypted history you control, not a crypto feature.
                <br />
                <br />
                We don't train on your conversations. Guest chats stay in your browser only; wallet mode stores ciphertext,
                not readable content, on our servers.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link to="/beta/chat" className="btn-try-beta" aria-label="Start talking with Dr. Safe, no login">
                  Start talking (no login)
                  <ArrowRight className="w-5 h-5 shrink-0" aria-hidden="true" />
                </Link>
                <Link
                  to="/explore"
                  className="btn-secondary btn-gentle-scale inline-flex items-center justify-center text-base sm:text-lg px-6"
                  aria-label="Explore SafePsy"
                >
                  Explore
                </Link>
              </div>
            </div>
          </section>

          <section className="scroll-reveal" data-reveal>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-heading mb-8 text-center">
              <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">Why you can trust Dr. Safe</span>
            </h2>
            <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-5">
              <div className="p-6 rounded-2xl border border-neutral-200 dark:border-white/20 bg-white/70 dark:bg-black/20 hover-soft-fade">
                <BadgeCheck className="w-7 h-7 text-secondary-600 dark:text-secondary-400 mb-3" />
                <p className="text-body text-sm sm:text-base"><strong className="text-heading">Privacy & security:</strong> Chat and summary data are encrypted at rest using AES-256-GCM (only ciphertext is stored). Data is transmitted over TLS 1.3. We do not log chat message content. Keys are derived from your wallet and not stored on SafePsy servers.</p>
              </div>
              <div className="p-6 rounded-2xl border border-neutral-200 dark:border-white/20 bg-white/70 dark:bg-black/20 hover-soft-fade">
                <Shield className="w-7 h-7 text-primary-600 dark:text-primary-400 mb-3" />
                <p className="text-body text-sm sm:text-base"><strong className="text-heading">Clinical boundaries:</strong> Dr. Safe is not a substitute for licensed therapy and does not provide diagnosis or medical treatment.</p>
              </div>
              <div className="p-6 rounded-2xl border border-neutral-200 dark:border-white/20 bg-white/70 dark:bg-black/20 hover-soft-fade">
                <Users className="w-7 h-7 text-accent-600 dark:text-accent-400 mb-3" />
                <p className="text-body text-sm sm:text-base"><strong className="text-heading">Compliance language:</strong> we implement measures aimed at GDPR compliance and support HIPAA-style safeguards (no HIPAA certification claim).</p>
              </div>
              <div className="p-6 rounded-2xl border border-neutral-200 dark:border-white/20 bg-white/70 dark:bg-black/20 hover-soft-fade">
                <Heart className="w-7 h-7 text-secondary-600 dark:text-secondary-400 mb-3" />
                <p className="text-body text-sm sm:text-base"><strong className="text-heading">Transparency:</strong> DID operations run on Sepolia Testnet; on-chain metadata is public, while chat content is off-chain and encrypted.</p>
              </div>
            </div>
            <p className="max-w-4xl mx-auto text-center text-body mt-6 text-xs sm:text-sm opacity-90">
              Important: SafePsy uses client-side encryption for storage, but it is not strict end-to-end encryption because the server must decrypt temporarily in memory to request AI responses.
            </p>
          </section>

          <section className="scroll-reveal" data-reveal>
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 max-w-2xl mx-auto hover-soft-fade">
              <h2 className="text-xl sm:text-2xl lg:text-3xl text-heading mb-2 text-center px-2">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">Join the waitlist</span>
              </h2>
              <p className="text-body text-center mb-6 sm:mb-8">Secure your spot and receive insider updates.</p>
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6" aria-label="Join waitlist form" noValidate>
                <div className="space-y-2">
                  <label htmlFor="draft-email" className="block text-base sm:text-lg font-medium text-heading">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="draft-email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading || isOffline}
                    autoComplete="email"
                    aria-required="true"
                    aria-invalid={status === 'error' && !formData.email.trim()}
                    aria-describedby="draft-email-error draft-email-help"
                    className={`w-full px-4 py-3 text-base sm:text-lg border-2 rounded-xl focus:ring-2 focus:ring-primary-200 focus:outline-none transition-all duration-300 bg-white/80 backdrop-blur-sm disabled:opacity-50 min-h-[44px] hover:border-primary-400/50 ${
                      status === 'error' && !formData.email.trim()
                        ? 'border-red-500 dark:border-red-600 focus:ring-red-500 focus:border-red-500'
                        : 'border-neutral-300 focus:border-primary-500'
                    }`}
                    placeholder="Enter your email address"
                  />
                  <span id="draft-email-help" className="sr-only">Enter a valid email address to join our waitlist</span>
                  {status === 'error' && !formData.email.trim() && (
                    <div className="form-error" id="draft-email-error" role="alert">
                      <AlertCircle className="form-error-icon" />
                      <span>Please enter your email address</span>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="draft-consent"
                      name="consentGiven"
                      checked={formData.consentGiven}
                      onChange={handleInputChange}
                      required
                      disabled={isLoading}
                      aria-required="true"
                      aria-invalid={status === 'error' && !formData.consentGiven}
                      className="mt-1 w-5 h-5 text-primary-600 border-2 border-neutral-300 rounded focus:ring-primary-500 focus:ring-2 disabled:opacity-50 min-w-[20px] min-h-[20px]"
                    />
                    <label htmlFor="draft-consent" className="text-xs sm:text-sm text-body leading-relaxed">
                      I consent to SafePsy collecting and processing my personal data for the purpose of joining the waitlist and receiving product updates. I have read and agree to the{' '}
                      <Link to="/tos" className="text-primary-600 hover:text-primary-700 underline font-medium break-words" target="_blank" rel="noopener noreferrer">
                        Terms of Service
                      </Link>
                      {' '}and{' '}
                      <Link to="/sap-policy" className="text-primary-600 hover:text-primary-700 underline font-medium break-words" target="_blank" rel="noopener noreferrer">
                        Security and Privacy Policy
                      </Link>
                      . *
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
          </section>

          <section id="faq" className="scroll-reveal" data-reveal>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-heading mb-8 text-center">
              <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                Frequently asked questions
              </span>
            </h2>
            <FAQAccordion items={FAQ_ITEMS} answerClassName="text-xs sm:text-sm" />
          </section>
        </div>
      </main>
      <div className="fixed bottom-4 right-4 z-40">
        <Link
          to="/beta/chat"
          className="btn-try-beta"
          aria-label="Try SafePsy beta chat"
        >
          {ctaLabel}
          <ArrowRight className="w-5 h-5 shrink-0" aria-hidden="true" />
        </Link>
      </div>
      <Footer />
      <ToastContainer />
    </div>
  )
}

