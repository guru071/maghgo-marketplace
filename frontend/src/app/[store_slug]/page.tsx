import React from 'react';
import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { StoreClient } from './store-client';
import type { Metadata } from 'next';

export const revalidate = 60; // Fallback ISR revalidation

interface StorePageProps {
  params: Promise<{
    store_slug: string;
  }>;
}

const DEMO_MERCHANT = {
  id: 'demo-123',
  phone_number: '919876543210',
  store_name: 'Villupuram Threads',
  store_slug: 'demo',
  store_description: 'Premium handpicked clothing. Demo store.',
  store_logo_url: null,
  is_active: true,
  subscription_plan: 'premium' as const,
  trial_ends_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
};

const DEMO_PRODUCTS = [
  {
    id: 'prod-1',
    merchant_id: 'demo-123',
    title: 'Red Cotton T-Shirt',
    price: 499,
    currency: 'INR',
    original_image_url: null,
    processed_image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80',
    description: '',
    is_available: true,
    sort_order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 'prod-2',
    merchant_id: 'demo-123',
    title: 'Blue Denim Jacket',
    price: 1299,
    currency: 'INR',
    original_image_url: null,
    processed_image_url: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800&q=80',
    description: '',
    is_available: true,
    sort_order: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: 'prod-3',
    merchant_id: 'demo-123',
    title: 'Classic White Sneakers',
    price: 2499,
    currency: 'INR',
    original_image_url: null,
    processed_image_url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80',
    description: '',
    is_available: true,
    sort_order: 3,
    created_at: new Date().toISOString(),
  }
];

export async function generateMetadata({ params }: StorePageProps): Promise<Metadata> {
  const { store_slug } = await params;
  if (store_slug === 'demo') {
    return { title: 'Demo Store | Powered by Maghgo' };
  }
  
  const supabase = createServerSupabaseClient();
  const { data: merchant } = await supabase
    .from('merchants')
    .select('store_name, store_description, store_logo_url')
    .eq('store_slug', store_slug)
    .single();

  if (!merchant) return { title: 'Store Not Found | Maghgo' };
  
  return {
    title: `${merchant.store_name} | Powered by Maghgo`,
    description: merchant.store_description || `Shop premium products from ${merchant.store_name}.`,
    openGraph: {
      images: merchant.store_logo_url ? [merchant.store_logo_url] : [],
    },
  };
}

export default async function StorePage({ params }: StorePageProps) {
  const { store_slug } = await params;

  if (store_slug === 'demo') {
    return <StoreClient merchant={DEMO_MERCHANT} products={DEMO_PRODUCTS} />;
  }

  const supabase = createServerSupabaseClient();
  
  const { data: merchant, error: merchantError } = await supabase
    .from('merchants')
    .select('*')
    .eq('store_slug', store_slug)
    .single();

  if (merchantError || !merchant || !merchant.is_active) {
    notFound();
  }

  const trialEnds = new Date(merchant.trial_ends_at);
  if (trialEnds < new Date()) {
    notFound();
  }

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('merchant_id', merchant.id)
    .eq('is_available', true)
    .order('sort_order', { ascending: true });

  return <StoreClient merchant={merchant} products={products || []} />;
}
