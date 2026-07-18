import crypto from 'crypto';
import { env } from '../config/env';

// ─── Secret encryption at rest (AES-256-GCM) ─────────────────────────────────
// Shop Razorpay secrets are live credentials. We encrypt them before they touch
// the database so a leaked DB dump (or a mis-scoped query) doesn't hand an
// attacker the ability to charge in a shop's name.
//
// Key source, in order of preference:
//   1. PAYMENTS_ENCRYPTION_KEY (64 hex chars = 32 bytes) — set this in prod.
//   2. Any other PAYMENTS_ENCRYPTION_KEY value — stretched with scrypt.
//   3. Derived from JWT_SECRET — so encryption works with zero extra config,
//      at the cost of coupling: rotating JWT_SECRET would orphan stored secrets
//      (shops just re-enter their keys). Prefer option 1 in production.
//
// Stored format: "v1:<ivHex>:<tagHex>:<cipherHex>". Anything without the "v1:"
// prefix is treated as legacy plaintext and returned as-is, so values written
// before this change keep working and are upgraded on the next save.

const SCRYPT_SALT = 'maghgo-payments-v1';
let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const configured = (env as any).PAYMENTS_ENCRYPTION_KEY as string | undefined;
  if (configured && /^[0-9a-fA-F]{64}$/.test(configured)) {
    cachedKey = Buffer.from(configured, 'hex');
  } else if (configured) {
    cachedKey = crypto.scryptSync(configured, SCRYPT_SALT, 32);
  } else {
    cachedKey = crypto.scryptSync(env.JWT_SECRET, SCRYPT_SALT, 32);
  }
  return cachedKey;
}

/** Encrypt a secret for storage. Returns the "v1:…" envelope. */
export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

/**
 * Decrypt a stored secret. Legacy plaintext (no "v1:" prefix) is returned
 * unchanged for backward compatibility. Returns null on empty input or if
 * decryption/authentication fails (tampered or wrong key).
 */
export function decryptSecret(stored: string | null | undefined): string | null {
  if (!stored) return null;
  if (!stored.startsWith('v1:')) return stored; // legacy plaintext
  try {
    const [, ivH, tagH, dataH] = stored.split(':');
    if (!ivH || !tagH || !dataH) return null;
    const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivH, 'hex'));
    decipher.setAuthTag(Buffer.from(tagH, 'hex'));
    const dec = Buffer.concat([decipher.update(Buffer.from(dataH, 'hex')), decipher.final()]);
    return dec.toString('utf8');
  } catch (e) {
    console.error('Failed to decrypt payment secret:', (e as any)?.message || e);
    return null;
  }
}

/** True when a stored value is in the encrypted envelope form. */
export function isEncrypted(stored: string | null | undefined): boolean {
  return typeof stored === 'string' && stored.startsWith('v1:');
}
