import { supabase } from '../db/supabase';
import type { Channel } from './merchant.service';

// ─── Platform kill-switches ──────────────────────────────────────────────────
// The admin panel (/goatech-admin-hq/settings) toggles each channel in
// platform_settings. Those flags now gate the BOT itself, not just the
// website's "Continue with…" buttons: a disabled channel's messages get one
// polite maintenance notice and are not processed.
//
// Cached for 60s so the check adds no per-message query cost, and FAIL-OPEN:
// if the settings table is unreachable, the bot keeps working — an admin
// toggle must never become a single point of failure for the whole product.

interface PlatformFlags {
  whatsapp_enabled: boolean;
  instagram_enabled: boolean;
  messenger_enabled: boolean;
  sms_enabled: boolean;
}

const CACHE_TTL_MS = 60 * 1000;
let cache: { flags: PlatformFlags; ts: number } | null = null;

const FLAG_FOR_CHANNEL: Record<Channel, keyof PlatformFlags> = {
  whatsapp: 'whatsapp_enabled',
  instagram: 'instagram_enabled',
  messenger: 'messenger_enabled',
  sms: 'sms_enabled',
};

export async function isChannelEnabled(channel: Channel): Promise<boolean> {
  const now = Date.now();
  if (!cache || now - cache.ts > CACHE_TTL_MS) {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('whatsapp_enabled, instagram_enabled, messenger_enabled, sms_enabled')
        .eq('id', 1)
        .maybeSingle();
      if (error || !data) {
        cache = { flags: { whatsapp_enabled: true, instagram_enabled: true, messenger_enabled: true, sms_enabled: true }, ts: now };
      } else {
        cache = { flags: data as PlatformFlags, ts: now };
      }
    } catch {
      cache = { flags: { whatsapp_enabled: true, instagram_enabled: true, messenger_enabled: true, sms_enabled: true }, ts: now };
    }
  }
  return cache.flags[FLAG_FOR_CHANNEL[channel]] !== false;
}
