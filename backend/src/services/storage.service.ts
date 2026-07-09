import { supabase } from '../db/supabase';

// ─── Supabase Storage Service ────────────────────────────────────────────────

const BUCKET = 'product-images';

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
