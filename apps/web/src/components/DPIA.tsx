import React from 'react'
import { FileText, Shield, AlertTriangle, CheckCircle, Users, Lock, Eye, Database, ArrowRight, EyeOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import TableOfContents from './TableOfContents'

const DPIA: React.FC = () => {
  const navigate = useNavigate()
  
  const tocSections = [
    { id: 'executive-summary', title: 'Executive Summary', level: 1 },
    { id: 'description-processing', title: 'Description of Processing Activities', level: 1 },
    { id: 'data-flow', title: 'Data Flow', level: 1 },
    { id: 'consent-management', title: 'Consent Management and Flows', level: 1 },
    { id: 'encrypted-storage', title: 'Encrypted Storage', level: 1 },
    { id: 'necessity-proportionality', title: 'Necessity and Proportionality', level: 1 },
    { id: 'risk-assessment', title: 'Risk Assessment', level: 1 },
    { id: 'mitigation-measures', title: 'Mitigation Measures', level: 1 },
    { id: 'no-content-logging', title: 'No-Content-Logging Policy', level: 1 },
    { id: 'compliance-framework', title: 'Compliance Framework', level: 1 },
    { id: 'consultation', title: 'Consultation and Review', level: 1 },
    { id: 'conclusion', title: 'Conclusion', level: 1 },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header showBackButton={true} />

      {/* Main Content */}
      <main id="main-content" className="flex-1" role="main" aria-label="Data Protection Impact Assessment" tabIndex={-1}>
        <section className="section-padding py-8 lg:py-12">
          <div className="container-max">
            {/* Table of Contents */}
            <div className="grid lg:grid-cols-4 gap-8">
              <div className="lg:col-span-1 hidden lg:block">
                <TableOfContents sections={tocSections} />
              </div>
              <div className="lg:col-span-3">
            {/* Hero Section */}
            <div className="text-center mb-12 sm:mb-16 px-4">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl text-heading leading-tight mb-4 sm:mb-6">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent text-[1.2em] font-bold">
                  Data Protection Impact Assessment
                </span>
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-body leading-relaxed max-w-3xl mx-auto">
                Comprehensive assessment of privacy risks and data protection measures for SafePsy's mental health platform
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-body">
                <span className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full border border-blue-200 dark:border-blue-800">
                  Version 1.0
                </span>
                <span className="px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-full border border-green-200 dark:border-green-800">
                  Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
                <span className="px-4 py-2 bg-purple-100 dark:bg-purple-900/30 rounded-full border border-purple-200 dark:border-purple-800">
                  GDPR Article 35
                </span>
              </div>
            </div>

            {/* Executive Summary */}
            <div id="executive-summary" className="bg-white/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12 xl:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-12 sm:mb-16 scroll-mt-4">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl text-heading mb-6 sm:mb-8 text-center px-2">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Executive Summary
                </span>
              </h2>
              <div className="space-y-6 text-body leading-relaxed">
                <p className="text-base sm:text-lg">
                  This Data Protection Impact Assessment (DPIA) evaluates the privacy risks associated with SafePsy&apos;s 
                  processing of personal data, particularly sensitive health data, in the context of our Web3.0 
                  decentralized mental health therapy platform. A key differentiator of SafePsy is that users own their data and it is not stored by third parties or used to train AI models. The assessment identifies potential risks to data subjects&apos; 
                  rights and freedoms and outlines comprehensive measures to mitigate these risks.
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                  <div className="flex items-start gap-3">
                    <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-lg font-semibold text-heading mb-2">Assessment Scope</h3>
                      <ul className="space-y-2 text-sm sm:text-base text-body">
                        <li>• Processing of sensitive health data (mental health information)</li>
                        <li>• Decentralized identity management using blockchain technology</li>
                        <li>• Client-side encryption for storage (encrypted at rest; not strict end-to-end encryption)</li>
                        <li>• Cross-border data transfers and international operations</li>
                        <li>• AI-assisted mental wellness support features</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Description of Processing */}
            <div id="description-processing" className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16 scroll-mt-4">
              <h2 className="text-3xl lg:text-4xl text-heading mb-12 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Description of Processing Activities
                </span>
              </h2>
              
              <div className="grid md:grid-cols-2 gap-8 mb-12">
                <div className="space-y-6">
                  <div className="flex items-start gap-3">
                    <Users className="w-6 h-6 text-primary-600 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-xl text-heading mb-3">Data Subjects</h3>
                      <ul className="space-y-2 text-body">
                        <li>• Therapy clients seeking mental health services</li>
                        <li>• Licensed therapists and mental health professionals</li>
                        <li>• Platform administrators and support staff</li>
                        <li>• Third-party service providers (under strict contracts)</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start gap-3">
                    <Database className="w-6 h-6 text-secondary-600 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-xl text-heading mb-3">Categories of Personal Data</h3>
                      <ul className="space-y-2 text-body">
                        <li>• <strong>Health Data:</strong> Mental health assessments, therapy notes, treatment history</li>
                        <li>• <strong>Identity Data:</strong> Decentralized Identifiers (DIDs), wallet addresses</li>
                        <li>• <strong>Communication Data:</strong> Encrypted messages, session recordings</li>
                        <li>• <strong>Technical Data:</strong> IP addresses, device information, usage patterns</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 mb-8">
                <h3 className="text-xl text-heading mb-4">Processing Purposes</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-body">Provision of mental health therapy services</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-body">Secure communication between clients and therapists</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-body">Progress tracking and treatment planning</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-body">Platform security and fraud prevention</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-body">Compliance with legal and regulatory requirements</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-body">Service improvement and analytics (anonymized)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6">
                <h3 className="text-xl text-heading mb-4">Legal Basis for Processing</h3>
                <div className="space-y-4 text-body">
                  <div>
                    <strong className="text-heading">Consent (GDPR Article 6(1)(a) & 9(2)(a)):</strong>
                    <p className="mt-1">Explicit consent for processing sensitive health data for therapy services. See <a href="#consent-management" className="text-primary-600 hover:underline link-hover">Consent Management</a> for detailed consent flow implementation.</p>
                  </div>
                  <div>
                    <strong className="text-heading">Contract (GDPR Article 6(1)(b)):</strong>
                    <p className="mt-1">Processing necessary for the performance of therapy service contracts</p>
                  </div>
                  <div>
                    <strong className="text-heading">Vital Interests (GDPR Article 9(2)(c)):</strong>
                    <p className="mt-1">Protection of vital interests in emergency mental health situations</p>
                  </div>
                  <div>
                    <strong className="text-heading">Legitimate Interests (GDPR Article 6(1)(f)):</strong>
                    <p className="mt-1">Platform security, fraud prevention, and service improvement (with balancing test)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Flow */}
            <div id="data-flow" className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16 scroll-mt-4">
              <h2 className="text-3xl lg:text-4xl text-heading mb-12 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Data Flow
                </span>
              </h2>
              
              <div className="space-y-8">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4 flex items-center gap-2">
                    <ArrowRight className="w-6 h-6 text-blue-600" />
                    Data Collection and Entry Points
                  </h3>
                  <div className="space-y-4 text-body">
                    <div>
                      <strong className="text-heading">User Registration and Authentication:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Users connect via Web3 wallet (MetaMask, WalletConnect, etc.)</li>
                        <li>Decentralized Identifier (DID) is created on blockchain</li>
                        <li>Wallet address stored as pseudonymous identifier</li>
                        <li>No personally identifiable information required for registration</li>
                        <li>Consent obtained for data processing during registration (see <a href="#consent-management" className="text-primary-600 hover:underline link-hover">Consent Management</a>)</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Therapy Session Data:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Client-therapist communication encrypted client-side before transmission (see <a href="#encrypted-storage" className="text-primary-600 hover:underline link-hover">Encrypted Storage</a>)</li>
                        <li>Encrypted messages sent via secure API endpoints</li>
                        <li>Session notes and assessments encrypted at rest</li>
                        <li>All sensitive content remains encrypted throughout processing</li>
                        <li>Explicit consent obtained before processing sensitive health data</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Technical Data:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>IP addresses: Not logged by default (privacy-by-design)</li>
                        <li>Device information: Minimal collection for security purposes</li>
                        <li>Usage patterns: Aggregated and anonymized only</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4 flex items-center gap-2">
                    <Database className="w-6 h-6 text-green-600" />
                    Data Processing and Storage
                  </h3>
                  <div className="space-y-4 text-body">
                    <div>
                      <strong className="text-heading">Encryption Pipeline:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Client-side encryption using AES-256-GCM before data leaves user device (see <a href="#encrypted-storage" className="text-primary-600 hover:underline link-hover">Encrypted Storage</a> for details)</li>
                        <li>Encrypted data transmitted via TLS 1.3</li>
                        <li>Server receives only encrypted blobs (no plaintext access)</li>
                        <li>Encrypted data stored in secure database with additional encryption at rest</li>
                        <li>User-controlled encryption keys (never transmitted to server)</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Blockchain Storage:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>DID registry stored on blockchain (Sepolia testnet, mainnet ready)</li>
                        <li>Only cryptographic hashes and references stored on-chain</li>
                        <li>No sensitive data stored on blockchain</li>
                        <li>User-controlled keys for DID management</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Database Storage:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Encrypted chat blobs stored in PostgreSQL database</li>
                        <li>Encrypted therapy notes and assessments</li>
                        <li>Metadata only (timestamps, DID references, encrypted key references)</li>
                        <li>Regular automated backups with encryption</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4 flex items-center gap-2">
                    <Users className="w-6 h-6 text-purple-600" />
                    Data Access and Sharing
                  </h3>
                  <div className="space-y-4 text-body">
                    <div>
                      <strong className="text-heading">Access Control:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Role-based access control (RBAC) for therapists and administrators</li>
                        <li>DID-based authentication for all data access</li>
                        <li>Multi-factor authentication for sensitive operations</li>
                        <li>Access logs maintained (metadata only, no content)</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Data Sharing:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>No data sharing with third parties without explicit consent</li>
                        <li>Service providers bound by Data Processing Agreements (DPAs)</li>
                        <li>Standard Contractual Clauses (SCCs) for international transfers</li>
                        <li>All sharing documented and auditable</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Data Export:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Users can export their encrypted data at any time</li>
                        <li>Export provided in machine-readable format (JSON/XML)</li>
                        <li>Data remains encrypted during export process</li>
                        <li>User controls decryption keys</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4 flex items-center gap-2">
                    <Lock className="w-6 h-6 text-orange-600" />
                    Data Retention and Deletion
                  </h3>
                  <div className="space-y-4 text-body">
                    <div>
                      <strong className="text-heading">Retention Periods:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Active therapy data: Retained during active service period</li>
                        <li>Historical health records: 7 years (regulatory requirement)</li>
                        <li>Communication data: 30 days (user-configurable)</li>
                        <li>Technical logs: 90 days (metadata only)</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Deletion Process:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>User-initiated deletion: Immediate cryptographic deletion</li>
                        <li>Automated deletion after retention periods expire</li>
                        <li>Deletion from all systems including backups</li>
                        <li>Verification of deletion completion</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Backup Management:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Encrypted backups stored in geographically distributed locations</li>
                        <li>Backup retention aligned with data retention policies</li>
                        <li>Secure deletion of expired backups</li>
                        <li>Regular backup integrity verification</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4">Data Flow Diagram Summary</h3>
                  <div className="text-body space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold">1. Collection:</span>
                      <span>User Device → Client-Side Encryption → Secure API</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold">2. Transmission:</span>
                      <span>TLS 1.3 Encrypted Channel → API Server</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold">3. Storage:</span>
                      <span>Encrypted Database → Encrypted Backups</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold">4. Access:</span>
                      <span>DID Authentication → Role-Based Access → Decrypted Client-Side Only</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold">5. Deletion:</span>
                      <span>Cryptographic Deletion → Verification → Backup Cleanup</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Consent Management and Flows */}
            <div id="consent-management" className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16 scroll-mt-4">
              <h2 className="text-3xl lg:text-4xl text-heading mb-12 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Consent Management and Flows
                </span>
              </h2>
              
              <div className="space-y-8">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <CheckCircle className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-xl text-heading mb-3">Overview</h3>
                      <p className="text-body">
                        SafePsy implements comprehensive consent management systems that comply with GDPR Article 6(1)(a) 
                        and Article 9(2)(a) requirements for explicit consent. All consent is obtained through clear, 
                        informed, and unambiguous mechanisms with granular controls and easy withdrawal capabilities.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4 flex items-center gap-2">
                    <Shield className="w-6 h-6 text-green-600" />
                    Consent Types and Legal Bases
                  </h3>
                  <div className="space-y-4 text-body">
                    <div>
                      <strong className="text-heading">Explicit Consent for Health Data (Article 9(2)(a)):</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Explicit, informed consent required for processing sensitive health data</li>
                        <li>Consent obtained before any health data processing begins</li>
                        <li>Clear explanation of what data is processed and why</li>
                        <li>Consent must be specific to each processing purpose</li>
                        <li>Users informed of risks and implications of consent</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Cookie and Tracking Consent (Article 6(1)(a)):</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Granular cookie consent management with separate controls for essential, functional, and analytics cookies</li>
                        <li>Essential cookies: Always enabled (required for service functionality)</li>
                        <li>Functional cookies: User-controlled consent</li>
                        <li>Analytics cookies: User-controlled consent with clear opt-in</li>
                        <li>Consent preferences stored locally with timestamp</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Marketing and Communications Consent:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Explicit opt-in required for marketing communications</li>
                        <li>Consent timestamp recorded for audit purposes</li>
                        <li>Separate consent for different communication types (email, notifications, etc.)</li>
                        <li>Clear distinction between service communications and marketing</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4 flex items-center gap-2">
                    <Users className="w-6 h-6 text-purple-600" />
                    Consent Flow Implementation
                  </h3>
                  <div className="space-y-4 text-body">
                    <div>
                      <strong className="text-heading">Cookie Consent Flow:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li><strong>Initial Presentation:</strong> Cookie banner displayed on first visit (checks localStorage for existing consent). Three clear options: "Accept All", "Essential Only", "Customize". No pre-ticked boxes. Active user action required.</li>
                        <li><strong>Granular Controls:</strong> Essential cookies (always enabled, cannot be disabled). Functional cookies (user-controlled toggle). Analytics cookies (user-controlled toggle with clear opt-in).</li>
                        <li><strong>Storage:</strong> Consent preferences stored in browser localStorage ('cookieConsent' JSON + 'cookieConsentDate' ISO timestamp). Cookie flags applied: SameSite=Strict, Secure, appropriate max-age.</li>
                        <li><strong>Ongoing Management:</strong> Cookie Manager component accessible from privacy settings. Users can update preferences at any time. Real-time preference updates with immediate effect.</li>
                        <li><strong>Validation:</strong> Consent age validation (1-year validity period). Automatic re-consent prompts after expiration. Consent validation on page load.</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Email Subscription Consent Flow:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li><strong>Consent Collection:</strong> Explicit consent checkbox in email subscription form. ConsentGiven boolean field (default: false). ConsentTimestamp recorded when consent provided (ISO 8601 format).</li>
                        <li><strong>Database Storage:</strong> Consent records stored in EmailSubscription model (PostgreSQL). Fields: consentGiven (Boolean), consentTimestamp (DateTime). Linked to email address for audit trail.</li>
                        <li><strong>API Processing:</strong> /api/subscribe endpoint validates and records consent. Prometheus metrics track consent status (consent_given: 'true'/'false'). Consent validation before email processing.</li>
                        <li><strong>Consent Withdrawal:</strong> Users can withdraw consent via email preferences or contact form. Withdrawal timestamp recorded. Email processing ceases immediately upon withdrawal.</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Consent Documentation and Audit:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li><strong>Timestamp Recording:</strong> All consent actions timestamped (ISO 8601 format). Consent date stored in localStorage (cookie consent) and database (email consent).</li>
                        <li><strong>Audit Trail:</strong> Consent history maintained for compliance purposes. Consent verification events logged (metadata only, no content). Consent compliance metrics tracked.</li>
                        <li><strong>Version Control:</strong> Consent version tracking for policy updates. Users notified when privacy policy changes materially affect processing. Re-consent requested when necessary.</li>
                        <li><strong>Record Linking:</strong> Cookie consent linked to browser localStorage (no user identifier). Email consent linked to email address in database. DID-based consent (future) will link to wallet address.</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Consent Withdrawal Process:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li><strong>Cookie Consent Withdrawal:</strong> Cookie Manager interface allows immediate preference changes. Non-essential cookies removed immediately. localStorage updated with new preferences. Withdrawal timestamp recorded.</li>
                        <li><strong>Email Consent Withdrawal:</strong> Users can withdraw via email preferences or contact form. Database updated: consentGiven = false, withdrawal timestamp recorded. Email processing ceases immediately.</li>
                        <li><strong>Granular Withdrawal:</strong> Users can withdraw specific consents while maintaining others. Clear explanation of consequences provided. Processing stops for withdrawn consent areas only.</li>
                        <li><strong>Immediate Effect:</strong> Withdrawal takes effect immediately (within technical constraints). No delay in processing cessation. User notified of withdrawal confirmation.</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Consent Renewal and Policy Updates:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li><strong>Policy Change Notifications:</strong> Users notified when privacy policy changes materially affect processing. Clear explanation of changes provided. Re-consent requested when necessary.</li>
                        <li><strong>Consent Review:</strong> Users can review and update consent preferences at any time. Consent manager accessible from privacy settings. Version control for consent records.</li>
                        <li><strong>Automatic Expiration:</strong> Cookie consent expires after 1 year (configurable). Users prompted to renew consent. Email consent does not expire (until withdrawn).</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4 flex items-center gap-2">
                    <Lock className="w-6 h-6 text-orange-600" />
                    Technical Implementation
                  </h3>
                  <div className="space-y-4 text-body">
                    <div>
                      <strong className="text-heading">Frontend Consent Management:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li><strong>Cookie Consent Hook (useCookieConsent):</strong> React hook managing consent state with localStorage persistence. Stores cookie preferences (essential, functional, analytics) with ISO 8601 timestamps. Validates consent age (1-year validity period).</li>
                        <li><strong>Cookie Banner Component:</strong> First-time user consent interface with three options: "Accept All", "Essential Only", and "Customize". No pre-ticked boxes. Active user action required. Granular controls for functional and analytics cookies.</li>
                        <li><strong>Cookie Manager Component:</strong> Ongoing preference management interface accessible from privacy settings. Allows users to update consent preferences at any time. Real-time preference updates with immediate effect.</li>
                        <li><strong>LocalStorage Storage:</strong> Consent preferences stored in browser localStorage with keys: 'cookieConsent' (JSON preferences) and 'cookieConsentDate' (ISO timestamp). Secure cookie flags (SameSite=Strict, Secure) applied based on preferences.</li>
                        <li><strong>Consent Validation:</strong> Automatic validation on page load. Checks consent age (re-consent after 1 year). Validates essential cookie requirement (always true). Error handling with fallback to default preferences.</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Backend Consent Processing:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li><strong>Database Schema:</strong> EmailSubscription model includes consentGiven (Boolean, default false) and consentTimestamp (DateTime, nullable) fields. Consent records linked to user email addresses for audit trail.</li>
                        <li><strong>API Endpoint Implementation:</strong> /api/subscribe endpoint accepts consentGiven boolean and records consentTimestamp when consent is provided. Consent validation before processing email subscriptions. Prometheus metrics track consent status (consent_given: 'true'/'false').</li>
                        <li><strong>Conditional Processing:</strong> API endpoints check consent status before processing. Functional and analytics features gated by consent preferences. Consent withdrawal immediately stops non-essential processing.</li>
                        <li><strong>Consent Validation Middleware:</strong> Validates consent timestamps (not expired). Verifies consent has not been withdrawn. Checks consent version compatibility (for future policy updates).</li>
                        <li><strong>Audit Trail:</strong> All consent actions logged with metadata (timestamp, consent type, user identifier hash). No content logging (privacy-by-design). Consent history maintained for compliance purposes.</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Consent Storage Architecture:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li><strong>Dual Storage Model:</strong> Frontend localStorage for immediate UI state and cookie management. Backend database for persistent consent records and audit compliance.</li>
                        <li><strong>Cookie Consent Storage:</strong> Browser localStorage (client-side only). No server-side cookie consent storage (privacy-by-design). User controls cookie preferences locally.</li>
                        <li><strong>Email Subscription Consent:</strong> Database storage (PostgreSQL) with consentGiven and consentTimestamp fields. Linked to email address for subscription management. Enables consent withdrawal and audit compliance.</li>
                        <li><strong>Consent Synchronization:</strong> Frontend preferences synced to backend on subscription actions. No automatic sync for cookie preferences (client-side only). User-initiated consent updates propagate immediately.</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Consent Verification:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li><strong>Pre-Processing Checks:</strong> Consent status verified before any data processing. Consent validity checked (not expired, not withdrawn). Consent type validated (appropriate consent for processing activity).</li>
                        <li><strong>Automated Compliance:</strong> Real-time consent validation on API requests. Automated consent expiration detection. Consent withdrawal immediately enforced.</li>
                        <li><strong>Audit Logging:</strong> Consent verification events logged (metadata only, no content). Consent compliance metrics tracked. Regular consent compliance reports generated.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4 flex items-center gap-2">
                    <Eye className="w-6 h-6 text-emerald-600" />
                    GDPR Compliance Requirements
                  </h3>
                  <div className="space-y-4 text-body">
                    <div>
                      <strong className="text-heading">Article 7 - Conditions for Consent:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>✓ Consent must be freely given, specific, informed, and unambiguous</li>
                        <li>✓ Clear affirmative action required (no pre-ticked boxes)</li>
                        <li>✓ Easy to withdraw consent (as easy as giving it)</li>
                        <li>✓ Separate consent for different processing operations</li>
                        <li>✓ Consent documented and demonstrable</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Article 13/14 - Information to be Provided:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>✓ Identity and contact details of controller</li>
                        <li>✓ DPO contact information</li>
                        <li>✓ Purposes and legal basis for processing</li>
                        <li>✓ Right to withdraw consent explained</li>
                        <li>✓ Consequences of not providing consent (where applicable)</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Article 17 - Right to Erasure:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>✓ Data deleted when consent is withdrawn (where consent was the only legal basis)</li>
                        <li>✓ No undue delay in processing withdrawal requests</li>
                        <li>✓ User notified of deletion completion</li>
                        <li>✓ Deletion extends to backups and archives where feasible</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-6 h-6 text-yellow-600" />
                    Consent-Related Risk Mitigation
                  </h3>
                  <div className="space-y-4 text-body">
                    <div>
                      <strong className="text-heading">Risk: Invalid or Insufficient Consent</strong>
                      <p className="mt-1 mb-2">Mitigation measures:</p>
                      <ul className="ml-6 list-disc space-y-1">
                        <li>Clear consent forms with plain language explanations</li>
                        <li>Legal review of consent mechanisms</li>
                        <li>Regular consent compliance audits</li>
                        <li>User education and clear consent options</li>
                        <li>Automated consent validation checks</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Risk: Consent Withdrawal Not Honored</strong>
                      <p className="mt-1 mb-2">Mitigation measures:</p>
                      <ul className="ml-6 list-disc space-y-1">
                        <li>Immediate processing cessation upon withdrawal</li>
                        <li>Automated systems to enforce consent preferences</li>
                        <li>Regular audits to verify withdrawal compliance</li>
                        <li>User notifications confirming withdrawal processing</li>
                        <li>Clear technical implementation of withdrawal mechanisms</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Encrypted Storage */}
            <div id="encrypted-storage" className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16 scroll-mt-4">
              <h2 className="text-3xl lg:text-4xl text-heading mb-12 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Encrypted Storage
                </span>
              </h2>
              
              <div className="space-y-8">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <Lock className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-xl text-heading mb-3">Overview</h3>
                      <p className="text-body">
                        SafePsy uses client-side encryption for storage and comprehensive encryption at rest. Chat and
                        summary data are encrypted at rest using AES-256-GCM and only ciphertext is stored. Data is
                        transmitted over TLS. To provide AI replies, message content is decrypted temporarily in server
                        memory during the request and sent to the AI provider to generate a response — so this is not
                        strict end-to-end encryption in the sense that servers never see plaintext. Plaintext is not
                        written to disk, logs, or the database.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4 flex items-center gap-2">
                    <Database className="w-6 h-6 text-green-600" />
                    Encryption Standards and Algorithms
                  </h3>
                  <div className="space-y-4 text-body">
                    <div>
                      <strong className="text-heading">Primary Encryption Algorithm: AES-256-GCM</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li><strong>Algorithm:</strong> Advanced Encryption Standard (AES) with 256-bit keys</li>
                        <li><strong>Mode:</strong> Galois/Counter Mode (GCM) for authenticated encryption</li>
                        <li><strong>Key Length:</strong> 256 bits (32 bytes) - provides strong security</li>
                        <li><strong>Authentication Tag:</strong> 128-bit tag for integrity verification</li>
                        <li><strong>IV/Nonce:</strong> 12-byte random initialization vector per encryption operation</li>
                        <li><strong>Security Level:</strong> Military-grade encryption suitable for sensitive health data</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Key Derivation: Wallet-Based (SHA-256)</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li><strong>Method:</strong> SHA-256 hash of wallet signature + wallet address. Deterministic derivation (same wallet + same message = same key). Domain-separated message format prevents key reuse.</li>
                        <li><strong>Key Encryption Key (KEK):</strong> Derived from wallet signature using SHA-256. Never stored (derived on-demand during authentication). Only accessible with wallet private key.</li>
                        <li><strong>Data Encryption Key (DEK):</strong> Random 32-byte key generated on first use. Encrypted with KEK and stored in DID on blockchain. Used to encrypt/decrypt chat messages.</li>
                        <li><strong>Security Properties:</strong> Deterministic (same inputs produce same key). Non-replayable (domain-separated message format). Verifiable (signature can be verified to ensure wallet ownership).</li>
                        <li><strong>Important Note:</strong> PBKDF2 is available for password-based derivation but NOT used for wallet-based keys. All wallet-based keys derived using SHA-256 hash method. Wallet authentication is the sole access mechanism.</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Transport Security: TLS 1.3</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li><strong>Protocol:</strong> Transport Layer Security version 1.3</li>
                        <li><strong>Purpose:</strong> Encrypts data in transit between client and server</li>
                        <li><strong>Certificate:</strong> Valid SSL/TLS certificates with strong cipher suites</li>
                        <li><strong>Perfect Forward Secrecy:</strong> Enabled for enhanced security</li>
                        <li><strong>HSTS:</strong> HTTP Strict Transport Security enforced</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4 flex items-center gap-2">
                    <ArrowRight className="w-6 h-6 text-purple-600" />
                    Encryption Flow and Data Lifecycle
                  </h3>
                  <div className="space-y-4 text-body">
                    <div>
                      <strong className="text-heading">1. Client-Side Encryption (Before Transmission):</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li><strong>Encryption Location:</strong> All sensitive data encrypted on user's device using Web Crypto API (browser-native cryptographic functions). Encryption occurs before data leaves the browser.</li>
                        <li><strong>Encryption Algorithm:</strong> AES-256-GCM with 32-byte keys. Random 12-byte IV generated for each encryption operation. 128-bit authentication tag for integrity verification.</li>
                        <li><strong>Key Derivation:</strong> Wallet-based key derivation using SHA-256 hash of wallet signature + wallet address. Keys derived client-side only (never transmitted to server).</li>
                        <li><strong>Encryption Format:</strong> Encrypted data includes IV (12 bytes) + ciphertext + authentication tag (16 bytes). Base64-encoded for storage/transmission.</li>
                        <li><strong>Server Reception:</strong> Server receives only encrypted blobs (ciphertext). Server never receives plaintext sensitive data. Server cannot decrypt without user's wallet-derived keys.</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">2. Transmission (In Transit):</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li><strong>Transport Security:</strong> Encrypted data transmitted over TLS 1.3 encrypted channels. Double encryption: client-side AES-256-GCM + TLS 1.3 transport layer.</li>
                        <li><strong>Connection Security:</strong> HTTPS-only connections enforced. Perfect Forward Secrecy enabled. HSTS (HTTP Strict Transport Security) headers enforced.</li>
                        <li><strong>Data Protection:</strong> No plaintext data in transit. Encrypted blobs protected by both application-layer and transport-layer encryption.</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">3. Server Reception and Storage (At Rest):</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li><strong>Server Storage Policy:</strong> Server receives only encrypted blobs (cannot decrypt without user keys). Encrypted data stored in PostgreSQL database as ciphertext only.</li>
                        <li><strong>Database Storage:</strong> Encrypted chat blobs, therapy notes, and assessments stored as base64-encoded ciphertext. Only metadata (timestamps, DID references, encrypted key references) stored in plaintext.</li>
                        <li><strong>Key Separation:</strong> Encryption key references stored separately from encrypted data. Server never has access to decryption keys (wallet-based keys are client-side only).</li>
                        <li><strong>Database Encryption:</strong> Database-level encryption at rest enabled (if supported by infrastructure). Additional layer of protection for stored ciphertext.</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">4. Server-Side Temporary Decryption (AI Processing):</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li><strong>Functional Requirement:</strong> Server MUST decrypt messages temporarily in memory for AI processing (Scaleway AI chat completions). This is a functional requirement for AI functionality.</li>
                        <li><strong>Plaintext Handling:</strong> Plaintext exists transiently in server memory only during request processing. Plaintext lifetime: Request duration only (typically seconds to minutes).</li>
                        <li><strong>Security Controls:</strong> Plaintext is NEVER written to disk, logs, or database. Plaintext cleared from memory after request completion. No persistent plaintext storage.</li>
                        <li><strong>AI Service Data Sharing:</strong> Decrypted plaintext sent to Scaleway AI for chat completions. Scaleway receives message content (plaintext) but NOT user identifiers (wallet, DID, email, IP).</li>
                        <li><strong>Privacy Disclosure:</strong> Users informed that Scaleway processes chat message content in plaintext for AI responses. This is necessary for AI functionality.</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">5. Access and Client-Side Decryption:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li><strong>Decryption Location:</strong> Decryption occurs only on user's device (client-side). Server retrieves encrypted blobs and sends to authorized user over TLS.</li>
                        <li><strong>Key Access:</strong> User's device decrypts using wallet-derived keys. Keys derived from wallet signature during authentication. Server has no capability to decrypt user data.</li>
                        <li><strong>Authentication:</strong> DID-based authentication verifies access rights before data retrieval. Wallet signature required for key derivation. Valid DID token required for authorization.</li>
                        <li><strong>Key Transmission:</strong> Decryption keys never transmitted to server. Keys exist only in browser memory during active session. Keys cleared on logout.</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">6. Backup and Archive Encryption:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li><strong>Backup Encryption:</strong> All backups encrypted before storage using same AES-256-GCM encryption. Encrypted backups stored in geographically distributed locations.</li>
                        <li><strong>Backup Integrity:</strong> Backup integrity verified using cryptographic hashes (SHA-256). Regular backup restoration testing to verify encryption. Backup retention aligned with data retention policies.</li>
                        <li><strong>Backup Access:</strong> Backups contain ciphertext only (cannot decrypt without user keys). Backup encryption keys managed separately. Secure deletion of expired backups.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4 flex items-center gap-2">
                    <Shield className="w-6 h-6 text-orange-600" />
                    Key Management
                  </h3>
                  <div className="space-y-4 text-body">
                    <div>
                      <strong className="text-heading">Wallet-Based Key Derivation:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li><strong>Key Derivation Method:</strong> SHA-256 hash of wallet signature + wallet address. Deterministic derivation (same wallet + same message = same key). Domain-separated message format prevents key reuse.</li>
                        <li><strong>Key Encryption Key (KEK):</strong> Derived from wallet signature using SHA-256. Never stored (derived on-demand during authentication). Only accessible with wallet private key.</li>
                        <li><strong>Data Encryption Key (DEK):</strong> Random 32-byte key generated on first use. Encrypted with KEK and stored in DID on blockchain. Used to encrypt/decrypt chat messages.</li>
                        <li><strong>Wallet Authentication:</strong> User signs authentication message with wallet. Signature verified to prove wallet ownership. KEK derived from signature for key decryption.</li>
                        <li><strong>No Password-Based Keys:</strong> PBKDF2 available but not used for wallet-based encryption. All keys derived from wallet authentication (wallet is your key).</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Key Storage Architecture:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li><strong>Encrypted DEK Storage:</strong> Stored in DID document on blockchain (on-chain). Format: {'{signature}:{iv}:{encryptedKey}'}. Encrypted using wallet-based KEK (AES-256-GCM).</li>
                        <li><strong>Server-Side Key Policy:</strong> Server NEVER stores raw keys (DEK/KEK) in any form. Server stores ciphertext blobs only (encrypted chat data). Server cannot decrypt without user's wallet.</li>
                        <li><strong>Client-Side Key Storage:</strong> Keys exist in browser memory only during active session. Keys cleared on logout or session expiration. No persistent key storage on client device.</li>
                        <li><strong>Key Transmission:</strong> Keys NEVER transmitted to server. Only encrypted blobs (ciphertext) sent to server. Key derivation happens client-side only.</li>
                        <li><strong>Multi-Device Access:</strong> Each device derives keys independently from wallet signature. No key synchronization between devices. Wallet authentication required on each device.</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Key Recovery and Access Control:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li><strong>Recovery Mechanism:</strong> Wallet seed phrase is the sole recovery mechanism. No key escrow or backup keys stored by SafePsy. No password-based recovery (wallet-only access).</li>
                        <li><strong>Access Requirements:</strong> Wallet authentication (can sign messages). Valid DID token (not revoked). Successful key derivation from wallet signature.</li>
                        <li><strong>Permanent Loss Conditions:</strong> Lost wallet seed phrase = permanent data loss. Revoked DID token = permanent access loss (even with wallet). No recovery mechanism exists (by design for security).</li>
                        <li><strong>User Education:</strong> Clear warnings about key loss consequences. Instructions for secure wallet seed phrase storage. Hardware wallet recommendations for enhanced security.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4 flex items-center gap-2">
                    <Database className="w-6 h-6 text-emerald-600" />
                    Storage Infrastructure
                  </h3>
                  <div className="space-y-4 text-body">
                    <div>
                      <strong className="text-heading">Database Storage (PostgreSQL):</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Encrypted data stored in PostgreSQL database</li>
                        <li>Database encrypted at rest (disk-level encryption)</li>
                        <li>Connection encryption (TLS) for database connections</li>
                        <li>Encrypted columns for sensitive metadata</li>
                        <li>Regular database security updates and patches</li>
                        <li>Access controls and role-based permissions</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Blockchain Storage (DID Registry):</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Only cryptographic hashes and DID references stored on-chain</li>
                        <li>No sensitive health data stored on blockchain</li>
                        <li>DID registry on Sepolia testnet (mainnet ready)</li>
                        <li>User-controlled keys for DID management</li>
                        <li>Blockchain provides immutability for DID registry</li>
                        <li>Off-chain data references linked to on-chain identifiers</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Backup Storage:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Encrypted backups stored in geographically distributed locations</li>
                        <li>Backup encryption independent of database encryption</li>
                        <li>Automated daily backups with encryption</li>
                        <li>Backup integrity verification using SHA-256 hashes</li>
                        <li>Backup retention aligned with data retention policies</li>
                        <li>Secure deletion of expired backups</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4 flex items-center gap-2">
                    <CheckCircle className="w-6 h-6 text-red-600" />
                    Encryption Compliance and Standards
                  </h3>
                  <div className="space-y-4 text-body">
                    <div>
                      <strong className="text-heading">GDPR Article 32 - Security of Processing:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>✓ Pseudonymization and encryption of personal data implemented</li>
                        <li>✓ Appropriate technical and organizational measures in place</li>
                        <li>✓ Ongoing confidentiality, integrity, and availability ensured</li>
                        <li>✓ Regular testing and evaluation of encryption measures</li>
                        <li>✓ Encryption suitable for sensitive health data processing</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Industry Standards:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>✓ AES-256-GCM: FIPS 140-2 validated encryption algorithm</li>
                        <li>✓ TLS 1.3: Latest transport security protocol</li>
                        <li>✓ PBKDF2: NIST-recommended key derivation function</li>
                        <li>✓ SHA-256: Industry-standard cryptographic hash function</li>
                        <li>✓ Encryption key length: 256 bits (exceeds minimum requirements)</li>
                        <li>✓ Authentication tags: 128-bit GCM tags for integrity</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Healthcare Standards (where applicable):</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>✓ HIPAA-compliant encryption standards (AES-256)</li>
                        <li>✓ Encryption suitable for Protected Health Information (PHI)</li>
                        <li>✓ Audit trails for encryption key access (where applicable)</li>
                        <li>✓ Encryption strength appropriate for sensitive health data</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-6 h-6 text-yellow-600" />
                    Encryption Risk Mitigation
                  </h3>
                  <div className="space-y-4 text-body">
                    <div>
                      <strong className="text-heading">Risk: Encryption Key Loss</strong>
                      <p className="mt-1 mb-2">Mitigation measures:</p>
                      <ul className="ml-6 list-disc space-y-1">
                        <li>User education on key management best practices</li>
                        <li>Key backup and recovery mechanisms (where feasible)</li>
                        <li>Hardware wallet support for enhanced security</li>
                        <li>Clear warnings about key loss consequences</li>
                        <li>Alternative authentication methods where appropriate</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Risk: Encryption Implementation Vulnerabilities</strong>
                      <p className="mt-1 mb-2">Mitigation measures:</p>
                      <ul className="ml-6 list-disc space-y-1">
                        <li>Use of well-tested, industry-standard encryption libraries</li>
                        <li>Regular security audits and code reviews</li>
                        <li>Penetration testing of encryption implementation</li>
                        <li>Regular updates to encryption libraries</li>
                        <li>Expert security review of cryptographic implementation</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Risk: Weak Encryption Keys</strong>
                      <p className="mt-1 mb-2">Mitigation measures:</p>
                      <ul className="ml-6 list-disc space-y-1">
                        <li>Cryptographically secure random key generation</li>
                        <li>Strong key derivation with sufficient iterations (100,000)</li>
                        <li>Key length requirements (256 bits minimum)</li>
                        <li>User education on strong password/passphrase selection</li>
                        <li>Password strength validation where applicable</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Necessity and Proportionality */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16">
              <h2 className="text-3xl lg:text-4xl text-heading mb-12 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Necessity and Proportionality
                </span>
              </h2>
              
              <div className="space-y-8">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4 flex items-center gap-2">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    Data Minimization
                  </h3>
                  <p className="text-body mb-4">
                    SafePsy implements strict data minimization principles:
                  </p>
                  <ul className="space-y-2 text-body ml-6 list-disc">
                    <li>Only essential health data required for therapy is collected</li>
                    <li>No unnecessary personal information is requested or stored</li>
                    <li>Data collection is limited to what is directly relevant to service provision</li>
                    <li>Regular audits ensure compliance with minimization principles</li>
                  </ul>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4 flex items-center gap-2">
                    <Shield className="w-6 h-6 text-blue-600" />
                    Purpose Limitation
                  </h3>
                  <p className="text-body mb-4">
                    All data processing is strictly limited to stated purposes:
                  </p>
                  <ul className="space-y-2 text-body ml-6 list-disc">
                    <li>Health data is used exclusively for therapy provision and progress tracking</li>
                    <li>No secondary use of data without explicit consent</li>
                    <li>Clear purpose specification in privacy notices and terms of service</li>
                    <li>Technical controls prevent unauthorized access or use</li>
                  </ul>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4 flex items-center gap-2">
                    <Lock className="w-6 h-6 text-purple-600" />
                    Storage Limitation
                  </h3>
                  <p className="text-body mb-4">
                    Data retention is limited to necessary periods:
                  </p>
                  <ul className="space-y-2 text-body ml-6 list-disc">
                    <li>Active therapy data: Retained during active service period</li>
                    <li>Historical records: 7 years (regulatory requirement for health records)</li>
                    <li>Communication data: 30 days (configurable by user)</li>
                    <li>Automated deletion after retention periods expire</li>
                    <li>User-controlled deletion available at any time</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Risk Assessment */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16">
              <h2 className="text-3xl lg:text-4xl text-heading mb-12 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Risk Assessment
                </span>
              </h2>
              
              <div className="space-y-8">
                {/* High Risk */}
                <div className="border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20 rounded-r-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                    <h3 className="text-xl text-heading">High Risk: Unauthorized Access to Health Data</h3>
                  </div>
                  <div className="space-y-4 text-body">
                    <div>
                      <strong className="text-heading">Risk Description:</strong>
                      <p className="mt-1">Potential unauthorized access to sensitive mental health data could result in discrimination, 
                      social stigma, or psychological harm to data subjects.</p>
                    </div>
                    <div>
                      <strong className="text-heading">Likelihood:</strong> Low (due to encryption and access controls)
                    </div>
                    <div>
                      <strong className="text-heading">Severity:</strong> High (significant impact on data subject rights)
                    </div>
                    <div>
                      <strong className="text-heading">Mitigation Measures:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>AES-256-GCM encryption for all data at rest</li>
                        <li>TLS 1.3 for all data in transit</li>
                        <li>DID-based authentication with cryptographic keys</li>
                        <li>Role-based access controls (RBAC)</li>
                        <li>Multi-factor authentication for therapists</li>
                        <li>Regular security audits and penetration testing</li>
                        <li>Comprehensive audit logging</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Medium Risk */}
                <div className="border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 rounded-r-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertTriangle className="w-6 h-6 text-yellow-600" />
                    <h3 className="text-xl text-heading">Medium Risk: Data Loss or Corruption</h3>
                  </div>
                  <div className="space-y-4 text-body">
                    <div>
                      <strong className="text-heading">Risk Description:</strong>
                      <p className="mt-1">Potential loss or corruption of therapy data could impact treatment continuity 
                      and patient care quality.</p>
                    </div>
                    <div>
                      <strong className="text-heading">Likelihood:</strong> Low
                    </div>
                    <div>
                      <strong className="text-heading">Severity:</strong> Medium
                    </div>
                    <div>
                      <strong className="text-heading">Mitigation Measures:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Automated daily backups with encryption</li>
                        <li>Geographically distributed backup storage</li>
                        <li>Data integrity verification using SHA-256</li>
                        <li>Version control for critical data</li>
                        <li>Disaster recovery procedures</li>
                        <li>Regular backup restoration testing</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Medium Risk */}
                <div className="border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 rounded-r-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertTriangle className="w-6 h-6 text-yellow-600" />
                    <h3 className="text-xl text-heading">Medium Risk: Key Loss or Compromise</h3>
                  </div>
                  <div className="space-y-4 text-body">
                    <div>
                      <strong className="text-heading">Risk Description:</strong>
                      <p className="mt-1">Loss of user-controlled encryption keys could result in permanent data inaccessibility, 
                      while key compromise could lead to unauthorized data access.</p>
                    </div>
                    <div>
                      <strong className="text-heading">Likelihood:</strong> Medium (user error) / Low (compromise)
                    </div>
                    <div>
                      <strong className="text-heading">Severity:</strong> High (data loss) / High (unauthorized access)
                    </div>
                    <div>
                      <strong className="text-heading">Mitigation Measures:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Comprehensive user education on key management</li>
                        <li>Hardware wallet support for enhanced security</li>
                        <li>Key recovery mechanisms (where technically feasible)</li>
                        <li>Multi-signature options for critical operations</li>
                        <li>Clear warnings about key loss consequences</li>
                        <li>Regular security awareness training</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Low Risk */}
                <div className="border-l-4 border-green-500 bg-green-50 dark:bg-green-900/20 rounded-r-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <h3 className="text-xl text-heading">Low Risk: Cross-Border Data Transfers</h3>
                  </div>
                  <div className="space-y-4 text-body">
                    <div>
                      <strong className="text-heading">Risk Description:</strong>
                      <p className="mt-1">Data transfers outside the EEA require appropriate safeguards to ensure 
                      equivalent data protection standards.</p>
                    </div>
                    <div>
                      <strong className="text-heading">Likelihood:</strong> N/A (operational requirement)
                    </div>
                    <div>
                      <strong className="text-heading">Severity:</strong> Low (with appropriate safeguards)
                    </div>
                    <div>
                      <strong className="text-heading">Mitigation Measures:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Standard Contractual Clauses (SCCs) for all transfers</li>
                        <li>Data Processing Agreements with all processors</li>
                        <li>Encryption in transit and at rest for all transfers</li>
                        <li>Regular compliance audits of third-party processors</li>
                        <li>Transparent disclosure of transfer locations</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Measures to Address Risks */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16">
              <h2 className="text-3xl lg:text-4xl text-heading mb-12 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Measures to Address Risks
                </span>
              </h2>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-primary-100 rounded-full flex items-center justify-center border border-primary-200 dark:bg-primary-900/30 dark:border-primary-700">
                    <Lock className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                  </div>
                  <h3 className="text-xl text-heading text-center">Technical Measures</h3>
                  <ul className="space-y-2 text-body text-sm">
                    <li>• AES-256-GCM encryption</li>
                    <li>• TLS 1.3 transport security</li>
                    <li>• DID-based authentication</li>
                    <li>• Role-based access controls</li>
                    <li>• Secure key management</li>
                    <li>• Regular security updates</li>
                  </ul>
                </div>
                
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-secondary-100 rounded-full flex items-center justify-center border border-secondary-200 dark:bg-secondary-900/30 dark:border-secondary-700">
                    <Shield className="w-8 h-8 text-secondary-600 dark:text-secondary-400" />
                  </div>
                  <h3 className="text-xl text-heading text-center">Organizational Measures</h3>
                  <ul className="space-y-2 text-body text-sm">
                    <li>• Privacy by design principles</li>
                    <li>• Staff training and awareness</li>
                    <li>• Data protection policies</li>
                    <li>• Incident response procedures</li>
                    <li>• Regular compliance audits</li>
                    <li>• Data Protection Officer (DPO)</li>
                  </ul>
                </div>
                
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-accent-100 rounded-full flex items-center justify-center border border-accent-200 dark:bg-accent-900/30 dark:border-accent-700">
                    <Eye className="w-8 h-8 text-accent-600 dark:text-accent-400" />
                  </div>
                  <h3 className="text-xl text-heading text-center">Monitoring & Review</h3>
                  <ul className="space-y-2 text-body text-sm">
                    <li>• Continuous security monitoring</li>
                    <li>• Regular risk assessments</li>
                    <li>• Audit logging and analysis</li>
                    <li>• Annual DPIA reviews</li>
                    <li>• User feedback mechanisms</li>
                    <li>• Compliance reporting</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* No-Content-Logging Policy */}
            <div id="no-content-logging" className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16 scroll-mt-4">
              <h2 className="text-3xl lg:text-4xl text-heading mb-12 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  No-Content-Logging Policy
                </span>
              </h2>
              
              <div className="space-y-8">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <EyeOff className="w-6 h-6 text-red-600 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-xl text-heading mb-3">Core Principle</h3>
                      <p className="text-body mb-4">
                        SafePsy implements a strict no-content-logging policy to ensure maximum privacy protection. 
                        Sensitive mental health content, therapy session data, and personal communications are never 
                        logged in plaintext or in any form that could be reconstructed.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4 flex items-center gap-2">
                    <Shield className="w-6 h-6 text-blue-600" />
                    What We Do NOT Log
                  </h3>
                  <div className="space-y-4 text-body">
                    <div>
                      <strong className="text-heading">Therapy Content:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Chat messages and conversations between clients and therapists</li>
                        <li>Therapy session notes and assessments</li>
                        <li>Mental health questionnaires and responses</li>
                        <li>Treatment plans and progress notes</li>
                        <li>Any content containing sensitive health information</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Personal Information:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Email addresses (unless explicitly provided for service delivery)</li>
                        <li>IP addresses (disabled by default, privacy-by-design)</li>
                        <li>Wallet addresses in connection with personal data</li>
                        <li>Any personally identifiable information (PII) in logs</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Encrypted Data:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Encrypted chat blobs are never logged</li>
                        <li>Encryption keys are never logged</li>
                        <li>Decryption processes are not logged</li>
                        <li>Key derivation material is not logged</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4 flex items-center gap-2">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    What We DO Log (Metadata Only)
                  </h3>
                  <div className="space-y-4 text-body">
                    <div>
                      <strong className="text-heading">Operational Metadata:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>API endpoint accessed (e.g., /api/chat/save)</li>
                        <li>HTTP method and status codes</li>
                        <li>Request timestamps</li>
                        <li>Response times and performance metrics</li>
                        <li>Error codes (without error message content)</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Security Events:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Authentication attempts (success/failure, no credentials)</li>
                        <li>Access control violations (metadata only)</li>
                        <li>Rate limiting events</li>
                        <li>Safety violation detections (type only, no content)</li>
                        <li>PII redaction events (that redaction occurred, not the content)</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">System Health:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>System resource usage (CPU, memory, disk)</li>
                        <li>Database connection status</li>
                        <li>Service availability metrics</li>
                        <li>Deployment and configuration changes</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4 flex items-center gap-2">
                    <Lock className="w-6 h-6 text-purple-600" />
                    Technical Implementation
                  </h3>
                  <div className="space-y-4 text-body">
                    <div>
                      <strong className="text-heading">Logging Middleware:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Request/response interceptors filter out sensitive content</li>
                        <li>PII redaction enabled by default in all logs</li>
                        <li>Content sanitization before any logging operations</li>
                        <li>Structured logging with explicit field exclusions</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Privacy Utilities:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>IP hashing disabled by default (no IP logging)</li>
                        <li>PII detection and redaction in log streams</li>
                        <li>Content filtering for sensitive keywords</li>
                        <li>Automatic sanitization of error messages</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Log Storage:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Logs stored in encrypted format</li>
                        <li>Limited retention period (90 days for metadata logs)</li>
                        <li>Access controls on log storage systems</li>
                        <li>Regular audit of logging practices</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-6 h-6 text-yellow-600" />
                    Exception Handling
                  </h3>
                  <div className="space-y-4 text-body">
                    <div>
                      <strong className="text-heading">Security Incidents:</strong>
                      <p className="mt-1 mb-2">
                        In the event of a security incident requiring investigation, the following applies:
                      </p>
                      <ul className="ml-6 list-disc space-y-1">
                        <li>Only metadata and non-sensitive information may be logged for incident response</li>
                        <li>Any exception to no-content-logging requires DPO approval</li>
                        <li>Incident logs are subject to strict access controls</li>
                        <li>Incident logs are deleted immediately after investigation completion</li>
                        <li>All exceptions are documented and audited</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Legal Requirements:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Compliance with legal obligations may require limited logging</li>
                        <li>Any legal exception must be approved by legal counsel and DPO</li>
                        <li>Legal logging is minimized to absolute necessity</li>
                        <li>Legal logs are subject to enhanced security measures</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4 flex items-center gap-2">
                    <Eye className="w-6 h-6 text-emerald-600" />
                    Compliance and Monitoring
                  </h3>
                  <div className="space-y-4 text-body">
                    <div>
                      <strong className="text-heading">Regular Audits:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Quarterly review of logging practices and configurations</li>
                        <li>Verification that no sensitive content is being logged</li>
                        <li>Review of exception requests and approvals</li>
                        <li>Assessment of log retention and deletion practices</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Privacy Impact:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>No-content-logging policy reduces privacy risks significantly</li>
                        <li>Eliminates risk of sensitive data exposure through log files</li>
                        <li>Prevents unauthorized access to therapy content via logs</li>
                        <li>Supports compliance with GDPR data minimization principles</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Documentation:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>This policy is documented in technical specifications</li>
                        <li>All developers receive training on no-content-logging requirements</li>
                        <li>Code reviews include verification of logging practices</li>
                        <li>Policy violations are treated as security incidents</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* GDPR Compliance Review */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16">
              <h2 className="text-3xl lg:text-4xl text-heading mb-12 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Comprehensive GDPR Compliance Review
                </span>
              </h2>
              
              <div className="space-y-12">
                {/* GDPR Principles - Article 5 */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-8">
                  <h3 className="text-2xl text-heading mb-6 flex items-center gap-3">
                    <Shield className="w-7 h-7 text-blue-600" />
                    Article 5: Principles Relating to Processing of Personal Data
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-100 dark:border-blue-900">
                        <h4 className="font-semibold text-heading mb-2">1. Lawfulness, Fairness, and Transparency</h4>
                        <p className="text-sm text-body">SafePsy ensures all processing is lawful, fair, and transparent through:</p>
                        <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                          <li>Clear privacy notices explaining data processing</li>
                          <li>Explicit consent mechanisms for sensitive data (see <a href="#consent-management" className="text-primary-600 hover:underline link-hover">Consent Management</a>)</li>
                          <li>Transparent terms of service and privacy policies</li>
                          <li>Regular privacy policy updates and notifications</li>
                        </ul>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-100 dark:border-blue-900">
                        <h4 className="font-semibold text-heading mb-2">2. Purpose Limitation</h4>
                        <p className="text-sm text-body">Data collected only for specified, explicit, and legitimate purposes:</p>
                        <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                          <li>Data processing limited to therapy service provision</li>
                          <li>No secondary use without explicit consent</li>
                          <li>Clear purpose specification in privacy notices</li>
                          <li>Technical controls preventing unauthorized use</li>
                        </ul>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-100 dark:border-blue-900">
                        <h4 className="font-semibold text-heading mb-2">3. Data Minimization</h4>
                        <p className="text-sm text-body">Only necessary data collected and processed:</p>
                        <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                          <li>Minimal data collection for service provision</li>
                          <li>Regular audits to ensure minimization compliance</li>
                          <li>No collection of unnecessary personal information</li>
                          <li>Data collection limited to therapy-relevant information</li>
                        </ul>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-100 dark:border-blue-900">
                        <h4 className="font-semibold text-heading mb-2">4. Accuracy</h4>
                        <p className="text-sm text-body">Personal data kept accurate and up-to-date:</p>
                        <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                          <li>User-controlled data correction mechanisms</li>
                          <li>Real-time data update capabilities</li>
                          <li>Data integrity verification using SHA-256</li>
                          <li>Regular data accuracy reviews</li>
                        </ul>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-100 dark:border-blue-900">
                        <h4 className="font-semibold text-heading mb-2">5. Storage Limitation</h4>
                        <p className="text-sm text-body">Data retained only as long as necessary:</p>
                        <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                          <li>7-year retention for health records (regulatory requirement)</li>
                          <li>30-day retention for communication data (user-configurable)</li>
                          <li>Automated deletion after retention periods</li>
                          <li>User-controlled immediate deletion option</li>
                        </ul>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-100 dark:border-blue-900">
                        <h4 className="font-semibold text-heading mb-2">6. Integrity and Confidentiality</h4>
                        <p className="text-sm text-body">Data processed securely with appropriate safeguards:</p>
                        <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                          <li>AES-256-GCM encryption for data at rest</li>
                          <li>TLS 1.3 for data in transit</li>
                          <li>DID-based access control</li>
                          <li>Comprehensive security measures and monitoring</li>
                        </ul>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-100 dark:border-blue-900">
                        <h4 className="font-semibold text-heading mb-2">7. Accountability</h4>
                        <p className="text-sm text-body">Controller responsible for and demonstrates compliance:</p>
                        <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                          <li>Comprehensive documentation of processing activities</li>
                          <li>Regular compliance audits and assessments</li>
                          <li>Data Protection Officer oversight</li>
                          <li>This DPIA as evidence of accountability</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lawfulness of Processing - Article 6 */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-8">
                  <h3 className="text-2xl text-heading mb-6 flex items-center gap-3">
                    <CheckCircle className="w-7 h-7 text-green-600" />
                    Article 6: Lawfulness of Processing
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-green-100 dark:border-green-900">
                      <h4 className="font-semibold text-heading mb-3">Legal Bases Used by SafePsy</h4>
                      <div className="space-y-4">
                        <div>
                          <strong className="text-heading text-sm">Article 6(1)(a) - Consent</strong>
                          <p className="text-sm text-body mt-1">Explicit, informed consent obtained for all non-essential processing activities. Users can withdraw consent at any time through granular consent controls. See <a href="#consent-management" className="text-primary-600 hover:underline link-hover">Consent Management</a> for detailed consent flow implementation.</p>
                        </div>
                        <div>
                          <strong className="text-heading text-sm">Article 6(1)(b) - Contract</strong>
                          <p className="text-sm text-body mt-1">Processing necessary for performance of therapy service contracts. All contract terms clearly specify data processing requirements.</p>
                        </div>
                        <div>
                          <strong className="text-heading text-sm">Article 6(1)(f) - Legitimate Interests</strong>
                          <p className="text-sm text-body mt-1">Used for platform security, fraud prevention, and service improvement. Legitimate interests balancing test conducted and documented. Users can object to processing.</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-green-100 dark:border-green-900">
                      <h4 className="font-semibold text-heading mb-3">Special Categories - Article 9</h4>
                      <div className="space-y-4">
                        <div>
                          <strong className="text-heading text-sm">Article 9(2)(a) - Explicit Consent</strong>
                          <p className="text-sm text-body mt-1">Explicit consent obtained for processing sensitive health data. Consent is specific, informed, and unambiguous. Clear explanation of risks provided. See <a href="#consent-management" className="text-primary-600 hover:underline link-hover">Consent Management</a> for comprehensive consent implementation details.</p>
                        </div>
                        <div>
                          <strong className="text-heading text-sm">Article 9(2)(c) - Vital Interests</strong>
                          <p className="text-sm text-body mt-1">Processing permitted when necessary to protect vital interests in emergency mental health situations. Strict protocols in place for such scenarios.</p>
                        </div>
                        <div>
                          <strong className="text-heading text-sm">Article 9(2)(h) - Health Care</strong>
                          <p className="text-sm text-body mt-1">Processing for preventive medicine, medical diagnosis, and provision of health care. All processing conducted by qualified health professionals or under their supervision.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Data Subject Rights - Articles 12-23 */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-8">
                  <h3 className="text-2xl text-heading mb-6 flex items-center gap-3">
                    <Users className="w-7 h-7 text-purple-600" />
                    Articles 12-23: Data Subject Rights
                  </h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-purple-100 dark:border-purple-900">
                      <h4 className="font-semibold text-heading mb-3">Article 12 - Transparent Information</h4>
                      <p className="text-sm text-body mb-3">Clear, concise, and easily accessible privacy information provided in plain language.</p>
                      <ul className="text-xs text-body space-y-1 ml-4 list-disc">
                        <li>Privacy notices in multiple languages</li>
                        <li>Visual aids and summaries</li>
                        <li>Regular updates and notifications</li>
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-purple-100 dark:border-purple-900">
                      <h4 className="font-semibold text-heading mb-3">Article 13 - Information to be Provided</h4>
                      <p className="text-sm text-body mb-3">Comprehensive information provided when collecting data directly from data subjects.</p>
                      <ul className="text-xs text-body space-y-1 ml-4 list-disc">
                        <li>Identity and contact details of controller</li>
                        <li>DPO contact information</li>
                        <li>Purposes and legal basis</li>
                        <li>Recipients and retention periods</li>
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-purple-100 dark:border-purple-900">
                      <h4 className="font-semibold text-heading mb-3">Article 14 - Information When Not Obtained Directly</h4>
                      <p className="text-sm text-body mb-3">Information provided when data obtained from third parties within one month.</p>
                      <ul className="text-xs text-body space-y-1 ml-4 list-disc">
                        <li>Source of personal data disclosed</li>
                        <li>Categories of data explained</li>
                        <li>All required information provided</li>
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-purple-100 dark:border-purple-900">
                      <h4 className="font-semibold text-heading mb-3">Article 15 - Right of Access</h4>
                      <p className="text-sm text-body mb-3">Data subjects can access their personal data within 30 days.</p>
                      <ul className="text-xs text-body space-y-1 ml-4 list-disc">
                        <li>Complete data export via encrypted APIs</li>
                        <li>Machine-readable format (JSON/XML)</li>
                        <li>Processing purposes and legal basis</li>
                        <li>Retention period information</li>
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-purple-100 dark:border-purple-900">
                      <h4 className="font-semibold text-heading mb-3">Article 16 - Right to Rectification</h4>
                      <p className="text-sm text-body mb-3">Data subjects can correct inaccurate or incomplete data.</p>
                      <ul className="text-xs text-body space-y-1 ml-4 list-disc">
                        <li>Real-time data correction mechanisms</li>
                        <li>Cryptographic integrity verification</li>
                        <li>Immediate update processing</li>
                        <li>Notification of corrections to recipients</li>
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-purple-100 dark:border-purple-900">
                      <h4 className="font-semibold text-heading mb-3">Article 17 - Right to Erasure</h4>
                      <p className="text-sm text-body mb-3">"Right to be forgotten" implemented with cryptographic data deletion.</p>
                      <ul className="text-xs text-body space-y-1 ml-4 list-disc">
                        <li>Complete data removal from all systems</li>
                        <li>Deletion from backups and archives</li>
                        <li>Notification to third-party processors</li>
                        <li>Exceptions for legal obligations documented</li>
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-purple-100 dark:border-purple-900">
                      <h4 className="font-semibold text-heading mb-3">Article 18 - Right to Restriction</h4>
                      <p className="text-sm text-body mb-3">Data subjects can restrict processing in specific circumstances.</p>
                      <ul className="text-xs text-body space-y-1 ml-4 list-disc">
                        <li>Technical controls for processing restriction</li>
                        <li>Notification of restriction to recipients</li>
                        <li>Clear restriction request mechanisms</li>
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-purple-100 dark:border-purple-900">
                      <h4 className="font-semibold text-heading mb-3">Article 20 - Right to Data Portability</h4>
                      <p className="text-sm text-body mb-3">Data provided in structured, commonly used, machine-readable format.</p>
                      <ul className="text-xs text-body space-y-1 ml-4 list-disc">
                        <li>JSON and XML export formats</li>
                        <li>Complete data export including metadata</li>
                        <li>Direct transmission to another controller (where feasible)</li>
                        <li>No excessive technical barriers</li>
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-purple-100 dark:border-purple-900">
                      <h4 className="font-semibold text-heading mb-3">Article 21 - Right to Object</h4>
                      <p className="text-sm text-body mb-3">Data subjects can object to processing based on legitimate interests.</p>
                      <ul className="text-xs text-body space-y-1 ml-4 list-disc">
                        <li>Clear objection mechanisms</li>
                        <li>Immediate processing cessation upon objection</li>
                        <li>Right to object to direct marketing</li>
                        <li>Balancing test documentation</li>
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-purple-100 dark:border-purple-900">
                      <h4 className="font-semibold text-heading mb-3">Article 22 - Automated Decision-Making</h4>
                      <p className="text-sm text-body mb-3">No solely automated decision-making with legal or significant effects.</p>
                      <ul className="text-xs text-body space-y-1 ml-4 list-disc">
                        <li>Human review for all significant decisions</li>
                        <li>Transparent AI-assisted tools (not automated decisions)</li>
                        <li>Right to human intervention</li>
                        <li>Right to contest automated decisions</li>
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-purple-100 dark:border-purple-900">
                      <h4 className="font-semibold text-heading mb-3">Article 23 - Restrictions</h4>
                      <p className="text-sm text-body mb-3">Any restrictions on data subject rights are lawful, necessary, and proportionate.</p>
                      <ul className="text-xs text-body space-y-1 ml-4 list-disc">
                        <li>Restrictions only for legal compliance</li>
                        <li>Documentation of restriction justifications</li>
                        <li>Minimal impact on data subject rights</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Controller and Processor Obligations */}
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-8">
                  <h3 className="text-2xl text-heading mb-6 flex items-center gap-3">
                    <FileText className="w-7 h-7 text-orange-600" />
                    Articles 24-43: Controller and Processor Obligations
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-orange-100 dark:border-orange-900">
                        <h4 className="font-semibold text-heading mb-3">Article 24 - Responsibility of Controller</h4>
                        <p className="text-sm text-body">SafePsy implements appropriate technical and organizational measures:</p>
                        <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                          <li>Privacy by design and by default implementation</li>
                          <li>Regular risk assessments and security audits</li>
                          <li>Comprehensive data protection policies</li>
                          <li>Staff training and awareness programs</li>
                        </ul>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-orange-100 dark:border-orange-900">
                        <h4 className="font-semibold text-heading mb-3">Article 25 - Data Protection by Design and by Default</h4>
                        <p className="text-sm text-body">Privacy integrated into system design from the outset:</p>
                        <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                          <li>Encryption at rest by default (ciphertext stored; keys derived from user wallet)</li>
                          <li>Minimal data collection as default setting</li>
                          <li>User-controlled privacy settings</li>
                          <li>Privacy impact assessments for new features</li>
                        </ul>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-orange-100 dark:border-orange-900">
                        <h4 className="font-semibold text-heading mb-3">Article 28 - Processor</h4>
                        <p className="text-sm text-body">All processors bound by data processing agreements:</p>
                        <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                          <li>Standard Contractual Clauses (SCCs) with all processors</li>
                          <li>Clear processor obligations and restrictions</li>
                          <li>Regular processor compliance audits</li>
                          <li>Sub-processor approval requirements</li>
                        </ul>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-orange-100 dark:border-orange-900">
                        <h4 className="font-semibold text-heading mb-3">Article 30 - Records of Processing Activities</h4>
                        <p className="text-sm text-body">Comprehensive records maintained of all processing activities:</p>
                        <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                          <li>Detailed processing activity logs</li>
                          <li>Categories of data subjects and personal data</li>
                          <li>Recipients and transfer information</li>
                          <li>Retention periods and security measures</li>
                        </ul>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-orange-100 dark:border-orange-900">
                        <h4 className="font-semibold text-heading mb-3">Article 32 - Security of Processing</h4>
                        <p className="text-sm text-body">Appropriate technical and organizational measures implemented (see <a href="#encrypted-storage" className="text-primary-600 hover:underline link-hover">Encrypted Storage</a> for details):</p>
                        <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                          <li>Pseudonymization and encryption of personal data (AES-256-GCM)</li>
                          <li>Confidentiality, integrity, and availability of systems</li>
                          <li>Regular testing and evaluation of security measures</li>
                          <li>Incident response and recovery procedures</li>
                          <li>Client-side encryption for storage; server-side temporary decryption in memory for AI responses</li>
                        </ul>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-orange-100 dark:border-orange-900">
                        <h4 className="font-semibold text-heading mb-3">Article 33 - Breach Notification to Authority</h4>
                        <p className="text-sm text-body">Personal data breaches reported within 72 hours:</p>
                        <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                          <li>Immediate breach detection and assessment</li>
                          <li>Notification to supervisory authority within 72 hours</li>
                          <li>Comprehensive breach documentation</li>
                          <li>Impact assessment and mitigation measures</li>
                        </ul>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-orange-100 dark:border-orange-900">
                        <h4 className="font-semibold text-heading mb-3">Article 34 - Breach Notification to Data Subject</h4>
                        <p className="text-sm text-body">High-risk breaches communicated to data subjects without delay:</p>
                        <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                          <li>Clear and plain language breach notifications</li>
                          <li>Description of nature and likely consequences</li>
                          <li>Measures taken or proposed to address breach</li>
                          <li>Contact information for further inquiries</li>
                        </ul>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-orange-100 dark:border-orange-900">
                        <h4 className="font-semibold text-heading mb-3">Article 35 - Data Protection Impact Assessment</h4>
                        <p className="text-sm text-body">This DPIA demonstrates compliance with Article 35 requirements:</p>
                        <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                          <li>Systematic description of processing operations</li>
                          <li>Assessment of necessity and proportionality</li>
                          <li>Risk assessment and mitigation measures</li>
                          <li>Regular review and update procedures</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Data Protection Officer - Articles 37-39 */}
                <div className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border border-teal-200 dark:border-teal-800 rounded-xl p-8">
                  <h3 className="text-2xl text-heading mb-6 flex items-center gap-3">
                    <Eye className="w-7 h-7 text-teal-600" />
                    Articles 37-39: Data Protection Officer
                  </h3>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-teal-100 dark:border-teal-900">
                      <h4 className="font-semibold text-heading mb-3">Article 37 - Designation</h4>
                      <p className="text-sm text-body">SafePsy has designated a Data Protection Officer due to:</p>
                      <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                        <li>Processing of sensitive health data (Article 9)</li>
                        <li>Large-scale systematic monitoring</li>
                        <li>Core activities requiring regular monitoring</li>
                        <li>DPO contact information publicly available</li>
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-teal-100 dark:border-teal-900">
                      <h4 className="font-semibold text-heading mb-3">Article 38 - Position</h4>
                      <p className="text-sm text-body">DPO operates with independence and expertise:</p>
                      <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                        <li>Direct reporting to highest management level</li>
                        <li>No conflicts of interest</li>
                        <li>Appropriate resources and support</li>
                        <li>Professional secrecy and confidentiality</li>
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-teal-100 dark:border-teal-900">
                      <h4 className="font-semibold text-heading mb-3">Article 39 - Tasks</h4>
                      <p className="text-sm text-body">DPO performs comprehensive compliance tasks:</p>
                      <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                        <li>Inform and advise on GDPR obligations</li>
                        <li>Monitor GDPR compliance</li>
                        <li>Provide advice on DPIAs</li>
                        <li>Cooperate with supervisory authorities</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Transfers of Personal Data - Articles 44-49 */}
                <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border border-red-200 dark:border-red-800 rounded-xl p-8">
                  <h3 className="text-2xl text-heading mb-6 flex items-center gap-3">
                    <Database className="w-7 h-7 text-red-600" />
                    Articles 44-49: Transfers of Personal Data to Third Countries
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-red-100 dark:border-red-900">
                      <h4 className="font-semibold text-heading mb-3">Article 44 - General Principle</h4>
                      <p className="text-sm text-body">All transfers subject to GDPR Chapter V requirements:</p>
                      <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                        <li>Transfers only with appropriate safeguards</li>
                        <li>Comprehensive transfer documentation</li>
                        <li>Regular transfer risk assessments</li>
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-red-100 dark:border-red-900">
                      <h4 className="font-semibold text-heading mb-3">Article 45 - Adequacy Decision</h4>
                      <p className="text-sm text-body">Transfers to countries with adequacy decisions:</p>
                      <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                        <li>Monitoring of adequacy decision status</li>
                        <li>Preference for adequate countries where possible</li>
                        <li>Documentation of adequacy-based transfers</li>
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-red-100 dark:border-red-900">
                      <h4 className="font-semibold text-heading mb-3">Article 46 - Appropriate Safeguards</h4>
                      <p className="text-sm text-body">Standard Contractual Clauses (SCCs) used for transfers:</p>
                      <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                        <li>EU Standard Contractual Clauses (2021 version)</li>
                        <li>Binding Corporate Rules where applicable</li>
                        <li>Additional technical safeguards (encryption)</li>
                        <li>Regular review of transfer mechanisms</li>
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-red-100 dark:border-red-900">
                      <h4 className="font-semibold text-heading mb-3">Article 49 - Derogations</h4>
                      <p className="text-sm text-body">Specific derogations used only when necessary:</p>
                      <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                        <li>Explicit consent for specific transfers</li>
                        <li>Contract performance necessity</li>
                        <li>Important reasons of public interest</li>
                        <li>Documentation of derogation use</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Codes of Conduct and Certification - Articles 40-43 */}
                <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-8">
                  <h3 className="text-2xl text-heading mb-6 flex items-center gap-3">
                    <Shield className="w-7 h-7 text-indigo-600" />
                    Articles 40-43: Codes of Conduct and Certification
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-indigo-100 dark:border-indigo-900">
                      <h4 className="font-semibold text-heading mb-3">Article 40 - Codes of Conduct</h4>
                      <p className="text-sm text-body">SafePsy adheres to relevant industry codes:</p>
                      <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                        <li>Mental health professional codes of ethics</li>
                        <li>Healthcare data protection standards</li>
                        <li>Technology industry best practices</li>
                        <li>Regular code compliance reviews</li>
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-indigo-100 dark:border-indigo-900">
                      <h4 className="font-semibold text-heading mb-3">Article 42 - Certification</h4>
                      <p className="text-sm text-body">Pursuing relevant certifications:</p>
                      <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                        <li>ISO 27001 Information Security Management</li>
                        <li>ISO 27701 Privacy Information Management</li>
                        <li>Healthcare-specific certifications</li>
                        <li>Regular certification audits</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Compliance Summary */}
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-2 border-emerald-300 dark:border-emerald-700 rounded-xl p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <CheckCircle className="w-8 h-8 text-emerald-600" />
                    <h3 className="text-2xl text-heading">GDPR Compliance Summary</h3>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-emerald-100 dark:border-emerald-900">
                    <p className="text-body mb-4">
                      SafePsy demonstrates comprehensive compliance with the General Data Protection Regulation (GDPR) through:
                    </p>
                    <div className="grid md:grid-cols-2 gap-4">
                      <ul className="space-y-2 text-body text-sm">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <span>Full implementation of GDPR principles (Article 5)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <span>Lawful processing with appropriate legal bases (Articles 6, 9)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <span>Complete data subject rights implementation (Articles 12-23)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <span>Privacy by design and by default (Article 25)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <span>Comprehensive security measures (Article 32)</span>
                        </li>
                      </ul>
                      <ul className="space-y-2 text-body text-sm">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <span>Data Protection Impact Assessments (Article 35 - this document)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <span>Data Protection Officer oversight (Articles 37-39)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <span>Breach notification procedures (Articles 33-34)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <span>Secure cross-border transfers (Articles 44-49)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <span>Records of processing activities (Article 30)</span>
                        </li>
                      </ul>
                    </div>
                    <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <p className="text-sm text-body font-medium">
                        This comprehensive GDPR compliance review demonstrates SafePsy's commitment to protecting personal data 
                        and respecting data subject rights in accordance with all applicable GDPR requirements. Compliance is 
                        continuously monitored, reviewed, and improved through regular audits and assessments.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Consultation */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16">
              <h2 className="text-3xl lg:text-4xl text-heading mb-12 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Consultation
                </span>
              </h2>
              
              <div className="space-y-8">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4">Data Protection Officer (DPO)</h3>
                  <p className="text-body mb-4">
                    SafePsy has appointed a Data Protection Officer to oversee data protection compliance:
                  </p>
                  <div className="space-y-2 text-body">
                    <p><strong>Contact:</strong> <button onClick={() => navigate('/contact-us')} className="text-primary-600 hover:underline link-hover">Contact Us</button></p>
                    <p><strong>Role:</strong> Independent oversight of data protection practices, risk assessments, and compliance monitoring</p>
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4">Stakeholder Consultation</h3>
                  <p className="text-body mb-4">
                    This DPIA has been developed in consultation with:
                  </p>
                  <ul className="space-y-2 text-body ml-6 list-disc">
                    <li>Data Protection Officer</li>
                    <li>Security and Privacy Team</li>
                    <li>Legal and Compliance Team</li>
                    <li>Technical Architecture Team</li>
                    <li>User representatives (where applicable)</li>
                  </ul>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4">Supervisory Authority Consultation</h3>
                  <p className="text-body">
                    Where required under GDPR Article 36, SafePsy will consult with the relevant supervisory authority 
                    (e.g., ICO in the UK, CNIL in France) before commencing high-risk processing activities. This DPIA 
                    will be made available to supervisory authorities upon request.
                  </p>
                </div>
              </div>
            </div>

            {/* Sign-off and Approval */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16">
              <h2 className="text-3xl lg:text-4xl text-heading mb-12 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Sign-off and Approval
                </span>
              </h2>
              
              <div className="space-y-6">
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4">Approval Status</h3>
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <span className="text-body font-semibold">DPIA Approved and Active</span>
                  </div>
                  <p className="text-body text-sm">
                    This DPIA has been reviewed and approved by the Data Protection Officer and senior management. 
                    It will be reviewed annually or when significant changes occur to processing activities.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <h4 className="text-lg text-heading mb-2">Data Protection Officer</h4>
                    <p className="text-body text-sm mb-4">Review and approval of DPIA</p>
                    <p className="text-body text-xs text-gray-500">Status: Approved</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <h4 className="text-lg text-heading mb-2">Chief Technology Officer</h4>
                    <p className="text-body text-sm mb-4">Technical risk assessment and mitigation</p>
                    <p className="text-body text-xs text-gray-500">Status: Approved</p>
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
                  <h3 className="text-lg text-heading mb-2">Next Review Date</h3>
                  <p className="text-body">
                    This DPIA will be reviewed on or before{' '}
                    <strong>{new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>, 
                    or earlier if significant changes occur to processing activities, technology, or regulatory requirements.
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl text-heading mb-6">
                Questions About This DPIA?
              </h2>
              <p className="text-lg text-body mb-8 max-w-2xl mx-auto">
                For questions about this Data Protection Impact Assessment or our data protection practices, 
                please contact us.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => navigate('/contact-us')}
                  className="btn-primary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 min-h-[44px]"
                >
                  Contact Us
                </button>
                <button
                  onClick={() => navigate('/sap-policy')}
                  className="btn-secondary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 min-h-[44px]"
                >
                  View Security and Privacy Policy
                </button>
              </div>
            </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default DPIA

