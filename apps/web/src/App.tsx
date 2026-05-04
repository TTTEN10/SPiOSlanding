import CookieBanner from './components/CookieBanner'
import { useCookieConsent } from './hooks/useCookieConsent'
import { ThemeProvider } from './contexts/ThemeContext'
import { WalletProvider } from './contexts/WalletContext'
import { AuthProvider } from './contexts/AuthContext'
import { RouterProvider } from 'react-router-dom'

export default function App({ router }: { router: unknown }) {
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
          <RouterProvider router={router as any} />

          {/* Cookie Banner - appears on all routes */}
          {typeof window !== 'undefined' ? (
            <CookieBanner onConsentChange={handleConsentChange} />
          ) : null}
      </AuthProvider>
      </WalletProvider>
    </ThemeProvider>
  );
}
