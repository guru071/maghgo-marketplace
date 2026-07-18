import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { supabase } from '../db/supabase';
import { getProducts, updateProductPrice, deleteAllProducts, deleteProduct, createProduct, setProductFulfillmentById } from '../services/product.service';
import { updateStoreDescription, toggleStoreStatus, getProductLimit } from '../services/merchant.service';
import { getOrders, updateOrderStatus, getAnalytics } from '../services/order.service';
import { createPaymentLink } from '../services/payment.service';
import { triggerRevalidation } from '../services/revalidate.service';
import { hasAccess } from '../utils/plans';
import multer from 'multer';
import { removeBackground } from '../services/media.service';
import { uploadImage } from '../services/storage.service';
import crypto from 'crypto';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// Every merchant column EXCEPT password_hash. Never select('*') on merchants:
// that ships the bcrypt hash to the browser, where it has no business being.
const MERCHANT_PUBLIC_COLUMNS = [
  'id', 'phone_number', 'store_name', 'store_slug', 'store_description',
  'store_logo_url', 'is_active', 'subscription_plan', 'subscription_ends_at',
  'created_at', 'updated_at', 'theme_config', 'theme_id', 'instagram_handle',
  'facebook_url', 'x_handle', 'instagram_id', 'messenger_id', 'link_code', 'custom_domain',
].join(', ');

// Apply auth middleware to all routes
router.use(requireAuth);

