export interface Merchant {
  id: string;
  phone_number: string;
  store_name: string;
  store_slug: string;
  store_description: string;
  store_logo_url: string | null;
  is_active: boolean;
  subscription_plan: 'trial' | 'basic' | 'starter' | 'pro' | 'advanced' | 'premium' | 'business' | 'agency' | 'vip' | 'enterprise' | 'custom';
  theme_config?: any;
  trial_ends_at: string;
  created_at: string;
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
}

export interface CartItem {
  id: string;
  title: string;
  price: number;
  currency: string;
  image_url: string | null;
  quantity: number;
}
