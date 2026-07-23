import { supabase } from '../db/supabase';

// ─── Supabase Storage Service ────────────────────────────────────────────────

const BUCKET = 'product-images';

/**
 * Delete images from storage given their public URLs. Called when a product is
 * hard-deleted so its files don't orphan in the bucket. Best-effort: a failure
 * here must never block the product delete itself.
 */
export async function deleteImagesByUrl(urls: (string | null | undefined)[]): Promise<void> {
  const marker = `/object/public/${BUCKET}/`;
  const paths = urls
    .filter((u): u is string => Boolean(u))
    .map((u) => {
      const i = u.indexOf(marker);
      return i >= 0 ? decodeURIComponent(u.slice(i + marker.length)) : null;
    })
    .filter((p): p is string => Boolean(p));

  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  if (error) console.warn('⚠️ Could not remove product images from storage:', error.message);
}

/**
 * Remove every file under a merchant's product-images folder — used by Clear
 * Catalog and on merchant deletion (product images + logo + QR all live here).
 *
 * Pages through the listing: `.list()` caps at 1000 entries, so a merchant with
 * more than 1000 images would otherwise keep everything past the first page.
 */
export async function deleteMerchantImageFolder(merchantId: string): Promise<void> {
  const PAGE = 1000;
  for (let offset = 0; ; offset += PAGE) {
    const { data: files, error: listErr } = await supabase.storage
      .from(BUCKET)
      .list(merchantId, { limit: PAGE, offset });
    if (listErr) {
      console.warn('⚠️ Could not list merchant image folder:', listErr.message);
      return;
    }
    if (!files || files.length === 0) return;
    const paths = files.map((f) => `${merchantId}/${f.name}`);
    const { error } = await supabase.storage.from(BUCKET).remove(paths);
    if (error) console.warn('⚠️ Could not clear merchant image folder:', error.message);
    if (files.length < PAGE) return; // last page
  }
}

/**
 * Upload an image buffer to Supabase Storage.
 *
 * @param merchantId - Merchant UUID, used as a folder prefix.
 * @param productId  - Product UUID, used as the filename stem.
 * @param imageBuffer - Raw image bytes.
 * @param mimeType    - MIME type for the content-type header.
 * @param suffix      - Optional suffix to differentiate original vs processed.
 * @returns The public URL of the uploaded image.
 */
export async function uploadImage(
  merchantId: string,
  productId: string,
  imageBuffer: Buffer,
  mimeType: string,
  suffix: string = ''
): Promise<string> {
  const ext = mimeType.includes('png') ? 'png' : 'jpg';
  const filePath = `${merchantId}/${productId}${suffix}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, imageBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

  return data.publicUrl;
}
