import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { supabase } from '../db/supabase';
import { getProducts, updateProductPrice, deleteAllProducts, deleteProduct, createProduct, setProductFulfillmentById, setProductStockById } from '../services/product.service';
import { updateStoreDescription, toggleStoreStatus, getProductLimit } from '../services/merchant.service';
import { getOrders, updateOrderStatus, getAnalytics } from '../services/order.service';
import { createPaymentLink } from '../services/payment.service';
import { listCoupons, createCoupon, deleteCoupon } from '../services/coupon.service';
import { encryptSecret } from '../utils/crypto';
import { generateApiKey } from '../utils/apikey';

// Normalise buyer-selectable options: [{name, values:[...]}], trimmed & capped.
function sanitizeVariants(raw: any): { name: string; values: string[] }[] | undefined {
  if (raw == null) return undefined;
  let arr = raw;
  if (typeof raw === 'string') {
    try { arr = JSON.parse(raw); } catch { return undefined; }
  }
  if (!Array.isArray(arr)) return undefined;
  return arr
    .filter((v: any) => v && String(v.name).trim() && Array.isArray(v.values))
    .slice(0, 6)
    .map((v: any) => ({
      name: String(v.name).trim().slice(0, 40),
      values: v.values
        .map((x: any) => String(x).trim().slice(0, 40))
        .filter((x: string) => x)
        .slice(0, 20),
    }))
    .filter((v: { values: string[] }) => v.values.length > 0);
}
import { triggerRevalidation } from '../services/revalidate.service';
import { hasAccess } from '../utils/plans';
import multer from 'multer';
import { removeBackground } from '../services/media.service';
import { uploadImage, deleteImagesByUrl } from '../services/storage.service';
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

    // Whether the shop has connected its own Razorpay (never expose the secret),
    // and the non-secret prefix of their API key (never the key itself).
    let razorpay_connected = false;
    let api_key_prefix: string | null = null;
    try {
      const { data: rk } = await supabase
        .from('merchants')
        .select('razorpay_key_id')
        .eq('id', req.merchantId)
        .maybeSingle();
      razorpay_connected = !!rk?.razorpay_key_id;
    } catch { /* pre-migration 17 → not connected */ }
    try {
      const { data: ak } = await supabase
        .from('merchants')
        .select('api_key_prefix')
        .eq('id', req.merchantId)
        .maybeSingle();
      api_key_prefix = ak?.api_key_prefix ?? null;
    } catch { /* pre-migration 19 → no key */ }

    res.json({ ...(data as Record<string, any>), razorpay_connected, api_key_prefix });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Connect / disconnect the shop's own Razorpay account. Order payments settle
