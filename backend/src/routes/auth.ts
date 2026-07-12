import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../db/supabase';
import { env } from '../config/env';

const router = Router();

// Register a new merchant directly via website
router.post('/register', async (req, res) => {
  try {
    const { phone_number, store_name, password } = req.body;

    if (!phone_number || !store_name || !password) {
      return res.status(400).json({ error: 'Phone number, store name, and password are required' });
    }

    // Check if phone number already exists
    const { data: existingUser } = await supabase
      .from('merchants')
      .select('id')
      .eq('phone_number', phone_number)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'This phone number is already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Generate slug from store name
    const store_slug = store_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Note: We need a unique slug. If it exists, append a random string
    const { data: existingSlug } = await supabase.from('merchants').select('id').eq('store_slug', store_slug).single();
    const final_slug = existingSlug ? `${store_slug}-${Math.floor(Math.random() * 10000)}` : store_slug;

    const { data: newMerchant, error } = await supabase
      .from('merchants')
      .insert({
        phone_number,
        store_name,
        store_slug: final_slug,
        password_hash
      })
      .select()
      .single();

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

    const { data: merchant, error } = await supabase
      .from('merchants')
      .select('id, password_hash')
      .eq('phone_number', phone_number)
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
