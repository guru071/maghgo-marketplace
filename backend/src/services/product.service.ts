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

export type FulfillmentType = 'buy' | 'prebook';

/**
 * Set a product's fulfilment mode ('buy' delivers, 'prebook' reserves).
 * Matches by title, case-insensitive, like the price/delete commands.
 *
 * If the fulfillment_type column hasn't been added yet (migration 13), Postgres
 * returns 42703. We surface that as a friendly, actionable message rather than a
 * raw error, and it never touches the rest of the product flow.
 */
export async function setProductFulfillment(
  merchantId: string,
  title: string,
  type: FulfillmentType
): Promise<number> {
  const escapedTitle = title.replace(/[%_\\]/g, '\\$&');

  const { data, error } = await supabase
    .from('products')
    .update({ fulfillment_type: type })
    .eq('merchant_id', merchantId)
    .ilike('title', `%${escapedTitle}%`)
    .eq('is_available', true)
    .select();

  if (error) {
    // The column may not exist yet (migration 13 not run). PostgREST reports
    // this as PGRST204 with a "could not find the column ... in the schema
    // cache" message; raw Postgres would be 42703. Catch both and explain.
    const code = (error as any).code;
    const missingColumn =
      code === '42703' ||
      code === 'PGRST204' ||
      /fulfillment_type.*column|column.*fulfillment_type|schema cache/i.test(error.message || '');
    if (missingColumn) {
      throw new Error('Pre-book is almost ready — the store owner just needs to run one quick setup step (migration 13). Try again after that.');
    }
    throw new Error(`Failed to update fulfilment: ${error.message}`);
  }

  return data?.length ?? 0;
}

/**
 * Set a product's fulfilment mode by id (dashboard). Scoped to the merchant.
 * Same graceful handling as setProductFulfillment for the pre-migration case.
 */
export async function setProductFulfillmentById(
  merchantId: string,
  productId: string,
  type: FulfillmentType
): Promise<boolean> {
  const { data, error } = await supabase
    .from('products')
    .update({ fulfillment_type: type })
    .eq('id', productId)
    .eq('merchant_id', merchantId)
    .select('id');

  if (error) {
    const code = (error as any).code;
    if (code === '42703' || code === 'PGRST204' || /fulfillment_type|schema cache/i.test(error.message || '')) {
      throw new Error('Pre-book needs one setup step (migration 13) before it can be used.');
    }
    throw new Error(`Failed to update fulfilment: ${error.message}`);
  }
  return (data?.length ?? 0) > 0;
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

