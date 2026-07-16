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
  trial_ends_at: '2030-01-01T00:00:00.000Z',
  created_at: '2026-01-01T00:00:00.000Z',
  instagram_handle: 'goatech.tech',
  facebook_url: 'goatech',
  x_handle: 'goatechHQ',
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
    created_at: '2026-01-01T00:00:00.000Z',
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
    created_at: '2026-01-01T00:00:00.000Z',
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
    created_at: '2026-01-01T00:00:00.000Z',
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

  const trialEnds = new Date(merchant.subscription_ends_at);
  if (trialEnds < new Date()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Store Unavailable</h2>
          <p className="text-gray-600 mb-6">
            This store is currently inactive. If you are the owner, please check your WhatsApp for reactivation instructions.
          </p>
          <a href="/" className="inline-block bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors">
            Powered by Maghgo
          </a>
        </div>
      </div>
    );
  }

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('*')
    .eq('merchant_id', merchant.id)
    .eq('is_available', true)
    .order('sort_order', { ascending: true });

  // Do NOT swallow a transient query error here. If we returned an empty list,
  // ISR would cache this empty storefront as the new static page and keep
  // serving "no products yet" for hours until the next regeneration. Throwing
  // makes Next.js keep serving the last good page instead.
  if (productsError) {
    throw new Error(`Failed to load products for "${store_slug}": ${productsError.message}`);
  }

  return <StoreClient merchant={merchant} products={products || []} />;
}
