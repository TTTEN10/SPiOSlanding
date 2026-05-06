import React from 'react'
import { Navigate, type RouteObject } from 'react-router-dom'
import Explore from './components/Explore'
import SecurityAndPrivacyPolicy from './components/SecurityAndPrivacyPolicy'
import ContactUs from './components/ContactUs'
import Maintenance from './components/Maintenance'
import Cookies from './components/Cookies'
import TermsOfService from './components/TermsOfService'
import Landing from './components/Landing'
import FAQ from './components/FAQ'
import Support from './components/Support'
import Feedback from './components/Feedback'
import Testing from './components/Testing'
import SEOHead from './components/SEOHead'
import { useSEO } from './hooks/useSEO'
import { useFocusManagement, useKeyboardNavigation } from './hooks/useFocusManagement'

function RouteWithSEO({ children }: { children: React.ReactNode }) {
  const seoConfig = useSEO()
  useFocusManagement()
  useKeyboardNavigation()
  return (
    <>
      <SEOHead config={seoConfig} />
      {children}
    </>
  )
}

export const routes: RouteObject[] = [
  {
    path: '/',
    element: (
      <RouteWithSEO>
        <Landing />
      </RouteWithSEO>
    ),
  },
  { path: '/about-us', element: <Navigate to="/explore" replace /> },
  {
    path: '/explore',
    element: (
      <RouteWithSEO>
        <Explore />
      </RouteWithSEO>
    ),
  },
  {
    path: '/sap-policy',
    element: (
      <RouteWithSEO>
        <SecurityAndPrivacyPolicy />
      </RouteWithSEO>
    ),
  },
  {
    path: '/contact-us',
    element: (
      <RouteWithSEO>
        <ContactUs />
      </RouteWithSEO>
    ),
  },
  {
    path: '/maintenance',
    element: (
      <RouteWithSEO>
        <Maintenance />
      </RouteWithSEO>
    ),
  },
  {
    path: '/cookies',
    element: (
      <RouteWithSEO>
        <Cookies />
      </RouteWithSEO>
    ),
  },
  {
    path: '/tos',
    element: (
      <RouteWithSEO>
        <TermsOfService />
      </RouteWithSEO>
    ),
  },
  {
    path: '/faq',
    element: (
      <RouteWithSEO>
        <FAQ />
      </RouteWithSEO>
    ),
  },
  {
    path: '/support',
    element: (
      <RouteWithSEO>
        <Support />
      </RouteWithSEO>
    ),
  },
  {
    path: '/feedback',
    element: (
      <RouteWithSEO>
        <Feedback />
      </RouteWithSEO>
    ),
  },
  {
    path: '/beta/chat',
    element: (
      <RouteWithSEO>
        <Testing />
      </RouteWithSEO>
    ),
  },
  { path: '*', element: <Navigate to="/" replace /> },
]

