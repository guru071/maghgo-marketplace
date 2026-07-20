import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { env } from '../config/env';
import { getPlanFromAmount, getAmountFromPlan, getActiveOfferDiscount, applyDiscount } from '../services/payment.service';
import { normalizePhone } from '../utils/phone';
import { sendNotification } from '../services/whatsapp.service';
import { supabase } from '../db/supabase';

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

      const paidRupees = amountPaid / 100;

      // Resolve the plan from EITHER the list price or a discounted price, so a
      // promo payment still maps to the right plan.
      const discount = await getActiveOfferDiscount();
      let plan = await getPlanFromAmount(paidRupees);
      if (discount > 0) {
        const { data: allPlans } = await supabase.from('plans').select('slug, monthly_price, yearly_price');
        const match = (allPlans ?? []).find((p: any) =>
          applyDiscount(p.monthly_price, discount) === paidRupees ||
          applyDiscount(p.yearly_price, discount) === paidRupees);
        if (match) plan = match.slug;
      }

      // getAmountFromPlan already returns the discounted price when an offer is
      // live; also accept the undiscounted list price (a link created before the
      // offer started must still activate).
      const monthlyAmount = await getAmountFromPlan(plan, false);
      const yearlyAmount = await getAmountFromPlan(plan, true);
      const { data: listRow } = await supabase
        .from('plans').select('monthly_price, yearly_price').eq('slug', plan).maybeSingle();
      const validAmounts = [monthlyAmount, yearlyAmount, listRow?.monthly_price, listRow?.yearly_price]
        .filter((n): n is number => typeof n === 'number');
      const isYearly = paidRupees === yearlyAmount || paidRupees === listRow?.yearly_price;

      // Strict validation: the amount must match one of this plan's valid prices
      // (list or promo). Anything else is refused — no plan without a real charge.
      if (status !== 'paid' || !plan || !validAmounts.includes(paidRupees)) {
        console.warn(`⚠️ Payment verification failed for ${senderId}: Status=${status}, AmountPaid=${paidRupees} not in [${validAmounts.join(', ')}] for Plan=${plan}`);
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

          // Use the subscription date itself to judge whether to extend vs. reset
          // NOT is_active (the merchant's pause toggle). is_active=false means paused,
          // not expired — charging from TODAY for a paused merchant loses their paid days.
          // Guard NULL: new Date(null||new Date(0)) still gives epoch 1970.
          const currentExpiry = merchant.subscription_ends_at ? new Date(merchant.subscription_ends_at) : null;
          const subIsCurrentlyValid = currentExpiry && !isNaN(currentExpiry.getTime()) && currentExpiry > now;
          const newExpiry = subIsCurrentlyValid
            ? new Date(currentExpiry!.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
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
            
          // 4. Confirm over WhatsApp (with the 24h-window template fallback —
          // a merchant may pay from a link days after last messaging the bot).
          if (merchant.phone_number) {
            await sendNotification(
              merchant.phone_number,
              `🎉 *Payment Successful!*\n\nThank you for subscribing to the Maghgo *${plan.toUpperCase()}* plan. Your store has been reactivated for the next ${isYearly ? '365' : '30'} days. You can now continue adding products!`
            ).catch((e: any) => console.error('Failed to send WhatsApp payment confirmation:', e?.message || e));
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
