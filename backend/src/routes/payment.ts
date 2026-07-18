import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { env } from '../config/env';
import { getPlanFromAmount, getAmountFromPlan } from '../services/payment.service';
import { normalizePhone } from '../utils/phone';
import { supabase } from '../db/supabase';
import axios from 'axios';

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

    const payload = JSON.parse(body.toString());

    // 2. We only care about payment_link.paid
    if (payload.event === 'payment_link.paid') {
      const paymentLink = payload.payload.payment_link.entity;

      // Order payments are settled per-shop via a signed callback
      // (/api/store/pay/verify), not this platform webhook — so ignore any
      // order-tagged link that somehow reaches here rather than misprocessing it
      // as a subscription.
      if (paymentLink.notes?.type === 'order') {
        res.sendStatus(200);
        return;
      }

      const senderId = paymentLink.notes?.sender_id || paymentLink.notes?.merchant_phone; // support both
      const amountPaid = paymentLink.amount_paid; // in paise
      const status = paymentLink.status; // e.g., 'paid'

      const plan = await getPlanFromAmount(amountPaid / 100);
      const monthlyAmount = await getAmountFromPlan(plan, false);
      const yearlyAmount = await getAmountFromPlan(plan, true);
      const isYearly = (amountPaid / 100) === yearlyAmount;

      // Strict validation: amount must exactly match either the monthly or yearly price of the detected plan
      if (status !== 'paid' || !plan || ((amountPaid / 100) !== monthlyAmount && (amountPaid / 100) !== yearlyAmount)) {
        console.warn(`⚠️ Payment verification failed for ${senderId}: Status=${status}, AmountPaid=${amountPaid} is invalid for Plan=${plan}`);
        res.status(400).send('Invalid payment amount for plan');
        return; // Halt and do NOT reactivate
      }

      if (senderId) {
        console.log(`✅ Payment verified successfully for merchant: ${senderId} (Plan: ${plan}, Yearly: ${isYearly})`);
        
        const now = new Date();
        const daysToAdd = isYearly ? 365 : 30;
        
        // The senderId came from the payment link's notes and may be a phone
        // number in any format, or an Instagram/Messenger id. Match the phone
        // in its canonical form — an exact match against an unnormalised
        // number would fail to find the payer, and we would take the money
        // without ever activating the subscription.
        const normalizedSender = normalizePhone(senderId);
        const { data: merchant, error: fetchError } = await supabase
          .from('merchants')
          .select('id, subscription_ends_at, is_active, phone_number, instagram_id, messenger_id')
          .or(`phone_number.eq.${normalizedSender || senderId},instagram_id.eq.${senderId},messenger_id.eq.${senderId}`)
          .single();
          
        if (merchant && !fetchError) {
          // Idempotency Check: Verify if this payment ID was already processed
          const paymentId = paymentLink.id || payload.payload.payment.entity.id;
          const { data: existingPayment } = await supabase
            .from('payments')
            .select('id')
            .eq('razorpay_payment_id', paymentId)
            .maybeSingle();

          if (existingPayment) {
            console.log(`⚠️ Payment ${paymentId} already processed. Skipping.`);
            res.sendStatus(200);
            return;
          }

          const currentExpiry = new Date(merchant.subscription_ends_at || new Date(0));
          const newExpiry = (merchant.is_active && currentExpiry > now) 
            ? new Date(currentExpiry.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
            : new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

          // Track the payment in audit log
          await supabase.from('payments').insert({
            merchant_id: merchant.id,
            razorpay_payment_id: paymentId,
            razorpay_payment_link_id: paymentLink.id,
            amount: amountPaid / 100,
            plan: plan,
            is_yearly: isYearly,
            status: status
          });

          await supabase
            .from('merchants')
            .update({
              is_active: true,
              subscription_plan: plan,
              subscription_ends_at: newExpiry.toISOString(),
            })
            .eq('id', merchant.id);
            
          // 4. Send success message via WhatsApp (if they have a phone number)
          if (merchant.phone_number) {
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
    
    // Send 200 OK after successful processing
    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Error processing Razorpay webhook:', error);
    if (!res.headersSent) {
      res.status(500).send('Internal Server Error');
    }
  }
});

export const paymentRouter = router;
