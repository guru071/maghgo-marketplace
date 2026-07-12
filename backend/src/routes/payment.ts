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
      const senderId = paymentLink.notes?.sender_id || paymentLink.notes?.merchant_phone; // support both
      const amountPaid = paymentLink.amount_paid; // in paise
      const status = paymentLink.status; // e.g., 'paid'

      const { getPlanFromAmount, getAmountFromPlan } = require('../services/payment.service');
      const plan = await getPlanFromAmount(amountPaid / 100);
      const yearlyAmount = await getAmountFromPlan(plan, true);
      const isYearly = (amountPaid / 100) === yearlyAmount;

      if (status !== 'paid' || (!plan || (plan === 'basic' && amountPaid / 100 !== 99 && amountPaid / 100 !== 1010))) {
        // basic is the fallback, so if it's basic but the amount isn't exactly the basic amount, it's invalid
        console.warn(`⚠️ Payment verification failed for ${senderId}: Status=${status}, AmountPaid=${amountPaid} is invalid`);
        return; // Halt and do NOT reactivate
      }

      if (senderId) {
        console.log(`✅ Payment verified successfully for merchant: ${senderId} (Plan: ${plan}, Yearly: ${isYearly})`);
        
        // Check if senderId is a phone number or an instagram/messenger ID
        // The webhook doesn't strictly know the channel, but reactivateSubscription needs it.
        // Wait, reactivateSubscription needs (channel, senderId). 
        // We can infer channel: if it's all digits (with optional +), it's WhatsApp/SMS. Otherwise, we can try to guess or let the service handle it.
        const isPhone = /^\\+?[1-9]\\d{9,14}$/.test(senderId);
        let channel: 'whatsapp' | 'instagram' | 'messenger' = 'whatsapp';
        // We can just try to reactivate by checking all columns, or pass a special channel 'any' to merchant.service.
        // But since reactivateSubscription takes (channel, senderId, plan, isYearly), let's just do it directly here using supabase.
        const { supabase } = require('../db/supabase');
        
        const now = new Date();
        const daysToAdd = isYearly ? 365 : 30;
        
        // Fetch the merchant to get their current trial_ends_at
        const { data: merchant, error: fetchError } = await supabase
          .from('merchants')
          .select('id, trial_ends_at, is_active, phone_number, instagram_id, messenger_id')
          .or(`phone_number.eq.${senderId},instagram_id.eq.${senderId},messenger_id.eq.${senderId}`)
          .single();
          
        if (merchant && !fetchError) {
          const currentExpiry = new Date(merchant.trial_ends_at);
          const newExpiry = (merchant.is_active && currentExpiry > now) 
            ? new Date(currentExpiry.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
            : new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

          await supabase
            .from('merchants')
            .update({
              is_active: true,
              subscription_plan: plan,
              trial_ends_at: newExpiry.toISOString(),
            })
            .eq('id', merchant.id);
            
          // 4. Send success message via WhatsApp (if they have a phone number)
          if (merchant.phone_number) {
            const axios = require('axios');
            await axios.post(
              `https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
              {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: merchant.phone_number,
                type: 'text',
                text: {
                  body: `🎉 *Payment Successful!*\n\nThank you for subscribing to the Maghgo *${plan.toUpperCase()}* plan. Your store has been reactivated for the next ${isYearly ? '365' : '30'} days. You can now continue adding products!`,
                },
              },
              {
                headers: {
                  Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
                  'Content-Type': 'application/json',
                },
              }
            ).catch((e: any) => console.error('Failed to send WhatsApp payment confirmation:', e));
          }
        } else {
           console.error(`⚠️ Could not find merchant for senderId: ${senderId}`);
        }
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
