# SafePsy — Quickstart & Offboarding

This guide covers how to get to first value in about 10 minutes, what to do in your first week, and how to leave safely—including what you can export, what can or cannot be deleted, and how to reach support.

---

## Quickstart (about 10 minutes)

Follow these steps to reach **first value**: a private chat with Dr. Safe using your own identity and keys.

**Optional:** Try the beta chat **without a wallet** (guest mode: five messages per session, not saved). Connect a wallet when you want encrypted, persistent history.

### 1. Open SafePsy and connect your wallet

- Go to the SafePsy app and choose **Connect wallet** (e.g. MetaMask or WalletConnect).
- **Use Sepolia Testnet.** If your wallet is on another network, switch to Sepolia when prompted.
- Approve the connection in your wallet.

### 2. Sign to verify ownership

- The app will ask you to **sign a one-time verification message** (no gas cost).
- Sign in your wallet. This proves you control the address and creates your session.

### 3. Create your Safe ID Token

- If you don’t have a DID yet, you’ll see **“Create my Safe ID Token”** (or similar).
- Click it. A **soulbound identity token** is minted on-chain (Sepolia). You may need a small amount of test ETH for gas.
- When you see **“Identity active”** (and a token ID), you’re done with this step.

### 4. Have your first chat with Dr. Safe

- Open the **chat** (e.g. from the main UI or chat widget).
- Send a first message to **Dr. Safe**. Your messages are encrypted; the server does not use your chats to train models.
- Once you’ve sent at least one message and received a reply, you’ve reached **activation**: DID + first chat.

### 5. (Not available during theBeta) Subscribe for premium

- If you want premium features, use the in-app **Subscribe** or payment flow (crypto or other methods as offered).
- You can do this after the quickstart; it’s not required to get first value.

**You’re activated when:** (1) your DID exists and (2) you’ve had your first conversation with Dr. Safe. Design your own success around this moment.

---

## First week checklist

- **Complete activation** — Ensure your DID is created and you’ve had at least one full exchange with Dr. Safe.
- **Try a reflection or between-session prompt** — Use the chat for something concrete (e.g. preparing for a session, organizing thoughts, or a coping prompt) so you feel the product value.
- **Review Security & Privacy Policy** — Read the [Security and Privacy Policy](/sap-policy) (and [Terms of Service](/terms) if you like) so you know how we handle data and your rights.
- **Back up your wallet seed phrase** — Your keys are in your wallet; we cannot recover them. Store your seed phrase securely and privately.
- **Know how to get help** — Save the [Contact](/contact-us) page for support and data requests (export, deletion, questions).

---

## Offboarding / leaving safely

### How to leave safely

1. **In the app (optional):** Delete or clear conversation history you don’t want to leave behind (see “What can be deleted” below).
2. **Export your data** if you want a copy before leaving (see “What can be exported”).
3. **Cancel any paid subscription** via the in-app subscription or payment flow so you are not charged again.
4. **Request full account/data deletion** if you want all your off-chain data removed (see “Support contact path”).
5. **Disconnect your wallet** in the app (and in your wallet’s “Connected sites” if you want to revoke the link).
6. **Stop using the service.** We do not retain plaintext chat; off-chain data we hold is encrypted and can be deleted on request.

You do **not** need to “delete” your DID on-chain to leave. The DID and its history remain on the blockchain; we can mark it revoked so it is no longer used by the app.

### What can be exported

- **DID / identity data** — You can export DID-related data (wallet address, token ID, network, profile metadata, chat data reference, encrypted key metadata, export timestamp) via the **DID export** feature in the app or the authenticated API (`GET /api/did/export`). This gives you a structured, machine-readable snapshot of your identity and references.
- **Full account / chat data** — For a complete copy of your data (including what we hold for your encrypted chat and account), submit a **data portability request** via the Contact page. We aim to provide machine-readable export (e.g. JSON) within the timeframe stated in our policy (e.g. within 30 days where applicable).
- **Your own chat history** — If the app offers a “download” or “export chat” option in the UI, you can use that. Otherwise, request a full export via Contact.

### What can be deleted (and what cannot)

**Can be deleted (off-chain):**

- **Encrypted chat history and related blobs** — We support deletion of your off-chain chat data. Once deleted according to our process, we do not retain it in our active systems. You can also delete individual messages or conversation history in the app where that option is available.
- **Subscription and payment records** — On request, we can remove or anonymize your subscription and payment records from our systems, subject to legal and accounting retention where required.
- **Contact form messages and email signups** — You can request deletion of messages you sent via the contact form and of your email/waitlist subscription.

**Cannot be deleted (on-chain):**

- **DID and lifecycle events on the blockchain** — Creation and update events for your DID are written to the blockchain (Sepolia) and are **permanent**. We **cannot** erase them. We can **revoke** your DID so it is no longer used for access or identification in our app.
- **Audit and security logs** — Security-relevant events (e.g. authentication, access) may be kept in audit logs with **redacted identifiers** for a defined period for security and compliance. These logs do not contain your chat content.

**Summary:** Off-chain data (chat, account, contact, subscriptions) can be deleted on request. On-chain DID and events cannot be erased; revocation stops further use.

### Support contact path

- **Contact page:** Use **[Contact us](/contact-us)** in the app or go to the `/contact-us` route. This is the right path for:
  - General support and questions  
  - Data portability (export) requests  
  - Deletion (erasure) requests  
  - Account or billing issues  
- **Security & Privacy Policy:** The policy also links to **Contact Us** (same Contact page) for questions about security or data protection.
- **Crisis:** The AI is not for emergencies. If you are in crisis, contact emergency services or a crisis hotline.

We aim to respond to data and support requests within the timeframes set out in our Security and Privacy Policy and applicable law.

---

*For product overview and activation definition, see [LAUNCH.md](./LAUNCH.md). For trust and compliance wording, see [CLAIMS_AND_TRUST_LANGUAGE.md](./CLAIMS_AND_TRUST_LANGUAGE.md) and [HARD_QUESTIONS_FAQ.md](./HARD_QUESTIONS_FAQ.md).*
