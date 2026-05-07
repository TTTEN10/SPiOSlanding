import React from 'react'
import { ArrowRight } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'

const Header: React.FC = () => {
  const { pathname } = useLocation()
  const showTryBeta = pathname === '/'

  return (
    <header className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-2 sm:py-3 fade-in">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 text-heading text-base sm:text-lg">
          <Link to="/" className="h-10 sm:h-12 transition-all duration-300 min-h-[44px] flex items-center group">
            <img
              src="/LogoTransparent1.png"
              alt="SafePsy Logo"
              className="h-10 sm:h-12 transition-all duration-300 group-hover:drop-shadow-lg group-hover:scale-105"
            />
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Primary action (desktop & mobile) */}
          {showTryBeta ? (
            <Link to="/register" className="btn-try-beta" aria-label="Go to SafePsy registration">
              Register
              <ArrowRight className="w-5 h-5 shrink-0" aria-hidden="true" />
            </Link>
          ) : null}

          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

export default Header
