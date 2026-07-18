import Razorpay from 'razorpay';
import crypto from 'crypto';
import { env } from '../config/env';
import { supabase } from '../db/supabase';

// Initialize Razorpay SDK
export const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET,
});

export async function getPlanFromAmount(amount: number): Promise<string> {
  const { data, error } = await supabase
    .from('plans')
    .select('slug')
    .or(`monthly_price.eq.${amount},yearly_price.eq.${amount}`)
    .limit(1)
    .single();

  if (error || !data) {
    return 'basic'; // fallback
  }

  return data.slug;
}

export async function getAmountFromPlan(plan: string, isYearly = false): Promise<number> {
  const { data, error } = await supabase
    .from('plans')
    .select('monthly_price, yearly_price')
    .eq('slug', plan.toLowerCase())
    .single();

  if (error || !data) {
    return isYearly ? 1010 : 99; // fallback
  }

  return isYearly ? data.yearly_price : data.monthly_price;
}

/**
 * Creates a unique Razorpay Payment Link for the merchant's subscription.
 * Pass the merchant's phone number so we can identify who paid in the webhook.
 *
 * @param merchantPhone The phone number of the merchant
 * @param amount Amount in INR (e.g. 999)
 * @returns The short URL for the payment link
 */
export async function createPaymentLink(senderId: string, amount: number): Promise<string> {
  try {
    const planName = await getPlanFromAmount(amount);
    
    // Check if the amount matches the yearly price of the plan
    const { data: planData } = await supabase
      .from('plans')
      .select('yearly_price')
      .eq('slug', planName)
      .single();
      
    const isYearly = planData ? planData.yearly_price === amount : false;
    
    const isPhone = /^\+?[1-9]\d{9,14}$/.test(senderId);

    const payload: any = {
      amount: amount * 100, // Razorpay expects amount in paise (1 INR = 100 paise)
      currency: 'INR',
      accept_partial: false,
      description: `Maghgo ${planName.charAt(0).toUpperCase() + planName.slice(1)} Plan (${isYearly ? '1 Year' : '30 Days'})`,
      reminder_enable: true,
      notes: {
        sender_id: senderId,
      },
    };

    if (isPhone) {
      payload.customer = { contact: senderId };
      payload.notify = { sms: true, email: false };
    } else {
      payload.notify = { sms: false, email: false };
    }

    const response = await razorpay.paymentLink.create(payload);

    return response.short_url;
  } catch (error) {
    console.error('❌ Failed to create Razorpay payment link:', error);
    throw new Error('Could not generate payment link');
  }
}

/**
 * Create a Razorpay payment link so a *shopper* can pay for their order online.
 *
 * CRITICAL: this uses the SHOP OWNER's own Razorpay credentials, so the money
 * settles into the shop's account — not the platform's. (Subscription payments
 * to Maghgo use the platform keys via createPaymentLink instead.) If the shop
 * hasn't connected Razorpay yet, we return null and the shopper falls back to
 * arranging payment in chat — we never silently route their money to us.
 *
 * Settlement is confirmed by a signed callback (see /api/store/pay/verify): the
 * shop's own webhook secret isn't available to us, so we verify the redirect
 * signature with the shop's key_secret instead. `reference_id` carries the order
 * id so the callback can find the order.
 *
 * The amount is whatever the *server* computed for the order — never a
 * client-supplied figure.
 *
 * @returns the link's short URL and id, or null if the shop hasn't connected
 *          Razorpay or the API call failed (the order is already recorded, so a
 *          failed link must not throw).
 */
export async function createOrderPaymentLink(params: {
  orderId: string;
  merchantId: string;
  storeName: string;
  amount: number; // rupees
  customerPhone?: string | null;
  razorpayKeyId?: string | null;
  razorpayKeySecret?: string | null;
}): Promise<{ url: string; id: string } | null> {
  // No connected account → no online payment. Never fall back to platform keys:
  // that would take the customer's money into the wrong account.
  if (!params.razorpayKeyId || !params.razorpayKeySecret) return null;
  if (!params.amount || params.amount < 1) return null;

  try {
    const shopRazorpay = new Razorpay({
      key_id: params.razorpayKeyId,
      key_secret: params.razorpayKeySecret,
    });

    const payload: any = {
      amount: Math.round(params.amount * 100), // paise
      currency: 'INR',
      accept_partial: false,
      reference_id: params.orderId,
      description: `Order at ${params.storeName}`.slice(0, 250),
      reminder_enable: true,
      // On payment, Razorpay redirects the shopper's browser here with a signed
      // set of params; the frontend forwards them to the backend to verify.
      callback_url: `${env.FRONTEND_URL}/pay/success`,
      callback_method: 'get',
      notes: { type: 'order', order_id: params.orderId, merchant_id: params.merchantId },
    };

    const phone = (params.customerPhone || '').replace(/\D/g, '');
    if (/^[1-9]\d{9,14}$/.test(phone)) {
      payload.customer = { contact: phone };
      payload.notify = { sms: true, email: false };
    } else {
      payload.notify = { sms: false, email: false };
    }

    const response = await shopRazorpay.paymentLink.create(payload);
    return { url: response.short_url, id: String(response.id) };
  } catch (error) {
    console.error('❌ Failed to create order payment link:', error);
    return null; // order stands; shopper can still pay manually
  }
}

/**
 * Verify a Razorpay Payment-Link callback signature using the SHOP's secret.
 * The signature is HMAC-SHA256 of
 *   payment_link_id | payment_link_reference_id | payment_link_status | payment_id
 * (Razorpay's documented formula for payment-link callbacks).
 */
export function verifyOrderPaymentSignature(
  keySecret: string,
  params: {
    razorpay_payment_link_id: string;
    razorpay_payment_link_reference_id: string;
    razorpay_payment_link_status: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }
): boolean {
  try {
    const body = `${params.razorpay_payment_link_id}|${params.razorpay_payment_link_reference_id}|${params.razorpay_payment_link_status}|${params.razorpay_payment_id}`;
    const expected = crypto.createHmac('sha256', keySecret).update(body).digest('hex');
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(params.razorpay_signature || '', 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
