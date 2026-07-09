import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';

// ─── Supabase Client (Service Role) ──────────────────────────────────────────
// Uses the service role key for full server-side access — never expose this
// on the client.

export const supabase: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
