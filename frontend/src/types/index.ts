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
  store_address?: string;
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
  // null/undefined = stock not tracked (sell freely); 0 = out of stock.
  // Optional so the type is valid before migration 16 adds the column.
  stock?: number | null;
  // Product details (migration 17). Optional for pre-migration compatibility.
  category?: string | null;
  specifications?: ProductSpec[];
  // Buyer-selectable options, e.g. Size / Colour (migration 18).
  variants?: ProductVariant[];
}

export interface ProductSpec {
  label: string;
  value: string;
}

export interface ProductVariant {
  name: string;      // e.g. "Size"
  values: string[];  // e.g. ["S", "M", "L"]
}

export interface CartItem {
  // Unique per cart line. For a product with a chosen variant this is
  // `${productId}::${variant}` so the same product in two sizes is two lines.
  id: string;
  // The real product id (for ordering); falls back to `id` when no variant.
  productId?: string;
  title: string;
  price: number;
  currency: string;
  image_url: string | null;
  quantity: number;
  fulfillment_type?: 'buy' | 'prebook';
  // Human-readable selected options, e.g. "Size: M · Colour: Red".
  variant?: string;
}