// into this account. The secret is write-only from the browser's perspective:
// it is stored and used server-side but never read back.
router.put('/payment-keys', async (req: AuthRequest, res) => {
  try {
    const keyId = (req.body?.razorpay_key_id ?? '').toString().trim();
    const keySecret = (req.body?.razorpay_key_secret ?? '').toString().trim();

    // Both empty → disconnect.
    if (!keyId && !keySecret) {
      const { error } = await supabase
        .from('merchants')
        .update({ razorpay_key_id: null, razorpay_key_secret: null })
        .eq('id', req.merchantId);
      if (error && /razorpay|schema cache|42703|PGRST204/i.test(error.message || '')) {
        return res.status(400).json({ error: 'Payments need one setup step (migration 17) first.' });
      }
      if (error) throw error;
      return res.json({ success: true, razorpay_connected: false });
    }

    if (!/^rzp_(live|test)_[A-Za-z0-9]+$/.test(keyId)) {
      return res.status(400).json({ error: 'Key ID should look like rzp_live_XXXXXXXX (from your Razorpay dashboard).' });
    }
    if (keySecret.length < 10) {
      return res.status(400).json({ error: 'Please paste your Razorpay Key Secret.' });
    }

    const { error } = await supabase
      .from('merchants')
      .update({ razorpay_key_id: keyId, razorpay_key_secret: encryptSecret(keySecret) })
      .eq('id', req.merchantId);

    if (error) {
      if (/razorpay|schema cache|42703|PGRST204/i.test(error.message || '')) {
        return res.status(400).json({ error: 'Payments need one setup step (migration 17) first.' });
      }
      throw error;
    }
    res.json({ success: true, razorpay_connected: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Generate (or regenerate) the shop's API key. The full key is returned exactly
// once here and never stored — only its hash + a display prefix are kept.
router.post('/api-key', async (req: AuthRequest, res) => {
  try {
    const { key, hash, displayPrefix } = generateApiKey();
    const { error } = await supabase
      .from('merchants')
      .update({ api_key_hash: hash, api_key_prefix: displayPrefix, api_key_created_at: new Date().toISOString() })
      .eq('id', req.merchantId);

    if (error) {
      if (/api_key|schema cache|42703|PGRST204/i.test(error.message || '')) {
        return res.status(400).json({ error: 'The API needs one setup step (migration 19) first.' });
      }
      throw error;
    }
    // Show the secret ONCE. Regenerating invalidates any previous key.
    res.json({ api_key: key, api_key_prefix: displayPrefix });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Revoke the shop's API key.
router.delete('/api-key', async (req: AuthRequest, res) => {
  try {
    const { error } = await supabase
      .from('merchants')
      .update({ api_key_hash: null, api_key_prefix: null, api_key_created_at: null })
      .eq('id', req.merchantId);
    if (error && !/api_key|schema cache|42703|PGRST204/i.test(error.message || '')) throw error;
    res.json({ success: true });
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
    const { title, price, description, category } = req.body;
    if (!title || !price) return res.status(400).json({ error: 'Title and price are required' });

    // specifications arrives as a JSON string from the multipart form.
    let specifications: { label: string; value: string }[] | undefined;
    if (req.body.specifications) {
      try {
        const parsed = JSON.parse(req.body.specifications);
        if (Array.isArray(parsed)) {
          specifications = parsed
            .filter((s: any) => s && String(s.label).trim() && String(s.value).trim())
            .slice(0, 30)
            .map((s: any) => ({ label: String(s.label).trim().slice(0, 60), value: String(s.value).trim().slice(0, 200) }));
        }
      } catch { /* ignore malformed specs */ }
    }

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

    const product = await createProduct(merchantId, title, Number(price), originalUrl, processedUrl, {
      description: description !== undefined ? String(description).slice(0, 2000) : undefined,
      category: category ? String(category).trim().slice(0, 60) : undefined,
      specifications,
      variants: sanitizeVariants(req.body.variants),
    });

    if (merchant) {
      await triggerRevalidation(merchant.store_slug);
    }

    res.json(product);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Product (title / price / stock). Stock is optional and degrades
// gracefully if migration 16 hasn't added the column yet.
router.put('/products/:id', async (req: AuthRequest, res) => {
  try {
    const { title, price, stock, description, category, specifications } = req.body;

    const updates: Record<string, any> = {};
    if (title !== undefined) updates.title = title;
    if (price !== undefined) updates.price = price;
    if (description !== undefined) updates.description = String(description).slice(0, 2000);
    if (category !== undefined) updates.category = category ? String(category).trim().slice(0, 60) : null;
    if (specifications !== undefined && Array.isArray(specifications)) {
      updates.specifications = specifications
        .filter((s: any) => s && String(s.label).trim() && String(s.value).trim())
        .slice(0, 30)
        .map((s: any) => ({ label: String(s.label).trim().slice(0, 60), value: String(s.value).trim().slice(0, 200) }));
    }
    if (req.body.variants !== undefined) {
      const v = sanitizeVariants(req.body.variants);
      if (v !== undefined) updates.variants = v;
    }
    if (stock !== undefined) {
      // '' / null / 'off' clears tracking; a number sets the count.
      updates.stock =
        stock === '' || stock === null || String(stock).toLowerCase() === 'off'
          ? null
          : Math.max(0, Math.floor(Number(stock)));
    }

    let { error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', req.params.id)
      .eq('merchant_id', req.merchantId);

    // Retry without columns migration 16/17/18 may not have added yet.
    if (error && /stock|category|specifications|variants|schema cache|42703|PGRST204/i.test(error.message || '')) {
      const { stock: _s, category: _c, specifications: _sp, variants: _v, ...base } = updates;
      ({ error } = await supabase
        .from('products')
        .update(base)
        .eq('id', req.params.id)
        .eq('merchant_id', req.merchantId));
    }
    if (error) throw error;

    const { data: merchant } = await supabase.from('merchants').select('store_slug').eq('id', req.merchantId).single();
    if (merchant) await triggerRevalidation(merchant.store_slug);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Product — permanently removes the row and its images.
router.delete('/products/:id', async (req: AuthRequest, res) => {
  try {
    // Fetch images first so we can clean storage after the row is gone.
    const { data: product } = await supabase
      .from('products')
      .select('original_image_url, processed_image_url')
      .eq('id', req.params.id)
      .eq('merchant_id', req.merchantId)
      .maybeSingle();

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', req.params.id)
      .eq('merchant_id', req.merchantId);

    if (error) throw error;

    if (product) {
      await deleteImagesByUrl([product.original_image_url, product.processed_image_url]).catch(() => {});
    }

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

// ─── Coupons ─────────────────────────────────────────────────────────────────

// List this merchant's discount codes.
router.get('/coupons', async (req: AuthRequest, res) => {
  try {
    res.json(await listCoupons(req.merchantId!));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create a discount code.
router.post('/coupons', async (req: AuthRequest, res) => {
  try {
    const { code, discount_type, discount_value, max_uses, min_order, expires_at } = req.body ?? {};
    const coupon = await createCoupon(req.merchantId!, {
      code,
      discount_type,
      discount_value: Number(discount_value),
      max_uses: max_uses === '' || max_uses == null ? null : Math.max(1, Math.floor(Number(max_uses))),
      min_order: min_order == null || min_order === '' ? 0 : Math.max(0, Number(min_order)),
      expires_at: expires_at || null,
    });
    res.status(201).json(coupon);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a discount code.
router.delete('/coupons/:id', async (req: AuthRequest, res) => {
  try {
    const ok = await deleteCoupon(req.merchantId!, String(req.params.id));
    if (!ok) return res.status(404).json({ error: 'Coupon not found' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export { router as dashboardRouter };
