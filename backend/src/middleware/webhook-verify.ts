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

  if (!signature || typeof signature !== 'string') {
    console.warn('⚠️ Webhook request missing or invalid X-Hub-Signature-256 header');
    res.status(401).json({ error: 'Missing or invalid signature header' });
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

/**
 * Express middleware that verifies the X-Twilio-Signature header.
 */
export function verifyTwilioWebhookSignature(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const signature = req.headers['x-twilio-signature'] as string | undefined;

  if (!signature) {
    console.warn('⚠️ Twilio webhook request missing signature');
    res.status(401).json({ error: 'Missing signature header' });
    return;
  }

  const twilioAuthToken = env.TWILIO_AUTH_TOKEN;
  
  if (!twilioAuthToken) {
    // If Twilio isn't configured, we shouldn't accept webhooks
    console.warn('⚠️ TWILIO_AUTH_TOKEN not configured, rejecting Twilio webhook');
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  const params = req.body || {};

  const twilio = require('twilio');
  const isValid = twilio.validateRequest(twilioAuthToken, signature, url, params);

  if (!isValid) {
    console.warn('⚠️ Twilio signature verification failed');
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  next();
}
