import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Wallet, HelpCircle, Mail, X, ChevronRight } from 'lucide-react'

const BETA_TUTORIAL_KEY = 'safepsyBetaTutorialDismissed'

export default function BetaTutorial() {
  const [isVisible, setIsVisible] = useState(() => {
    try {
      return !localStorage.getItem(BETA_TUTORIAL_KEY)
    } catch {
      return true
    }
  })

  useEffect(() => {
    try {
      if (!isVisible) localStorage.setItem(BETA_TUTORIAL_KEY, 'true')
    } catch {}
  }, [isVisible])

  const handleDismiss = () => {
    setIsVisible(false)
    try {
      localStorage.setItem(BETA_TUTORIAL_KEY, 'true')
    } catch {}
  }

  if (!isVisible) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 fade-in" aria-hidden="true" />
      <div className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4 fade-in" role="dialog" aria-labelledby="beta-tutorial-title" aria-describedby="beta-tutorial-desc">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/95 backdrop-blur-sm border border-neutral-200 dark:bg-black/95 dark:border-white/20 rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 lg:p-8 card-hover">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-100 rounded-full flex items-center justify-center border border-primary-200 dark:bg-primary-900/30 dark:border-primary-700 flex-shrink-0">
                  <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h3 id="beta-tutorial-title" className="text-lg sm:text-xl font-semibold text-heading">
                    SafePsy Beta – Quickstart
                  </h3>
                  <p id="beta-tutorial-desc" className="text-sm sm:text-base text-body mt-1">
                    Get started in a few steps.
                  </p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-300 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Close tutorial"
              >
                <X className="w-5 h-5 text-neutral-600 dark:text-gray-400" />
              </button>
            </div>

            <div className="space-y-4 text-body text-sm sm:text-base">
              <div>
                <h4 className="font-semibold text-heading mb-2 flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-primary-600" />
                  Quick steps
                </h4>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Connect your wallet (top right).</li>
                  <li>Verify your wallet with a one-time signature.</li>
                  <li>Start chatting with Dr. Safe in the box below.</li>
                  <li>Your conversations are encrypted and tied to your wallet.</li>
                </ol>
              </div>

              <div className="border-t border-neutral-200 dark:border-white/20 pt-4 flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0" />
                  <span><strong className="text-heading">Connect:</strong> Use the &quot;Connect Wallet&quot; button in the header to link MetaMask or another Web3 wallet.</span>
                </div>
                <Link
                  to="/#faq"
                  className="inline-flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:underline font-medium"
                >
                  <HelpCircle className="w-5 h-5 flex-shrink-0" />
                  FAQ &amp; help
                </Link>
                <Link
                  to="/contact-us"
                  className="inline-flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:underline font-medium"
                >
                  <Mail className="w-5 h-5 flex-shrink-0" />
                  Contact support
                </Link>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-white/20">
              <button
                onClick={handleDismiss}
                className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white rounded-xl font-medium transition-all duration-300 min-h-[44px] text-sm sm:text-base"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
