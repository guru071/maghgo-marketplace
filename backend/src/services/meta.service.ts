import axios from 'axios';
import { env } from '../config/env';

/**
 * Sends a text reply via Facebook Graph API for Instagram or Messenger.
 * Requires META_PAGE_ACCESS_TOKEN.
 * @param recipientId The user's psid (Messenger) or ig_sid (Instagram).
 * @param text The text to send.
 */
export async function sendMetaReply(
  recipientId: string,
  text: string,
): Promise<void> {
  const accessToken = env.META_PAGE_ACCESS_TOKEN || env.WHATSAPP_TOKEN;

  if (!accessToken) {
    console.warn('⚠️ META_PAGE_ACCESS_TOKEN / WHATSAPP_TOKEN is missing. Cannot send Meta reply.');
    console.log(`[MOCK META REPLY to ${recipientId}]: ${text}`);
    return;
  }

  try {
    await axios.post(
      'https://graph.facebook.com/v21.0/me/messages',
      {
        recipient: { id: recipientId },
        message: { text }
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error: any) {
    console.error('Error sending Meta reply:', error?.response?.data || error.message);
    throw new Error('Failed to send Meta reply');
  }
}

/**
 * Send text with tappable quick-reply chips (Instagram / Messenger GUI).
 * A tapped chip returns its `payload` as message.quick_reply.payload, which the
 * controller feeds to the bot as a command — the same pattern as WhatsApp.
 * Max 13 quick replies; titles <= 20 chars.
 */
export async function sendMetaQuickReplies(
  recipientId: string,
  text: string,
  replies: { id: string; title: string }[]
): Promise<void> {
  const accessToken = env.META_PAGE_ACCESS_TOKEN || env.WHATSAPP_TOKEN;
  if (!accessToken) {
    console.log(`[MOCK META QUICK REPLIES to ${recipientId}]: ${text} | ${replies.map((r) => r.title).join(', ')}`);
    return;
  }
  try {
    await axios.post(
      'https://graph.facebook.com/v21.0/me/messages',
      {
        recipient: { id: recipientId },
        message: {
          text,
          quick_replies: replies.slice(0, 13).map((r) => ({
            content_type: 'text',
            title: r.title.slice(0, 20),
            payload: r.id,
          })),
        },
      },
      { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error sending Meta quick replies:', error?.response?.data || error.message);
    throw new Error('Failed to send Meta quick replies');
  }
}

export interface CardButton {
  type: 'postback' | 'web_url';
  title: string;
  payload?: string; // for postback -> comes back as a command
  url?: string;     // for web_url
}

export interface Card {
  title: string;
  subtitle?: string;
  image_url?: string;
  buttons?: CardButton[];
}

/**
 * A horizontally-scrollable carousel of image cards (Instagram / Messenger) —
 * the Flipkart-style product row. Up to 10 cards, up to 3 buttons each.
 * postback buttons return their payload as a command; web_url buttons open a
 * link (e.g. the storefront).
 */
export async function sendMetaCards(recipientId: string, cards: Card[]): Promise<void> {
  const accessToken = env.META_PAGE_ACCESS_TOKEN || env.WHATSAPP_TOKEN;
  if (!accessToken) {
    console.log(`[MOCK META CARDS to ${recipientId}]: ${cards.map((c) => c.title).join(', ')}`);
    return;
  }
  const elements = cards.slice(0, 10).map((c) => ({
    title: c.title.slice(0, 80),
    ...(c.subtitle ? { subtitle: c.subtitle.slice(0, 80) } : {}),
    ...(c.image_url ? { image_url: c.image_url } : {}),
    ...(c.buttons && c.buttons.length
      ? {
          buttons: c.buttons.slice(0, 3).map((b) =>
            b.type === 'web_url'
              ? { type: 'web_url', title: b.title.slice(0, 20), url: b.url }
              : { type: 'postback', title: b.title.slice(0, 20), payload: b.payload }
          ),
        }
      : {}),
  }));
  try {
    await axios.post(
      'https://graph.facebook.com/v21.0/me/messages',
      {
        recipient: { id: recipientId },
        message: { attachment: { type: 'template', payload: { template_type: 'generic', elements } } },
      },
      { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error sending Meta cards:', error?.response?.data || error.message);
    throw new Error('Failed to send Meta cards');
  }
}

/**
 * Downloads media from a public or Graph API authenticated URL provided by Meta Webhook.
 * Usually, Instagram attachments from `payload.url` are public CDNs that expire, so we can just GET them.
 */
export async function downloadMetaMedia(url: string): Promise<Buffer> {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  } catch (error: any) {
    console.error('Error downloading Meta media:', error?.response?.data || error.message);
    throw new Error('Failed to download Meta media');
  }
}
