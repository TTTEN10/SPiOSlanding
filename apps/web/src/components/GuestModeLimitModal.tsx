import { useState } from 'react';
import { Wallet, ChevronDown, ChevronUp, X } from 'lucide-react';

type GuestModeLimitModalProps = {
  open: boolean;
  onClose: () => void;
  onScrollToWallet: () => void;
};

/**
 * Shown when a guest user reaches the per-session prompt limit (see ChatWidget).
 * Conversion: reframe wallet as ownership + privacy, not crypto.
 */
export default function GuestModeLimitModal({
  open,
  onClose,
  onScrollToWallet,
}: GuestModeLimitModalProps) {
  const [whyOpen, setWhyOpen] = useState(false);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-limit-title"
      aria-describedby="guest-limit-desc"
    >
      <div className="relative max-w-lg w-full rounded-2xl border border-neutral-dark/20 dark:border-white/20 bg-white dark:bg-gray-900 shadow-xl p-6 sm:p-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-body hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 id="guest-limit-title" className="text-xl sm:text-2xl font-semibold text-heading pr-10">
          Save this conversation securely
        </h2>
        <p id="guest-limit-desc" className="mt-4 text-body leading-relaxed">
          You&apos;ve had a real conversation here. Guest mode stays in this tab only — refreshing clears it. To keep
          this space yours across visits, use a wallet as a private identity anchor (signing confirms who you are; no
          funds are used).
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <a
            href="https://metamask.io/download/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-primary-600 to-secondary-600 text-white font-medium hover:opacity-95 transition-opacity min-h-[44px]"
          >
            <Wallet className="w-5 h-5 shrink-0" aria-hidden />
            New wallet (free app)
          </a>
          <button
            type="button"
            onClick={() => {
              onScrollToWallet();
              onClose();
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-primary-600 text-primary-700 dark:text-primary-300 font-medium hover:bg-primary-50 dark:hover:bg-primary-900/20 min-h-[44px]"
          >
            I already have one — secure my space
          </button>
        </div>

        <div className="mt-6 border-t border-gray-200 dark:border-white/10 pt-4">
          <button
            type="button"
            onClick={() => setWhyOpen((v) => !v)}
            className="flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400 w-full text-left"
            aria-expanded={whyOpen}
          >
            Why a wallet?
            {whyOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {whyOpen && (
            <ul className="mt-3 text-sm text-body space-y-2 list-disc pl-5">
              <li>
                <strong className="text-heading">Ownership</strong> — encrypted history is tied to keys you control, not
                a password database we own.
              </li>
              <li>
                <strong className="text-heading">Privacy</strong> — ciphertext is stored; signing confirms identity; no
                payment is required for that step.
              </li>
              <li>
                <strong className="text-heading">Continuity</strong> — pick up where you left off on your next visit.
              </li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
