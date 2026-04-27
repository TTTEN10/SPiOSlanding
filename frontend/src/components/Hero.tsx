import React from 'react'
import { Shield, Heart, Users } from 'lucide-react'

const Hero: React.FC = () => {
  return (
    <section className="section-padding py-16 lg:py-24">
      <div className="container-max">
        {/* Main Hero Section */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-20">
          {/* Left Column - Headline */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Revolutionizing{' '}
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Mental Wellness Support
                </span>{' '}
                with Privacy-First Technology
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed max-w-2xl whitespace-normal break-words [text-wrap:pretty]">
                SafePsy offers a secure, AI-assisted space for reflection and between-session support, powered by wallet-based identity and encrypted storage.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="btn-primary text-lg px-8 py-4">
                Join Our Waitlist
              </button>
              <button className="btn-secondary text-lg px-8 py-4">
                Learn More
              </button>
            </div>
          </div>

          {/* Right Column - Illustration Placeholder */}
          <div className="relative">
            <div className="bg-gradient-to-br from-primary-100 to-secondary-100 rounded-3xl p-8 lg:p-12 h-96 lg:h-[500px] flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
                  <Shield className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-700">
                  Secure Therapy Platform
                </h3>
                <p className="text-gray-600">
                  Illustration placeholder for SafePsy platform
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Values Section */}
        <div className="text-center py-16">
          <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-8">
              <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                Secure. Ethical. Human-centered.
              </span>
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8 mt-12">
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-primary-100 rounded-full flex items-center justify-center">
                  <Shield className="w-8 h-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Secure</h3>
                <p className="text-gray-600">
                  Chat and summary data are encrypted at rest using AES-256-GCM (only ciphertext is stored). Keys are derived from your wallet and not stored on our servers. To generate AI responses, content is decrypted temporarily in server memory during the request (not strict end-to-end encryption).
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-secondary-100 rounded-full flex items-center justify-center">
                  <Heart className="w-8 h-8 text-secondary-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Ethical</h3>
                <p className="text-gray-600">
                  Transparent AI algorithms and ethical guidelines protect your mental health journey.
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-accent-100 rounded-full flex items-center justify-center">
                  <Users className="w-8 h-8 text-accent-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Human-centered</h3>
                <p className="text-gray-600">
                  Technology that enhances human connection, not replaces it.
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
