import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp } from 'lucide-react'
import Header from './Header'
import Footer from './Footer'
import { SUPPORT_CATEGORIES } from '../data/supportIssues'

const Support: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  let globalIdx = 0

  return (
    <div className="min-h-screen flex flex-col">
      <Header showBackButton={true} />

      <main id="main-content" className="flex-1" role="main" aria-label="Support" tabIndex={-1}>
        <section className="section-padding py-8 lg:py-12">
          <div className="container-max">
            <div className="text-center mb-10 sm:mb-14 px-4">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl text-heading leading-tight mb-4">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent font-bold">
                  Support
                </span>
              </h1>
              <p className="text-body text-sm sm:text-base max-w-2xl mx-auto">
                Quick answers for common issues. If something is not covered here, we are happy to help via{' '}
                <Link to="/contact-us" className="text-primary-600 hover:underline link-hover">
                  Contact
                </Link>
                .
              </p>
            </div>

            <div className="max-w-3xl mx-auto space-y-10 sm:space-y-12 mb-12 sm:mb-16">
              {SUPPORT_CATEGORIES.map((category) => (
                <section key={category.id} aria-labelledby={`support-cat-${category.id}`}>
                  <h2
                    id={`support-cat-${category.id}`}
                    className="text-heading font-semibold text-lg sm:text-xl mb-3 sm:mb-4"
                  >
                    {category.title}
                  </h2>
                  <div className="space-y-1">
                    {category.issues.map((item) => {
                      const i = globalIdx++
                      const isOpen = openIndex === i
                      return (
                        <div key={i} className="border-b border-neutral-200 dark:border-white/20">
                          <button
                            type="button"
                            onClick={() => setOpenIndex(isOpen ? null : i)}
                            className="w-full py-3 sm:py-4 flex items-center justify-between gap-3 text-left min-h-[44px] hover:bg-neutral-50 dark:hover:bg-white/5 rounded-lg transition-colors"
                            aria-expanded={isOpen}
                            aria-controls={`support-answer-${i}`}
                            id={`support-question-${i}`}
                          >
                            <span className="text-heading font-medium text-sm sm:text-base pr-2">{item.q}</span>
                            {isOpen ? (
                              <ChevronUp className="w-4 h-4 text-body flex-shrink-0" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-body flex-shrink-0" />
                            )}
                          </button>
                          <div
                            id={`support-answer-${i}`}
                            role="region"
                            aria-labelledby={`support-question-${i}`}
                            className={`overflow-hidden transition-all duration-200 ease-out ${
                              isOpen ? 'max-h-[min(120vh,2400px)] opacity-100' : 'max-h-0 opacity-0'
                            }`}
                          >
                            <p className="text-body text-sm sm:text-base pb-4 pr-8 whitespace-pre-line">{item.a}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>

            <div className="text-center">
              <Link
                to="/contact-us"
                className="btn-primary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 min-h-[44px] inline-flex items-center justify-center hover:scale-105 active:scale-95 transition-transform duration-200"
              >
                Contact us
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default Support
