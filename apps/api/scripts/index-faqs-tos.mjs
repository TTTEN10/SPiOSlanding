/**
 * Script to index FAQs and Terms of Service into Qdrant
 * 
 * This script extracts FAQs and ToS content and indexes them into the RAG system.
 * 
 * Usage:
 *   node apps/api/scripts/index-faqs-tos.mjs
 * 
 * Environment variables:
 *   RAG_ADMIN_API_KEY: Admin API key for authentication
 *   API_URL: Base URL of the API (default: http://localhost:3001)
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

const API_URL = process.env.API_URL || 'http://localhost:3001';
const ADMIN_API_KEY = process.env.RAG_ADMIN_API_KEY;

if (!ADMIN_API_KEY) {
  console.error('ERROR: RAG_ADMIN_API_KEY environment variable is required');
  process.exit(1);
}

/**
 * FAQs content for SafePsy
 */
const FAQs = [
  {
    question: "What is SafePsy?",
    answer: "SafePsy is a Web3.0 decentralized identity-based therapy and mental health platform that combines blockchain technology with AI-powered therapy assistance. It provides secure, privacy-first mental health services with DID-based authentication."
  },
  {
    question: "How does SafePsy protect my privacy?",
    answer: "SafePsy uses decentralized identity (DID) technology, encryption, and blockchain-based access control. Your data is encrypted before storage (ciphertext only in our database), and encryption keys are derived from your wallet and are not stored on our servers. To provide AI responses, message content is processed temporarily in server memory and sent to the AI provider; we do not log chat content or store plaintext."
  },
  {
    question: "What is a Decentralized Identity (DID)?",
    answer: "A Decentralized Identity (DID) is a blockchain-based identity that you own and control. It's cryptographically linked to your wallet address and stored on the Ethereum blockchain. Only you can modify or revoke your DID using your wallet's private keys."
  },
  {
    question: "Do I need a crypto wallet to use SafePsy?",
    answer: "Yes, SafePsy requires a Web3 wallet (like MetaMask) to create and manage your DID. This ensures you have complete control over your identity and data. Your wallet's private keys never leave your device."
  },
  {
    question: "What happens if I lose my wallet or private keys?",
    answer: "If you lose access to your wallet or private keys, SafePsy cannot recover your DID or encrypted data. We strongly recommend using hardware wallets and secure backup methods. SafePsy does not provide key recovery services."
  },
  {
    question: "Is the AI assistant a replacement for professional therapy?",
    answer: "No, the AI assistant is NOT a substitute for professional mental health care. It does not provide medical advice, diagnosis, or treatment. It should complement, not replace, professional therapy. Always consult licensed mental health professionals for clinical decisions."
  },
  {
    question: "How does chat history work?",
    answer: "Your chat history is encrypted and stored securely. You can access it using your wallet authentication. Chat summaries may be stored on decentralized storage (IPFS or object storage) with encrypted references stored in your DID."
  },
  {
    question: "What blockchain network does SafePsy use?",
    answer: "SafePsy currently operates on Sepolia Testnet (Chain ID: 11155111). All DID operations and identity management happen on the blockchain. Network fees (gas fees) apply to blockchain transactions. Mainnet may be supported in the future after a professional audit."
  },
  {
    question: "Can I delete my account and data?",
    answer: "Yes, you can delete your chat history and encrypted data at any time. DID records on the blockchain are permanent but can be marked as revoked. You maintain control over your data through your wallet."
  },
  {
    question: "What payment methods does SafePsy support?",
    answer: "SafePsy supports cryptocurrency payments. Premium subscriptions can be paid via crypto (ETH, USDT, USDC) on the supported network (currently Sepolia Testnet)."
  },
  {
    question: "Is SafePsy available worldwide?",
    answer: "SafePsy is designed for global access. However, availability may vary by jurisdiction due to regulatory requirements. Users are responsible for ensuring compliance with local laws regarding blockchain and mental health services."
  },
  {
    question: "How secure is my data?",
    answer: "SafePsy uses client-side encryption and DID-based access control. Your data is encrypted before storage (AES-256-GCM); only ciphertext is stored and encryption keys are derived from your wallet and not kept on our servers. Only you can decrypt your stored data with your wallet. To generate AI replies, message content is processed temporarily server-side and sent to the AI provider; we do not log or persistently store plaintext."
  },
  {
    question: "What are the subscription tiers?",
    answer: "SafePsy offers FREE and PREMIUM tiers. Free tier provides basic access, while Premium tier includes enhanced features, higher quotas, and priority support. Subscription status is managed on-chain via your DID."
  },
  {
    question: "How do I contact support?",
    answer: "You can contact SafePsy support through the contact form on the website or by email. For urgent matters related to your DID or wallet security, please reach out immediately through the contact page."
  }
];

/**
 * Terms of Service sections (key excerpts)
 */
