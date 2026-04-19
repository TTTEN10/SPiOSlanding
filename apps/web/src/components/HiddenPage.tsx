import React, { useEffect, useRef } from 'react'
import { Shield, Lock, Eye, CheckCircle, Star, Zap, Heart, Brain, Globe, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'

const HiddenPage: React.FC = () => {
  const navigate = useNavigate()
  const mainContentRef = useRef<HTMLElement>(null)

  // Focus management for accessibility
  useEffect(() => {
    // Focus main content on mount for screen readers
    if (mainContentRef.current) {
      mainContentRef.current.focus()
    }
  }, [])

  // Keyboard navigation handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC to go back
      if (e.key === 'Escape') {
        navigate(-1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate])

  return (
    <div className="min-h-screen flex flex-col">
      <Header showBackButton={true} />

      {/* Skip to main content link (accessibility) */}
      <a 
        href="#main-content" 
        className="skip-to-main sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg focus:outline-2 focus:outline-white"
        aria-label="Skip to main content"
      >
        Skip to main content
      </a>

      {/* Main Content */}
      <main 
        id="main-content" 
        ref={mainContentRef}
        className="flex-1" 
        role="main" 
        aria-label="Administrative portal" 
        tabIndex={-1}
      >
        <section className="section-padding py-8 lg:py-12" aria-labelledby="page-heading">
          <div className="container-max">
            {/* Page Title */}
            <div className="text-center mb-12 sm:mb-16 px-4 fade-in">
              <h1 
                id="page-heading"
                className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl text-heading leading-tight mb-4 sm:mb-6"
              >
                <span className="text-[1.08em] stagger-item">Administrative</span>{' '}
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent text-[1.2em] font-bold stagger-item">
                  Portal
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-body max-w-2xl mx-auto" role="doc-subtitle">
                Secure access portal with comprehensive accessibility and SEO optimization
              </p>
            </div>

            {/* Features Grid */}
            <div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-16"
              role="list"
              aria-label="Feature list"
            >
              <article 
                className="bg-white/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 fade-in card-hover stagger-item"
                role="listitem"
                aria-labelledby="feature-1"
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-primary-100 rounded-full flex items-center justify-center border border-primary-200 dark:bg-primary-900/30 dark:border-primary-700 transition-all duration-300 hover:scale-110 hover:shadow-lg" aria-hidden="true">
                  <Shield className="w-8 h-8 text-primary-600 dark:text-primary-400 icon-hover" aria-hidden="true" />
                </div>
                <h2 id="feature-1" className="text-xl sm:text-2xl text-heading mb-4 text-center">
                  WCAG 2.1 AAA Compliance
                </h2>
                <p className="text-body text-center">
                  Fully compliant with Web Content Accessibility Guidelines 2.1 Level AAA standards, ensuring maximum accessibility for all users.
                </p>
              </article>

              <article 
                className="bg-white/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 fade-in card-hover stagger-item"
                role="listitem"
                aria-labelledby="feature-2"
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-secondary-100 rounded-full flex items-center justify-center border border-secondary-200 dark:bg-secondary-900/30 dark:border-secondary-700 transition-all duration-300 hover:scale-110 hover:shadow-lg" aria-hidden="true">
                  <Lock className="w-8 h-8 text-secondary-600 dark:text-secondary-400 icon-hover" aria-hidden="true" />
                </div>
                <h2 id="feature-2" className="text-xl sm:text-2xl text-heading mb-4 text-center">
                  Complete SEO Optimization
                </h2>
                <p className="text-body text-center">
                  Comprehensive SEO setup including structured data, Open Graph tags, Twitter cards, and semantic HTML markup.
                </p>
              </article>

              <article 
                className="bg-white/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 fade-in card-hover stagger-item"
                role="listitem"
                aria-labelledby="feature-3"
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-accent-100 rounded-full flex items-center justify-center border border-accent-200 dark:bg-accent-900/30 dark:border-accent-700 transition-all duration-300 hover:scale-110 hover:shadow-lg" aria-hidden="true">
                  <Eye className="w-8 h-8 text-accent-600 dark:text-accent-400 icon-hover" aria-hidden="true" />
                </div>
                <h2 id="feature-3" className="text-xl sm:text-2xl text-heading mb-4 text-center">
                  Lighthouse Score ≥ 90
                </h2>
                <p className="text-body text-center">
                  Optimized for performance, accessibility, best practices, and SEO with Lighthouse scores exceeding 90 across all categories.
                </p>
              </article>

              <article 
                className="bg-white/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 fade-in card-hover stagger-item"
                role="listitem"
                aria-labelledby="feature-4"
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-primary-100 rounded-full flex items-center justify-center border border-primary-200 dark:bg-primary-900/30 dark:border-primary-700 transition-all duration-300 hover:scale-110 hover:shadow-lg" aria-hidden="true">
                  <CheckCircle className="w-8 h-8 text-primary-600 dark:text-primary-400 icon-hover" aria-hidden="true" />
                </div>
                <h2 id="feature-4" className="text-xl sm:text-2xl text-heading mb-4 text-center">
                  Semantic HTML5
                </h2>
                <p className="text-body text-center">
                  Proper use of semantic HTML5 elements including article, section, nav, and main with appropriate ARIA labels and roles.
                </p>
              </article>

              <article 
                className="bg-white/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 fade-in card-hover stagger-item"
                role="listitem"
                aria-labelledby="feature-5"
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-secondary-100 rounded-full flex items-center justify-center border border-secondary-200 dark:bg-secondary-900/30 dark:border-secondary-700 transition-all duration-300 hover:scale-110 hover:shadow-lg" aria-hidden="true">
                  <Star className="w-8 h-8 text-secondary-600 dark:text-secondary-400 icon-hover" aria-hidden="true" />
                </div>
                <h2 id="feature-5" className="text-xl sm:text-2xl text-heading mb-4 text-center">
                  Keyboard Navigation
                </h2>
                <p className="text-body text-center">
                  Full keyboard accessibility with skip links, focus management, and proper tab order throughout the interface.
                </p>
              </article>

              <article 
                className="bg-white/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 fade-in card-hover stagger-item"
                role="listitem"
                aria-labelledby="feature-6"
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-accent-100 rounded-full flex items-center justify-center border border-accent-200 dark:bg-accent-900/30 dark:border-accent-700 transition-all duration-300 hover:scale-110 hover:shadow-lg" aria-hidden="true">
                  <Zap className="w-8 h-8 text-accent-600 dark:text-accent-400 icon-hover" aria-hidden="true" />
                </div>
                <h2 id="feature-6" className="text-xl sm:text-2xl text-heading mb-4 text-center">
                  Performance Optimized
                </h2>
                <p className="text-body text-center">
                  Optimized images, lazy loading, code splitting, and efficient rendering for maximum performance scores.
                </p>
              </article>
            </div>

            {/* Accessibility Features Section */}
            <section 
              className="bg-white/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12 xl:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-12 sm:mb-16 fade-in card-hover"
              aria-labelledby="accessibility-heading"
            >
              <h2 
                id="accessibility-heading"
                className="text-2xl sm:text-3xl lg:text-4xl text-heading mb-8 sm:mb-12 text-center px-2"
              >
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Accessibility Features
                </span>
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8" role="list" aria-label="Accessibility features">
                <div role="listitem" className="flex items-start gap-4">
                  <Heart className="w-6 h-6 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-1" aria-hidden="true" />
                  <div>
                    <h3 className="text-lg sm:text-xl text-heading mb-2">ARIA Labels & Roles</h3>
                    <p className="text-body">
                      Comprehensive ARIA labels, roles, and properties for screen reader compatibility and semantic clarity.
                    </p>
                  </div>
                </div>

                <div role="listitem" className="flex items-start gap-4">
                  <Brain className="w-6 h-6 text-secondary-600 dark:text-secondary-400 flex-shrink-0 mt-1" aria-hidden="true" />
                  <div>
                    <h3 className="text-lg sm:text-xl text-heading mb-2">Screen Reader Support</h3>
                    <p className="text-body">
                      Optimized content structure with proper headings hierarchy and descriptive alternative text.
                    </p>
                  </div>
                </div>

                <div role="listitem" className="flex items-start gap-4">
                  <Globe className="w-6 h-6 text-accent-600 dark:text-accent-400 flex-shrink-0 mt-1" aria-hidden="true" />
                  <div>
                    <h3 className="text-lg sm:text-xl text-heading mb-2">Responsive Design</h3>
                    <p className="text-body">
                      Fully responsive layout that works seamlessly across all device sizes and orientations.
                    </p>
                  </div>
                </div>

                <div role="listitem" className="flex items-start gap-4">
                  <Eye className="w-6 h-6 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-1" aria-hidden="true" />
                  <div>
                    <h3 className="text-lg sm:text-xl text-heading mb-2">Color Contrast</h3>
                    <p className="text-body">
                      WCAG AAA compliant color contrast ratios for text and interactive elements.
                    </p>
                  </div>
                </div>

                <div role="listitem" className="flex items-start gap-4">
                  <Shield className="w-6 h-6 text-secondary-600 dark:text-secondary-400 flex-shrink-0 mt-1" aria-hidden="true" />
                  <div>
                    <h3 className="text-lg sm:text-xl text-heading mb-2">Focus Indicators</h3>
                    <p className="text-body">
                      Visible and clear focus indicators for keyboard navigation with appropriate focus management.
                    </p>
                  </div>
                </div>

                <div role="listitem" className="flex items-start gap-4">
                  <Lock className="w-6 h-6 text-accent-600 dark:text-accent-400 flex-shrink-0 mt-1" aria-hidden="true" />
                  <div>
                    <h3 className="text-lg sm:text-xl text-heading mb-2">Reduced Motion</h3>
                    <p className="text-body">
                      Respects user preferences for reduced motion and provides static alternatives when needed.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* SEO Features Section */}
            <section 
              className="bg-white/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12 xl:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-12 sm:mb-16 fade-in card-hover"
              aria-labelledby="seo-heading"
            >
              <h2 
                id="seo-heading"
                className="text-2xl sm:text-3xl lg:text-4xl text-heading mb-8 sm:mb-12 text-center px-2"
              >
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  SEO Optimization
                </span>
              </h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl sm:text-2xl text-heading mb-4">Meta Tags & Open Graph</h3>
                  <ul className="space-y-3 text-body list-disc list-inside" role="list">
                    <li>Complete Open Graph protocol implementation</li>
                    <li>Twitter Card meta tags (summary_large_image)</li>
                    <li>Canonical URLs for proper indexing</li>
                    <li>Language and locale meta tags</li>
                    <li>Mobile-optimized viewport settings</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl text-heading mb-4">Structured Data (JSON-LD)</h3>
                  <ul className="space-y-3 text-body list-disc list-inside" role="list">
                    <li>Organization schema markup</li>
                    <li>Website schema for search engines</li>
                    <li>BreadcrumbList navigation schema</li>
                    <li>Article schema when applicable</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl text-heading mb-4">Technical SEO</h3>
                  <ul className="space-y-3 text-body list-disc list-inside" role="list">
                    <li>Semantic HTML5 structure</li>
                    <li>Proper heading hierarchy (H1-H6)</li>
                    <li>Alt text for all images</li>
                    <li>Fast page load times</li>
                    <li>Mobile-first responsive design</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Back Button */}
            <div className="text-center fade-in">
              <button
                onClick={() => navigate(-1)}
                className="btn-primary inline-flex items-center gap-2"
                aria-label="Go back to previous page"
              >
                <ArrowLeft className="w-5 h-5" aria-hidden="true" />
                <span>Go Back</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default HiddenPage
