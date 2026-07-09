import axios from 'axios';
import { env } from '../config/env';

// ─── WhatsApp Cloud API Service ──────────────────────────────────────────────

const GRAPH_API = 'https://graph.facebook.com/v21.0';

/**
 * Retrieve the temporary download URL for a media asset.
 */
export async function getMediaUrl(mediaId: string): Promise<string> {
  const response = await axios.get<{ url: string }>(
    `${GRAPH_API}/${mediaId}`,
    {
      headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}` },
    }
  );
  return response.data.url;
}

/**
 * Download binary media from the temporary URL returned by `getMediaUrl`.
 */
export async function downloadMedia(mediaUrl: string): Promise<Buffer> {
  const response = await axios.get(mediaUrl, {
    headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}` },
    responseType: 'arraybuffer',
  });
  return Buffer.from(response.data);
}

/**
 * Send a plain text message to a WhatsApp number.
 */
export async function sendTextMessage(
  to: string,
  text: string
): Promise<void> {
  await axios.post(
    `${GRAPH_API}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { preview_url: false, body: text },
    },
    {
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Send a reply (threaded) to a specific incoming message.
 */
export async function sendReply(
  to: string,
  messageId: string,
  text: string
): Promise<void> {
  await axios.post(
    `${GRAPH_API}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      context: { message_id: messageId },
      type: 'text',
      text: { preview_url: false, body: text },
    },
    {
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );
}
