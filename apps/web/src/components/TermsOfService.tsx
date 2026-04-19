import React from 'react'
import { FileText, Lock, AlertTriangle, Shield, ArrowUp } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'

const TermsOfService: React.FC = () => {
  const navigate = useNavigate()

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header showBackButton={true} />

      {/* Main Content */}
      <main id="main-content" className="flex-1" role="main" aria-label="Terms of Service" tabIndex={-1}>
        <section className="section-padding py-8 lg:py-12">
          <div className="container-max">
            {/* Hero Section */}
            <div className="text-center mb-12 sm:mb-16 px-4">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl text-heading leading-tight mb-4 sm:mb-6">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent text-[1.2em] font-bold">
                  Terms of Service
                </span>
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-body leading-relaxed max-w-3xl mx-auto">
                Legal terms and conditions for using SafePsy Web3.0 platform
              </p>
              <div className="mt-6">
                <p className="text-sm text-body mb-3">
                  For information about our security and privacy practices, please see our{' '}
                  <Link 
                    to="/sap-policy" 
                    className="text-primary-600 hover:text-primary-700 underline font-medium"
                  >
                    Security and Privacy Policy
                  </Link>
                  .
                </p>
              </div>
            </div>

            {/* Terms of Service Content */}
            <div className="space-y-8">
                {/* Last Updated */}
                <div className="text-center text-sm text-body mb-8">
                  <p>Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>

                {/* Introduction */}
                <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 lg:p-12 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20">
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl text-heading mb-6">
                    <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                      1. Introduction
                    </span>
                  </h2>
                  <div className="space-y-4 text-body">
                    <p>
                      Welcome to SafePsy (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). SafePsy is a Web3.0 decentralized identity-based therapy and mental health platform 
                      that combines blockchain technology with AI-powered therapy assistance. A key differentiator: you own your data—we do not store it with third parties or use it to train AI models. By accessing or using our services, you agree to be bound 
                      by these Terms of Service (&quot;Terms&quot;).
                    </p>
                    <p>
                      These Terms constitute a legally binding agreement between you and SafePsy. Please read these Terms carefully before using our 
                      services. If you do not agree to these Terms, you must not use our services.
                    </p>
                  </div>
                </div>

                {/* Web3.0 Service Description */}
                <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 lg:p-12 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20">
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl text-heading mb-6">
                    <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                      2. Web3.0 Service Description
                    </span>
                  </h2>
                  <div className="space-y-4 text-body">
                    <p>
                      SafePsy operates as a decentralized application (dApp) on Ethereum Sepolia Testnet for on-chain identity (DID) operations. Production use on Ethereum Mainnet may follow after readiness review.
                      Our services include:
                    </p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li>Decentralized Identity (DID) management and verification on blockchain</li>
                      <li>Blockchain-based therapy session management</li>
                      <li>Encrypted data storage and access control</li>
                      <li>AI-powered therapy assistance tools with real-time streaming</li>
                      <li>Secure communication channels between therapists and clients</li>
                      <li>DID-based authentication and identity verification</li>
                      <li>AI conversation history and session continuity</li>
                    </ul>
                    <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mt-1 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Important Blockchain Information</h4>
                          <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                            <li>• All transactions are recorded on public blockchain networks</li>
                            <li>• Network fees (gas fees) apply to blockchain transactions</li>
                            <li>• Blockchain transactions are irreversible once confirmed</li>
                            <li>• You are responsible for maintaining access to your wallet and keys</li>
                            <li>• We cannot reverse or modify blockchain transactions</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key Management and User Responsibility */}
                <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 lg:p-12 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20">
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl text-heading mb-6">
                    <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                      3. Key Management & User Responsibility
                    </span>
                  </h2>
                  <div className="space-y-4 text-body">
                    <p>
                      SafePsy implements a user-controlled key management system. The key regarding your identity and data access is your responsibility:
                    </p>
                    
                    <div className="space-y-4 mt-6">
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h4 className="font-semibold text-heading mb-2 flex items-center gap-2">
                          <Lock className="w-5 h-5 text-primary-600" />
                          Wallet Private Keys
                        </h4>
                        <p className="text-sm text-body">
                          Your wallet's private keys are stored locally in your wallet application (e.g., MetaMask, WalletConnect). 
                          SafePsy never has access to, stores, or can recover your private keys. You are solely responsible for 
                          securing and backing up your wallet credentials.
                        </p>
                      </div>

                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h4 className="font-semibold text-heading mb-2 flex items-center gap-2">
                          <Shield className="w-5 h-5 text-primary-600" />
                          DID Keys
                        </h4>
                        <p className="text-sm text-body">
                          Your Decentralized Identity (DID) is controlled by your wallet address. Only you can sign transactions 
                          and manage your DID through your wallet. SafePsy cannot access or modify your DID without your explicit 
                          cryptographic signature.
                        </p>
                      </div>

                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h4 className="font-semibold text-heading mb-2 flex items-center gap-2">
                          <Lock className="w-5 h-5 text-primary-600" />
                          Encryption Keys
                        </h4>
                        <p className="text-sm text-body">
                          Data encryption keys are derived from your wallet and are never transmitted to or stored on SafePsy servers. 
                          Your encrypted data can only be decrypted using keys that you control.
                        </p>
                      </div>

                      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                        <h4 className="font-semibold text-heading mb-2 flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                          Key Loss Warning
                        </h4>
                        <p className="text-sm text-body">
                          If you lose access to your wallet or private keys, SafePsy cannot recover your identity or encrypted data. 
                          We strongly recommend using hardware wallets and secure backup methods. SafePsy does not provide key recovery 
                          services and cannot assist in recovering lost keys.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        WARNING: Never share your private keys, seed phrases, or wallet passwords with anyone. SafePsy will never ask for these credentials.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Decentralized Identity (DID) Terms */}
                <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 lg:p-12 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20">
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl text-heading mb-6">
                    <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                      4. Decentralized Identity (DID) Terms
                    </span>
                  </h2>
                  <div className="space-y-4 text-body">
                    <p>
                      SafePsy uses Decentralized Identity (DID) technology to provide you with self-sovereign identity management. 
                      By using our DID services, you agree to the following terms:
                    </p>
                    
                    <div className="space-y-4 mt-6">
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h4 className="font-semibold text-heading mb-2 flex items-center gap-2">
                          <Shield className="w-5 h-5 text-primary-600" />
                          DID Ownership and Control
                        </h4>
                        <p className="text-sm text-body">
                          Your DID is stored on the Ethereum blockchain and is cryptographically linked to your wallet address. 
                          You have complete ownership and control over your DID. SafePsy cannot modify, revoke, or transfer your DID 
                          without your explicit cryptographic signature. You are solely responsible for maintaining access to your 
                          wallet and private keys.
                        </p>
                      </div>

                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h4 className="font-semibold text-heading mb-2 flex items-center gap-2">
                          <Lock className="w-5 h-5 text-primary-600" />
                          DID Creation and Management
                        </h4>
                        <p className="text-sm text-body">
                          When you create a DID on SafePsy, it is permanently recorded on the blockchain. You can update your DID 
                          information, but historical records remain immutable. You may revoke your DID at any time, which will mark 
                          it as revoked in the registry. Revocation is irreversible and will prevent future use of that DID on our platform.
                        </p>
                      </div>

                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h4 className="font-semibold text-heading mb-2 flex items-center gap-2">
                          <FileText className="w-5 h-5 text-primary-600" />
                          DID Verification
                        </h4>
                        <p className="text-sm text-body">
                          SafePsy verifies DID ownership through blockchain transactions. All DID operations require cryptographic 
                          signatures from your wallet. We verify DID validity and ownership before granting access to platform features. 
                          You agree that SafePsy may query the blockchain to verify your DID status at any time.
                        </p>
                      </div>

                      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <h4 className="font-semibold text-heading mb-2 flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-yellow-600" />
                          DID Loss and Recovery
                        </h4>
                        <p className="text-sm text-body">
                          If you lose access to your wallet or private keys, you will lose access to your DID and any data associated 
                          with it. SafePsy cannot recover lost DIDs or restore access to wallets. We strongly recommend using hardware 
                          wallets and secure backup methods. SafePsy is not responsible for any losses resulting from lost wallet access.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI-Powered Services Terms */}
                <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 lg:p-12 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20">
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl text-heading mb-6">
                    <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                      5. AI-Powered Services Terms
                    </span>
                  </h2>
                  <div className="space-y-4 text-body">
                    <p>
                      SafePsy provides AI-powered therapy assistance features designed to complement professional mental health care. 
                      By using our AI services, you agree to the following terms:
                    </p>
                    
                    <div className="space-y-4 mt-6">
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h4 className="font-semibold text-heading mb-2 flex items-center gap-2">
                          <Shield className="w-5 h-5 text-primary-600" />
                          AI Service Description
                        </h4>
                        <p className="text-sm text-body">
                          Our AI assistant uses third-party AI services (including OpenAI) to provide conversational support, session 
                          preparation assistance, and between-session guidance. The AI is designed to support, not replace, professional 
                          mental health therapy. All AI interactions are processed through encrypted channels and stored securely.
                        </p>
                      </div>

                      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                        <h4 className="font-semibold text-heading mb-2 flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                          Medical Disclaimer
                        </h4>
                        <p className="text-sm text-body">
                          <strong>THE AI ASSISTANT IS NOT A SUBSTITUTE FOR PROFESSIONAL MENTAL HEALTH CARE.</strong> The AI assistant 
                          does not provide medical advice, diagnosis, or treatment. It should not be used in place of professional 
                          therapy or counseling. If you are experiencing a mental health emergency, contact emergency services or 
                          a crisis hotline immediately. SafePsy is not liable for any decisions made based on AI-generated content.
                        </p>
                      </div>

                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h4 className="font-semibold text-heading mb-2 flex items-center gap-2">
                          <Lock className="w-5 h-5 text-primary-600" />
                          AI Data Usage and Privacy
                        </h4>
                        <p className="text-sm text-body">
                          Your conversations with the AI assistant are encrypted and stored securely. We do not use your conversations 
                          to train AI models. Your data may be processed by third-party AI service providers (OpenAI) in accordance with 
                          their privacy policies and our data processing agreements. You can delete your AI conversation history at any 
                          time through your account settings.
                        </p>
                      </div>

                      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <h4 className="font-semibold text-heading mb-2 flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-yellow-600" />
                          AI Limitations and Accuracy
                        </h4>
                        <p className="text-sm text-body">
                          AI-generated responses may contain errors, inaccuracies, or inappropriate content. The AI assistant may not 
                          understand context fully or may provide responses that are not suitable for your specific situation. You agree 
                          to use your judgment when interacting with the AI and to consult with licensed mental health professionals 
                          for clinical decisions. SafePsy is not responsible for any consequences resulting from reliance on AI-generated content.
                        </p>
                      </div>

                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h4 className="font-semibold text-heading mb-2 flex items-center gap-2">
                          <FileText className="w-5 h-5 text-primary-600" />
                          AI Service Availability
                        </h4>
                        <p className="text-sm text-body">
                          AI services depend on third-party providers and may experience downtime, rate limits, or service interruptions. 
                          SafePsy does not guarantee uninterrupted AI service availability. We reserve the right to modify, suspend, or 
                          discontinue AI features at any time. You agree that SafePsy is not liable for any losses resulting from AI 
                          service unavailability.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Information Security and Compliance */}
                <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 lg:p-12 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20">
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl text-heading mb-6">
                    <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                      6. Information Security and Compliance
                    </span>
                  </h2>
                  <div className="space-y-4 text-body">
                    <p>
                      SafePsy maintains an Information Security Management System (ISMS) aligned with ISO/IEC 27001:2022. 
                      Our security practices include risk-based controls, secure development, encryption, access control, and 
                      regular security reviews. We record security-relevant events (such as authentication attempts) in audit 
                      logs for incident response and compliance; these logs do not contain full personal identifiers (e.g. wallet 
                      addresses are redacted). By using our services, you acknowledge that we apply industry-standard 
                      information security measures to protect your data.
                    </p>
                  </div>
                </div>

                {/* User Responsibilities */}
                <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 lg:p-12 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20">
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl text-heading mb-6">
                    <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                      7. User Responsibilities
                    </span>
                  </h2>
                  <div className="space-y-4 text-body">
                    <p>You agree to:</p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li>Provide accurate and complete information when using our services</li>
                      <li>Maintain the security and confidentiality of your wallet credentials and DID</li>
                      <li>Use our services only for lawful purposes</li>
                      <li>Not attempt to circumvent or interfere with our security measures</li>
                      <li>Not use our services to transmit harmful, illegal, or unauthorized content</li>
                      <li>Comply with all applicable laws and regulations</li>
                      <li>Accept responsibility for all activities that occur under your account and DID</li>
                      <li>Pay any applicable network fees (gas fees) for blockchain transactions</li>
                      <li>Not use the AI assistant as a substitute for professional mental health care</li>
                      <li>Seek professional help for mental health emergencies and clinical decisions</li>
                    </ul>
                  </div>
                </div>

                {/* Blockchain Risks */}
                <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 lg:p-12 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20">
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl text-heading mb-6">
                    <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                      8. Blockchain Risks
                    </span>
                  </h2>
                  <div className="space-y-4 text-body">
                    <p>
                      By using SafePsy, you acknowledge and accept the following risks associated with blockchain technology:
                    </p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li><strong>Network Congestion:</strong> Blockchain networks may experience congestion, leading to delayed transactions or higher fees</li>
                      <li><strong>Irreversibility:</strong> Blockchain transactions cannot be reversed once confirmed</li>
                      <li><strong>Smart Contract Risks:</strong> Smart contracts are immutable and may contain bugs or vulnerabilities</li>
                      <li><strong>Regulatory Changes:</strong> Changes in blockchain regulations may affect our services</li>
                      <li><strong>Technology Risks:</strong> Blockchain technology is evolving and may have unknown risks</li>
                      <li><strong>Market Volatility:</strong> Cryptocurrency prices and network fees may fluctuate</li>
                    </ul>
                  </div>
                </div>

                {/* Intellectual Property */}
                <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 lg:p-12 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20">
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl text-heading mb-6">
                    <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                      9. Intellectual Property
                    </span>
                  </h2>
                  <div className="space-y-4 text-body">
                    <p>
                      All content, features, and functionality of SafePsy, including but not limited to text, graphics, logos, icons, 
                      images, and software, are the exclusive property of SafePsy or its licensors and are protected by international 
                      copyright, trademark, and other intellectual property laws.
                    </p>
                    <p>
                      You retain ownership of your personal data and content. By using our services, you grant SafePsy a limited, 
                      non-exclusive, non-transferable license to use your data solely for the purpose of providing our services.
                    </p>
                  </div>
                </div>

                {/* Limitations of Liability */}
                <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 lg:p-12 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20">
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl text-heading mb-6">
                    <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                      10. Limitations of Liability
                    </span>
                  </h2>
                  <div className="space-y-4 text-body">
                    <p>
                      TO THE MAXIMUM EXTENT PERMITTED BY LAW, SAFEPSY SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, 
                      CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR USE, ARISING OUT 
                      OF OR IN CONNECTION WITH YOUR USE OF OUR SERVICES.
                    </p>
                    <p>
                      SafePsy's total liability for any claims arising from or related to our services shall not exceed the amount 
                      you paid to SafePsy in the twelve (12) months preceding the claim.
                    </p>
                    <p>
                      SafePsy is not responsible for losses resulting from:
                    </p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li>Loss of wallet access, private keys, or DID access</li>
                      <li>Blockchain network failures or congestion</li>
                      <li>Smart contract bugs or vulnerabilities</li>
                      <li>Unauthorized access to your wallet or DID</li>
                      <li>User error or negligence</li>
                      <li>AI service unavailability or errors in AI-generated content</li>
                      <li>Decisions made based on AI assistant responses</li>
                      <li>Third-party AI service provider failures or data breaches</li>
                    </ul>
                    <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-sm font-semibold text-red-800 dark:text-red-200 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        IMPORTANT: SafePsy is not liable for any medical, psychological, or health-related decisions made based on 
                        AI-generated content. Always consult licensed professionals for clinical decisions.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Dispute Resolution */}
                <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 lg:p-12 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20">
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl text-heading mb-6">
                    <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                      11. Dispute Resolution
                    </span>
                  </h2>
                  <div className="space-y-4 text-body">
                    <p>
                      Any disputes arising from or related to these Terms or our services shall be resolved through binding arbitration 
                      in accordance with the rules of the American Arbitration Association, except where prohibited by law.
                    </p>
                    <p>
                      You agree to waive any right to participate in a class-action lawsuit or class-wide arbitration.
                    </p>
                  </div>
                </div>

                {/* Applicable Law */}
                <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 lg:p-12 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20">
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl text-heading mb-6">
                    <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                      12. Applicable Law
                    </span>
                  </h2>
                  <div className="space-y-4 text-body">
                    <p>
                      These Terms shall be governed by and construed in accordance with the laws of [Jurisdiction], without regard to 
                      its conflict of law provisions.
                    </p>
                  </div>
                </div>

                {/* Changes to Terms */}
                <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 lg:p-12 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20">
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl text-heading mb-6">
                    <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                      13. Changes to Terms
                    </span>
                  </h2>
                  <div className="space-y-4 text-body">
                    <p>
                      SafePsy reserves the right to modify these Terms at any time. We will notify users of material changes via 
                      email or through our platform. Your continued use of our services after such modifications constitutes your 
                      acceptance of the updated Terms.
                    </p>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 lg:p-12 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20">
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl text-heading mb-6">
                    <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                      14. Contact Information
                    </span>
                  </h2>
                  <div className="space-y-4 text-body">
                    <p>For questions about these Terms of Service, please contact us:</p>
                    <div className="text-center">
                      <button
                        onClick={() => navigate('/contact-us')}
                        className="btn-primary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 min-h-[44px]"
                      >
                        Contact Us
                      </button>
                    </div>
                  </div>
                </div>
            </div>

            {/* Scroll to Top Button */}
            <div className="fixed bottom-8 right-8">
              <button
                onClick={scrollToTop}
                className="p-3 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-all duration-300 hover:scale-110"
                aria-label="Scroll to top"
              >
                <ArrowUp className="w-6 h-6" />
              </button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default TermsOfService

