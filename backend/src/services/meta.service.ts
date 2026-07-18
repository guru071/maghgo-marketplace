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
