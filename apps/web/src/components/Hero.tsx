import React from 'react'
import { Shield, Heart, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import WaitlistForm from './WaitlistForm'

const Hero: React.FC = () => {
  const navigate = useNavigate()

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
          <WaitlistForm title="Get early access and exclusive updates." subtitle="Join our waitlist to be notified when SafePsy is ready." />
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
    </section>
  )
}

export default Hero
