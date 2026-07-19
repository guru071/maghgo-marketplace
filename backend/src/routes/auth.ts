import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../db/supabase';
import { env } from '../config/env';
import { normalizePhone, isValidPhone } from '../utils/phone';
import { buildStoreSlug } from '../utils/slug';
import rateLimit from 'express-rate-limit';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login/register requests per windowMs
  message: { error: 'Too many authentication attempts from this IP, please try again after 15 minutes' }
});

router.use(authLimiter);

// Register a new merchant directly via website
router.post('/register', async (req, res) => {
  try {
    const { phone_number, store_name, password, store_address, instagram_handle, store_category } = req.body;

    if (!phone_number || !store_name || !password) {
      return res.status(400).json({ error: 'Phone number, store name, and password are required' });
    }

    // Store the canonical form. The user may type "+91 98765 43210" while the
    // WhatsApp webhook sends "919876543210"; lookups are exact matches, so
    // without this the bot would never recognise a web-registered merchant.
    const normalizedPhone = normalizePhone(phone_number);
    if (!isValidPhone(normalizedPhone)) {
      return res.status(400).json({ error: 'Please enter a valid phone number, including country code.' });
    }

    // Check if phone number already exists
    const { data: existingUser } = await supabase
      .from('merchants')
      .select('id')
      .eq('phone_number', normalizedPhone)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'This phone number is already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Storefronts live at the URL root, so the slug must not collide with a
    // static page like /login — that store would be permanently unreachable.
    const store_slug = buildStoreSlug(store_name);
    if (!store_slug) {
      return res.status(400).json({ error: 'Please choose a store name containing letters or numbers.' });
    }

    // Note: We need a unique slug. If it exists, append a random string
    const { data: existingSlug } = await supabase.from('merchants').select('id').eq('store_slug', store_slug).single();
    const final_slug = existingSlug ? `${store_slug}-${Math.floor(Math.random() * 10000)}` : store_slug;

    // Grant the same 30-day trial the WhatsApp registration flow gives, so the
    // public storefront is active immediately (otherwise subscription_ends_at is
    // NULL → parsed as 1970 → store renders as "unavailable").
    const subEndsAt = new Date();
    subEndsAt.setDate(subEndsAt.getDate() + 30);

    const igHandle = typeof instagram_handle === 'string' && instagram_handle.trim()
      ? instagram_handle.trim().replace(/^@/, '').slice(0, 60)
      : null;
    const address = typeof store_address === 'string' && store_address.trim()
      ? store_address.trim().slice(0, 300)
      : null;
    const category = typeof store_category === 'string' && store_category.trim()
      ? store_category.trim().slice(0, 60)
      : null;

    const baseInsert: any = {
      phone_number: normalizedPhone,
      store_name,
      store_slug: final_slug,
      password_hash,
      subscription_plan: 'starter',
      is_active: true,
      subscription_ends_at: subEndsAt.toISOString(),
      instagram_handle: igHandle,
    };

    // store_address / store_category may not exist yet (migrations 15/22). Try
    // with them; if a column is missing, retry without so registration never
    // fails over an optional field.
    let { data: newMerchant, error } = await supabase
      .from('merchants')
      .insert({ ...baseInsert, store_address: address, store_category: category })
      .select()
      .single();

    if (error && /store_address|store_category|schema cache|42703|PGRST204/i.test(error.message || '')) {
      ({ data: newMerchant, error } = await supabase
        .from('merchants')
        .insert(baseInsert)
        .select()
        .single());
    }

    if (error) throw error;

    // Generate JWT
    const token = jwt.sign({ merchantId: newMerchant.id }, env.JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({ token, store_slug: final_slug });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Login via website
router.post('/login', async (req, res) => {
  try {
    const { phone_number, password } = req.body;

    if (!phone_number || !password) {
      return res.status(400).json({ error: 'Phone number and password are required' });
    }

    // Normalise on login too, so "+91 98765 43210" finds the merchant stored
    // as "919876543210".
    const { data: merchant, error } = await supabase
      .from('merchants')
      .select('id, password_hash')
      .eq('phone_number', normalizePhone(phone_number))
      .single();

    if (error || !merchant) {
      return res.status(401).json({ error: 'Invalid phone number or password' });
    }

    if (!merchant.password_hash) {
      return res.status(401).json({ error: 'This account was registered via WhatsApp. Please text LOGIN to the bot to access your dashboard.' });
    }

    const isMatch = await bcrypt.compare(password, merchant.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid phone number or password' });
    }

    // Generate JWT
    const token = jwt.sign({ merchantId: merchant.id }, env.JWT_SECRET, { expiresIn: '24h' });

    res.json({ token });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export { router as authRouter };
