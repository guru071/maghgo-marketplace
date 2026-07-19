import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { createOrder, priceCart, attachOrderPaymentLink, getOrderByPaymentLink, markOrderPaidByLink } from '../services/order.service';
import { validateCoupon } from '../services/coupon.service';
import { createOrderPaymentLink, verifyOrderPaymentSignature } from '../services/payment.service';
import { getMerchantBySlug } from '../services/merchant.service';
import { sendNotification } from '../services/whatsapp.service';
import { decryptSecret } from '../utils/crypto';
import { supabase } from '../db/supabase';
import { env } from '../config/env';

// ─── Public Storefront Routes ────────────────────────────────────────────────
// These are called by shoppers, who are never authenticated. Everything here
// must assume the caller is hostile: the service re-prices every line from the
// database and ignores any amounts the client sends.

const router = Router();

// A shopper placing an order is a rare, deliberate act. This ceiling stops a
// script filling a merchant's dashboard with junk while leaving real customers
// (who might legitimately reorder a few times) well clear of it.
const orderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: { error: 'Too many orders from this address. Please try again shortly.' },
});

/**
 * POST /api/store/:slug/orders
 * Record an order placed from a storefront cart.
 *
 * Best-effort by design: the frontend opens the merchant's chat regardless of
 * the outcome here. Losing the analytics row is bad; blocking a real sale
 * because our database hiccuped would be much worse.
 */
router.post('/:slug/orders', orderLimiter, async (req: Request, res: Response) => {
  try {
    const { items, customer_name, customer_phone, notes, coupon_code } = req.body ?? {};
    const slug = String(req.params.slug);

    const order = await createOrder(slug, items, {
      name: customer_name,
      phone: customer_phone,
      notes,
      couponCode: coupon_code,
    });

    if (!order) {
      // Unknown/inactive store, or none of the items resolved to a live product.
      return res.status(404).json({ error: 'Store or products not found' });
    }

    // Offer online payment. Best-effort — a missing link never fails the order,
    // the shopper can still complete it in chat as before.
    let payment_url: string | null = null;
    try {
      const merchant = await getMerchantBySlug(slug);
      const payLink = await createOrderPaymentLink({
        orderId: order.id,
        merchantId: order.merchant_id,
        storeName: merchant?.store_name || 'the store',
        amount: Number(order.total),
        customerPhone: customer_phone,
        razorpayKeyId: merchant?.razorpay_key_id,
        razorpayKeySecret: decryptSecret(merchant?.razorpay_key_secret),
      });
      if (payLink) {
        payment_url = payLink.url;
        await attachOrderPaymentLink(order.id, payLink.url, payLink.id);
      }
    } catch (e: any) {
      console.warn('Order pay-link generation failed (non-fatal):', e?.message ?? e);
    }

    res.status(201).json({
      id: order.id,
      total: order.total,
      discount: order.discount ?? 0,
      status: order.status,
      payment_url,
    });
  } catch (err: any) {
    console.error('❌ Failed to record order:', err?.message ?? err);
    res.status(400).json({ error: err?.message ?? 'Could not record order' });
  }
});

/**
 * POST /api/store/:slug/coupon
 * Validate a discount code against the shopper's cart. The subtotal is computed
 * server-side from the database, so the returned discount can be trusted even
 * though the request came from an unauthenticated browser.
 */
const couponLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 40 });
router.post('/:slug/coupon', couponLimiter, async (req: Request, res: Response) => {
  try {
    const { items, code } = req.body ?? {};
    if (!code) return res.status(400).json({ error: 'A coupon code is required.' });

    const priced = await priceCart(String(req.params.slug), items);
    if (!priced) return res.status(404).json({ error: 'Store or products not found' });

    const applied = await validateCoupon(priced.merchantId, String(code), priced.subtotal);
    if (!applied) return res.status(404).json({ error: 'That coupon is not valid.' });

    res.json({
      code: applied.code,
      discount: applied.discount,
      subtotal: priced.subtotal,
      total: Math.max(0, priced.subtotal - applied.discount),
    });
  } catch (err: any) {
    // validateCoupon throws a shopper-friendly message for expired/used codes.
    res.status(400).json({ error: err?.message ?? 'That coupon could not be applied.' });
  }
});

/**
 * POST /api/store/pay/verify
 * Confirm an order payment from the Razorpay payment-link callback.
 *
 * The shop's own secret verifies the redirect signature (their money, their
 * keys). On success the order is marked paid (idempotently) and both parties
 * are notified. This is intentionally NOT under /:slug — the order is found by
 * its payment-link id, which uniquely identifies the shop.
 */
const verifyLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 60 });
router.post('/pay/verify', verifyLimiter, async (req: Request, res: Response) => {
  try {
    const {
      razorpay_payment_link_id,
      razorpay_payment_link_reference_id,
      razorpay_payment_link_status,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body ?? {};

    if (!razorpay_payment_link_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment parameters.' });
    }

    const order = await getOrderByPaymentLink(String(razorpay_payment_link_id));
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    // The shop's secret is read only here (backend/service_role) and never leaves.
    const { data: merchant } = await supabase
      .from('merchants')
      .select('razorpay_key_secret, phone_number, store_name, store_slug')
      .eq('id', order.merchant_id)
      .maybeSingle();

    if (!merchant) return res.status(404).json({ error: 'Store not found.' });

    const shopSecret = decryptSecret(merchant.razorpay_key_secret);
    if (!shopSecret) {
      return res.status(400).json({ error: 'This store is not set up for online payments.' });
    }

    const valid = verifyOrderPaymentSignature(shopSecret, {
      razorpay_payment_link_id: String(razorpay_payment_link_id),
      razorpay_payment_link_reference_id: String(razorpay_payment_link_reference_id ?? ''),
      razorpay_payment_link_status: String(razorpay_payment_link_status ?? ''),
      razorpay_payment_id: String(razorpay_payment_id ?? ''),
      razorpay_signature: String(razorpay_signature),
    });

    if (!valid || razorpay_payment_link_status !== 'paid') {
      return res.status(400).json({ error: 'Payment could not be verified.' });
    }

    const result = await markOrderPaidByLink(String(razorpay_payment_link_id));
    if (result && !result.alreadyPaid) {
      const paid = result.order;
      const symbol = paid.currency === 'INR' ? '₹' : `${paid.currency} `;
      const totalStr = `${symbol}${Number(paid.total).toLocaleString('en-IN')}`;

      if (paid.customer_phone && /^[1-9]\d{9,14}$/.test(paid.customer_phone)) {
        sendNotification(paid.customer_phone, `✅ *Payment received — ${totalStr}!*\n\nThank you. Your order at *${merchant.store_name}* is confirmed. 🙏`)
          .catch((e) => console.error('order receipt failed:', e?.message || e));
      }
      if (merchant.phone_number) {
        sendNotification(merchant.phone_number, `💰 *Order PAID — ${totalStr}!*\n\nA customer paid online for their order at *${merchant.store_name}*. See it: ${env.FRONTEND_URL}/dashboard/orders`)
          .catch((e) => console.error('merchant paid notice failed:', e?.message || e));
      }
    }

    res.json({ ok: true, store_slug: merchant.store_slug });
  } catch (err: any) {
    console.error('❌ Payment verify failed:', err?.message ?? err);
    res.status(500).json({ error: 'Could not verify payment.' });
  }
});

export { router as storeRouter };
