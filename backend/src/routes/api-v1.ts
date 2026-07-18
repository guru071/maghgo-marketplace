import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireApiKey, ApiRequest } from '../middleware/apiAuth';
import { supabase } from '../db/supabase';
import { getProducts, getProductCount, createProduct, setProductStockById } from '../services/product.service';
import { getProductLimit } from '../services/merchant.service';
import { getOrders } from '../services/order.service';
import { triggerRevalidation } from '../services/revalidate.service';
import { deleteImagesByUrl } from '../services/storage.service';

// ─── Public Merchant API (v1) ────────────────────────────────────────────────
// Authenticated by the shop's API key. Lets an external website / system sync
// products and read orders. Everything is scoped to the key's own merchant.
//
// Base URL: /api/v1   Auth: Authorization: Bearer mgk_live_…  (or X-API-Key)

const router = Router();

// Generous but bounded — this is machine-to-machine.
router.use(rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false }));
router.use(requireApiKey);

const sanitizeSpecs = (raw: any) =>
  Array.isArray(raw)
    ? raw.filter((s: any) => s && String(s.label).trim() && String(s.value).trim())
        .slice(0, 30)
        .map((s: any) => ({ label: String(s.label).trim().slice(0, 60), value: String(s.value).trim().slice(0, 200) }))
    : undefined;

const sanitizeVariants = (raw: any) =>
  Array.isArray(raw)
    ? raw.filter((v: any) => v && String(v.name).trim() && Array.isArray(v.values))
        .slice(0, 6)
        .map((v: any) => ({
          name: String(v.name).trim().slice(0, 40),
          values: v.values.map((x: any) => String(x).trim().slice(0, 40)).filter(Boolean).slice(0, 20),
        }))
        .filter((v: { values: string[] }) => v.values.length > 0)
    : undefined;

async function revalidate(merchantId: string) {
  const { data } = await supabase.from('merchants').select('store_slug').eq('id', merchantId).maybeSingle();
  if (data?.store_slug) await triggerRevalidation(data.store_slug).catch(() => {});
}

// Shape a product for the public API (stable, documented fields only).
const publicProduct = (p: any) => ({
  id: p.id,
  title: p.title,
  price: Number(p.price),
  currency: p.currency ?? 'INR',
  description: p.description ?? '',
  category: p.category ?? null,
  image_url: p.processed_image_url || p.original_image_url || null,
  stock: p.stock ?? null,
  fulfillment_type: p.fulfillment_type ?? 'buy',
  specifications: p.specifications ?? [],
  variants: p.variants ?? [],
  available: p.is_available !== false,
  created_at: p.created_at,
});

// ─── Store ───────────────────────────────────────────────────────────────────
router.get('/store', async (req: ApiRequest, res) => {
  try {
    const { data, error } = await supabase
      .from('merchants')
      .select('store_name, store_slug, store_description, subscription_plan, is_active')
      .eq('id', req.merchantId)
      .single();
    if (error) throw error;
    res.json({ ...data, storefront_url: `${process.env.FRONTEND_URL || ''}/${data.store_slug}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Products ---
router.get('/products', async (req: ApiRequest, res) => {
  try {
    const products = await getProducts(req.merchantId!);
    res.json({ data: products.map(publicProduct), count: products.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/products', async (req: ApiRequest, res) => {
  try {
    const { title, price, image_url, description, category, stock, specifications, variants } = req.body ?? {};
    if (!title || price == null) return res.status(400).json({ error: 'title and price are required.' });
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum < 0) return res.status(400).json({ error: 'price must be a non-negative number.' });

    // Respect the plan's product limit, same as every other create path.
    const [count, limit] = await Promise.all([getProductCount(req.merchantId!), (async () => {
      const { data } = await supabase.from('merchants').select('subscription_plan').eq('id', req.merchantId).single();
      return getProductLimit(data?.subscription_plan ?? 'basic');
    })()]);
    if (count >= limit) return res.status(402).json({ error: `Plan limit reached (${limit} products).` });

    const img = image_url ? String(image_url).slice(0, 1000) : '';
    const product = await createProduct(req.merchantId!, String(title).slice(0, 200), Math.round(priceNum), img, img, {
      description: description !== undefined ? String(description).slice(0, 2000) : undefined,
      category: category ? String(category).trim().slice(0, 60) : undefined,
      specifications: sanitizeSpecs(specifications),
      variants: sanitizeVariants(variants),
    });

    if (stock !== undefined && stock !== null && String(stock) !== '') {
      await setProductStockById(req.merchantId!, product.id, Math.max(0, Math.floor(Number(stock)))).catch(() => {});
    }

    await revalidate(req.merchantId!);
    res.status(201).json(publicProduct({ ...product, stock: stock ?? null }));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/products/:id', async (req: ApiRequest, res) => {
  try {
    const b = req.body ?? {};
    const updates: Record<string, any> = {};
    if (b.title !== undefined) updates.title = String(b.title).slice(0, 200);
    if (b.price !== undefined) updates.price = Math.max(0, Math.round(Number(b.price)));
    if (b.description !== undefined) updates.description = String(b.description).slice(0, 2000);
    if (b.category !== undefined) updates.category = b.category ? String(b.category).trim().slice(0, 60) : null;
    if (b.image_url !== undefined) { updates.processed_image_url = String(b.image_url); updates.original_image_url = String(b.image_url); }
    if (b.available !== undefined) updates.is_available = Boolean(b.available);
    if (b.stock !== undefined) updates.stock = b.stock === null || b.stock === '' ? null : Math.max(0, Math.floor(Number(b.stock)));
    if (b.specifications !== undefined) updates.specifications = sanitizeSpecs(b.specifications) ?? [];
    if (b.variants !== undefined) updates.variants = sanitizeVariants(b.variants) ?? [];
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No updatable fields provided.' });

    let { error } = await supabase.from('products').update(updates).eq('id', req.params.id).eq('merchant_id', req.merchantId);
    // Retry without columns migration 16/17/18 may not have added.
    if (error && /stock|category|specifications|variants|schema cache|42703|PGRST204/i.test(error.message || '')) {
      const { stock, category, specifications, variants, ...base } = updates;
      ({ error } = await supabase.from('products').update(base).eq('id', req.params.id).eq('merchant_id', req.merchantId));
    }
    if (error) throw error;

    await revalidate(req.merchantId!);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/products/:id', async (req: ApiRequest, res) => {
  try {
    const { data: product } = await supabase
      .from('products')
      .select('original_image_url, processed_image_url')
      .eq('id', req.params.id)
      .eq('merchant_id', req.merchantId)
      .maybeSingle();

    const { error } = await supabase.from('products').delete().eq('id', req.params.id).eq('merchant_id', req.merchantId);
    if (error) throw error;
    if (product) await deleteImagesByUrl([product.original_image_url, product.processed_image_url]).catch(() => {});
    await revalidate(req.merchantId!);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Orders (read-only) ──────────────────────────────────────────────────────
router.get('/orders', async (req: ApiRequest, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 200);
    const orders = await getOrders(req.merchantId!, limit);
    res.json({ data: orders, count: orders.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export { router as apiV1Router };
