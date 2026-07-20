import cron from 'node-cron';
import { supabase } from '../db/supabase';
import { importMetaCatalog } from '../services/metaCatalog.service';
import { sendNotification } from '../services/whatsapp.service';

/**
 * Nightly Meta catalogue auto-sync — the follow-up to CONNECT META. Every shop
 * with a connected catalogue gets a re-import at 03:00 UTC (08:30 IST), so new
 * products added in their FB/Insta Shop appear in Maghgo without anyone tapping
 * IMPORT META. Dedupe lives inside importMetaCatalog, so re-runs only add
 * what's new. Owners are messaged only when something was actually imported —
 * a nightly "0 imported" would teach them to ignore the bot.
 */
export function startMetaSyncJob(): void {
  cron.schedule('0 3 * * *', async () => {
    try {
      const { data: merchants, error } = await supabase
        .from('merchants')
        .select('id, store_name, phone_number, meta_catalog_id')
        .not('meta_catalog_id', 'is', null);
      if (error || !merchants?.length) return;

      for (const m of merchants) {
        try {
          const r = await importMetaCatalog(m.id);
          if (r.imported > 0) {
            console.log(`📷 Meta auto-sync: ${m.store_name} +${r.imported}`);
            if (m.phone_number) {
              await sendNotification(
                m.phone_number,
                `📷 *Meta sync:* ${r.imported} new product(s) from your FB/Insta Shop were added to *${m.store_name}* overnight.` +
                (r.limitReached ? '\n\n⚠️ Some were skipped — plan limit reached. Reply *UPGRADE* to raise it.' : '')
              ).catch(() => {});
            }
          }
        } catch (err: any) {
          // Expired token, revoked access, Meta hiccup — log and move on; the
          // owner can always run IMPORT META manually and see the real error.
          console.error(`Meta auto-sync failed for ${m.store_name}:`, err?.message || err);
        }
      }
    } catch (err: any) {
      console.error('Meta sync job failed:', err?.message || err);
    }
  });
  console.log('📷 Meta catalogue auto-sync scheduled (08:30 IST)');
}
