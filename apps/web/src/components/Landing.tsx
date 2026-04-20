import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Shield, Heart, Users, ArrowRight, Sparkles, BadgeCheck } from 'lucide-react'
import Header from './Header'
import Footer from './Footer'
import WaitlistSignupSection from './WaitlistSignupSection'
import { useOffline } from '../hooks/useOffline'
import { FAQ_ITEMS } from '../data/faq'
import FAQAccordion from './FAQAccordion'
import { useScrollReveal } from '../hooks/useScrollReveal.ts'

export default function Landing() {
  const { isOffline } = useOffline()
  const ctaLabel = useMemo(() => (isOffline ? 'Queue for later' : 'Try beta'), [isOffline])

  useScrollReveal()

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main id="main-content" className="flex-1" role="main" aria-label="Landing" tabIndex={-1}>
        <div className="container-max section-padding py-8 lg:py-12 space-y-14 lg:space-y-20 relative overflow-hidden">
          <div className="pointer-events-none absolute -top-28 -left-20 w-72 h-72 rounded-full bg-primary-400/20 blur-3xl animate-pulse" />
          <div className="pointer-events-none absolute top-64 -right-24 w-72 h-72 rounded-full bg-secondary-400/20 blur-3xl animate-pulse" />

          <section className="mb-6 scroll-reveal" data-reveal>
            <div className="max-w-5xl mx-auto bg-white/70 dark:bg-black/30 backdrop-blur-sm rounded-3xl border border-neutral-dark/20 dark:border-white/20 p-6 sm:p-8 lg:p-12 hover-soft-fade">
              <p className="inline-flex items-center gap-2 text-sm sm:text-base text-heading mb-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700 rounded-full px-4 py-2">
                <Sparkles className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                Private reflection · A mindful gateway
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl text-heading leading-tight font-normal fade-in">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent font-bold whitespace-nowrap text-[0.85em]">
                  Feel better without giving up your story
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-body leading-relaxed mt-6 max-w-3xl whitespace-nowrap">
                Dr. Safe for ethical AI support, secured by wallet-based identity and encrypted continuity by design.
              </p>
              <p className="text-lg sm:text-xl text-body leading-relaxed mt-6 max-w-3xl">
                No data sharing. No model training.
                <br />
                <br />
                Your memories are encrypted so only you can access them through your private keys.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link to="/almost-there" className="btn-try-beta" aria-label="Start talking">
                  Start talking
                  <ArrowRight className="w-5 h-5 shrink-0" aria-hidden="true" />
                </Link>
                <Link
                  to="/explore"
                  className="btn-secondary btn-gentle-scale inline-flex items-center justify-center text-base sm:text-lg px-6"
                  aria-label="Explore SafePsy"
                >
                  Explore
                </Link>
              </div>
            </div>
          </section>

          <section className="scroll-reveal" data-reveal>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-heading mb-8 text-center">
              <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">Why you can trust Dr. Safe</span>
            </h2>
            <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-5">
              <div className="p-6 rounded-2xl border border-neutral-200 dark:border-white/20 bg-white/70 dark:bg-black/20 hover-soft-fade">
                <BadgeCheck className="w-7 h-7 text-secondary-600 dark:text-secondary-400 mb-3" />
                <p className="text-body text-sm sm:text-base"><strong className="text-heading">Privacy & security:</strong> Chat and summary data are encrypted at rest using AES-256-GCM (only ciphertext is stored). Data is transmitted over TLS 1.3. We do not log chat message content. Keys are derived from your wallet and not stored on SafePsy servers.</p>
              </div>
              <div className="p-6 rounded-2xl border border-neutral-200 dark:border-white/20 bg-white/70 dark:bg-black/20 hover-soft-fade">
                <Shield className="w-7 h-7 text-primary-600 dark:text-primary-400 mb-3" />
                <p className="text-body text-sm sm:text-base"><strong className="text-heading">Clinical boundaries:</strong> Dr. Safe is not a substitute for licensed therapy and does not provide diagnosis or medical treatment.</p>
              </div>
              <div className="p-6 rounded-2xl border border-neutral-200 dark:border-white/20 bg-white/70 dark:bg-black/20 hover-soft-fade">
                <Users className="w-7 h-7 text-accent-600 dark:text-accent-400 mb-3" />
                <p className="text-body text-sm sm:text-base"><strong className="text-heading">Compliance language:</strong> we implement measures aimed at GDPR compliance and support HIPAA-style safeguards (no HIPAA certification claim).</p>
              </div>
              <div className="p-6 rounded-2xl border border-neutral-200 dark:border-white/20 bg-white/70 dark:bg-black/20 hover-soft-fade">
                <Heart className="w-7 h-7 text-secondary-600 dark:text-secondary-400 mb-3" />
                <p className="text-body text-sm sm:text-base"><strong className="text-heading">Transparency:</strong> DID operations run on Sepolia Testnet; on-chain metadata is public, while chat content is off-chain and encrypted.</p>
              </div>
            </div>
            <p className="max-w-4xl mx-auto text-center text-body mt-6 text-xs sm:text-sm opacity-90">
              Important: SafePsy uses client-side encryption for storage, but it is not strict end-to-end encryption because the server must decrypt temporarily in memory to request AI responses.
            </p>
          </section>

          <WaitlistSignupSection idPrefix="landing" />

          <section id="faq" className="scroll-reveal" data-reveal>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-heading mb-8 text-center">
              <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                Frequently asked questions
              </span>
            </h2>
            <FAQAccordion items={FAQ_ITEMS} answerClassName="text-xs sm:text-sm" />
          </section>
        </div>
      </main>
      <div className="fixed bottom-4 right-4 z-40">
        <Link
          to="/almost-there"
          className="btn-try-beta"
          aria-label="Try SafePsy beta"
        >
          {ctaLabel}
          <ArrowRight className="w-5 h-5 shrink-0" aria-hidden="true" />
        </Link>
      </div>
      <Footer />
    </div>
  )
}
