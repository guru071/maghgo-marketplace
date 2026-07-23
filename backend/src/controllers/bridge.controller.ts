import { Request, Response } from 'express';
import crypto from 'crypto';
import axios from 'axios';
import { env } from '../config/env';
import { processBotMessage, BotMessage, BotCard } from '../services/bot.service';

/**
 * Third-party bridge for Instagram & Messenger.
 *
 * WHY THIS EXISTS: sending/receiving Instagram or Messenger messages from our
 * own Meta app needs App Review for advanced access (pages_messaging /
 * instagram_manage_messages) — a slow, hard approval. A Meta *Tech Partner*
 * (ManyChat, Chatfuel, …) already holds that approval. A shop connects its
 * IG/FB page to the partner; the partner forwards each incoming DM to THIS
 * endpoint and renders whatever we return. So Maghgo's bot brain runs the
 * conversation without Maghgo ever passing Meta review.
 *
 * We reuse the exact same processBotMessage the other channels use. The bot
 * already degrades buttons/menus/cta/cards to plain text when a channel can't
 * render a GUI (that's how SMS works), so this bridge only has to COLLECT the
 * text the bot produces and return it — no per-partner button wiring, and it
 * works identically for ManyChat, Chatfuel, or anything that can POST JSON and
 * show a reply.
 *
 * Auth is a shared secret (BRIDGE_SECRET). Without it the endpoint is disabled
 * — an open endpoint that runs the bot under any sender id could be abused to
 * spam or to impersonate merchants.
 */

const BRIDGE_CHANNELS = new Set(['instagram', 'messenger']);

/** Pull a value from the first matching key — partners name fields differently. */
function pick(body: any, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = body?.[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number') return String(v);
  }
  return undefined;
}

export async function handleBridgeMessage(req: Request, res: Response): Promise<void> {
  // ── Fail-closed auth ────────────────────────────────────────────────────────
  const expected = env.BRIDGE_SECRET;
  if (!expected) {
    res.status(503).json({ error: 'Bridge not configured.' });
    return;
  }
  const provided =
    (req.headers['x-bridge-secret'] as string | undefined) ||
    (typeof req.query.secret === 'string' ? req.query.secret : undefined) ||
    pick(req.body, ['secret', 'bridge_secret']);

  // Constant-time compare so a wrong secret can't be guessed by timing.
  const a = Buffer.from(String(provided ?? ''), 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }

  // ── Channel ─────────────────────────────────────────────────────────────────
  const channel = String(req.params.channel || '').toLowerCase();
  if (!BRIDGE_CHANNELS.has(channel)) {
    res.status(400).json({ error: 'Channel must be instagram or messenger.' });
    return;
  }

  // ── Who + what ────────────────────────────────────────────────────────────────
  // The subscriber id is the person's id inside the partner platform. It's
  // stable per user, which is exactly what the bot needs to key their session —
  // and replies go back through the partner, so we never need the raw Meta id.
  const senderId = pick(req.body, [
    'subscriber_id', 'sender_id', 'user_id', 'psid', 'ig_id', 'id', 'contact_id',
  ]);
  if (!senderId) {
    res.status(400).json({ error: 'Missing subscriber_id.' });
    return;
  }

  const text = pick(req.body, [
    'text', 'message', 'last_input_text', 'last_text_input', 'query', 'body',
  ]);
  const imageUrl = pick(req.body, [
    'image_url', 'attachment_url', 'last_input_attachment', 'media_url',
  ]);

  // A message with neither text nor image is nothing to act on. Answer 200 so
  // the partner doesn't retry, with an empty message set.
  if (!text && !imageUrl) {
    res.json(buildResponse(channel, []));
    return;
  }

  // ── Collect the bot's replies instead of sending them ────────────────────────
  const collected: string[] = [];
  const push = (s: string) => { if (s && s.trim()) collected.push(s); };

  const botMsg: BotMessage = {
    channel: channel as any, // 'instagram' | 'messenger' — sets the right text limit
    senderId,
    // A partner may retry a delivery; a fresh id per call avoids the dedup guard
    // eating a real repeat message, while a partner-supplied id (if any) dedupes.
    messageId: pick(req.body, ['message_id', 'mid', 'event_id']) || `bridge-${senderId}-${Date.now()}`,
    type: imageUrl ? 'image' : 'text',
    text: imageUrl ? undefined : text,
    sendReply: async (t) => push(t),
    // Cards/CTA are flattened to text here (a couple of call sites invoke
    // sendCards directly rather than guarding on it, so we implement it rather
    // than leave it undefined). Buttons/menus have their own text fallback in
    // the bot and route through sendReply above, so we deliberately DON'T
    // implement sendButtons/sendMenu — the fallback already lists the options.
    sendCards: async (cards: BotCard[], storeUrl?: string) => {
      for (const c of cards) {
        let line = `*${c.title}*`;
        if (c.subtitle) line += `\n${c.subtitle}`;
        if (c.imageUrl) line += `\n${c.imageUrl}`;
        if (c.actionId) line += `\n↳ reply *${c.actionId}*`;
        push(line);
      }
      if (storeUrl) push(`🛍️ ${storeUrl}`);
    },
    sendCtaUrl: async (body, buttonText, url) => push(`${body}\n\n${buttonText}: ${url}`),
  };

  // Best-effort inbound image (a photo DM the merchant sent to add a product).
  if (imageUrl) {
    try {
      const dl = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 15000, maxContentLength: 8 * 1024 * 1024 });
      botMsg.image = {
        caption: text,
        buffer: Buffer.from(dl.data),
        mime_type: (dl.headers['content-type'] as string) || 'image/jpeg',
      };
    } catch {
      // Couldn't fetch the image — fall back to treating it as a text message
      // (or an empty prompt) rather than failing the whole request.
      botMsg.type = 'text';
      botMsg.text = text || 'HELP';
    }
  }

  try {
    await processBotMessage(botMsg);
  } catch (err: any) {
    console.error('❌ Bridge processing error:', err?.message || err);
    // Never 500 back to the partner — that triggers retries and can disable the
    // partner's webhook. Return a friendly line instead.
    res.json(buildResponse(channel, ['⚠️ Something went wrong. Please try again in a moment.']));
    return;
  }

  res.json(buildResponse(channel, collected));
}

/**
 * A response body every common partner can render:
 *  - ManyChat "External Request → Dynamic block" reads `content.messages`.
 *  - Chatfuel "JSON API" reads the top-level `messages`.
 *  - Anything else can read the single joined `text`.
 */
function buildResponse(channel: string, messages: string[]) {
  // Instagram caps a single message near 1000 chars; the bot already chunks to
  // its per-channel limit, so each entry here is already safe. Cap the count so
  // a runaway never floods the partner.
  const capped = messages.slice(0, 10);
  return {
    version: 'v2',
    content: {
      type: channel, // 'instagram' | 'messenger' — ManyChat routes by this
      messages: capped.map((t) => ({ type: 'text', text: t })),
    },
    // Chatfuel shape:
    messages: capped.map((t) => ({ text: t })),
    // Lowest-common-denominator:
    text: capped.join('\n\n'),
  };
}
