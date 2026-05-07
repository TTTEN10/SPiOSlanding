import React from 'react'
import { Home, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'

const NotFound: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Main Content */}
      <main id="main-content" className="flex-1" role="main" aria-label="Page not found" tabIndex={-1}>
        <section className="section-padding py-8 lg:py-12">
          <div className="container-max">
            {/* Error Content */}
            <div className="text-center max-w-4xl mx-auto px-4 fade-in">
              {/* Error Code */}
              <div className="mb-6 sm:mb-8 stagger-item">
                <h1 className="text-6xl sm:text-8xl lg:text-9xl xl:text-[12rem] font-bold text-heading leading-none">
                  <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                    404
                  </span>
                </h1>
              </div>

              {/* Error Message */}
              <div className="mb-8 sm:mb-12">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl text-heading mb-4 sm:mb-6">
                  Page Not Found
                </h2>
                <p className="text-base sm:text-lg lg:text-xl text-body leading-relaxed max-w-2xl mx-auto">
                  The page you're looking for doesn't exist or has been moved. 
                  Let's get you back on track to finding the mental health support you need.
                </p>
              </div>


              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 sm:mb-12 stagger-item">
                <button 
                  onClick={() => navigate('/')}
                  className="btn-primary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 flex items-center justify-center gap-2 min-h-[44px] w-full sm:w-auto hover:scale-105 active:scale-95 transition-transform duration-200 group"
                >
                  <Home className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                  Go Home
                </button>
                <button 
                  onClick={() => navigate(-1)}
                  className="btn-secondary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 flex items-center justify-center gap-2 min-h-[44px] w-full sm:w-auto hover:scale-105 active:scale-95 transition-transform duration-200 group"
                >
                  <ArrowLeft className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-1" />
                  Go Back
                </button>
              </div>

              {/* Helpful Links */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 fade-in card-hover">
                <h3 className="text-xl sm:text-2xl text-heading mb-4 sm:mb-6">
                  <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                    Popular Pages
                  </span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <button 
                    onClick={() => navigate('/')}
                    className="text-sm sm:text-base text-body hover:text-primary-600 transition-all duration-300 p-3 rounded-lg hover:bg-white/50 min-h-[44px] hover:scale-105 active:scale-95"
                  >
                    Home
                  </button>
                  <button 
                    onClick={() => navigate('/explore')}
                    className="text-sm sm:text-base text-body hover:text-primary-600 transition-all duration-300 p-3 rounded-lg hover:bg-white/50 min-h-[44px] hover:scale-105 active:scale-95"
                  >
                    Explore
                  </button>
                  <button 
                    onClick={() => navigate('/contact-us')}
                    className="text-sm sm:text-base text-body hover:text-primary-600 transition-all duration-300 p-3 rounded-lg hover:bg-white/50 min-h-[44px] hover:scale-105 active:scale-95"
                  >
                    Contact
                  </button>
                  <button 
                    onClick={() => navigate('/')}
                    className="text-sm sm:text-base text-body hover:text-primary-600 transition-all duration-300 p-3 rounded-lg hover:bg-white/50 min-h-[44px] hover:scale-105 active:scale-95"
                  >
                    Go to Home
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default NotFound
