import { sendNotification } from './whatsapp.service';
import { sendMetaReply } from './meta.service';
import { sendTgText } from './telegram.service';
import { sendSmsReply } from './sms.service';

/** The channel identifiers a merchant may have linked. */
export interface NotifiableMerchant {
  phone_number?: string | null;
  telegram_id?: string | null;
  instagram_id?: string | null;
  messenger_id?: string | null;
}

/**
 * Send an unprompted message to a merchant on whichever channel they use.
 *
 * Ordered by how reliably a channel can deliver an unprompted message:
 *
 *  - WhatsApp goes first — sendNotification falls back to an approved template
 *    when the 24-hour service window has closed, so it lands either way.
 *  - Telegram has no messaging window at all, so it's the next most reliable.
 *  - Instagram and Messenger CAN'T be messaged outside 24 hours of the
 *    merchant's last message. We still try (a merchant who chatted this
 *    morning will get it) but a failure there is expected, not a bug.
 *  - SMS costs money per message, so it's only used when nothing else exists.
 *
 * Every channel is attempted until one succeeds. Returns the channel that
 * delivered, or null if the merchant is unreachable — callers use this for
 * logging only; a failed notification must never break the caller.
 */
export async function notifyMerchant(
  merchant: NotifiableMerchant,
  text: string
): Promise<string | null> {
  const attempts: { channel: string; send: () => Promise<void> }[] = [];

  if (merchant.phone_number) {
    attempts.push({ channel: 'whatsapp', send: () => sendNotification(merchant.phone_number!, text) });
  }
  if (merchant.telegram_id) {
    attempts.push({ channel: 'telegram', send: () => sendTgText(merchant.telegram_id!, text) });
  }
  if (merchant.instagram_id) {
    attempts.push({ channel: 'instagram', send: () => sendMetaReply(merchant.instagram_id!, text) });
  }
  if (merchant.messenger_id) {
    attempts.push({ channel: 'messenger', send: () => sendMetaReply(merchant.messenger_id!, text) });
  }
  if (attempts.length === 0 && merchant.phone_number) {
    attempts.push({ channel: 'sms', send: () => sendSmsReply(merchant.phone_number!, text) });
  }

  for (const attempt of attempts) {
    try {
      await attempt.send();
      return attempt.channel;
    } catch (err: any) {
      console.warn(`notifyMerchant: ${attempt.channel} failed — ${err?.message || err}`);
    }
  }
  return null;
}
