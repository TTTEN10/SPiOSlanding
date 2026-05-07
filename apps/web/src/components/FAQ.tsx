import { Link } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import { FAQ_ITEMS } from '../data/faq'
import FAQAccordion from './FAQAccordion'

const FAQ: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main id="main-content" className="flex-1" role="main" aria-label="FAQ" tabIndex={-1}>
        <section className="section-padding py-8 lg:py-12">
          <div className="container-max">
            <div className="text-center mb-12 sm:mb-16 px-4">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl text-heading leading-tight mb-4">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent font-bold">
                  Frequently asked questions
                </span>
              </h1>
            </div>

            <div className="mb-12 sm:mb-16">
              <FAQAccordion items={FAQ_ITEMS} answerClassName="text-sm sm:text-base" />
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

export default FAQ
