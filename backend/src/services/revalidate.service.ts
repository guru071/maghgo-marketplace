import axios from 'axios';
import { env } from '../config/env';

// ─── ISR Revalidation Service ────────────────────────────────────────────────

/**
 * Trigger Next.js On-Demand Incremental Static Regeneration for a store page.
 *
 * Calls the frontend's `/api/revalidate` endpoint with the revalidation secret
 * and the path to revalidate.
 *
 * @param storeSlug - The merchant's store slug (e.g. "saree-palace").
 */
export async function triggerRevalidation(storeSlug: string): Promise<void> {
  try {
    await axios.post(
      `${env.FRONTEND_URL}/api/revalidate`,
      { path: `/${storeSlug}` },
      {
        headers: {
          'x-revalidation-secret': env.REVALIDATION_SECRET,
          'Content-Type': 'application/json',
        },
        timeout: 10_000,
      }
    );
    console.log(`✅ Revalidation triggered for /${storeSlug}`);
  } catch (err) {
    // Revalidation is best-effort — log but don't throw
    console.warn(`⚠️ Revalidation failed for /store/${storeSlug}:`, err instanceof Error ? err.message : err);
  }
}
