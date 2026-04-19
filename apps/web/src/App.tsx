import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import Explore from './components/Explore'
import SecurityAndPrivacyPolicy from './components/SecurityAndPrivacyPolicy'
import ContactUs from './components/ContactUs'
import Maintenance from './components/Maintenance'
import Cookies from './components/Cookies'
import CookieBanner from './components/CookieBanner'
import SEOHead from './components/SEOHead'
import TermsOfService from './components/TermsOfService'
import Landing from './components/Landing'
import AlmostThere from './components/AlmostThere'
import FAQ from './components/FAQ'
import Support from './components/Support'
import Feedback from './components/Feedback'
import { useSEO } from './hooks/useSEO'
import { useCookieConsent } from './hooks/useCookieConsent'
import { useFocusManagement, useKeyboardNavigation } from './hooks/useFocusManagement'
import { ThemeProvider } from './contexts/ThemeContext'
import { WalletProvider } from './contexts/WalletContext'
import { AuthProvider } from './contexts/AuthContext'

// Component to handle SEO for each route
function RouteWithSEO({ children }: { children: React.ReactNode }) {
  const seoConfig = useSEO();
  useFocusManagement();
  useKeyboardNavigation();
  return (
    <>
      <SEOHead config={seoConfig} />
      {children}
    </>
  );
}

export default function App() {
  const { hasConsentFor } = useCookieConsent()

  // Example of how to conditionally load analytics based on consent
  // You can use hasConsentFor('analytics') to conditionally load tracking scripts
  const handleConsentChange = (preferences: any) => {
    // This is where you can initialize analytics or other services
    // based on the user's consent preferences
    console.log('Cookie consent updated:', preferences)
    
    // Example: Load Google Analytics only if analytics consent is given
    if (preferences.analytics && !hasConsentFor('analytics')) {
      // Initialize analytics here
      console.log('Analytics consent given - initialize tracking')
    }
  }

  return (
    <ThemeProvider>
      <WalletProvider>
        <AuthProvider>
          <HelmetProvider>
          <Router>
            <Routes>
              <Route
                path="/"
                element={
                  <RouteWithSEO>
                    <Landing />
                  </RouteWithSEO>
                }
              />
              <Route path="/about-us" element={<Navigate to="/explore" replace />} />
              <Route
                path="/almost-there"
                element={
                  <RouteWithSEO>
                    <AlmostThere />
                  </RouteWithSEO>
                }
              />
              <Route
                path="/explore"
                element={
                  <RouteWithSEO>
                    <Explore />
                  </RouteWithSEO>
                }
              />
              <Route
                path="/sap-policy"
                element={
                  <RouteWithSEO>
                    <SecurityAndPrivacyPolicy />
                  </RouteWithSEO>
                }
              />
              <Route
                path="/contact-us"
                element={
                  <RouteWithSEO>
                    <ContactUs />
                  </RouteWithSEO>
                }
              />
              <Route
                path="/maintenance"
                element={
                  <RouteWithSEO>
                    <Maintenance />
                  </RouteWithSEO>
                }
              />
              <Route
                path="/cookies"
                element={
                  <RouteWithSEO>
                    <Cookies />
                  </RouteWithSEO>
                }
              />
              <Route
                path="/tos"
                element={
                  <RouteWithSEO>
                    <TermsOfService />
                  </RouteWithSEO>
                }
              />
              <Route
                path="/faq"
                element={
                  <RouteWithSEO>
                    <FAQ />
                  </RouteWithSEO>
                }
              />
              <Route
                path="/support"
                element={
                  <RouteWithSEO>
                    <Support />
                  </RouteWithSEO>
                }
              />
              <Route
                path="/feedback"
                element={
                  <RouteWithSEO>
                    <Feedback />
                  </RouteWithSEO>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            {/* Cookie Banner - appears on all routes */}
            <CookieBanner onConsentChange={handleConsentChange} />
          </Router>
        </HelmetProvider>
      </AuthProvider>
      </WalletProvider>
    </ThemeProvider>
  );
}
