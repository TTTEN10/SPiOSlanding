import Header from './Header'
import Footer from './Footer'
import WaitlistSignupSection from './WaitlistSignupSection'
import { useScrollReveal } from '../hooks/useScrollReveal.ts'

export default function AlmostThere() {
  useScrollReveal()

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main id="main-content" className="flex-1" role="main" aria-label="Beta waitlist" tabIndex={-1}>
        <div className="container-max section-padding py-8 lg:py-12 relative overflow-hidden">
          <div className="pointer-events-none absolute -top-28 -left-20 w-72 h-72 rounded-full bg-primary-400/20 blur-3xl animate-pulse" />
          <div className="pointer-events-none absolute top-64 -right-24 w-72 h-72 rounded-full bg-secondary-400/20 blur-3xl animate-pulse" />
          <p
            className="scroll-reveal text-center text-heading font-medium text-2xl sm:text-3xl lg:text-4xl leading-snug max-w-3xl mx-auto mb-8 sm:mb-10 lg:mb-12 px-2"
            data-reveal
          >
            Beta will be available soon, join the waitlist below to stay updated.
          </p>
          <WaitlistSignupSection idPrefix="almost" showBetaTagline={false} />
        </div>
      </main>
      <Footer />
    </div>
  )
}
