import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { createOrder } from '../services/order.service';

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
    const { items, customer_name, customer_phone, notes } = req.body ?? {};

    const order = await createOrder(String(req.params.slug), items, {
      name: customer_name,
      phone: customer_phone,
      notes,
    });

    if (!order) {
      // Unknown/inactive store, or none of the items resolved to a live product.
      return res.status(404).json({ error: 'Store or products not found' });
    }

    res.status(201).json({ id: order.id, total: order.total, status: order.status });
  } catch (err: any) {
    console.error('❌ Failed to record order:', err?.message ?? err);
    res.status(400).json({ error: err?.message ?? 'Could not record order' });
  }
});

export { router as storeRouter };
