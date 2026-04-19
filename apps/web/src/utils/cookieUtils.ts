/**
 * Utility functions for cookie management and consent validation
 */

import { CookiePreferences } from '../hooks/useCookieConsent'

/**
 * Check if user has consented to a specific cookie type
 */
export const hasConsentForCookieType = (cookieType: keyof CookiePreferences): boolean => {
  const consent = localStorage.getItem('cookieConsent')
  if (!consent) return false
  
  try {
    const preferences = JSON.parse(consent)
    return preferences[cookieType] === true
  } catch (error) {
    console.error('Error parsing cookie consent:', error)
    return false
  }
}

/**
 * Initialize analytics only if user has given consent
 */
export const initializeAnalytics = () => {
  if (!hasConsentForCookieType('analytics')) {
    console.log('Analytics disabled - user has not given consent')
    return false
  }

  // Example: Initialize Google Analytics
  console.log('Initializing analytics...')
  
  // You would typically load Google Analytics or other tracking scripts here
  // Example:
  // gtag('config', 'GA_MEASUREMENT_ID', {
  //   anonymize_ip: true,
  //   cookie_flags: 'SameSite=Strict;Secure'
  // })
  
  return true
}

/**
 * Initialize functional features based on consent
 */
export const initializeFunctionalFeatures = () => {
  if (!hasConsentForCookieType('functional')) {
    console.log('Functional cookies disabled - using default settings')
    return false
  }

  console.log('Initializing functional features...')
  
  // Example: Load user preferences, themes, etc.
  // const savedTheme = localStorage.getItem('theme')
  // if (savedTheme) {
  //   applyTheme(savedTheme)
  // }
  
  return true
}

/**
 * Clear all non-essential cookies when consent is withdrawn
 */
export const clearNonEssentialCookies = () => {
  const cookiesToRemove = [
    'functional_cookies',
    'analytics_cookies',
    'theme_preference',
    'language_preference',
    // Add other non-essential cookies here
  ]

  cookiesToRemove.forEach(cookieName => {
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
  })

  console.log('Cleared all non-essential cookies')
}

/**
 * Get cookie consent summary for debugging
 */
export const getCookieConsentSummary = () => {
  const consent = localStorage.getItem('cookieConsent')
  const consentDate = localStorage.getItem('cookieConsentDate')
  
  if (!consent) {
    return {
      hasConsented: false,
      preferences: null,
      consentDate: null
    }
  }

  try {
    const preferences = JSON.parse(consent)
    return {
      hasConsented: true,
      preferences,
      consentDate: consentDate ? new Date(consentDate) : null
    }
  } catch (error) {
    console.error('Error parsing cookie consent:', error)
    return {
      hasConsented: false,
      preferences: null,
      consentDate: null
    }
  }
}

/**
 * Check if consent is still valid (not expired)
 */
export const isConsentValid = (maxAgeInDays: number = 365): boolean => {
  const consentDate = localStorage.getItem('cookieConsentDate')
  if (!consentDate) return false

  try {
    const date = new Date(consentDate)
    const now = new Date()
    const maxAge = maxAgeInDays * 24 * 60 * 60 * 1000 // Convert days to milliseconds
    
    return (now.getTime() - date.getTime()) < maxAge
  } catch (error) {
    console.error('Error validating consent date:', error)
    return false
  }
}

/**
 * Conditional feature loading based on consent
 */
export const withConsentCheck = <T>(
  cookieType: keyof CookiePreferences,
  featureName: string,
  initializeFunction: () => T
): T | null => {
  if (hasConsentForCookieType(cookieType)) {
    console.log(`Loading ${featureName} - user has given consent for ${cookieType} cookies`)
    return initializeFunction()
  } else {
    console.log(`${featureName} skipped - no consent for ${cookieType} cookies`)
    return null
  }
}
