import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

// ─── X-Hub-Signature-256 Webhook Verification ────────────────────────────────
// Meta signs every webhook POST with HMAC-SHA256 using the app secret.
// We MUST verify this signature to prevent spoofed payloads.

/**
 * Express middleware that verifies the X-Hub-Signature-256 header.
 * Requires `req.rawBody` to be set (see index.ts body parser config).
 */
export function verifyWebhookSignature(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const signature = req.headers['x-hub-signature-256'] as string | undefined;

  if (!signature) {
    console.warn('⚠️ Webhook request missing X-Hub-Signature-256 header');
    res.status(401).json({ error: 'Missing signature header' });
    return;
  }

  // The raw body buffer must have been captured by the body parser verify fn
  const rawBody = (req as any).rawBody as Buffer | undefined;

  if (!rawBody) {
    console.error('❌ rawBody not available — check body parser config');
    res.status(500).json({ error: 'Internal configuration error' });
    return;
  }

  const expectedSignature =
    'sha256=' +
    crypto
      .createHmac('sha256', env.WHATSAPP_APP_SECRET)
      .update(rawBody)
      .digest('hex');

  // Constant-time comparison to prevent timing attacks
  const sigBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

  if (
    sigBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    console.warn('⚠️ Webhook signature verification failed');
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  next();
}
