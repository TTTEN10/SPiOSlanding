import React from 'react'
import { Link } from 'react-router-dom'
import { Cookie, Settings, Shield, Eye, CheckCircle } from 'lucide-react'
import Header from './Header'
import Footer from './Footer'

const Cookies: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Main Content */}
      <main id="main-content" className="flex-1" role="main" aria-label="Cookie Policy" tabIndex={-1}>
        <section className="section-padding py-8 lg:py-12">
          <div className="container-max">
            {/* Hero Section */}
            <div className="text-center mb-16">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl text-heading leading-tight mb-6">
                <span className="text-[1.08em]">Cookie</span>{' '}
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent text-[1.2em] font-bold">
                  Policy
                </span>
              </h1>
              <p className="text-xl text-body leading-relaxed max-w-3xl mx-auto">
                How SafePsy uses cookies and similar technologies to enhance your experience while protecting your privacy. You own your data; we don&apos;t store it with third parties or use it to train AI models.
              </p>
            </div>


            {/* What Are Cookies */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16">
              <h2 className="text-3xl lg:text-4xl text-heading mb-8 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  What Are Cookies?
                </span>
              </h2>
              <div className="space-y-6">
                <p className="text-lg text-body leading-relaxed text-center max-w-4xl mx-auto">
                  Cookies are small text files that are stored on your device when you visit a website. They help websites 
                  remember information about your visit, such as your preferred language and other settings, making your 
                  next visit easier and the site more useful to you.
                </p>
                <div className="grid md:grid-cols-3 gap-8">
                  <div className="space-y-4 text-center">
                    <div className="w-16 h-16 mx-auto bg-primary-100 rounded-full flex items-center justify-center border border-primary-200">
                      <Cookie className="w-8 h-8 text-primary-600" />
                    </div>
                    <h3 className="text-xl text-heading">Small Files</h3>
                    <p className="text-body">
                      Tiny text files stored on your device to remember your preferences
                    </p>
                  </div>
                  
                  <div className="space-y-4 text-center">
                    <div className="w-16 h-16 mx-auto bg-secondary-100 rounded-full flex items-center justify-center border border-secondary-200">
                      <Settings className="w-8 h-8 text-secondary-600" />
                    </div>
                    <h3 className="text-xl text-heading">User Experience</h3>
                    <p className="text-body">
                      Help personalize your experience and remember your settings
                    </p>
                  </div>
                  
                  <div className="space-y-4 text-center">
                    <div className="w-16 h-16 mx-auto bg-accent-100 rounded-full flex items-center justify-center border border-accent-200">
                      <Shield className="w-8 h-8 text-accent-600" />
                    </div>
                    <h3 className="text-xl text-heading">Privacy Safe</h3>
                    <p className="text-body">
                      Used responsibly with your privacy and security in mind
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Types of Cookies We Use */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16">
              <h2 className="text-3xl lg:text-4xl text-heading mb-8 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Types of Cookies We Use
                </span>
              </h2>
              
              <div className="space-y-8">
                {/* Essential Cookies */}
                <div className="border border-green-200 dark:border-green-800 rounded-xl p-6 bg-green-50 dark:bg-green-900/20">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center border border-green-200 dark:border-green-700 flex-shrink-0">
                      <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl text-heading mb-3">Essential Cookies</h3>
                      <p className="text-body mb-4">
                        These cookies are necessary for the website to function properly and cannot be disabled. 
                        They enable basic functions like page navigation, access to secure areas, and remembering 
                        your login status.
                      </p>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-lg text-heading mb-2">Examples:</h4>
                          <ul className="space-y-1 text-body">
                            <li>• Authentication cookies</li>
                            <li>• Security tokens</li>
                            <li>• Session management</li>
                            <li>• Load balancing</li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-lg text-heading mb-2">Duration:</h4>
                          <p className="text-body">Session-based or up to 30 days</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Functional Cookies */}
                <div className="border border-blue-200 dark:border-blue-800 rounded-xl p-6 bg-blue-50 dark:bg-blue-900/20">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center border border-blue-200 dark:border-blue-700 flex-shrink-0">
                      <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl text-heading mb-3">Functional Cookies</h3>
                      <p className="text-body mb-4">
                        These cookies enhance your experience by remembering your preferences and choices. 
                        They help us provide personalized features and improve the usability of our platform.
                      </p>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-lg text-heading mb-2">Examples:</h4>
                          <ul className="space-y-1 text-body">
                            <li>• Language preferences</li>
                            <li>• Theme settings</li>
                            <li>• Accessibility options</li>
                            <li>• User interface preferences</li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-lg text-heading mb-2">Duration:</h4>
                          <p className="text-body">Up to 12 months</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Analytics Cookies */}
                <div className="border border-purple-200 dark:border-purple-800 rounded-xl p-6 bg-purple-50 dark:bg-purple-900/20">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center border border-purple-200 dark:border-purple-700 flex-shrink-0">
                      <Eye className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl text-heading mb-3">Analytics Cookies</h3>
                      <p className="text-body mb-4">
                        These cookies help us understand how visitors interact with our website by collecting 
                        and reporting information anonymously. This helps us improve our services and user experience.
                      </p>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-lg text-heading mb-2">Examples:</h4>
                          <ul className="space-y-1 text-body">
                            <li>• Page views and navigation</li>
                            <li>• Feature usage statistics</li>
                            <li>• Performance metrics</li>
                            <li>• Error tracking</li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-lg text-heading mb-2">Duration:</h4>
                          <p className="text-body">Up to 24 months</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cookie Management */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16">
              <h2 className="text-3xl lg:text-4xl text-heading mb-8 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Managing Your Cookie Preferences
                </span>
              </h2>
              
              <div className="space-y-8">
                <p className="text-lg text-body leading-relaxed text-center max-w-4xl mx-auto">
                  You have control over which cookies you accept. You can manage your cookie preferences through 
                  your browser settings or our cookie consent manager.
                </p>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h3 className="text-2xl text-heading">Browser Settings</h3>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                        <div>
                          <h4 className="text-lg text-heading">Chrome</h4>
                          <p className="text-body">Settings → Privacy and security → Cookies and other site data</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                        <div>
                          <h4 className="text-lg text-heading">Firefox</h4>
                          <p className="text-body">Options → Privacy & Security → Cookies and Site Data</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                        <div>
                          <h4 className="text-lg text-heading">Safari</h4>
                          <p className="text-body">Preferences → Privacy → Manage Website Data</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                        <div>
                          <h4 className="text-lg text-heading">Edge</h4>
                          <p className="text-body">Settings → Cookies and site permissions → Cookies and site data</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-2xl text-heading">Cookie Consent Manager</h3>
                    <div className="bg-gray-50 dark:bg-transparent border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                      <p className="text-body dark:text-white mb-4">
                        Our cookie consent manager allows you to:
                      </p>
                      <ul className="space-y-2 text-body dark:text-white">
                        <li className="flex items-start gap-2">
                          <span className="w-2 h-2 bg-primary-600 rounded-full mt-2 flex-shrink-0"></span>
                          Accept or reject different categories of cookies
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-2 h-2 bg-primary-600 rounded-full mt-2 flex-shrink-0"></span>
                          View detailed information about each cookie type
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-2 h-2 bg-primary-600 rounded-full mt-2 flex-shrink-0"></span>
                          Change your preferences at any time
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-2 h-2 bg-primary-600 rounded-full mt-2 flex-shrink-0"></span>
                          Withdraw consent for previously accepted cookies
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>


            {/* Privacy and Security */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16">
              <h2 className="text-3xl lg:text-4xl text-heading mb-8 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Privacy and Security
                </span>
              </h2>
              
              <div className="space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h3 className="text-2xl text-heading">Data Protection</h3>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Shield className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                        <div>
                          <h4 className="text-lg text-heading">Encrypted Storage</h4>
                          <p className="text-body">All cookie data is encrypted and securely stored</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Shield className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                        <div>
                          <h4 className="text-lg text-heading">No Personal Data</h4>
                          <p className="text-body">Cookies do not contain personally identifiable information</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Shield className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                        <div>
                          <h4 className="text-lg text-heading">Secure Transmission</h4>
                          <p className="text-body">All cookie data is transmitted over secure HTTPS connections</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-2xl text-heading">Your Rights</h3>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
                        <div>
                          <h4 className="text-lg text-heading">Right to Access</h4>
                          <p className="text-body">View what cookies are stored on your device</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
                        <div>
                          <h4 className="text-lg text-heading">Right to Delete</h4>
                          <p className="text-body">Remove cookies from your device at any time</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
                        <div>
                          <h4 className="text-lg text-heading">Right to Control</h4>
                          <p className="text-body">Choose which cookies to accept or reject</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl text-heading mb-6">
                Questions About Our Cookie Policy?
              </h2>
              <p className="text-lg text-body mb-8 max-w-2xl mx-auto">
                If you have any questions about how we use cookies or would like to exercise your rights, 
                please{' '}
                <Link 
                  to="/contact-us" 
                  className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent font-semibold hover:from-primary-700 hover:to-secondary-700 transition-all duration-200"
                >
                  contact us
                </Link>
                .
              </p>
            </div>

          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default Cookies
