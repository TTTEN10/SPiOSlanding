import React, { useState, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import Header from './Header'
import Footer from './Footer'
import { useOffline } from '../hooks/useOffline'
import { useToast } from '../hooks/useToast'
import { getActionableErrorMessage, fetchWithErrorHandling } from '../utils/errorMessages'
import { offlineQueue } from '../utils/queueManager'

interface ContactResponse {
  success: boolean
  message: string
}

const ContactUs: React.FC = () => {
  const { isOffline } = useOffline()
  const { showToast, ToastContainer } = useToast()
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    subject: '',
    message: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [successTimeout, setSuccessTimeout] = useState<NodeJS.Timeout | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      setStatus('error')
      setMessage('Please enter your full name')
      return false
    }
    if (!formData.email.trim()) {
      setStatus('error')
      setMessage('Please enter your email address')
      return false
    }
    if (!formData.subject.trim()) {
      setStatus('error')
      setMessage('Please enter a subject')
      return false
    }
    if (!formData.message.trim()) {
      setStatus('error')
      setMessage('Please enter your message')
      return false
    }
    return true
  }

  useEffect(() => {
    return () => {
      if (successTimeout) {
        clearTimeout(successTimeout)
      }
    }
  }, [successTimeout])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    if (isOffline) {
      offlineQueue.add(
        `${import.meta.env.VITE_API_URL || '/api'}/contact`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fullName: formData.fullName.trim(),
            email: formData.email.trim().toLowerCase(),
            subject: formData.subject.trim(),
            message: formData.message.trim()
          }),
        }
      )
      showToast('info', 'You\'re offline. Your message has been queued and will be sent when you\'re back online.')
      setFormData({
        fullName: '',
        email: '',
        subject: '',
        message: ''
      })
      return
    }

    setIsLoading(true)
    setStatus('idle')

    try {
      const response = await fetchWithErrorHandling(
        `${import.meta.env.VITE_API_URL || '/api'}/contact`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fullName: formData.fullName.trim(),
            email: formData.email.trim().toLowerCase(),
            subject: formData.subject.trim(),
            message: formData.message.trim()
          }),
        }
      )

      const data: ContactResponse = await response.json()

      if (response.ok && data.success) {
        setStatus('success')
        setMessage(data.message)
        showToast('success', data.message, 7000)
        setFormData({
          fullName: '',
          email: '',
          subject: '',
          message: ''
        })
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
    <div className="min-h-screen flex flex-col">
      <Header showBackButton={true} />

      {/* Main Content */}
      <main id="main-content" className="flex-1" role="main" aria-label="Contact SafePsy" tabIndex={-1}>
        <section className="section-padding py-8 lg:py-12">
          <div className="container-max">
            {/* Hero Section */}
            <div className="text-center mb-12 sm:mb-16 px-4 fade-in">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl text-heading leading-tight mb-4 sm:mb-6">
                <span className="text-[1.08em] stagger-item">Get in</span>{' '}
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent text-[1.2em] font-bold stagger-item">
                  Touch
                </span>
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-body leading-relaxed max-w-3xl mx-auto stagger-item">
                Have questions about SafePsy? We&apos;re the privacy-first platform where you own your data—we don&apos;t store it with third parties or use it to train AI.<br className="hidden sm:block" />
                <span className="sm:hidden"> </span>Reach out and we&apos;ll get back to you.
              </p>
            </div>

            {/* Contact Form */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-12 sm:mb-16 fade-in card-hover">
              <h2 className="text-xl sm:text-2xl lg:text-3xl text-heading mb-6 sm:mb-8 text-center px-2">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Send us a Message
                </span>
              </h2>
              
              {/* Offline Indicator */}
              {isOffline && (
                <div className="mb-6 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center gap-2">
                  <span className="text-sm text-yellow-800 dark:text-yellow-300">
                    You're offline. Your message will be queued and sent when you're back online.
                  </span>
                </div>
              )}

              {/* Status Messages */}
              {status === 'success' && (
                <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 dark:bg-green-900/20 dark:border-green-500/50 dark:text-green-300 rounded-xl fade-in animate-pulse flex items-center gap-2">
                  <span className="text-green-600 dark:text-green-400">✓</span>
                  <p className="font-medium">{message}</p>
                </div>
              )}
              
              {status === 'error' && (
                <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/20 dark:border-red-500/50 dark:text-red-300 rounded-xl fade-in flex items-center gap-2">
                  <span className="text-red-600 dark:text-red-400">✕</span>
                  <p className="font-medium">{message}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <label htmlFor="fullName" className="block text-base sm:text-lg font-medium text-heading">
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      required
                      autoComplete="name"
                      disabled={isOffline}
                      className={`w-full px-4 py-3 text-base sm:text-lg border-2 rounded-xl focus:ring-2 focus:ring-primary-200 focus:outline-none transition-all duration-300 bg-white/80 backdrop-blur-sm min-h-[44px] hover:border-primary-400/50 ${
                        status === 'error' && !formData.fullName.trim() ? 'input-error' : 'border-neutral-300 focus:border-primary-500'
                      }`}
                      placeholder="Enter your full name"
                      aria-invalid={status === 'error' && !formData.fullName.trim()}
                    />
                    {status === 'error' && !formData.fullName.trim() && (
                      <div className="form-error" role="alert">
                        <AlertCircle className="form-error-icon" />
                        <span>Please enter your full name</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="email" className="block text-base sm:text-lg font-medium text-heading">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      autoComplete="email"
                      disabled={isOffline}
                      className={`w-full px-4 py-3 text-base sm:text-lg border-2 rounded-xl focus:ring-2 focus:ring-primary-200 focus:outline-none transition-all duration-300 bg-white/80 backdrop-blur-sm min-h-[44px] hover:border-primary-400/50 ${
                        status === 'error' && !formData.email.trim() ? 'input-error' : 'border-neutral-300 focus:border-primary-500'
                      }`}
                      placeholder="Enter your email address"
                      aria-invalid={status === 'error' && !formData.email.trim()}
                    />
                    {status === 'error' && !formData.email.trim() && (
                      <div className="form-error" role="alert">
                        <AlertCircle className="form-error-icon" />
                        <span>Please enter your email address</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="subject" className="block text-base sm:text-lg font-medium text-heading">
                    Subject
                  </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 text-base sm:text-lg border-2 border-neutral-300 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none transition-all duration-300 bg-white/80 backdrop-blur-sm min-h-[44px] hover:border-primary-400/50"
                      placeholder="What's this about?"
                    />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="message" className="block text-base sm:text-lg font-medium text-heading">
                    Your Message
                  </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                      rows={6}
                      className="w-full px-4 py-3 text-base sm:text-lg border-2 border-neutral-300 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none transition-all duration-300 bg-white/80 backdrop-blur-sm resize-none hover:border-primary-400/50"
                      placeholder="Tell us how we can help you..."
                    />
                </div>
                
                <div className="text-center">
                  <button
                    type="submit"
                    disabled={isLoading || isOffline}
                    className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white font-semibold text-base sm:text-lg px-8 sm:px-12 py-3 sm:py-4 rounded-xl hover:from-primary-700 hover:to-secondary-700 focus:outline-none focus:ring-4 focus:ring-primary-200 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-primary-500/25 transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none min-h-[44px] w-full sm:w-auto"
                  >
                    {isLoading ? 'Sending...' : isOffline ? 'Queue for Later (Offline)' : 'Send Message'}
                  </button>
                </div>
              </form>
            </div>

          </div>
        </section>
      </main>
      <Footer />
      <ToastContainer />
    </div>
  )
}

export default ContactUs
