import React, { useState } from 'react'
import { Settings, Cookie, Shield, CheckCircle, X } from 'lucide-react'
import { useCookieConsent, CookiePreferences } from '../hooks/useCookieConsent'

interface CookieManagerProps {
  isOpen: boolean
  onClose: () => void
}

const CookieManager: React.FC<CookieManagerProps> = ({ isOpen, onClose }) => {
  const { consentData, updateConsent } = useCookieConsent()
  const [preferences, setPreferences] = useState<CookiePreferences>(consentData.preferences)

  if (!isOpen) return null

  const handleSave = () => {
    updateConsent(preferences)
    onClose()
  }

  const handlePreferenceChange = (type: keyof CookiePreferences, value: boolean) => {
    if (type === 'essential') return // Essential cookies cannot be disabled
    
    setPreferences(prev => ({
      ...prev,
      [type]: value
    }))
  }

  const handleAcceptAll = () => {
    const newPreferences = {
      essential: true,
      functional: true,
      analytics: true
    }
    setPreferences(newPreferences)
    updateConsent(newPreferences)
    onClose()
  }

  const handleEssentialOnly = () => {
    const newPreferences = {
      essential: true,
      functional: false,
      analytics: false
    }
    setPreferences(newPreferences)
    updateConsent(newPreferences)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={onClose} />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        <div className="bg-white/95 backdrop-blur-sm border border-neutral-200 dark:bg-black/95 dark:border-white/20 rounded-xl sm:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary-100 rounded-full flex items-center justify-center border border-primary-200 dark:bg-primary-900/30 dark:border-primary-700 flex-shrink-0">
                  <Cookie className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold text-heading truncate">
                  Cookie Preferences
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
                aria-label="Close cookie preferences"
              >
                <X className="w-5 h-5 text-neutral-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Description */}
            <p className="text-sm sm:text-base text-body mb-4 sm:mb-6">
              Manage your cookie preferences below. You can enable or disable different types of cookies 
              to control your privacy and experience on our platform.
            </p>

            {/* Cookie Categories */}
            <div className="space-y-4 mb-8">
              {/* Essential Cookies */}
              <div className="border border-green-200 rounded-xl p-4 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-heading">Essential Cookies</h3>
                      <p className="text-sm text-body">
                        Required for the website to function properly. These cannot be disabled.
                      </p>
                      <ul className="text-xs text-body mt-1 space-y-1">
                        <li>• Authentication and security</li>
                        <li>• Session management</li>
                        <li>• Load balancing</li>
                      </ul>
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
                      <h3 className="font-semibold text-heading">Functional Cookies</h3>
                      <p className="text-sm text-body">
                        Remember your preferences and improve your experience.
                      </p>
                      <ul className="text-xs text-body mt-1 space-y-1">
                        <li>• Language preferences</li>
                        <li>• Theme settings</li>
                        <li>• Accessibility options</li>
                      </ul>
                    </div>
                  </div>
                  <button
                    onClick={() => handlePreferenceChange('functional', !preferences.functional)}
                    className={`w-12 h-6 rounded-full flex items-center transition-colors duration-200 ${
                      preferences.functional 
                        ? 'bg-primary-600 justify-end' 
                        : 'bg-neutral-300 dark:bg-gray-600 justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 bg-white rounded-full mx-1"></div>
                  </button>
                </div>
              </div>

              {/* Analytics Cookies */}
              <div className="border border-purple-200 rounded-xl p-4 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-heading">Analytics Cookies</h3>
                      <p className="text-sm text-body">
                        Help us understand how you use our platform to improve our services.
                      </p>
                      <ul className="text-xs text-body mt-1 space-y-1">
                        <li>• Page views and navigation</li>
                        <li>• Feature usage statistics</li>
                        <li>• Performance metrics</li>
                      </ul>
                    </div>
                  </div>
                  <button
                    onClick={() => handlePreferenceChange('analytics', !preferences.analytics)}
                    className={`w-12 h-6 rounded-full flex items-center transition-colors duration-200 ${
                      preferences.analytics 
                        ? 'bg-primary-600 justify-end' 
                        : 'bg-neutral-300 dark:bg-gray-600 justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 bg-white rounded-full mx-1"></div>
                  </button>
                </div>
              </div>
            </div>

            {/* Consent Info */}
            <div className="bg-neutral-50 border border-neutral-200 dark:bg-gray-800 dark:border-gray-600 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-neutral-600 dark:text-gray-400 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-heading mb-1">Your Privacy Rights</h4>
                  <p className="text-sm text-body">
                    You can change your cookie preferences at any time. Your choices will be saved 
                    and respected across all pages of our website. Essential cookies are always enabled 
                    for security and functionality purposes.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={handleEssentialOnly}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors duration-200 min-h-[44px] text-sm sm:text-base"
              >
                Essential only
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl min-h-[44px] text-sm sm:text-base"
              >
                Save preferences
              </button>
              <button
                onClick={handleAcceptAll}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-secondary-600 to-accent-600 hover:from-secondary-700 hover:to-accent-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl min-h-[44px] text-sm sm:text-base"
              >
                Accept all
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default CookieManager
