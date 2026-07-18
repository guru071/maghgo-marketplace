import crypto from 'crypto';

// ─── Merchant API keys ───────────────────────────────────────────────────────
// A key looks like `mgk_live_<40 hex chars>`. We hand the full key to the shop
// owner exactly once and persist only its SHA-256 hash, so a leaked database
// can't be used to call the API. A short, non-secret prefix is stored alongside
// for display in the dashboard ("mgk_live_1a2b…").

const KEY_PREFIX = 'mgk_live_';

export interface GeneratedApiKey {
  key: string;        // full secret — shown to the user once, never stored
  hash: string;       // what we store
  displayPrefix: string; // e.g. "mgk_live_1a2b…" for the dashboard
}

/** SHA-256 hash of a full key, hex-encoded. Deterministic — used for lookup. */
export function hashApiKey(fullKey: string): string {
  return crypto.createHash('sha256').update(fullKey.trim()).digest('hex');
}

/** Mint a new API key. Returns the secret (once) plus what to store. */
export function generateApiKey(): GeneratedApiKey {
  const secret = crypto.randomBytes(20).toString('hex'); // 40 hex chars
  const key = `${KEY_PREFIX}${secret}`;
  return {
    key,
    hash: hashApiKey(key),
    displayPrefix: `${KEY_PREFIX}${secret.slice(0, 4)}…`,
  };
}

/** Pull the key out of an Authorization: Bearer / X-API-Key header value. */
export function extractApiKey(headerAuth?: string, headerKey?: string): string | null {
  if (headerKey && headerKey.startsWith(KEY_PREFIX)) return headerKey.trim();
  if (headerAuth) {
    const m = headerAuth.match(/^Bearer\s+(mgk_live_[A-Za-z0-9]+)\s*$/i);
    if (m) return m[1];
  }
  return null;
}
