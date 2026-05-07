import React from 'react'
import { Home, RefreshCw, AlertTriangle, Mail } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'

const ServerError: React.FC = () => {
  const navigate = useNavigate()

  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Main Content */}
      <main id="main-content" className="flex-1" role="main" aria-label="Server error" tabIndex={-1}>
        <section className="section-padding py-8 lg:py-12">
          <div className="container-max">
            {/* Error Content */}
            <div className="text-center max-w-4xl mx-auto px-4">
              {/* Error Code */}
              <div className="mb-6 sm:mb-8">
                <h1 className="text-6xl sm:text-8xl lg:text-9xl xl:text-[12rem] font-bold text-heading leading-none">
                  <span className="bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                    500
                  </span>
                </h1>
              </div>

              {/* Error Message */}
              <div className="mb-8 sm:mb-12">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl text-heading mb-4 sm:mb-6">
                  Internal Server Error
                </h2>
                <p className="text-base sm:text-lg lg:text-xl text-body leading-relaxed max-w-2xl mx-auto">
                  Something went wrong on our end. We're working to fix this issue and get you back to your mental health journey as soon as possible.
                </p>
              </div>

              {/* Visual Element */}
              <div className="mb-8 sm:mb-12">
                <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto bg-white/70 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20">
                  <AlertTriangle className="w-12 h-12 sm:w-16 sm:h-16 text-red-600" />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 sm:mb-12">
                <button 
                  onClick={handleRefresh}
                  className="btn-primary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 flex items-center justify-center gap-2 min-h-[44px] w-full sm:w-auto"
                >
                  <RefreshCw className="w-5 h-5" />
                  Try Again
                </button>
                <button 
                  onClick={() => navigate('/')}
                  className="btn-secondary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 flex items-center justify-center gap-2 min-h-[44px] w-full sm:w-auto"
                >
                  <Home className="w-5 h-5" />
                  Go Home
                </button>
              </div>

              {/* Help Section */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20">
                <h3 className="text-xl sm:text-2xl text-heading mb-4 sm:mb-6">
                  <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                    Need Help?
                  </span>
                </h3>
                <p className="text-sm sm:text-base text-body mb-4 sm:mb-6 max-w-2xl mx-auto">
                  If this problem persists, please don't hesitate to reach out to our support team. 
                  We're here to help you access the mental health support you need.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                  <button 
                    onClick={() => navigate('/contact-us')}
                    className="btn-primary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 flex items-center justify-center gap-2 min-h-[44px] w-full sm:w-auto"
                  >
                    <Mail className="w-5 h-5" />
                    Contact Support
                  </button>
                  <button 
                    onClick={() => navigate('/')}
                    className="btn-secondary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 min-h-[44px] w-full sm:w-auto"
                  >
                    Go to Home
                  </button>
                </div>
              </div>

              {/* Status Information */}
              <div className="mt-8 text-sm text-body opacity-75">
                <p>Error Code: 500 - Internal Server Error</p>
                <p>Timestamp: {new Date().toLocaleString()}</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default ServerError
