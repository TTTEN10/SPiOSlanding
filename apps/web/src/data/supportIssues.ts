export interface SupportIssue {
  q: string
  a: string
}

export interface SupportCategory {
  title: string
  id: string
  issues: SupportIssue[]
}

export const SUPPORT_CATEGORIES: SupportCategory[] = [
  {
    title: 'Login & account',
    id: 'login-account',
    issues: [
      {
        q: "I can't sign in or my password isn't accepted",
        a: 'Double-check your email and password, and use the password reset link on the sign-in page if needed. Clear your browser cache or try another browser or private window. If you still cannot sign in, contact us from the email associated with your account so we can verify ownership.',
      },
      {
        q: "I didn't receive a verification or password-reset email",
        a: 'Wait a few minutes and check spam or promotions folders. Confirm you entered the correct email address. If your organization filters external mail, ask IT to allow messages from SafePsy. If nothing arrives after retrying, use Contact us with the email you registered so support can trace delivery issues.',
      },
      {
        q: 'I need to change the email on my account',
        a: 'Use account or profile settings to update your email where that option exists. If email changes are restricted for security, contact support with proof of access to the current email (or explain loss of access). We may require identity checks before updating login credentials.',
      },
    ],
  },
  {
    title: 'Onboarding stuck',
    id: 'onboarding',
    issues: [
      {
        q: 'A setup step keeps loading or never finishes',
        a: 'Check your network connection and disable VPNs or strict firewalls temporarily. Refresh the page and try again. If a specific step (for example wallet or identity) hangs, note which step and approximate time—support can check for known incidents or guide you through an alternate path.',
      },
      {
        q: "I finished a step but the app says I'm not done",
        a: 'Go back one step and continue forward again so the flow can save progress. Ensure required fields are filled and any confirmations (email, wallet signature) completed. If the UI still disagrees, send a screenshot and your browser version via Contact us.',
      },
      {
        q: 'Wallet or connection fails during onboarding',
        a: 'Confirm your wallet extension or app is up to date and on a supported network. Try disconnecting and reconnecting, or another supported wallet. If errors mention RPC or chain, retry later or switch network as prompted. Include the exact error text when contacting support.',
      },
    ],
  },
  {
    title: 'Pricing & billing',
    id: 'pricing-billing',
    issues: [
      {
        q: 'Where can I see my plan and charges?',
        a: 'Billing and plan details are shown in your account or subscription area in the product when logged in. For receipts or invoices, check the email from your payment provider. If you cannot find billing history, contact us with the email used at checkout.',
      },
      {
        q: 'My payment failed or my card was declined',
        a: 'Verify card details, expiry, and available funds. Try another card or payment method if offered. Banks sometimes block first charges—call your issuer to authorize SafePsy. If the app shows an error code, include it when you reach out to support.',
      },
      {
        q: 'How do I cancel or change my subscription?',
        a: 'Use the subscription or billing section in your account to cancel or change plan where self-service is available. Cancellations typically apply at the end of the current period unless stated otherwise. If you do not see those controls, contact us with your account email and request.',
      },
    ],
  },
  {
    title: 'Privacy concerns',
    id: 'privacy',
    issues: [
      {
        q: 'What data does SafePsy collect and why?',
        a: 'We collect only what is needed to run the service, improve security, and meet legal obligations. Categories and purposes are described in our Security and Privacy Policy and Cookie Policy. For a structured view of processing activities, see our DPIA page.',
      },
      {
        q: 'How can I limit cookies or optional analytics?',
        a: 'Use Cookie Preferences in the site footer to adjust non-essential cookies where available. You can also change browser settings to block third-party cookies. Essential cookies required for security and login may still be needed for the product to function.',
      },
      {
        q: 'Who can access my conversations or health-related information?',
        a: 'Access is limited by design to what is described in our policies: you, automated systems needed to deliver the service, and authorized personnel under strict controls where legally required. We do not sell your mental health chats. For details, read the Security and Privacy Policy and contact us for specific questions.',
      },
    ],
  },
  {
    title: 'Offboarding, delete & export',
    id: 'offboarding',
    issues: [
      {
        q: 'How do I delete my account and personal data?',
        a: 'Use in-product account deletion or data settings if available. If there is no self-service option, email or use Contact us from your registered address and request account deletion. We will confirm identity and explain timelines and any legal retention exceptions.',
      },
      {
        q: 'How do I export my data (portability)?',
        a: 'Where export is offered (for example profile or chat data), use the export or download feature in the app. For a broader data subject request, contact us with your registered email and specify what you need. We respond within the timeframes described in our privacy documentation.',
      },
      {
        q: 'After I leave, how long is data kept?',
        a: 'Retention depends on the type of data and legal requirements. Active account data is removed or anonymized after deletion subject to backups and lawful holds. Our policies describe typical retention periods; support can give a concise summary for your case when you contact us.',
      },
    ],
  },
]
