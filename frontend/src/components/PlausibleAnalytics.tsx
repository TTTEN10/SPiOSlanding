import React from 'react'

const PlausibleAnalytics: React.FC = () => {
  const plausibleDomain = import.meta.env.VITE_PLAUSIBLE_DOMAIN

  if (!plausibleDomain) {
    return null
  }

  return (
    <script
      defer
      data-domain={plausibleDomain}
      src="https://plausible.io/js/script.js"
    />
  )
}

export default PlausibleAnalytics
