import React from 'react'
import { Shield, Lock, Eye, Users, FileText, CheckCircle, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'

const SecurityAndPrivacyPolicy: React.FC = () => {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex flex-col">
      <Header showBackButton={true} />

      {/* Main Content */}
      <main id="main-content" className="flex-1" role="main" aria-label="Security and Privacy Policy" tabIndex={-1}>
        <section className="section-padding py-8 lg:py-12">
          <div className="container-max">
            {/* Hero Section */}
            <div className="text-center mb-12 sm:mb-16 px-4">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl text-heading leading-tight mb-4 sm:mb-6">
                <span className="text-[1.08em]">Security and</span>{' '}
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent text-[1.2em] font-bold">
                  Privacy Policy
                </span>
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-body leading-relaxed max-w-3xl mx-auto">
                Comprehensive data protection and security measures for your mental health journey
              </p>
            </div>

            {/* Security Overview */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12 xl:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-12 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl text-heading mb-6 sm:mb-8 text-center px-2">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Security Overview
                </span>
              </h2>
              <p className="text-base sm:text-lg text-body leading-relaxed text-center max-w-4xl mx-auto mb-6 px-4">
                SafePsy implements comprehensive security measures to protect user data, ensure privacy, 
                and maintain system integrity. Our multi-layer security model is aligned with ISO/IEC 27001:2022 
                and provides enterprise-grade protection for your sensitive mental health information. We record 
                security-relevant events (e.g. authentication) in audit logs with redacted identifiers for incident 
                response and compliance.
              </p>
              <p className="text-base sm:text-lg text-body leading-relaxed text-center max-w-4xl mx-auto mb-8 sm:mb-12 px-4 font-medium text-heading">
                A key differentiator: you own your data. We do not store it with third parties or use it to train AI models.
              </p>

              <div className="max-w-4xl mx-auto mb-10 sm:mb-12 px-4 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-900/20 p-6 text-left">
                <h3 className="text-xl text-heading font-semibold mb-3">Guest mode and wallet mode</h3>
                <p className="text-body text-sm sm:text-base mb-3">
                  <strong className="text-heading">Guest mode</strong> lets you try the assistant without connecting a wallet.
                  Guest conversations are not written to our databases, are not associated with any wallet or account, and exist
                  only in your browser for that visit (a hard refresh starts a new session). We do not use guest message content
                  for analytics or training. Operational logs avoid storing guest chat text.
                </p>
                <p className="text-body text-sm sm:text-base">
                  <strong className="text-heading">Wallet mode</strong> (after you connect and verify a wallet) enables encrypted
                  storage of your chat history, keys derived from your wallet, and continuity across sessions subject to our
                  technical architecture and terms.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                <div className="space-y-4 text-center">
                  <div className="w-16 h-16 mx-auto bg-primary-100 rounded-full flex items-center justify-center border border-primary-200 dark:bg-primary-900/30 dark:border-primary-700">
                    <Shield className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                  </div>
                  <h3 className="text-xl text-heading">Network Security</h3>
                  <p className="text-body">
                    HTTPS/TLS encryption, security headers, rate limiting, and DDoS protection
                  </p>
                </div>
                
                <div className="space-y-4 text-center">
                  <div className="w-16 h-16 mx-auto bg-secondary-100 rounded-full flex items-center justify-center border border-secondary-200 dark:bg-secondary-900/30 dark:border-secondary-700">
                    <Lock className="w-8 h-8 text-secondary-600 dark:text-secondary-400" />
                  </div>
                  <h3 className="text-xl text-heading">Data Security</h3>
                  <p className="text-body">
                    AES-256 encryption, DID-based access control, and secure key management
                  </p>
                </div>
                
                <div className="space-y-4 text-center">
                  <div className="w-16 h-16 mx-auto bg-accent-100 rounded-full flex items-center justify-center border border-accent-200 dark:bg-accent-900/30 dark:border-accent-700">
                    <Eye className="w-8 h-8 text-accent-600 dark:text-accent-400" />
                  </div>
                  <h3 className="text-xl text-heading">Application Security</h3>
                  <p className="text-body">
                    Input validation, authentication, session management, and CSRF protection
                  </p>
                </div>
                
                <div className="space-y-4 text-center">
                  <div className="w-16 h-16 mx-auto bg-primary-100 rounded-full flex items-center justify-center border border-primary-200 dark:bg-primary-900/30 dark:border-primary-700">
                    <Users className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                  </div>
                  <h3 className="text-xl text-heading">Infrastructure Security</h3>
                  <p className="text-body">
                    Container security, network segmentation, monitoring, and incident response
                  </p>
                </div>
              </div>
            </div>

            {/* Encryption Standards */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16">
              <h2 className="text-3xl lg:text-4xl text-heading mb-12 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Encryption Standards
                </span>
              </h2>
              
              <div className="grid md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <h3 className="text-2xl text-heading mb-4">Data Protection</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="text-lg text-heading">AES-256-GCM Encryption</h4>
                        <p className="text-body">Industry-standard encryption for all sensitive data at rest and in transit</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="text-lg text-heading">TLS 1.3</h4>
                        <p className="text-body">Latest transport layer security for secure data transmission</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="text-lg text-heading">Wallet-Based Key Derivation</h4>
                        <p className="text-body">Encryption keys derived from wallet signatures using SHA-256 hash. PBKDF2 available for password-based derivation if needed.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="text-lg text-heading">SHA-256 Integrity</h4>
                        <p className="text-body">Data integrity verification and tamper detection</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-2xl text-heading mb-4">Access Control</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="text-lg text-heading">DID-Based Authentication</h4>
                        <p className="text-body">Decentralized identity management with cryptographic key pairs and blockchain verification</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="text-lg text-heading">User-Controlled Keys</h4>
                        <p className="text-body">Users maintain control over their encryption keys (never stored on servers). Chat data is encrypted client-side before transmission and stored as ciphertext only. Server-side AI processing requires temporary decryption in memory.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="text-lg text-heading">Role-Based Permissions</h4>
                        <p className="text-body">Granular access control for therapists and authorized personnel</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="text-lg text-heading">Audit Logging</h4>
                        <p className="text-body">Access and data operation logs, plus security event logging (e.g. authentication success and failure) for incident response and compliance. Audit logs use redacted identifiers (e.g. partial wallet address) and do not store full PII or secrets.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Protection Rights */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16">
              <h2 className="text-3xl lg:text-4xl text-heading mb-12 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Your Data Protection Rights
                </span>
              </h2>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-primary-100 rounded-full flex items-center justify-center border border-primary-200">
                    <Eye className="w-8 h-8 text-primary-600" />
                  </div>
                  <h3 className="text-xl text-heading text-center">Right to Access</h3>
                  <p className="text-body text-center">
                    Access all your personal data processed by SafePsy through our encrypted APIs within 30 days
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-secondary-100 rounded-full flex items-center justify-center border border-secondary-200">
                    <FileText className="w-8 h-8 text-secondary-600" />
                  </div>
                  <h3 className="text-xl text-heading text-center">Right to Rectification</h3>
                  <p className="text-body text-center">
                    Correct or update your personal data with encrypted data update mechanisms
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-accent-100 rounded-full flex items-center justify-center border border-accent-200">
                    <Lock className="w-8 h-8 text-accent-600" />
                  </div>
                  <h3 className="text-xl text-heading text-center">Right to Erasure</h3>
                  <p className="text-body text-center">
                    Deletion of your off-chain data (e.g. chat history, encrypted blobs) according to our process. On-chain DID lifecycle events are permanent on the blockchain and cannot be erased.
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-primary-100 rounded-full flex items-center justify-center border border-primary-200">
                    <Shield className="w-8 h-8 text-primary-600" />
                  </div>
                  <h3 className="text-xl text-heading text-center">Right to Portability</h3>
                  <p className="text-body text-center">
                    Export all your data in a structured, machine-readable format
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-secondary-100 rounded-full flex items-center justify-center border border-secondary-200">
                    <Users className="w-8 h-8 text-secondary-600" />
                  </div>
                  <h3 className="text-xl text-heading text-center">Right to Restrict Processing</h3>
                  <p className="text-body text-center">
                    Limit data processing for specific purposes or data types
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-accent-100 rounded-full flex items-center justify-center border border-accent-200">
                    <CheckCircle className="w-8 h-8 text-accent-600" />
                  </div>
                  <h3 className="text-xl text-heading text-center">Consent Management</h3>
                  <p className="text-body text-center">
                    Granular consent controls with immediate withdrawal capabilities
                  </p>
                </div>
              </div>
            </div>

            {/* Compliance */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16">
              <h2 className="text-3xl lg:text-4xl text-heading mb-12 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Regulatory Compliance
                </span>
              </h2>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center border border-green-200">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-xl text-heading">GDPR</h3>
                  <p className="text-body">Measures aimed at GDPR compliance: data subject rights (access, rectification, erasure, portability, restriction), lawful bases, and minimization</p>
                </div>
                
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 mx-auto bg-blue-100 rounded-full flex items-center justify-center border border-blue-200">
                    <CheckCircle className="w-10 h-10 text-blue-600" />
                  </div>
                  <h3 className="text-xl text-heading">HIPAA-style safeguards</h3>
                  <p className="text-body">Technical and organizational safeguards supporting HIPAA-style security. We are not a HIPAA-covered entity and do not hold HIPAA certification.</p>
                </div>
                
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 mx-auto bg-purple-100 rounded-full flex items-center justify-center border border-purple-200">
                    <CheckCircle className="w-10 h-10 text-purple-600" />
                  </div>
                  <h3 className="text-xl text-heading">ISO 27001</h3>
                  <p className="text-body">Security controls and documentation aligned with ISO/IEC 27001:2022. Not certified; certification requires an accredited audit.</p>
                </div>
                
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 mx-auto bg-orange-100 rounded-full flex items-center justify-center border border-orange-200">
                    <CheckCircle className="w-10 h-10 text-orange-600" />
                  </div>
                  <h3 className="text-xl text-heading">APA/EFPA</h3>
                  <p className="text-body">Alignment with APA and EFPA professional ethics and guidelines for psychological services</p>
                </div>
              </div>

              {/* GDPR Compliance Details */}
              <div className="mb-12">
                <h3 className="text-2xl text-heading mb-6 text-center">
                  <span className="bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">
                    GDPR Compliance
                  </span>
                </h3>
                <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
                  <div className="space-y-4 text-center">
                    <h4 className="text-lg text-heading font-semibold">Data Subject Rights Implementation</h4>
                    <div className="space-y-3">
                      <div className="text-center">
                        <p className="text-body font-medium">Right to Access (Article 15)</p>
                        <p className="text-sm text-body">Complete data export via encrypted APIs within 30 days</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Right to Rectification (Article 16)</p>
                        <p className="text-sm text-body">Real-time data correction with cryptographic integrity verification</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Right to Erasure (Article 17)</p>
                        <p className="text-sm text-body">Cryptographic data deletion from all systems and backups</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Right to Portability (Article 20)</p>
                        <p className="text-sm text-body">Machine-readable data export in JSON/XML formats</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4 text-center">
                    <h4 className="text-lg text-heading font-semibold">Privacy Principles</h4>
                    <div className="space-y-3">
                      <div className="text-center">
                        <p className="text-body font-medium">Lawfulness & Transparency</p>
                        <p className="text-sm text-body">Clear consent mechanisms and transparent processing</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Purpose Limitation</p>
                        <p className="text-sm text-body">Data processing limited to stated therapy purposes</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Data Minimization</p>
                        <p className="text-sm text-body">Only necessary data collected for therapy services</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Storage Limitation</p>
                        <p className="text-sm text-body">Automatic deletion after retention periods expire</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* HIPAA-style safeguards */}
              <div className="mb-12">
                <h3 className="text-2xl text-heading mb-6 text-center">
                  <span className="bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                    HIPAA-style safeguards
                  </span>
                </h3>
                <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
                  <div className="space-y-4 text-center">
                    <h4 className="text-lg text-heading font-semibold">Administrative Safeguards</h4>
                    <div className="space-y-3">
                      <div className="text-center">
                        <p className="text-body font-medium">Security Officer</p>
                        <p className="text-sm text-body">Designated HIPAA security officer with documented responsibilities</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Workforce Training</p>
                        <p className="text-sm text-body">Regular HIPAA compliance training for all staff</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Access Management</p>
                        <p className="text-sm text-body">Role-based access controls with regular reviews</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Incident Response</p>
                        <p className="text-sm text-body">Documented breach response procedures and reporting</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4 text-center">
                    <h4 className="text-lg text-heading font-semibold">Physical Safeguards</h4>
                    <div className="space-y-3">
                      <div className="text-center">
                        <p className="text-body font-medium">Facility Access</p>
                        <p className="text-sm text-body">Physical access controls for data centers and offices</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Workstation Security</p>
                        <p className="text-sm text-body">Secure workstation policies and device controls</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Media Controls</p>
                        <p className="text-sm text-body">Secure handling and disposal of electronic media</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4 text-center">
                    <h4 className="text-lg text-heading font-semibold">Technical Safeguards</h4>
                    <div className="space-y-3">
                      <div className="text-center">
                        <p className="text-body font-medium">Access Control</p>
                        <p className="text-sm text-body">Unique user identification and authentication</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Audit Controls</p>
                        <p className="text-sm text-body">Comprehensive audit logging and monitoring</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Data Integrity</p>
                        <p className="text-sm text-body">Cryptographic integrity verification and tamper detection</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Transmission Security</p>
                        <p className="text-sm text-body">Encrypted at rest with client-side key management. Server-side AI processing requires temporary decryption in memory.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ISO 27001 Compliance Details */}
              <div className="mb-12">
                <h3 className="text-2xl text-heading mb-6 text-center">
                  <span className="bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent">
                    ISO/IEC 27001:2022 Information Security Management System
                  </span>
                </h3>
                <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
                  <div className="space-y-4 text-center">
                    <h4 className="text-lg text-heading font-semibold">Information Security Management</h4>
                    <div className="space-y-3">
                      <div className="text-center">
                        <p className="text-body font-medium">ISMS Alignment</p>
                        <p className="text-sm text-body">Documented scope, policy, and Statement of Applicability aligned with ISO 27001:2022</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Risk Management</p>
                        <p className="text-sm text-body">Risk assessment and treatment process with a risk register</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Annex A Controls</p>
                        <p className="text-sm text-body">93 controls across four domains (Organizational, People, Physical, Technological) with applicability and implementation status</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Security Event Logging</p>
                        <p className="text-sm text-body">Audit trails for authentication and security-relevant events; logs use redacted identifiers and no PII or secrets</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4 text-center">
                    <h4 className="text-lg text-heading font-semibold">Security Control Categories</h4>
                    <div className="space-y-3">
                      <div className="text-center">
                        <p className="text-body font-medium">Access Control (A.5.15–5.18)</p>
                        <p className="text-sm text-body">Wallet/DID authentication, identity management, least privilege</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Cryptography (A.5.35, 8.24)</p>
                        <p className="text-sm text-body">TLS, AES-256, hashing, and secure key management</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Operations Security (A.8.15–8.16)</p>
                        <p className="text-sm text-body">Event logging, monitoring, and secure operations</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Secure Development (A.5.36, 8.25–8.28)</p>
                        <p className="text-sm text-body">Secure SDLC, input validation, and secure coding</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* APA/EFPA Compliance Details */}
              <div className="mb-12">
                <h3 className="text-2xl text-heading mb-6 text-center">
                  <span className="bg-gradient-to-r from-orange-600 to-orange-700 bg-clip-text text-transparent">
                    APA/EFPA Compliance
                  </span>
                </h3>
                <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
                  <div className="space-y-4 text-center">
                    <h4 className="text-lg text-heading font-semibold">American Psychological Association (APA)</h4>
                    <div className="space-y-3">
                      <div className="text-center">
                        <p className="text-body font-medium">Ethical Principles</p>
                        <p className="text-sm text-body">Adherence to APA Ethical Principles of Psychologists</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Confidentiality</p>
                        <p className="text-sm text-body">Strong confidentiality protections for therapy data</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Professional Standards</p>
                        <p className="text-sm text-body">Compliance with professional therapy standards</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Competence</p>
                        <p className="text-sm text-body">Maintenance of professional competence and training</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4 text-center">
                    <h4 className="text-lg text-heading font-semibold">European Federation of Psychologists' Associations (EFPA)</h4>
                    <div className="space-y-3">
                      <div className="text-center">
                        <p className="text-body font-medium">European Standards</p>
                        <p className="text-sm text-body">Compliance with European psychology standards</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Data Protection</p>
                        <p className="text-sm text-body">Enhanced data protection for European users</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Professional Ethics</p>
                        <p className="text-sm text-body">Adherence to European professional ethics guidelines</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Quality Assurance</p>
                        <p className="text-sm text-body">Continuous quality improvement in therapy services</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 dark:bg-transparent border border-green-200 dark:border-green-800 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg text-heading dark:text-white mb-2">Privacy by Design</h3>
                    <p className="text-body dark:text-white">
                      SafePsy implements privacy-by-design principles throughout our platform. We minimize data collection, 
                      use encrypted at rest with client-side key management (server stores ciphertext only), provide granular consent controls, 
                      and ensure users maintain control over their personal information. Our architecture is built from the ground up to protect your privacy. 
                      Note: Server-side AI processing (Scaleway) requires temporary decryption in memory for chat completions.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Decentralized Identity (DID) */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16">
              <h2 className="text-3xl lg:text-4xl text-heading mb-12 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Decentralized Identity (DID)
                </span>
              </h2>
              
              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-2xl text-heading mb-4">What is DID?</h3>
                  <p className="text-body leading-relaxed">
                    SafePsy uses Decentralized Identity (DID) technology to give you complete control over your digital identity. 
                    Your DID is a unique identifier stored on the blockchain that you own and control through your cryptocurrency wallet. 
                    Unlike traditional identity systems, your DID is controlled by your wallet keys. Some lifecycle operations (e.g. revocation) are enforced by the smart contract rules and are recorded on-chain.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-xl text-heading">DID Benefits</h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-body font-medium">User Ownership</p>
                          <p className="text-sm text-body">You own and control your identity on the blockchain</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-body font-medium">Verifiable Credentials</p>
                          <p className="text-sm text-body">Cryptographically verifiable identity without third-party verification</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-body font-medium">Privacy-Preserving</p>
                          <p className="text-sm text-body">Minimal data exposure with selective disclosure</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-body font-medium">Portable Identity</p>
                          <p className="text-sm text-body">Use your DID across different platforms and services</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xl text-heading">DID Management</h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Lock className="w-5 h-5 text-primary-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-body font-medium">Blockchain Storage</p>
                          <p className="text-sm text-body">Your DID is stored on Ethereum blockchain, ensuring immutability and transparency</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-primary-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-body font-medium">Wallet Control</p>
                          <p className="text-sm text-body">Only you can manage your DID through your wallet's private keys</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Eye className="w-5 h-5 text-primary-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-body font-medium">Revocation Rights</p>
                          <p className="text-sm text-body">You can revoke your DID. Revocation is an on-chain lifecycle event and does not erase blockchain history.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <FileText className="w-5 h-5 text-primary-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-body font-medium">Update Capability</p>
                          <p className="text-sm text-body">Update your DID information while maintaining cryptographic integrity</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                  <h4 className="text-lg text-heading mb-3 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-blue-600" />
                    DID Privacy & Security
                  </h4>
                  <p className="text-body text-sm leading-relaxed">
                    Your DID is cryptographically linked to your wallet address. SafePsy never stores your private keys and cannot 
                    access or modify your DID without your explicit cryptographic signature. All DID operations are recorded on the 
                    blockchain, providing a transparent and auditable identity management system. Your DID data can be encrypted and 
                    stored securely, with only you holding the decryption keys.
                  </p>
                </div>
              </div>
            </div>

            {/* AI-Powered Features */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16">
              <h2 className="text-3xl lg:text-4xl text-heading mb-12 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  AI assistant (mental wellness support)
                </span>
              </h2>
              
              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-2xl text-heading mb-4">AI Service Overview</h3>
                  <p className="text-body leading-relaxed">
                    SafePsy includes an AI assistant designed to complement human therapy sessions. Our AI assistant 
                    helps you prepare for sessions, reflect between appointments, and access guidance when needed. The AI is trained 
                    on psychology-informed principles and is designed to support, not replace, professional mental health care.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-xl text-heading">AI Features</h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-body font-medium">Conversational Support</p>
                          <p className="text-sm text-body">Real-time AI conversations to help process thoughts and emotions</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-body font-medium">Session Preparation</p>
                          <p className="text-sm text-body">Help organize thoughts and questions before therapy sessions</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-body font-medium">Between-Session Support</p>
                          <p className="text-sm text-body">Access guidance and reflection tools between appointments</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-body font-medium">Streaming Responses</p>
                          <p className="text-sm text-body">Real-time token streaming for natural conversation flow</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xl text-heading">Data Privacy & AI</h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-primary-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-body font-medium">No Training Data Usage</p>
                          <p className="text-sm text-body">Your conversations are not used to train AI models</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Lock className="w-5 h-5 text-primary-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-body font-medium">Encrypted Conversations</p>
                          <p className="text-sm text-body">All AI conversations are encrypted and stored securely</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Eye className="w-5 h-5 text-primary-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-body font-medium">User Control</p>
                          <p className="text-sm text-body">You can delete AI conversation history at any time</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <FileText className="w-5 h-5 text-primary-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-body font-medium">Third-Party AI Services</p>
                          <p className="text-sm text-body">Chat content is processed by a third-party AI provider to generate responses. Their data handling and retention policies apply to the content they process.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
                  <h4 className="text-lg text-heading mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    AI Limitations & Disclaimers
                  </h4>
                  <div className="space-y-2 text-body text-sm leading-relaxed">
                    <p>
                      <strong>Not a Replacement for Professional Care:</strong> The AI assistant is designed to complement, not replace, 
                      professional mental health therapy. It should not be used as a substitute for professional diagnosis or treatment.
                    </p>
                    <p>
                      <strong>No Medical Advice:</strong> The AI assistant does not provide medical advice, diagnosis, or treatment. 
                      Always consult with licensed mental health professionals for clinical decisions.
                    </p>
                    <p>
                      <strong>Emergency Situations:</strong> The AI assistant is not equipped to handle mental health emergencies. 
                      If you are experiencing a crisis, please contact emergency services or a crisis hotline immediately.
                    </p>
                    <p>
                      <strong>Accuracy:</strong> While we strive for accuracy, AI responses may contain errors or be inappropriate for 
                      your specific situation. Use your judgment and consult professionals when needed.
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                  <h4 className="text-lg text-heading mb-3 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-blue-600" />
                    AI Data Processing
                  </h4>
                  <p className="text-body text-sm leading-relaxed mb-3">
                    When you interact with our AI assistant, the following data is processed:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-body text-sm ml-4">
                    <li>Your conversation messages are sent to a third-party AI provider for processing</li>
                    <li>Conversation history is stored encrypted in our systems for continuity</li>
                    <li>Usage metrics (token counts, response times) are logged for service improvement</li>
                    <li>No personal identifiers are shared with AI service providers beyond what's necessary for the conversation</li>
                    <li>You can request deletion of your AI conversation data at any time</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Data Categories */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16">
              <h2 className="text-3xl lg:text-4xl text-heading mb-12 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Data Categories & Processing
                </span>
              </h2>

              <div className="max-w-5xl mx-auto mb-8 px-4 rounded-2xl border border-neutral-200 dark:border-white/20 bg-white/60 dark:bg-black/20 p-6 text-left">
                <h3 className="text-xl text-heading font-semibold mb-3">Waitlist and product updates (email collection)</h3>
                <p className="text-body text-sm sm:text-base mb-3">
                  When you join the waitlist, SafePsy processes your email address and a record of your consent (including a timestamp) to register your request and send you product updates.
                </p>
                <ul className="list-disc list-inside space-y-1 text-body text-sm sm:text-base ml-4">
                  <li><strong>Purpose:</strong> waitlist registration and product updates</li>
                  <li><strong>Legal basis:</strong> consent (you can withdraw at any time via unsubscribe or by contacting us)</li>
                  <li><strong>Storage:</strong> waitlist entries are stored in our operational systems (e.g. database and/or a managed spreadsheet used for waitlist operations)</li>
                  <li><strong>Retention:</strong> until you withdraw consent or the waitlist is no longer needed, unless a longer retention is required by law</li>
                </ul>
              </div>
              
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <table className="w-full border-collapse border border-neutral-300 dark:border-gray-600 text-sm sm:text-base">
                    <thead>
                      <tr className="bg-neutral-100 dark:bg-gray-800">
                        <th className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-left text-heading text-xs sm:text-sm">Data Type</th>
                        <th className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-left text-heading text-xs sm:text-sm">Purpose</th>
                        <th className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-left text-heading text-xs sm:text-sm">Retention</th>
                        <th className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-left text-heading text-xs sm:text-sm">Legal Basis</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Identity Data (DID)</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Blockchain-based identity verification and access control</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">User-controlled deletion (blockchain immutable)</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Consent, Contract</td>
                      </tr>
                      <tr>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">AI Conversation Data</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">AI-powered therapy assistance and conversation history</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">User-controlled deletion (30 days default)</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Consent, Legitimate Interests</td>
                      </tr>
                      <tr>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Health Data</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Therapy provision and progress tracking</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">7 years (regulatory)</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Consent, Vital Interests</td>
                      </tr>
                      <tr>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Communication Data</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Therapy conversations and sessions</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">30 days (configurable)</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Consent, Contract</td>
                      </tr>
                      <tr>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Technical Data</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Platform security, optimization, and security audit logs (redacted identifiers only)</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">12 months</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Legitimate Interests</td>
                      </tr>
                      <tr>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Waitlist Data</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Waitlist registration and product updates</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Until withdrawal of consent or waitlist ends</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Consent</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Questions About Your Privacy */}
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl text-heading mb-6">
                Questions About Your Privacy?
              </h2>
              <p className="text-lg text-body mb-8 max-w-2xl mx-auto">
                We're committed to transparency and protecting your privacy. Contact us with any questions about our security measures or data protection practices.
              </p>
              <div className="flex justify-center">
                <button
                  onClick={() => navigate('/contact-us')}
                  className="btn-primary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 min-h-[44px]"
                >
                  Contact Us
                </button>
              </div>
            </div>


          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default SecurityAndPrivacyPolicy
