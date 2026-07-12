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
  if (!env.META_PAGE_ACCESS_TOKEN) {
    console.warn('⚠️ META_PAGE_ACCESS_TOKEN is missing. Cannot send Meta reply.');
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
          Authorization: `Bearer ${env.META_PAGE_ACCESS_TOKEN}`,
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