// Get Store Details
router.get('/store', async (req: AuthRequest, res) => {
  try {
    // Try to include store_address; if migration 15 hasn't run yet the column
    // is missing, so fall back to the base columns rather than 500.
    let { data, error } = await supabase
      .from('merchants')
      .select(`${MERCHANT_PUBLIC_COLUMNS}, store_address`)
      .eq('id', req.merchantId)
      .single();

    if (error && /store_address|schema cache|42703/i.test(error.message || '')) {
      ({ data, error } = await supabase
        .from('merchants')
        .select(MERCHANT_PUBLIC_COLUMNS)
        .eq('id', req.merchantId)
        .single());
    }

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Store Details
router.put('/store', async (req: AuthRequest, res) => {
  try {
    const { store_name, store_description, is_active, theme_config } = req.body;
    
    let updates: any = {};
    if (store_name !== undefined) updates.store_name = store_name;
    if (store_description !== undefined) updates.store_description = store_description;
    if (is_active !== undefined) updates.is_active = is_active;
    if (theme_config !== undefined) updates.theme_config = theme_config;

    const { data: merchant, error } = await supabase
      .from('merchants')
      .update(updates)
      .eq('id', req.merchantId)
      .select('store_slug')
      .single();

    if (error) throw error;

    if (merchant) {
      await triggerRevalidation(merchant.store_slug);
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get Products
router.get('/products', async (req: AuthRequest, res) => {
  try {
    const products = await getProducts(req.merchantId!);
    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add Product (with image processing)
router.post('/products', upload.single('image'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image is required' });
    const { title, price } = req.body;
    if (!title || !price) return res.status(400).json({ error: 'Title and price are required' });

    const merchantId = req.merchantId!;

    // 1. Check Product Limits
    const { data: merchant } = await supabase.from('merchants').select('subscription_plan, phone_number, store_slug').eq('id', merchantId).single();
    if (!merchant) return res.status(404).json({ error: 'Merchant not found' });
    
    const limit = await getProductLimit(merchant.subscription_plan);
    const products = await getProducts(merchantId);
    
    if (products.length >= limit) {
      return res.status(402).json({ 
        error: 'Plan Limit Reached', 
        message: `Your current plan allows a maximum of ${limit} products.` 
      });
    }

    let processedBuffer: Buffer;
    
    try {
      processedBuffer = await removeBackground(req.file.buffer);
    } catch (err) {
      console.warn('⚠️ Background removal failed via dashboard, using original image:', err);
      processedBuffer = req.file.buffer;
    }

    const productId = crypto.randomUUID();
    const [originalUrl, processedUrl] = await Promise.all([
      uploadImage(merchantId, productId, req.file.buffer, req.file.mimetype, '-original'),
      uploadImage(merchantId, productId, processedBuffer, 'image/png', '-processed'),
    ]);

    const product = await createProduct(merchantId, title, Number(price), originalUrl, processedUrl);

    if (merchant) {
      await triggerRevalidation(merchant.store_slug);
    }

    res.json(product);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Product
router.put('/products/:id', async (req: AuthRequest, res) => {
  try {
    const { title, price } = req.body;
    
    // updateProductPrice uses ILIKE on title currently, let's update by ID instead
    // Actually, updateProductPrice expects a title. Let's write a quick inline supabase update by ID.
    const { error } = await supabase
      .from('products')
      .update({ title, price })
      .eq('id', req.params.id)
      .eq('merchant_id', req.merchantId);

    if (error) throw error;

    const { data: merchant } = await supabase.from('merchants').select('store_slug').eq('id', req.merchantId).single();
    if (merchant) await triggerRevalidation(merchant.store_slug);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Product
router.delete('/products/:id', async (req: AuthRequest, res) => {
  try {
    const { error } = await supabase
      .from('products')
      .update({ is_available: false })
      .eq('id', req.params.id)
      .eq('merchant_id', req.merchantId);

    if (error) throw error;

    const { data: merchant } = await supabase.from('merchants').select('store_slug').eq('id', req.merchantId).single();
    if (merchant) await triggerRevalidation(merchant.store_slug);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Save Visual Builder theme config — scoped to the authenticated merchant only.
// The store is derived from the JWT merchantId, so a merchant can never write
// another merchant's storefront (prevents the previous unauthenticated IDOR).
router.put('/theme', async (req: AuthRequest, res) => {
  try {
    const { theme_config } = req.body;
    if (theme_config === undefined) {
      return res.status(400).json({ error: 'theme_config is required' });
    }

    const { data: merchant, error } = await supabase
      .from('merchants')
      .update({ theme_config })
      .eq('id', req.merchantId)
      .select('store_slug')
      .single();

    if (error) throw error;

    if (merchant) {
      await triggerRevalidation(merchant.store_slug);
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Set a product's fulfilment mode (buy delivers / prebook = reserve at shop).
router.patch('/products/:id/fulfillment', async (req: AuthRequest, res) => {
  try {
    const { fulfillment_type } = req.body;
    if (fulfillment_type !== 'buy' && fulfillment_type !== 'prebook') {
      return res.status(400).json({ error: "fulfillment_type must be 'buy' or 'prebook'" });
    }
    const ok = await setProductFulfillmentById(req.merchantId!, String(req.params.id), fulfillment_type);
    if (!ok) return res.status(404).json({ error: 'Product not found' });

    const { data: merchant } = await supabase.from('merchants').select('store_slug').eq('id', req.merchantId).single();
    if (merchant) await triggerRevalidation(merchant.store_slug);

    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ─── Themes ──────────────────────────────────────────────────────────────────

// The real theme catalogue. The dashboard used to render a hardcoded list of
// four, so the 60 premium themes in the database were unreachable.
// `locked` is computed from the merchant's plan rather than hidden, so a
// merchant can see what upgrading would give them.
router.get('/themes', async (req: AuthRequest, res) => {
  try {
    const { data: merchant } = await supabase
      .from('merchants')
      .select('subscription_plan')
      .eq('id', req.merchantId)
      .single();

    const { data, error } = await supabase
      .from('themes')
      .select('id, name, description, plan_required, config')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    const plan = merchant?.subscription_plan ?? 'basic';
    const themes = (data ?? []).map((t: any) => ({
      ...t,
      // A theme carrying a Puck content[] is one of the premium, full-layout
      // designs; the rest are the older colour-only configs.
      premium: Array.isArray(t.config?.content) && t.config.content.length > 0,
      locked: !hasAccess(t.plan_required, plan),
    }));

    res.json({ plan, themes });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Save the store's address (shown as a "Visit us" block on the storefront).
router.put('/address', async (req: AuthRequest, res) => {
  try {
    const address = (req.body?.store_address ?? '').toString().trim().slice(0, 300) || null;

    const { error } = await supabase
      .from('merchants')
      .update({ store_address: address })
      .eq('id', req.merchantId);

    if (error) {
      if (/store_address|schema cache|42703/i.test(error.message || '')) {
        return res.status(400).json({ error: 'Store address needs one setup step (migration 15) before it can be saved.' });
      }
      throw error;
    }

    const { data: m } = await supabase.from('merchants').select('store_slug').eq('id', req.merchantId).single();
    if (m) await triggerRevalidation(m.store_slug);

    res.json({ success: true, store_address: address });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Custom Domain ───────────────────────────────────────────────────────────

// Claim (or clear) a custom domain for this merchant's storefront.
// Saving the domain is the app's half; DNS + adding it in the host completes it.
router.put('/domain', async (req: AuthRequest, res) => {
  try {
    const raw = (req.body?.custom_domain ?? '').toString().trim();

    // Empty clears it. Otherwise normalise: strip scheme, path, and any
    // trailing dot, and lowercase — merchants paste "https://Shop.com/" a lot.
    let domain: string | null = null;
    if (raw) {
      const cleaned: string = raw
        .replace(/^https?:\/\//i, '')
        .replace(/\/.*$/, '')
        .replace(/\.$/, '')
        .toLowerCase();

      if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(cleaned)) {
        return res.status(400).json({ error: 'That doesn\'t look like a valid domain. Example: mystore.com' });
      }
      domain = cleaned;
    }

    const { error } = await supabase
      .from('merchants')
      .update({ custom_domain: domain })
      .eq('id', req.merchantId);

    if (error) {
      const code = (error as any).code;
      if (code === '42703' || code === 'PGRST204' || /custom_domain|schema cache/i.test(error.message || '')) {
        return res.status(400).json({ error: 'Custom domains need one setup step (migration 14) before they can be used.' });
      }
      // Unique violation — someone else already claimed it.
      if (code === '23505') {
        return res.status(409).json({ error: 'That domain is already connected to another store.' });
      }
      throw error;
    }

    res.json({ success: true, custom_domain: domain });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Orders ──────────────────────────────────────────────────────────────────

// List this merchant's orders (newest first).
router.get('/orders', async (req: AuthRequest, res) => {
  try {
    res.json(await getOrders(req.merchantId!));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Move an order along its status flow. Scoped to the caller's own orders.
router.patch('/orders/:id', async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'status is required' });

    const updated = await updateOrderStatus(req.merchantId!, String(req.params.id), status);
    if (!updated) return res.status(404).json({ error: 'Order not found' });

    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Real analytics, aggregated from real orders — no invented figures.
router.get('/analytics', async (req: AuthRequest, res) => {
  try {
    res.json(await getAnalytics(req.merchantId!));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Upgrade Plan - Generate a real Razorpay payment link.
// The merchant only becomes active once the Razorpay webhook confirms payment
// (see routes/payment.ts), so no plan is granted without a verified charge.
router.post('/upgrade', async (req: AuthRequest, res) => {
  try {
    const { amount } = req.body;
    if (!amount) return res.status(400).json({ error: 'Amount is required' });

    // We need the merchant's phone number to pass as senderId to Razorpay
    const { data: merchant } = await supabase
      .from('merchants')
      .select('phone_number')
      .eq('id', req.merchantId)
      .single();
    if (!merchant) return res.status(404).json({ error: 'Merchant not found' });
    if (!merchant.phone_number) {
      return res.status(400).json({ error: 'A phone number is required to generate a payment link.' });
    }

    const url = await createPaymentLink(merchant.phone_number, Number(amount));
    res.json({ url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export { router as dashboardRouter };
