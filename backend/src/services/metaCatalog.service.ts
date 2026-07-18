import axios from 'axios';
import { supabase } from '../db/supabase';
import { createProduct, getProducts, getProductCount } from './product.service';
import { getProductLimit } from './merchant.service';
import { triggerRevalidation } from './revalidate.service';
import { encryptSecret, decryptSecret } from '../utils/crypto';

// ─── Meta (Facebook/Instagram) catalogue import ──────────────────────────────
// A shop connects its OWN commerce catalogue (a Catalog ID + an access token
// that can read it, from Meta Business settings) and imports those products into
// Maghgo, where they then appear on the storefront and in the bot.
//
// Reading your own catalogue with your own token needs no Meta App Review.
// The token is encrypted at rest and never leaves the backend.

const GRAPH = 'https://graph.facebook.com/v21.0';
const CATALOG_MISSING = 'Meta Catalog needs one setup step (migration 20) first.';

function isMissingColumn(error: any): boolean {
  return /meta_catalog|schema cache|42703|PGRST204/i.test(error?.message || '');
}

/** Meta prices arrive as strings like "499.00 INR" / "₹1,299". Pull the number. */
export function parseMetaPrice(raw: unknown): number {
  if (raw == null) return 0;
  const m = String(raw).replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  return m ? Math.round(parseFloat(m[1])) : 0;
}

interface CatalogPage {
  data: any[];
  paging?: { cursors?: { after?: string }; next?: string };
}

async function fetchCatalogPage(catalogId: string, token: string, limit: number, after?: string): Promise<CatalogPage> {
  try {
    const res = await axios.get(`${GRAPH}/${encodeURIComponent(catalogId)}/products`, {
      params: {
        fields: 'name,description,price,image_url,availability,retailer_id',
        limit,
        ...(after ? { after } : {}),
        access_token: token,
      },
      timeout: 20000,
    });
    return res.data as CatalogPage;
  } catch (err: any) {
    const metaMsg = err?.response?.data?.error?.message;
    if (metaMsg) throw new Error(`Meta: ${metaMsg}`);
    throw new Error('Could not reach Meta. Check the Catalog ID and token, then try again.');
  }
}

/** Save (and validate) a shop's Meta catalogue connection. Token stored encrypted. */
export async function connectMetaCatalog(merchantId: string, catalogId: string, token: string): Promise<void> {
  const id = (catalogId || '').trim();
  const tok = (token || '').trim();
  if (!/^\d{5,}$/.test(id)) throw new Error('That doesn\'t look like a Catalog ID (it should be a long number).');
  if (tok.length < 20) throw new Error('Please paste a valid Meta access token.');

  // Prove the pair works before saving, so a bad token fails fast with Meta's
  // own message rather than silently on the next import.
  await fetchCatalogPage(id, tok, 1);

  const { error } = await supabase
    .from('merchants')
    .update({ meta_catalog_id: id, meta_catalog_token: encryptSecret(tok) })
    .eq('id', merchantId);
  if (error) throw new Error(isMissingColumn(error) ? CATALOG_MISSING : error.message);
}

export async function disconnectMetaCatalog(merchantId: string): Promise<void> {
  const { error } = await supabase
    .from('merchants')
    .update({ meta_catalog_id: null, meta_catalog_token: null, meta_catalog_last_sync: null })
    .eq('id', merchantId);
  if (error && !isMissingColumn(error)) throw new Error(error.message);
}

export interface ImportResult {
  imported: number;
  skipped: number;
  total: number;
  limitReached: boolean;
}

/**
 * Import the connected catalogue's products into Maghgo. Dedupes by title
 * (case-insensitive) so re-running only adds what's new, and respects the plan's
 * product limit. Pages through the catalogue (capped) so large catalogues are
 * bounded.
 */
export async function importMetaCatalog(merchantId: string): Promise<ImportResult> {
  const { data: m, error: mErr } = await supabase
    .from('merchants')
    .select('meta_catalog_id, meta_catalog_token, subscription_plan, store_slug')
    .eq('id', merchantId)
    .single();
  if (mErr) throw new Error(isMissingColumn(mErr) ? CATALOG_MISSING : mErr.message);
  if (!m?.meta_catalog_id || !m?.meta_catalog_token) throw new Error('Connect your Meta catalog first.');

  const token = decryptSecret(m.meta_catalog_token);
  if (!token) throw new Error('Your saved Meta token could not be read. Please reconnect.');

  const limit = await getProductLimit(m.subscription_plan);
  let count = await getProductCount(merchantId);
  const existing = new Set((await getProducts(merchantId)).map((p) => p.title.trim().toLowerCase()));

  let imported = 0, skipped = 0, total = 0, limitReached = false;
  let after: string | undefined;
  let pages = 0;

  do {
    const page = await fetchCatalogPage(m.meta_catalog_id, token, 100, after);
    for (const it of page.data ?? []) {
      total++;
      const title = String(it?.name || '').trim();
      if (!title) { skipped++; continue; }
      if (existing.has(title.toLowerCase())) { skipped++; continue; }
      if (count >= limit) { skipped++; limitReached = true; continue; }

      const price = parseMetaPrice(it.price);
      const img = it.image_url ? String(it.image_url).slice(0, 1000) : '';
      try {
        await createProduct(merchantId, title.slice(0, 200), price, img, img, {
          description: it.description ? String(it.description).slice(0, 2000) : undefined,
        });
        existing.add(title.toLowerCase());
        imported++; count++;
      } catch (e: any) {
        console.error('Meta import: failed to create product', title, e?.message || e);
        skipped++;
      }
    }
    after = page.paging?.next ? page.paging?.cursors?.after : undefined;
    pages++;
  } while (after && pages < 20 && !limitReached);

  await supabase.from('merchants').update({ meta_catalog_last_sync: new Date().toISOString() }).eq('id', merchantId).then(() => {}, () => {});
  if (m.store_slug) triggerRevalidation(m.store_slug).catch(() => {});

  return { imported, skipped, total, limitReached };
}
