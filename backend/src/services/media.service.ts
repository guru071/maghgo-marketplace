import axios from 'axios';
import FormData from 'form-data';
import { env } from '../config/env';

// ─── Background Removal Service ──────────────────────────────────────────────
// Providers, chosen by BG_REMOVAL_PROVIDER:
//
//   'removebg' (default) — the remove.bg API. Best quality, costs credits
//                          (50 free/month, then ~$0.20/image).
//   'local'              — on-server AI (@imgly/background-removal-node).
//                          Free and unlimited, but the model needs ~2GB RAM:
//                          fine on a Standard instance, it will OOM a 512MB
//                          Starter. Requires: npm i @imgly/background-removal-node
//                          If the package isn't installed, we log once and fall
//                          back to remove.bg so nothing breaks.
//
// Callers already treat any throw as "use the original photo", so a failure in
// either provider degrades gracefully to no background removal.

let localUnavailableLogged = false;

async function removeBackgroundLocal(imageBuffer: Buffer): Promise<Buffer> {
  // Dynamic require: the package is optional and heavy, so it must not be a
  // hard dependency of the build.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const imgly: any = require('@imgly/background-removal-node');
  const blob = await imgly.removeBackground(new Blob([new Uint8Array(imageBuffer)]));
  return Buffer.from(await blob.arrayBuffer());
}

async function removeBackgroundApi(imageBuffer: Buffer): Promise<Buffer> {
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
      // Bound the wait: remove.bg occasionally stalls, and without a timeout the
      // whole "add product" reply hangs on it. On timeout the caller catches the
      // error and falls back to the original image, so the merchant still gets a
      // fast reply instead of silence.
      timeout: 20000,
    }
  );

  return Buffer.from(response.data);
}

/**
 * Remove the background from an image using the configured provider.
 *
 * @param imageBuffer - Raw image bytes (JPEG / PNG / WebP).
 * @returns PNG buffer with transparent background.
 */
export async function removeBackground(imageBuffer: Buffer): Promise<Buffer> {
  if (env.BG_REMOVAL_PROVIDER === 'local') {
    try {
      return await removeBackgroundLocal(imageBuffer);
    } catch (err: any) {
      if (!localUnavailableLogged) {
        localUnavailableLogged = true;
        console.warn(
          '⚠️ Local background removal unavailable (' + (err?.code === 'MODULE_NOT_FOUND'
            ? 'run: npm i @imgly/background-removal-node — and give the server ~2GB RAM'
            : (err?.message || err)) + '). Falling back to remove.bg.'
        );
      }
      // fall through to the API
    }
  }
  return removeBackgroundApi(imageBuffer);
}
