import React from 'react'
import { Mail, Instagram, Linkedin } from 'lucide-react'

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container-max section-padding py-12">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent">
              SafePsy
            </h3>
            <p className="text-gray-300">
              Revolutionizing online therapy with privacy-first technology.
            </p>
          </div>

          {/* Contact Links */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Contact</h4>
            <div className="space-y-3">
              <a
                href="mailto:hello@safepsy.com"
                className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors"
                aria-label="Email us at hello@safepsy.com"
              >
                <Mail className="w-5 h-5" />
                hello@safepsy.com
              </a>
              <a
                href="https://instagram.com/safepsy"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors"
                aria-label="Follow us on Instagram"
              >
                <Instagram className="w-5 h-5" />
                @safepsy
              </a>
              <a
                href="https://linkedin.com/company/safepsy"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors"
                aria-label="Connect with us on LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
                SafePsy
              </a>
            </div>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Legal</h4>
            <div className="space-y-2 text-gray-300">
              <p className="text-sm">
                © 2024 SafePsy. All rights reserved.
              </p>
              <p className="text-sm">
                Privacy-first by design.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-400 text-sm">
            Built with privacy, security, and human-centered design.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
