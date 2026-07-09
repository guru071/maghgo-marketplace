import axios from 'axios';
import FormData from 'form-data';
import { env } from '../config/env';

// ─── Background Removal Service (remove.bg) ──────────────────────────────────

/**
 * Remove the background from an image using the remove.bg API.
 *
 * @param imageBuffer - Raw image bytes (JPEG / PNG / WebP).
 * @returns PNG buffer with transparent background.
 */
export async function removeBackground(imageBuffer: Buffer): Promise<Buffer> {
  const form = new FormData();
  form.append('image_file', imageBuffer, {
    filename: 'image.png',
    contentType: 'image/png',
  });
  form.append('size', 'auto');

  const response = await axios.post(
    'https://api.remove.bg/v1.0/removebg',
    form,
    {
      headers: {
        ...form.getHeaders(),
        'X-Api-Key': env.REMOVEBG_API_KEY,
      },
      responseType: 'arraybuffer',
    }
  );

  return Buffer.from(response.data);
}
