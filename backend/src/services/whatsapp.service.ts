import axios from 'axios';
import { env } from '../config/env';

// ─── WhatsApp Cloud API Service ──────────────────────────────────────────────

const GRAPH_API = 'https://graph.facebook.com/v21.0';

// Every outbound call to Meta is bounded: a stalled Graph API request must fail
// fast rather than hang a bot reply (or a media download) indefinitely.
const HTTP_TIMEOUT_MS = 15000;

/**
 * Retrieve the temporary download URL for a media asset.
 */
export async function getMediaUrl(mediaId: string): Promise<string> {
  const response = await axios.get<{ url: string }>(
    `${GRAPH_API}/${mediaId}`,
    {
      headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}` },
      timeout: HTTP_TIMEOUT_MS,
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
    timeout: HTTP_TIMEOUT_MS,
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
      timeout: HTTP_TIMEOUT_MS,
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
      timeout: HTTP_TIMEOUT_MS,
    }
  );
}

// ─── Interactive (GUI) messages ──────────────────────────────────────────────

async function postMessage(payload: any): Promise<void> {
  await axios.post(`${GRAPH_API}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, payload, {
    headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    timeout: HTTP_TIMEOUT_MS,
  });
}

export interface ReplyButton {
  id: string;   // returned to us as the "command" when tapped
  title: string; // <= 20 chars (WhatsApp limit)
}

/**
 * Up to THREE tappable reply buttons under a message. When a button is tapped
 * WhatsApp sends its `id` back as interactive.button_reply.id, which the
 * controller feeds to the bot exactly like a typed command.
 */
export async function sendButtons(to: string, body: string, buttons: ReplyButton[]): Promise<void> {
  await postMessage({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: body.slice(0, 1024) },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: 'reply',
          reply: { id: b.id, title: b.title.slice(0, 20) },
        })),
      },
    },
  });
}

/**
 * A single "call to action" URL button under a message — e.g. "🛍️ View store".
 * The modern way to surface a link instead of pasting a raw URL in text.
 */
export async function sendCtaUrl(to: string, body: string, buttonText: string, url: string): Promise<void> {
  await postMessage({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'cta_url',
      body: { text: body.slice(0, 1024) },
      action: { name: 'cta_url', parameters: { display_text: buttonText.slice(0, 20), url } },
    },
  });
}

/** A plain image with a caption — used to render product cards. */
export async function sendImage(to: string, imageUrl: string, caption?: string): Promise<void> {
  await postMessage({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'image',
    image: { link: imageUrl, ...(caption ? { caption: caption.slice(0, 1024) } : {}) },
  });
}

/**
 * An interactive message with an image header plus up to 3 reply buttons —
 * a real product card: photo on top, details in the body, actions below.
 */
export async function sendImageButtons(
  to: string,
  imageUrl: string,
  body: string,
  buttons: ReplyButton[]
): Promise<void> {
  await postMessage({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      header: { type: 'image', image: { link: imageUrl } },
      body: { text: body.slice(0, 1024) },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({ type: 'reply', reply: { id: b.id, title: b.title.slice(0, 20) } })),
      },
    },
  });
}

export interface ListRow {
  id: string;
  title: string;        // <= 24 chars
  description?: string; // <= 72 chars
}

/**
 * A "menu" button that opens a scrollable list — the closest thing WhatsApp has
 * to a full GUI menu. Up to 10 rows across sections.
 */
export async function sendList(
  to: string,
  body: string,
  buttonLabel: string,
  rows: ListRow[],
  header?: string
): Promise<void> {
  await postMessage({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      ...(header ? { header: { type: 'text', text: header.slice(0, 60) } } : {}),
      body: { text: body.slice(0, 1024) },
      action: {
        button: buttonLabel.slice(0, 20),
        sections: [
          {
            title: 'Actions',
            rows: rows.slice(0, 10).map((r) => ({
              id: r.id,
              title: r.title.slice(0, 24),
              ...(r.description ? { description: r.description.slice(0, 72) } : {}),
            })),
          },
        ],
      },
    },
  });
}
