import React, { useEffect, useState } from 'react'
import { ArrowRight, Menu, X } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'

const Header: React.FC = () => {
  const { pathname } = useLocation()
  const showTryBeta = pathname === '/'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  const navItems: Array<{ to: string; label: string }> = [
    { to: '/beta/chat', label: 'Chat (beta)' },
    { to: '/feedback', label: 'Feedback' },
    { to: '/contact-us', label: 'Contact' },
    { to: '/sap-policy', label: 'Security & privacy' },
    { to: '/tos', label: 'Terms' },
    { to: '/status', label: 'Status' },
  ]

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
          {showTryBeta ? (
            <Link to="/almost-there" className="btn-try-beta" aria-label="Try SafePsy beta">
              Try beta
              <ArrowRight className="w-5 h-5 shrink-0" aria-hidden="true" />
            </Link>
          ) : null}

          <ThemeToggle />

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/20 bg-white/70 dark:bg-neutral-900/50 text-heading hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden mt-3 rounded-2xl border border-gray-200 dark:border-white/20 bg-white/90 dark:bg-neutral-950/80 backdrop-blur p-3 shadow-lg">
          <nav className="grid gap-1" aria-label="Mobile navigation">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`px-3 py-3 rounded-xl text-sm transition-colors ${
                  pathname === item.to
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-heading border border-primary-200 dark:border-primary-800'
                    : 'text-body hover:text-heading hover:bg-gray-50 dark:hover:bg-neutral-900/50'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}

export default Header
