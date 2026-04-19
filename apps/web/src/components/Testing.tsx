import ChatWidget from './ChatWidget';
import Header from './Header';
import Footer from './Footer';
import DIDTokenVisualization from './DIDTokenVisualization';
import DIDProfile from './DIDProfile';
import BetaTutorial from './BetaTutorial';

export default function Testing() {
  return (
    <div className="min-h-screen flex flex-col">
      <BetaTutorial />
      <Header showBackButton={true} />

      {/* Main Content */}
      <main id="main-content" className="flex-1" role="main" aria-label="AI chat" tabIndex={-1}>
        <section className="section-padding py-8 lg:py-12">
          <div className="container-max">
            {/* Hero Section */}
            <div className="text-center mb-12 sm:mb-16 px-4 fade-in">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl text-heading leading-tight mb-4 sm:mb-6">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent text-[1.2em] font-bold stagger-item">
                  Chat with Dr. Safe
                </span>
              </h1>
              <p className="max-w-2xl mx-auto mt-4 text-sm sm:text-base text-body">
                You can chat as a guest (no wallet, five messages per session, nothing saved) or connect a wallet to
                encrypt and keep your history.
              </p>
              <div className="max-w-3xl mx-auto mt-6">
                <div className="grid grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
                  <div className="p-3 rounded-xl border border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20">
                    <p className="text-heading font-semibold">Step 1</p>
                    <p className="text-body">Try chat or connect</p>
                  </div>
                  <div className="p-3 rounded-xl border border-secondary-300 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-900/20">
                    <p className="text-heading font-semibold">Step 2</p>
                    <p className="text-body">Secure DID</p>
                  </div>
                  <div className="p-3 rounded-xl border border-accent-300 dark:border-accent-700 bg-accent-50 dark:bg-accent-900/20">
                    <p className="text-heading font-semibold">Step 3</p>
                    <p className="text-body">Full sessions</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Widget Section */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12 shadow-lg border border-neutral-200 dark:border-white/10 mb-12 sm:mb-16 fade-in card-hover">
              <ChatWidget />
            </div>

            {/* Wallet / DID (below chat) */}
            <div className="space-y-8 sm:space-y-12 mb-12 sm:mb-16 fade-in">
              <DIDProfile />
              <DIDTokenVisualization />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

