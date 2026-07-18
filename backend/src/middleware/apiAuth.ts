import { Request, Response, NextFunction } from 'express';
import { supabase } from '../db/supabase';
import { extractApiKey, hashApiKey } from '../utils/apikey';

// Authenticates a merchant by their API key (Authorization: Bearer mgk_live_… or
// X-API-Key). Attaches merchantId, exactly like the dashboard's JWT middleware,
// so /api/v1 handlers can reuse the same services.

export interface ApiRequest extends Request {
  merchantId?: string;
}

export async function requireApiKey(req: ApiRequest, res: Response, next: NextFunction) {
  const key = extractApiKey(req.headers.authorization, req.headers['x-api-key'] as string | undefined);
  if (!key) {
    return res.status(401).json({ error: 'Missing API key. Send it as "Authorization: Bearer mgk_live_…" or the X-API-Key header.' });
  }

  try {
    const { data, error } = await supabase
      .from('merchants')
      .select('id')
      .eq('api_key_hash', hashApiKey(key))
      .maybeSingle();

    if (error) {
      // Column missing (migration 19 not run) or DB issue — fail closed.
      if (/api_key_hash|schema cache|42703|PGRST205/i.test(error.message || '')) {
        return res.status(503).json({ error: 'The API is not enabled on this server yet.' });
      }
      throw error;
    }
    if (!data) return res.status(401).json({ error: 'Invalid API key.' });

    req.merchantId = data.id;
    next();
  } catch (err: any) {
    console.error('API key auth failed:', err?.message || err);
    res.status(500).json({ error: 'Authentication failed.' });
  }
}
