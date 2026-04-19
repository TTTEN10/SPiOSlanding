/**
 * Resolve a secret from an external backend (e.g. Scaleway Secret Manager).
 * Returns `undefined` so callers fall back to `process.env` until a backend client is wired.
 */
export async function getSecret(_secretName: string, _envKey: string): Promise<string | undefined> {
  void _secretName;
  void _envKey;
  return undefined;
}

/** Reserved for batch preloading when a secret backend is enabled. */
export async function preloadSecrets(_names: string[]): Promise<void> {
  void _names;
}
