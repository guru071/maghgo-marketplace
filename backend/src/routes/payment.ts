import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { env } from '../config/env';
import { reactivateSubscription } from '../services/merchant.service';
import { sendReply } from '../services/whatsapp.service';

const router = Router();

router.post('/razorpay', async (req: Request, res: Response) => {
  try {
    // 1. Verify Razorpay webhook signature
    const signature = req.headers['x-razorpay-signature'] as string;
    const body = (req as any).rawBody; // Required for signature verification

    if (!signature || !body) {
      res.status(400).send('Missing signature or body');
      return;
    }

    if (typeof signature !== 'string') {
      console.warn('⚠️ Invalid Razorpay webhook signature format (array detected)');
      res.status(400).send('Invalid signature format');
      return;
    }

    const expectedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

    if (
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      console.warn('⚠️ Invalid Razorpay webhook signature');
      res.status(400).send('Invalid signature');
      return;
    }

    // Always ACK quickly
    res.sendStatus(200);

    const payload = JSON.parse(body.toString());

    // 2. We only care about payment_link.paid
    if (payload.event === 'payment_link.paid') {
      const paymentLink = payload.payload.payment_link.entity;
      const merchantPhone = paymentLink.notes?.merchant_phone;
      const amountPaid = paymentLink.amount_paid; // in paise
      const status = paymentLink.status; // e.g., 'paid'

      const { getPlanFromAmount } = require('../services/payment.service');
      const plan = getPlanFromAmount(amountPaid / 100);

      if (status !== 'paid' || (!plan || (plan === 'basic' && amountPaid / 100 !== 149 && amountPaid / 100 !== 1520))) {
        // basic is the fallback, so if it's basic but the amount isn't exactly the basic amount, it's invalid
        console.warn(`⚠️ Payment verification failed for ${merchantPhone}: Status=${status}, AmountPaid=${amountPaid} is invalid`);
        return; // Halt and do NOT reactivate
      }

      if (merchantPhone) {
        console.log(`✅ Payment verified successfully for merchant: ${merchantPhone} (Plan: ${plan})`);
        
        // 3. Reactivate subscription ONLY AFTER verification
        await reactivateSubscription(merchantPhone, plan);

        // 4. Send success message via WhatsApp
        // Since we don't have a messageId, we send a direct message (not a reply)
        const axios = require('axios');
        await axios.post(
          `https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
          {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: merchantPhone,
            type: 'text',
            text: {
              body: `🎉 *Payment Successful!*\n\nThank you for subscribing to the Maghgo *${plan.toUpperCase()}* plan. Your store has been reactivated for the next 30 days. You can now continue adding products!`,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
              'Content-Type': 'application/json',
            },
          }
        );
      }
    }
  } catch (error) {
    console.error('❌ Error processing Razorpay webhook:', error);
    // Note: Don't send 500 if we already sent 200, we should only log it since we fire-and-forget inside the handler
    if (!res.headersSent) {
      res.status(500).send('Internal Server Error');
    }
  }
});

export const paymentRouter = router;
