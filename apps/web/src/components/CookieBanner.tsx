import React, { useState, useEffect } from 'react'
import { Cookie, Settings, X, CheckCircle, Shield } from 'lucide-react'
import { useCookieConsent, CookiePreferences } from '../hooks/useCookieConsent'

interface CookieBannerProps {
  onConsentChange?: (preferences: CookiePreferences) => void
}

const CookieBanner: React.FC<CookieBannerProps> = ({ onConsentChange }) => {
  // Initialize visibility by checking localStorage directly to avoid flash
  const [isVisible, setIsVisible] = useState(() => {
    // Check localStorage synchronously on initial render
    const savedConsent = localStorage.getItem('cookieConsent')
    return !savedConsent // Only show if no consent exists
  })
  
  const [showDetails, setShowDetails] = useState(false)
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true, // Always true - essential cookies cannot be disabled
    functional: false,
    analytics: false
  })

  const { consentData, updateConsent } = useCookieConsent()

  // Check if user has already made a choice
  useEffect(() => {
    if (!consentData.hasConsented) {
      setIsVisible(true)
    } else {
      // User has already consented - hide banner and update preferences
      setIsVisible(false)
      setPreferences(consentData.preferences)
    }
  }, [consentData])

  const handleAcceptAll = () => {
    const newPreferences = {
      essential: true,
      functional: true,
      analytics: true
    }
    saveConsent(newPreferences)
  }

  const handleAcceptEssential = () => {
    const newPreferences = {
      essential: true,
      functional: false,
      analytics: false
    }
    saveConsent(newPreferences)
  }

  const handleSavePreferences = () => {
    saveConsent(preferences)
  }

  const saveConsent = (consent: CookiePreferences) => {
    updateConsent(consent)
    setIsVisible(false)
    setShowDetails(false)
    
    // Call the callback to notify parent components
    if (onConsentChange) {
      onConsentChange(consent)
    }
  }

  const handlePreferenceChange = (type: keyof CookiePreferences, value: boolean) => {
    if (type === 'essential') return // Essential cookies cannot be disabled
    
    setPreferences(prev => ({
      ...prev,
      [type]: value
    }))
  }

  if (!isVisible) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 fade-in" />
      
      {/* Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4 fade-in">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/95 backdrop-blur-sm border border-neutral-200 dark:bg-black/95 dark:border-white/20 rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 lg:p-8 card-hover">
            {!showDetails ? (
              // Simple banner view
              <div className="space-y-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-100 rounded-full flex items-center justify-center border border-primary-200 dark:bg-primary-900/30 dark:border-primary-700 flex-shrink-0 transition-transform duration-300 hover:scale-110 hover:rotate-12">
                    <Cookie className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg sm:text-xl font-semibold text-heading mb-2">
                      We respect your privacy
                    </h3>
                    <p className="text-sm sm:text-base text-body leading-relaxed">
                      We use essential cookies to make our site work. We'd also like to set optional 
                      cookies to improve your experience and help us understand how you use our platform.
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-2">
                  <button
                    onClick={handleAcceptEssential}
                    className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 rounded-xl font-medium transition-all duration-300 min-h-[44px] text-sm sm:text-base hover:scale-105 active:scale-95"
                  >
                    Essential only
                  </button>
                  <button
                    onClick={() => setShowDetails(true)}
                    className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 dark:bg-gray-800 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-300 rounded-xl font-medium transition-all duration-300 min-h-[44px] text-sm sm:text-base hover:scale-105 active:scale-95 group"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Settings className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90" />
                      <span>Customize</span>
                    </div>
                  </button>
                  <button
                    onClick={handleAcceptAll}
                    className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-primary-500/25 min-h-[44px] text-sm sm:text-base hover:scale-105 active:scale-95"
                  >
                    Accept all
                  </button>
                </div>
              </div>
            ) : (
              // Detailed preferences view
              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xl sm:text-2xl font-semibold text-heading">
                    Cookie Preferences
                  </h3>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="p-2 hover:bg-neutral-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-300 min-w-[44px] min-h-[44px] flex items-center justify-center hover:scale-110 active:scale-95 group"
                    aria-label="Close preferences"
                  >
                    <X className="w-5 h-5 text-neutral-600 dark:text-gray-400 transition-transform duration-300 group-hover:rotate-90" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Essential Cookies */}
                  <div className="border border-green-200 rounded-xl p-4 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold text-heading">Essential Cookies</h4>
                          <p className="text-sm text-body">
                            Required for the website to function properly. Cannot be disabled.
                          </p>
                        </div>
                      </div>
                      <div className="w-12 h-6 bg-green-200 dark:bg-green-800 rounded-full flex items-center justify-end px-1">
                        <div className="w-4 h-4 bg-green-600 dark:bg-green-400 rounded-full"></div>
                      </div>
                    </div>
                  </div>

                  {/* Functional Cookies */}
                  <div className="border border-blue-200 rounded-xl p-4 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold text-heading">Functional Cookies</h4>
                          <p className="text-sm text-body">
                            Remember your preferences and improve your experience.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handlePreferenceChange('functional', !preferences.functional)}
                        className={`w-12 h-6 rounded-full flex items-center transition-all duration-300 hover:scale-110 ${
                          preferences.functional 
                            ? 'bg-primary-600 justify-end' 
                            : 'bg-neutral-300 dark:bg-gray-600 justify-start'
                        }`}
                      >
                        <div className="w-4 h-4 bg-white rounded-full mx-1 transition-transform duration-300"></div>
                      </button>
                    </div>
                  </div>

                  {/* Analytics Cookies */}
                  <div className="border border-purple-200 rounded-xl p-4 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-1 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold text-heading">Analytics Cookies</h4>
                          <p className="text-sm text-body">
                            Help us understand how you use our platform to improve our services.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handlePreferenceChange('analytics', !preferences.analytics)}
                        className={`w-12 h-6 rounded-full flex items-center transition-all duration-300 hover:scale-110 ${
                          preferences.analytics 
                            ? 'bg-primary-600 justify-end' 
                            : 'bg-neutral-300 dark:bg-gray-600 justify-start'
                        }`}
                      >
                        <div className="w-4 h-4 bg-white rounded-full mx-1 transition-transform duration-300"></div>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 border-t border-neutral-200 dark:border-gray-600">
                  <button
                    onClick={handleAcceptEssential}
                    className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 rounded-xl font-medium transition-all duration-300 min-h-[44px] text-sm sm:text-base hover:scale-105 active:scale-95"
                  >
                    Essential only
                  </button>
                  <button
                    onClick={handleSavePreferences}
                    className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-primary-500/25 min-h-[44px] text-sm sm:text-base hover:scale-105 active:scale-95"
                  >
                    Save preferences
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default CookieBanner
