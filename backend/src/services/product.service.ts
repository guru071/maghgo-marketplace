import { supabase } from '../db/supabase';
import { Product } from '../types/whatsapp';

// ─── Product CRUD Service ────────────────────────────────────────────────────

/**
 * Create a new product record in the database.
 */
export async function createProduct(
  merchantId: string,
  title: string,
  price: number,
  originalUrl: string,
  processedUrl: string
): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert({
      merchant_id: merchantId,
      title,
      price,
      original_image_url: originalUrl,
      processed_image_url: processedUrl,
      is_available: true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create product: ${error.message}`);
  }

  return data as Product;
}

/**
 * Retrieve all available products for a merchant.
 */
export async function getProducts(merchantId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('merchant_id', merchantId)
    .eq('is_available', true)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`);
  }

  return (data ?? []) as Product[];
}

/**
 * Soft-delete a product by setting is_available to false.
 * Uses ILIKE for case-insensitive title matching.
 *
 * @returns The number of rows updated.
 */
export async function deleteProduct(
  merchantId: string,
  title: string
): Promise<number> {
  // Escape ILIKE wildcards to prevent injection
  const escapedTitle = title.replace(/[%_\\]/g, '\\$&');

  const { data, error } = await supabase
    .from('products')
    .update({ is_available: false })
    .eq('merchant_id', merchantId)
    .ilike('title', `%${escapedTitle}%`)
    .eq('is_available', true)
    .select();

  if (error) {
    throw new Error(`Failed to delete product: ${error.message}`);
  }

  return data?.length ?? 0;
}

/**
 * Count available products for a merchant.
 */
export async function getProductCount(merchantId: string): Promise<number> {
  const { count, error } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('merchant_id', merchantId)
    .eq('is_available', true);

  if (error) {
    throw new Error(`Failed to count products: ${error.message}`);
  }

  return count ?? 0;
}

/**
 * Update the price of an existing product by title.
 */
export async function updateProductPrice(
  merchantId: string,
  title: string,
  newPrice: number
): Promise<number> {
  const escapedTitle = title.replace(/[%_\\]/g, '\\$&');

  const { data, error } = await supabase
    .from('products')
    .update({ price: newPrice })
    .eq('merchant_id', merchantId)
    .ilike('title', `%${escapedTitle}%`)
    .eq('is_available', true)
    .select();

  if (error) {
    throw new Error(`Failed to update product price: ${error.message}`);
  }

  return data?.length ?? 0;
}

/**
 * Soft-delete all products for a merchant (Clear Catalog)
 */
export async function deleteAllProducts(merchantId: string): Promise<number> {
  const { data, error } = await supabase
    .from('products')
    .update({ is_available: false })
    .eq('merchant_id', merchantId)
    .eq('is_available', true)
    .select();

  if (error) {
    throw new Error(`Failed to clear catalog: ${error.message}`);
  }

  return data?.length ?? 0;
}

