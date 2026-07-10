import Razorpay from 'razorpay';
import { env } from '../config/env';

// Initialize Razorpay SDK
export const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET,
});

export function getPlanFromAmount(amount: number): string {
  // Monthly
  if (amount === 99) return 'basic';
  if (amount === 149) return 'starter';
  if (amount === 249) return 'pro';
  if (amount === 349) return 'advanced';
  if (amount === 499) return 'premium';
  if (amount === 749) return 'business';
  if (amount === 999) return 'agency';
  if (amount === 1499) return 'vip';
  if (amount === 1999) return 'enterprise';

  // Yearly (15% discount)
  if (amount === 1010) return 'basic'; // 99 * 0.85 * 12
  if (amount === 1520) return 'starter'; // 149 * 0.85 * 12
  if (amount === 2540) return 'pro'; // 249 * 0.85 * 12
  if (amount === 3560) return 'advanced'; // 349 * 0.85 * 12
  if (amount === 5090) return 'premium'; // 499 * 0.85 * 12
  if (amount === 7640) return 'business'; // 749 * 0.85 * 12
  if (amount === 10190) return 'agency'; // 999 * 0.85 * 12
  if (amount === 15290) return 'vip'; // 1499 * 0.85 * 12
  if (amount === 20390) return 'enterprise'; // 1999 * 0.85 * 12

  return 'basic'; // fallback
}

export function getAmountFromPlan(plan: string, isYearly = false): number {
  if (isYearly) {
    switch (plan.toLowerCase()) {
      case 'basic': return 1010;
      case 'starter': return 1520;
      case 'pro': return 2540;
      case 'advanced': return 3560;
      case 'premium': return 5090;
      case 'business': return 7640;
      case 'agency': return 10190;
      case 'vip': return 15290;
      case 'enterprise': return 20390;
      default: return 1010;
    }
  }

  switch (plan.toLowerCase()) {
    case 'basic': return 99;
    case 'starter': return 149;
    case 'pro': return 249;
    case 'advanced': return 349;
    case 'premium': return 499;
    case 'business': return 749;
    case 'agency': return 999;
    case 'vip': return 1499;
    case 'enterprise': return 1999;
    default: return 99;
  }
}

/**
 * Creates a unique Razorpay Payment Link for the merchant's subscription.
 * Pass the merchant's phone number so we can identify who paid in the webhook.
 *
 * @param merchantPhone The phone number of the merchant
 * @param amount Amount in INR (e.g. 999)
 * @returns The short URL for the payment link
 */
export async function createPaymentLink(merchantPhone: string, amount: number): Promise<string> {
  try {
    const planName = getPlanFromAmount(amount);
    const isYearly = amount > 1000 && amount !== 1999 && amount !== 2999 && amount !== 4999;
    
    const response = await razorpay.paymentLink.create({
      amount: amount * 100, // Razorpay expects amount in paise (1 INR = 100 paise)
      currency: 'INR',
      accept_partial: false,
      description: `Maghgo ${planName.charAt(0).toUpperCase() + planName.slice(1)} Plan (${isYearly ? '1 Year' : '30 Days'})`,
      customer: {
        contact: merchantPhone,
      },
      notify: {
        sms: true,
        email: false,
      },
      reminder_enable: true,
      notes: {
        merchant_phone: merchantPhone,
      },
    });

    return response.short_url;
  } catch (error) {
    console.error('❌ Failed to create Razorpay payment link:', error);
    throw new Error('Could not generate payment link');
  }
}
