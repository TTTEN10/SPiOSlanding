import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, Loader2, Activity } from 'lucide-react'
import Header from './Header'
import Footer from './Footer'
import { getApiBaseUrl } from '../config/api'

const API_BASE_URL = getApiBaseUrl()
const MAX_AUTO_REFRESHES = 10; // Maximum number of automatic refreshes

interface HealthStatus {
  live: boolean;
  timestamp?: string;
  error?: string;
}

const Status: React.FC = () => {
  const navigate = useNavigate()
  const [status, setStatus] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [autoRefreshCount, setAutoRefreshCount] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const checkHealth = useCallback(async (_isManual: boolean = false) => {
    setLoading(true)
    
    try {
      // Try multiple health endpoints
      const endpoints = ['/healthz', '/readyz']
      let lastError: Error | null = null

      for (const endpoint of endpoints) {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
        
        try {
          const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          })

          if (response.ok) {
            clearTimeout(timeoutId)
            setStatus({
              live: true,
              timestamp: new Date().toISOString(),
            })
            setLastChecked(new Date())
            setLoading(false)
            return
          }
          
          clearTimeout(timeoutId)
        } catch (error) {
          clearTimeout(timeoutId)
          lastError = error instanceof Error ? error : new Error('Unknown error')
          // Continue to next endpoint
        }
      }

      // If all endpoints failed, mark as not live
      setStatus({
        live: false,
        error: lastError?.message || 'All health check endpoints failed',
        timestamp: new Date().toISOString(),
      })
      setLastChecked(new Date())
    } catch (error) {
      setStatus({
        live: false,
        error: error instanceof Error ? error.message : 'Failed to check health status',
        timestamp: new Date().toISOString(),
      })
      setLastChecked(new Date())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial health check (manual, doesn't count towards quota)
    checkHealth(true)

    // Set up periodic health checks every 30 seconds
    const interval = setInterval(() => {
      setAutoRefreshCount(prevCount => {
        // Check if quota has been reached
        if (prevCount >= MAX_AUTO_REFRESHES) {
          // Clear interval if quota reached
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          return prevCount
        }
        
        // Perform auto-refresh and increment count
        checkHealth(false)
        return prevCount + 1
      })
    }, 30000)

    intervalRef.current = interval

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [checkHealth])

  // Redirect to error page if not live after initial check
  useEffect(() => {
    if (!loading && status && !status.live) {
      // Redirect to server error page after a short delay to show status
      const redirectTimer = setTimeout(() => {
        navigate('/500', { replace: true })
      }, 3000) // Show status for 3 seconds before redirecting

      return () => clearTimeout(redirectTimer)
    }
  }, [loading, status, navigate])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main id="main-content" className="flex-1" role="main" aria-label="System status" tabIndex={-1}>
        <section className="section-padding py-8 lg:py-12">
          <div className="container-max">
            <div className="text-center max-w-4xl mx-auto px-4 fade-in">
              {/* Status Icon */}
              <div className="mb-6 sm:mb-8 stagger-item">
                <div className={`w-24 h-24 sm:w-32 sm:h-32 mx-auto bg-white/70 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 transition-all duration-300 ${
                  loading ? 'animate-pulse' : status?.live ? 'hover:scale-110' : 'hover:scale-110'
                }`}>
                  {loading ? (
                    <Loader2 className="w-12 h-12 sm:w-16 sm:h-16 text-primary-600 animate-spin" />
                  ) : status?.live ? (
                    <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-green-600" />
                  ) : (
                    <XCircle className="w-12 h-12 sm:w-16 sm:h-16 text-red-600" />
                  )}
                </div>
              </div>

              {/* Status Message */}
              <div className="mb-8 sm:mb-12">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl text-heading mb-4 sm:mb-6">
                  <span className={`bg-gradient-to-r bg-clip-text text-transparent ${
                    loading 
                      ? 'from-primary-600 to-secondary-600' 
                      : status?.live 
                        ? 'from-green-600 to-emerald-600' 
                        : 'from-red-600 to-orange-600'
                  }`}>
                    {loading ? 'Checking Status...' : status?.live ? 'System Live' : 'System Offline'}
                  </span>
                </h1>
                <p className="text-base sm:text-lg lg:text-xl text-body leading-relaxed max-w-2xl mx-auto">
                  {loading 
                    ? 'Please wait while we check the system status...'
                    : status?.live 
                      ? 'All systems are operational. SafePsy is running normally.'
                      : 'The system is currently unavailable. Redirecting to error page...'
                  }
                </p>
              </div>

              {/* Status Card */}
              {status && (
                <div className={`bg-white/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-8 sm:mb-12 fade-in card-hover ${
                  status.live ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'
                }`}>
                  <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4">
                    <Activity className={`w-5 h-5 sm:w-6 sm:h-6 ${
                      status.live ? 'text-green-600' : 'text-red-600'
                    }`} />
                    <h3 className="text-xl sm:text-2xl text-heading">Status Details</h3>
                  </div>
                  <div className="space-y-4 text-left max-w-2xl mx-auto">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        status.live ? 'bg-green-500' : 'bg-red-500'
                      } ${status.live ? '' : 'animate-pulse'}`}></div>
                      <span className="text-body">
                        <strong>Status:</strong>{' '}
                        <span className={status.live ? 'text-green-600' : 'text-red-600'}>
                          {status.live ? 'Operational' : 'Offline'}
                        </span>
                      </span>
                    </div>
                    {status.timestamp && (
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-body">
                          <strong>Last Checked:</strong>{' '}
                          {new Date(status.timestamp).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {status.error && (
                      <div className="flex items-start gap-3">
                        <div className="w-3 h-3 bg-orange-500 rounded-full mt-1"></div>
                        <span className="text-body">
                          <strong>Error:</strong>{' '}
                          <span className="text-orange-600">{status.error}</span>
                        </span>
                      </div>
                    )}
                    {API_BASE_URL && (
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <span className="text-body">
                          <strong>API Endpoint:</strong>{' '}
                          <code className="text-sm bg-white/50 dark:bg-black/50 px-2 py-1 rounded">
                            {API_BASE_URL}
                          </code>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Auto-refresh indicator */}
              {lastChecked && (
                <div className="text-center mb-4">
                  {autoRefreshCount < MAX_AUTO_REFRESHES ? (
                    <p className="text-sm text-body opacity-75">
                      Auto-refreshing every 30 seconds ({MAX_AUTO_REFRESHES - autoRefreshCount} remaining). Last checked: {lastChecked.toLocaleTimeString()}
                    </p>
                  ) : (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        <strong>Auto-refresh limit reached:</strong> Automatic refreshes have been disabled after {MAX_AUTO_REFRESHES} attempts. Please use the manual refresh button to check status.
                      </p>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                        Last checked: {lastChecked.toLocaleTimeString()}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Manual refresh button */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                <button 
                  onClick={() => checkHealth(true)}
                  disabled={loading}
                  className="btn-primary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 flex items-center justify-center gap-2 min-h-[44px] w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-transform duration-200"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <Activity className="w-5 h-5" />
                      Refresh Status {autoRefreshCount >= MAX_AUTO_REFRESHES && '(Manual Only)'}
                    </>
                  )}
                </button>
                <button 
                  onClick={() => navigate('/')}
                  className="btn-secondary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 min-h-[44px] w-full sm:w-auto hover:scale-105 active:scale-95 transition-transform duration-200"
                >
                  Go Home
                </button>
              </div>

              {/* Redirect notice */}
              {status && !status.live && !loading && (
                <div className="mt-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    <strong>Notice:</strong> You will be redirected to the error page in a few seconds...
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default Status

