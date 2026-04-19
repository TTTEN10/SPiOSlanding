import { useState, useEffect } from 'react'

export interface CookiePreferences {
  essential: boolean
  functional: boolean
  analytics: boolean
}

export interface CookieConsentData {
  preferences: CookiePreferences
  consentDate: string | null
  hasConsented: boolean
}

export const useCookieConsent = () => {
  const [consentData, setConsentData] = useState<CookieConsentData>({
    preferences: {
      essential: true, // Always true
      functional: false,
      analytics: false
    },
    consentDate: null,
    hasConsented: false
  })

  // Load consent data from localStorage on mount
  useEffect(() => {
    const savedConsent = localStorage.getItem('cookieConsent')
    const savedDate = localStorage.getItem('cookieConsentDate')
    
    if (savedConsent) {
      try {
        const preferences = JSON.parse(savedConsent)
        setConsentData({
          preferences,
          consentDate: savedDate,
          hasConsented: true
        })
      } catch (error) {
        console.error('Error parsing cookie consent data:', error)
        // Reset to default if parsing fails
        localStorage.removeItem('cookieConsent')
        localStorage.removeItem('cookieConsentDate')
      }
    }
  }, [])

  const updateConsent = (preferences: CookiePreferences) => {
    const consentDate = new Date().toISOString()
    
    // Save to localStorage
    localStorage.setItem('cookieConsent', JSON.stringify(preferences))
    localStorage.setItem('cookieConsentDate', consentDate)
    
    // Update state
    setConsentData({
      preferences,
      consentDate,
      hasConsented: true
    })

    // Apply cookie settings
    applyCookieSettings(preferences)
  }

  const clearConsent = () => {
    localStorage.removeItem('cookieConsent')
    localStorage.removeItem('cookieConsentDate')
    
    // Remove non-essential cookies
    document.cookie = "functional_cookies=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    document.cookie = "analytics_cookies=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    
    setConsentData({
      preferences: {
        essential: true,
        functional: false,
        analytics: false
      },
      consentDate: null,
      hasConsented: false
    })
  }

  const hasConsentFor = (cookieType: keyof CookiePreferences): boolean => {
    return consentData.preferences[cookieType]
  }

  return {
    consentData,
    updateConsent,
    clearConsent,
    hasConsentFor
  }
}

// Utility functions for cookie management
export const applyCookieSettings = (preferences: CookiePreferences) => {
  // Set functional cookies if consented
  if (preferences.functional) {
    document.cookie = "functional_cookies=true; path=/; max-age=31536000; SameSite=Strict; Secure"
  } else {
    document.cookie = "functional_cookies=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
  }

  // Set analytics cookies if consented
  if (preferences.analytics) {
    document.cookie = "analytics_cookies=true; path=/; max-age=63072000; SameSite=Strict; Secure"
  } else {
    document.cookie = "analytics_cookies=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
  }
}

export const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(';').shift()
    return cookieValue || null
  }
  return null
}

export const setCookie = (name: string, value: string, options: {
  maxAge?: number
  expires?: Date
  path?: string
  domain?: string
  secure?: boolean
  sameSite?: 'Strict' | 'Lax' | 'None'
} = {}): void => {
  let cookieString = `${name}=${value}`
  
  if (options.maxAge !== undefined) {
    cookieString += `; max-age=${options.maxAge}`
  }
  
  if (options.expires) {
    cookieString += `; expires=${options.expires.toUTCString()}`
  }
  
  if (options.path) {
    cookieString += `; path=${options.path}`
  }
  
  if (options.domain) {
    cookieString += `; domain=${options.domain}`
  }
  
  if (options.secure) {
    cookieString += `; secure`
  }
  
  if (options.sameSite) {
    cookieString += `; samesite=${options.sameSite}`
  }
  
  document.cookie = cookieString
}

export const deleteCookie = (name: string, path: string = '/'): void => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path};`
}

// Cookie consent validation
export const validateCookieConsent = (): boolean => {
  const consent = localStorage.getItem('cookieConsent')
  const consentDate = localStorage.getItem('cookieConsentDate')
  
  if (!consent || !consentDate) {
    return false
  }
  
  try {
    const preferences = JSON.parse(consent)
    const date = new Date(consentDate)
    const now = new Date()
    
    // Check if consent is older than 1 year (optional: you might want to re-ask)
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
    
    return date > oneYearAgo && preferences.essential === true
  } catch (error) {
    console.error('Error validating cookie consent:', error)
    return false
  }
}
