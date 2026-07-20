import cron from 'node-cron';
import { supabase } from '../db/supabase';
import { notifyMerchant } from '../services/notify.service';
import { getSubscriptionStatus } from '../services/merchant.service';
import { env } from '../config/env';

// Days-remaining values that get a message. The job runs once a day, so each
// merchant naturally hits each milestone at most once — no "already reminded"
// column (and therefore no migration) is needed.
//
// -1 is the morning after expiry, when the storefront has just gone dark and
// the merchant most needs to know why.
const MILESTONES = new Set([7, 3, 1, -1]);

function messageFor(store: string, plan: string, daysLeft: number, endsAtLabel: string): string {
  const p = plan.toUpperCase();

  if (daysLeft === -1) {
    return (
      `🔴 *Your ${p} plan has expired*\n\n` +
      `*${store}* went offline yesterday (${endsAtLabel}).\n\n` +
      `Your products, orders, theme and settings are all safe — nothing is deleted. ` +
      `Renew and your storefront is back within seconds.\n\n` +
      `Reply *MYPLAN* to renew.`
    );
  }

  // No nested asterisks — the whole headline is already bold, so an inner
  // *tomorrow* renders as literal stars on WhatsApp instead of bold text.
  const when = daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`;
  const urgency = daysLeft === 1
    ? `\n\n⚠️ After that your storefront goes offline until you renew.`
    : '';

  return (
    `⏳ *Your ${p} plan ends ${when}*\n\n` +
    `🏪 ${store}\n` +
    `📅 Expires: *${endsAtLabel}*${urgency}\n\n` +
    `Reply *MYPLAN* to renew or change plan.`
  );
}

/**
 * Subscription expiry reminders — 09:30 IST daily.
 *
 * Merchants previously got no warning whatsoever: the expiry date lived only in
 * the admin panel, so the first sign of a lapsed plan was their storefront
 * going dark, usually noticed by a customer rather than the owner.
 *
 * Reminders go out on whichever channel the merchant actually uses (see
 * notifyMerchant) and are best-effort — one merchant's failure must never stop
 * the rest of the run.
 *
 * @param dryRun log what would be sent without sending anything (used to verify
 *               the job against live data without messaging real merchants).
 */
export async function runExpiryReminders(
  dryRun = false
): Promise<{ due: number; sent: number; unreachable: number }> {
  try {
    // Widest window we ever notify on: 8 days ahead through 2 days past.
    const from = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const to = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString();

    const { data: merchants, error } = await supabase
      .from('merchants')
      .select('id, store_name, subscription_plan, subscription_ends_at, phone_number, telegram_id, instagram_id, messenger_id')
      .neq('subscription_plan', 'inactive')
      .gte('subscription_ends_at', from)
      .lte('subscription_ends_at', to);

    if (error) {
      console.error('❌ Expiry reminder job query failed:', error.message);
      return { due: 0, sent: 0, unreachable: 0 };
    }
    if (!merchants || merchants.length === 0) {
      console.log('📅 Expiry reminders: nobody due today.');
      return { due: 0, sent: 0, unreachable: 0 };
    }

    let sent = 0;
    let unreachable = 0;
    let due = 0;

    for (const m of merchants) {
      const st = getSubscriptionStatus(m);
      if (!MILESTONES.has(st.daysLeft)) continue;
      due++;

      const body =
        messageFor(m.store_name, st.plan, st.daysLeft, st.endsAtLabel) +
        `\n\n🔗 ${env.FRONTEND_URL}/dashboard`;

      if (dryRun) {
        console.log(`   [dry-run] ${m.store_name} — ${st.daysLeft} day(s) left → would notify:\n${body}\n`);
        sent++;
        continue;
      }

      const via = await notifyMerchant(m, body);
      if (via) sent++;
      else unreachable++;
    }

    console.log(`📅 Expiry reminders: ${sent} sent, ${unreachable} unreachable (${due} due of ${merchants.length} in window).`);
    return { due, sent, unreachable };
  } catch (err: any) {
    console.error('❌ Expiry reminder job failed:', err?.message || err);
    return { due: 0, sent: 0, unreachable: 0 };
  }
}

export function startExpiryJob(): void {
  cron.schedule('0 4 * * *', () => { runExpiryReminders(); }); // 04:00 UTC = 09:30 IST
  console.log('📅 Subscription expiry reminders scheduled (09:30 IST — 7/3/1 days before, and the day after)');
}
