import { Router, Request, Response } from 'express';
import { env } from '../config/env';
import { verifyWebhookSignature } from '../middleware/webhook-verify';
import { handleIncomingMessage } from '../controllers/message.controller';
import { handleIncomingSms } from '../controllers/sms.controller';

// ─── Webhook Routes ──────────────────────────────────────────────────────────

const router = Router();

/**
 * GET /webhook
 * Meta verification challenge — called once when you register the webhook URL.
 */
router.get('/', (req: Request, res: Response): void => {
  const mode = req.query['hub.mode'] as string | undefined;
  const token = req.query['hub.verify_token'] as string | undefined;
  const challenge = req.query['hub.challenge'] as string | undefined;

  if (mode === 'subscribe' && token === env.WEBHOOK_VERIFY_TOKEN) {
    console.log('✅ Webhook verified successfully');
    res.status(200).send(challenge);
    return;
  }

  console.warn('⚠️ Webhook verification failed — token mismatch');
  res.sendStatus(403);
});

/**
 * POST /webhook
 * Receive incoming WhatsApp messages.
 * Signature is verified by the middleware, then delegated to the controller.
 */
router.post('/', verifyWebhookSignature, handleIncomingMessage);

/**
 * POST /webhook/sms
 * Receive incoming Twilio SMS/MMS messages.
 * We use Express's URL-encoded parser since Twilio sends application/x-www-form-urlencoded.
 */
import express from 'express';
router.post('/sms', express.urlencoded({ extended: true }), handleIncomingSms);

export default router;
