import React, { useState } from 'react'
import { Mail, Instagram, Linkedin, Settings, HelpCircle, LifeBuoy } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import CookieManager from './CookieManager'

const Footer: React.FC = () => {
  const navigate = useNavigate()
  const [isCookieManagerOpen, setIsCookieManagerOpen] = useState(false)

  return (
    <footer className="fade-in">
      <div className="container-max section-padding py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {/* Brand */}
          <div className="space-y-3 sm:space-y-4 sm:col-span-2 md:col-span-2">
            <Link to="/" className="h-10 sm:h-12 hover:drop-shadow-lg transition-all duration-300 inline-block group">
              <img src="/LogoTransparent1.png" alt="SafePsy Logo" className="h-10 sm:h-12 transition-transform duration-300 group-hover:scale-105" />
            </Link>
            <p className="text-text-primary font-titillium font-regular text-base sm:text-[1.1em]">
              Mental Health, Rebuilt on Privacy
            </p>
          </div>

          {/* Contact Links */}
          <div className="space-y-1.5 sm:space-y-2">
            <h4 className="text-base sm:text-lg font-titillium font-semibold text-text-primary dark:text-white leading-tight">Contact</h4>
            <div className="space-y-0.5 sm:space-y-1">
              <button
                type="button"
                onClick={() => navigate('/contact-us')}
                className="flex w-full items-center gap-2 sm:gap-3 text-text-primary hover:text-primary-600 transition-all duration-300 font-titillium font-regular min-h-[36px] py-0.5 text-sm sm:text-base leading-tight group hover:scale-105 active:scale-95 text-left"
                aria-label="Contact us"
              >
                <Mail className="w-5 h-5 dark:text-white flex-shrink-0 transition-transform duration-300 group-hover:scale-110" />
                <span className="text-black dark:text-white link-hover block w-full min-w-0 flex-1 text-left">
                  Contact
                </span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/support')}
                className="flex w-full items-center gap-2 sm:gap-3 text-text-primary hover:text-primary-600 transition-all duration-300 font-titillium font-regular min-h-[36px] py-0.5 text-sm sm:text-base leading-tight group hover:scale-105 active:scale-95 text-left"
                aria-label="Support"
              >
                <LifeBuoy className="w-5 h-5 dark:text-white flex-shrink-0 transition-transform duration-300 group-hover:scale-110" />
                <span className="text-black dark:text-white link-hover block w-full min-w-0 flex-1 text-left">
                  Support
                </span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/faq')}
                className="flex w-full items-center gap-2 sm:gap-3 text-text-primary hover:text-primary-600 transition-all duration-300 font-titillium font-regular min-h-[36px] py-0.5 text-sm sm:text-base leading-tight group hover:scale-105 active:scale-95 text-left"
                aria-label="FAQ"
              >
                <HelpCircle className="w-5 h-5 dark:text-white flex-shrink-0 transition-transform duration-300 group-hover:scale-110" />
                <span className="text-black dark:text-white link-hover block w-full min-w-0 flex-1 text-left">
                  FAQ
                </span>
              </button>
              <button
                type="button"
                onClick={() => window.open('https://instagram.com/safepsy', '_blank', 'noopener,noreferrer')}
                className="flex w-full items-center gap-2 sm:gap-3 text-text-primary hover:text-primary-600 transition-all duration-300 font-titillium font-regular min-h-[36px] py-0.5 text-sm sm:text-base leading-tight group hover:scale-105 active:scale-95 cursor-pointer text-left"
                aria-label="Follow us on Instagram (opens in new tab)"
              >
                <Instagram className="w-5 h-5 dark:text-white flex-shrink-0 transition-transform duration-300 group-hover:scale-110" />
                <span className="text-black dark:text-white link-hover block w-full min-w-0 flex-1 text-left">@safepsy</span>
              </button>
              <button
                type="button"
                onClick={() => window.open('https://linkedin.com/company/safepsy', '_blank', 'noopener,noreferrer')}
                className="flex w-full items-center gap-2 sm:gap-3 text-text-primary hover:text-primary-600 transition-all duration-300 font-titillium font-regular min-h-[36px] py-0.5 text-sm sm:text-base leading-tight group hover:scale-105 active:scale-95 cursor-pointer text-left"
                aria-label="Connect with us on LinkedIn (opens in new tab)"
              >
                <Linkedin className="w-5 h-5 dark:text-white flex-shrink-0 transition-transform duration-300 group-hover:scale-110" />
                <span className="text-black dark:text-white link-hover block w-full min-w-0 flex-1 text-left">SafePsy</span>
              </button>
            </div>
          </div>

          {/* Legal */}
          <div className="space-y-1.5 sm:space-y-2">
            <h4 className="text-base sm:text-lg font-titillium font-semibold text-text-primary dark:text-white leading-tight">Legal</h4>
            <div className="space-y-0.5 sm:space-y-1">
              <button 
                type="button"
                onClick={() => navigate('/tos')}
                className="text-text-primary font-titillium font-regular hover:text-primary-600 transition-all duration-300 text-left block w-full min-h-[36px] py-0.5 text-sm sm:text-base leading-tight group hover:scale-105 active:scale-95"
              >
                <span className="text-black dark:text-white link-hover block w-full text-left">
                  Terms of Service & Privacy Policy
                </span>
              </button>
              <button 
                type="button"
                onClick={() => navigate('/sap-policy')}
                className="text-text-primary font-titillium font-regular hover:text-primary-600 transition-all duration-300 text-left block w-full min-h-[36px] py-0.5 text-sm sm:text-base leading-tight group hover:scale-105 active:scale-95"
              >
                <span className="text-black dark:text-white link-hover block w-full text-left">
                  Security and Privacy Policy
                </span>
              </button>
              <button 
                type="button"
                onClick={() => navigate('/cookies')}
                className="text-text-primary font-titillium font-regular hover:text-primary-600 transition-all duration-300 text-left block w-full min-h-[36px] py-0.5 text-sm sm:text-base leading-tight group hover:scale-105 active:scale-95"
              >
                <span className="text-black dark:text-white link-hover block w-full text-left">
                  Cookie Policy
                </span>
              </button>
              <button 
                type="button"
                onClick={() => setIsCookieManagerOpen(true)}
                className="flex w-full items-center gap-2 text-text-primary font-titillium font-regular hover:text-primary-600 transition-all duration-300 text-left min-h-[36px] py-0.5 text-sm sm:text-base leading-tight group hover:scale-105 active:scale-95"
              >
                <Settings className="w-4 h-4 dark:text-white flex-shrink-0 transition-transform duration-300 group-hover:rotate-90" />
                <span className="text-black dark:text-white link-hover block w-full min-w-0 flex-1 text-left">
                  Cookie Preferences
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-text-primary/20 dark:border-white/20 mt-6 sm:mt-8 pt-6 sm:pt-8 text-center space-y-2">
          <p className="text-text-primary text-xs sm:text-sm font-noto font-light px-4">
            Built for privacy and security.
          </p>
          <p className="text-text-primary text-xs sm:text-sm font-titillium font-regular px-4">
            © 2026 SafePsy. All rights reserved.
          </p>
        </div>
      </div>
      
      {/* Cookie Manager Modal */}
      <CookieManager 
        isOpen={isCookieManagerOpen} 
        onClose={() => setIsCookieManagerOpen(false)} 
      />
    </footer>
  )
}

export default Footer
