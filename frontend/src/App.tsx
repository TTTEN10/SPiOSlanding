import React from 'react'
import Hero from './components/Hero'
import EmailSignup from './components/EmailSignup'
import Footer from './components/Footer'
import PlausibleAnalytics from './components/PlausibleAnalytics'

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <PlausibleAnalytics />
      <main className="flex-1">
        <Hero />
        <EmailSignup />
      </main>
      <Footer />
    </div>
  )
}

export default App
