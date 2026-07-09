import Razorpay from 'razorpay';
import { env } from '../config/env';

// Initialize Razorpay SDK
export const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET,
});

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
    const response = await razorpay.paymentLink.create({
      amount: amount * 100, // Razorpay expects amount in paise (1 INR = 100 paise)
      currency: 'INR',
      accept_partial: false,
      description: amount === 2999 ? 'Maghgo Enterprise (30 Days)' : amount === 499 ? 'Maghgo Premium (30 Days)' : 'Maghgo Basic (30 Days)',
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
