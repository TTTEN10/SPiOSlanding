import React from 'react'
import { ArrowRight } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'
import ConnectWallet from './ConnectWallet'

interface HeaderProps {
  showBackButton?: boolean
  showTagline?: boolean
}

const Header: React.FC<HeaderProps> = ({ showBackButton = false }) => {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const showTryBeta = pathname === '/'

  return (
    <header className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-2 sm:py-3 fade-in">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 text-heading text-base sm:text-lg">
          {showBackButton && (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="min-h-[44px] min-w-[44px] px-3 rounded-xl border border-gray-200 dark:border-white/20 bg-white/70 dark:bg-neutral-900/50 text-heading hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors"
              aria-label="Go back"
            >
              Back
            </button>
          )}
          <Link to="/" className="h-10 sm:h-12 transition-all duration-300 min-h-[44px] flex items-center group">
            <img
              src="/LogoTransparent1.png"
              alt="SafePsy Logo"
              className="h-10 sm:h-12 transition-all duration-300 group-hover:drop-shadow-lg group-hover:scale-105"
            />
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Desktop nav (simple links) */}
          <nav className="hidden md:flex items-center gap-2">
            {!showTryBeta && (
              <Link to="/explore" className="px-3 py-2 rounded-lg text-sm text-body hover:text-heading hover:bg-gray-50 dark:hover:bg-neutral-900/50 transition-colors">
                Explore
              </Link>
            )}
          </nav>

          {/* Primary action (desktop & mobile) */}
          {showTryBeta ? (
            <Link to="/register" className="btn-try-beta" aria-label="Go to SafePsy registration">
              Register
              <ArrowRight className="w-5 h-5 shrink-0" aria-hidden="true" />
            </Link>
          ) : (
            <div id="wallet-connect-region" className="hidden sm:flex items-center">
              <ConnectWallet />
            </div>
          )}

          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

export default Header
