import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { supabase } from '../db/supabase';
import { getProducts, updateProductPrice, deleteAllProducts, deleteProduct, createProduct } from '../services/product.service';
import { updateStoreDescription, toggleStoreStatus, getProductLimit } from '../services/merchant.service';
import { createPaymentLink } from '../services/payment.service';
import { triggerRevalidation } from '../services/revalidate.service';
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
  'facebook_url', 'x_handle', 'instagram_id', 'messenger_id', 'link_code',
].join(', ');

// Apply auth middleware to all routes
router.use(requireAuth);

// Get Store Details
router.get('/store', async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabase
      .from('merchants')
      .select(MERCHANT_PUBLIC_COLUMNS)
      .eq('id', req.merchantId)
      .single();

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
