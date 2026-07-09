import { Router, Request, Response } from 'express';
import { env } from '../config/env';
import { verifyWebhookSignature } from '../middleware/webhook-verify';
import { handleIncomingMessage } from '../controllers/message.controller';

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

export default router;