const ToSSections = [
  {
    section: "Introduction",
    content: "Welcome to SafePsy. SafePsy is a Web3.0 decentralized identity-based therapy and mental health platform that combines blockchain technology with AI-powered therapy assistance. By accessing or using our services, you agree to be bound by these Terms of Service."
  },
  {
    section: "Key Management",
    content: "SafePsy implements user-controlled key management. Your wallet's private keys are stored locally in your wallet application. SafePsy never has access to, stores, or can recover your private keys. You are solely responsible for securing and backing up your wallet credentials. If you lose access to your wallet or private keys, SafePsy cannot recover your identity or encrypted data."
  },
  {
    section: "DID Ownership",
    content: "Your DID is stored on the Ethereum blockchain and is cryptographically linked to your wallet address. You have complete ownership and control over your DID. SafePsy cannot modify, revoke, or transfer your DID without your explicit cryptographic signature. You are solely responsible for maintaining access to your wallet and private keys."
  },
  {
    section: "AI Service Disclaimer",
    content: "THE AI ASSISTANT IS NOT A SUBSTITUTE FOR PROFESSIONAL MENTAL HEALTH CARE. The AI assistant does not provide medical advice, diagnosis, or treatment. It should not be used in place of professional therapy or counseling. If you are experiencing a mental health emergency, contact emergency services or a crisis hotline immediately. SafePsy is not liable for any decisions made based on AI-generated content."
  },
  {
    section: "Blockchain Risks",
    content: "By using SafePsy, you acknowledge and accept risks associated with blockchain technology, including network congestion, transaction irreversibility, smart contract risks, regulatory changes, technology risks, and market volatility. Blockchain transactions cannot be reversed once confirmed."
  },
  {
    section: "User Responsibilities",
    content: "You agree to provide accurate information, maintain security of your wallet credentials and DID, use services only for lawful purposes, not attempt to circumvent security measures, comply with all applicable laws, accept responsibility for all activities under your account and DID, and not use the AI assistant as a substitute for professional mental health care."
  },
  {
    section: "Limitations of Liability",
    content: "TO THE MAXIMUM EXTENT PERMITTED BY LAW, SAFEPSY SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES. SafePsy is not responsible for losses resulting from loss of wallet access, blockchain network failures, smart contract bugs, unauthorized access, user error, AI service unavailability, or decisions made based on AI-generated content."
  },
  {
    section: "Data Privacy",
    content: "Your conversations with the AI assistant are encrypted and stored securely. We do not use your conversations to train AI models. Your data may be processed by third-party AI service providers in accordance with their privacy policies. You can delete your AI conversation history at any time through your account settings."
  }
];

/**
 * Index a document via API
 */
async function indexDocument(text, source, documentId, metadata = {}) {
  const response = await fetch(`${API_URL}/api/rag/index`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-API-Key': ADMIN_API_KEY,
    },
    body: JSON.stringify({
      text,
      source,
      documentId,
      metadata,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to index document: ${response.status} ${error}`);
  }

  return await response.json();
}

/**
 * Index multiple documents in batch
 */
async function indexDocumentsBatch(documents) {
  const response = await fetch(`${API_URL}/api/rag/index/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-API-Key': ADMIN_API_KEY,
    },
    body: JSON.stringify({ documents }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to batch index documents: ${response.status} ${error}`);
  }

  return await response.json();
}

/**
 * Main indexing function
 */
async function main() {
  console.log('Starting FAQs/ToS indexing...');
  console.log(`API URL: ${API_URL}`);

  try {
    // Index FAQs
    console.log('\n📝 Indexing FAQs...');
    const faqDocuments = FAQs.map((faq, index) => ({
      text: `Q: ${faq.question}\n\nA: ${faq.answer}`,
      source: 'faq',
      documentId: `faq_${index + 1}`,
      metadata: {
        type: 'faq',
        question: faq.question,
        index: index + 1,
      },
    }));

    const faqResult = await indexDocumentsBatch(faqDocuments);
    console.log(`✅ Indexed ${faqResult.data.count} FAQs`);

    // Index ToS sections
    console.log('\n📄 Indexing Terms of Service sections...');
    const tosDocuments = ToSSections.map((tos, index) => ({
      text: `Section: ${tos.section}\n\n${tos.content}`,
      source: 'tos',
      documentId: `tos_${index + 1}`,
      metadata: {
        type: 'tos',
        section: tos.section,
        index: index + 1,
      },
    }));

    const tosResult = await indexDocumentsBatch(tosDocuments);
    console.log(`✅ Indexed ${tosResult.data.count} ToS sections`);

    console.log('\n✨ Indexing complete!');
    console.log(`Total documents indexed: ${faqResult.data.count + tosResult.data.count}`);
  } catch (error) {
    console.error('❌ Error during indexing:', error);
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

