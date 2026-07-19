import cron from 'node-cron';
import { supabase } from '../db/supabase';
import { sendNotification } from '../services/whatsapp.service';

/**
 * Daily sales digest — every morning at 9:00 IST, each merchant who had orders
 * yesterday gets a one-line summary in WhatsApp. Quiet days send nothing (a
 * daily "₹0" would train people to ignore the bot).
 */
export function startDigestJob(): void {
  cron.schedule('30 3 * * *', async () => { // 03:30 UTC = 09:00 IST
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: orders } = await supabase
        .from('order_logs')
        .select('merchant_id, total, status')
        .gte('created_at', since);
      if (!orders || orders.length === 0) return;

      const byMerchant = new Map<string, { orders: number; revenue: number }>();
      for (const o of orders) {
        if (o.status === 'cancelled') continue;
        const m = byMerchant.get(o.merchant_id) ?? { orders: 0, revenue: 0 };
        byMerchant.set(o.merchant_id, { orders: m.orders + 1, revenue: m.revenue + Number(o.total) });
      }

      for (const [merchantId, stats] of byMerchant) {
        const { data: m } = await supabase
          .from('merchants')
          .select('phone_number, store_name')
          .eq('id', merchantId)
          .maybeSingle();
        if (!m?.phone_number) continue;
        await sendNotification(
          m.phone_number,
          `🌅 *Good morning!*\n\nYesterday at *${m.store_name}*:\n🧾 ${stats.orders} order(s) · 💰 ₹${stats.revenue.toLocaleString('en-IN')}\n\nReply *ORDERS* to manage them, or *SALES* for full analytics.`
        ).catch((e) => console.error('digest send failed:', e?.message || e));
      }
      console.log(`🌅 Daily digest sent to ${byMerchant.size} merchant(s)`);
    } catch (err: any) {
      console.error('Digest job failed:', err?.message || err);
    }
  });
  console.log('🌅 Daily sales digest scheduled (09:00 IST)');
}
