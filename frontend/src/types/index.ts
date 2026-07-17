export interface Merchant {
  id: string;
  phone_number: string;
  store_name: string;
  store_slug: string;
  store_description: string;
  store_logo_url: string | null;
  is_active: boolean;
  subscription_plan: 'inactive' | 'trial' | 'basic' | 'starter' | 'pro' | 'advanced' | 'premium' | 'business' | 'agency' | 'vip' | 'enterprise' | 'custom';
  theme_config?: any;
  // The database column is subscription_ends_at; there is no trial_ends_at.
  // The old `trial_ends_at` field was a type-only fiction masked by select('*').
  subscription_ends_at: string;
  created_at: string;
  theme_id?: string;
  instagram_handle?: string;
  facebook_url?: string;
  x_handle?: string;
}

export interface Product {
  id: string;
  merchant_id: string;
  title: string;
  price: number;
  currency: string;
  original_image_url: string | null;
  processed_image_url: string | null;
  description: string;
  is_available: boolean;
  sort_order: number;
  created_at: string;
  // 'buy' = shop delivers; 'prebook' = customer reserves and collects at the
  // shop. Optional so the type is valid before migration 13 adds the column.
  fulfillment_type?: 'buy' | 'prebook';
}

export interface CartItem {
  id: string;
  title: string;
  price: number;
  currency: string;
  image_url: string | null;
  quantity: number;
  fulfillment_type?: 'buy' | 'prebook';
}
