export type DebugLogPayload = {
  runId: string;
  hypothesisId: string;
  location: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp?: number;
};

/**
 * Optional structured debug hook. When `DEBUG_INGEST_URL` is unset, this is a no-op.
 * Safe for hot paths (e.g. CORS): never throws.
 */
export function debugLog(payload: DebugLogPayload): void {
  const url = process.env.DEBUG_INGEST_URL;
  if (!url) return;

  const body = JSON.stringify({
    ...payload,
    timestamp: payload.timestamp ?? Date.now(),
  });

  void fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  }).catch(() => {
    /* debug-only */
  });
}
