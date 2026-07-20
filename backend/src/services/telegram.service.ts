import axios from 'axios';
import { env } from '../config/env';

// ─── Telegram Bot API ────────────────────────────────────────────────────────
// The friendliest channel in the stack: free, no app review, inline keyboards
// with unlimited buttons, 4096-char messages, native photo captions.
//
// Two Telegram-specific quirks handled here:
//  1. Our bot texts use WhatsApp-style *bold*. Telegram's legacy Markdown would
//     also treat the underscores in store slugs as italics and reject the
//     message — so we convert to HTML: escape everything, then *…* → <b>…</b>.
//  2. Inline-button callback_data is capped at 64 BYTES, but our command ids
//     can be long ("OPTIONS Red Shirt - Size: S,M,L"). Long ids are stashed in
//     an in-memory token map and sent as "cb:<n>"; the webhook resolves them
//     back. TTL-pruned. (Single-instance, like the other bot state.)

const HTTP_TIMEOUT_MS = 15000;

const api = () => `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}`;

export function telegramConfigured(): boolean {
  return Boolean(env.TELEGRAM_BOT_TOKEN);
}

async function call(method: string, payload: Record<string, unknown>): Promise<any> {
  const res = await axios.post(`${api()}/${method}`, payload, { timeout: HTTP_TIMEOUT_MS });
  return res.data?.result;
}

/** WhatsApp-style *bold* → Telegram HTML, with everything else escaped. */
export function toTelegramHtml(text: string): string {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return escaped.replace(/\*([^*\n]+)\*/g, '<b>$1</b>');
}

// ── Callback-data tokens (64-byte Telegram limit) ────────────────────────────
const CB_TTL_MS = 30 * 60 * 1000;
const cbTokens = new Map<string, { data: string; ts: number }>();
let cbCounter = 0;

function cbData(data: string): string {
  if (Buffer.byteLength(data, 'utf8') <= 64) return data;
  const now = Date.now();
  for (const [k, v] of cbTokens) if (now - v.ts > CB_TTL_MS) cbTokens.delete(k);
  const token = `cb:${++cbCounter}`;
  cbTokens.set(token, { data, ts: now });
  return token;
}

/** Resolve a callback payload back to the full command (or itself). */
export function resolveCallback(data: string): string {
  if (data.startsWith('cb:')) return cbTokens.get(data)?.data ?? '';
  return data;
}

// ── Senders ──────────────────────────────────────────────────────────────────

export async function sendTgText(chatId: string, text: string): Promise<void> {
  await call('sendMessage', { chat_id: chatId, text: toTelegramHtml(text), parse_mode: 'HTML', disable_web_page_preview: false });
}

export async function sendTgButtons(chatId: string, body: string, buttons: { id: string; title: string }[]): Promise<void> {
  await call('sendMessage', {
    chat_id: chatId,
    text: toTelegramHtml(body),
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: buttons.map((b) => [{ text: b.title.slice(0, 40), callback_data: cbData(b.id) }]) },
  });
}

export async function sendTgMenu(
  chatId: string,
  body: string,
  rows: { id: string; title: string; description?: string }[],
  header?: string
): Promise<void> {
  await call('sendMessage', {
    chat_id: chatId,
    text: toTelegramHtml(`${header ? `*${header}*\n` : ''}${body}`),
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: rows.map((r) => [{ text: r.title.slice(0, 40), callback_data: cbData(r.id) }]) },
  });
}

export async function sendTgCta(chatId: string, body: string, buttonText: string, url: string): Promise<void> {
  await call('sendMessage', {
    chat_id: chatId,
    text: toTelegramHtml(body),
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: [[{ text: buttonText.slice(0, 40), url }]] },
  });
}

export async function sendTgPhoto(chatId: string, photoUrl: string, caption: string, button?: { id: string; title: string }): Promise<void> {
  await call('sendPhoto', {
    chat_id: chatId,
    photo: photoUrl,
    caption: toTelegramHtml(caption).slice(0, 1024),
    parse_mode: 'HTML',
    ...(button ? { reply_markup: { inline_keyboard: [[{ text: button.title.slice(0, 40), callback_data: cbData(button.id) }]] } } : {}),
  });
}

/** Acknowledge a tapped inline button so Telegram stops its loading spinner. */
export async function answerCallback(callbackQueryId: string): Promise<void> {
  await call('answerCallbackQuery', { callback_query_id: callbackQueryId }).catch(() => {});
}

/** Download an incoming photo by file_id (for product uploads). */
export async function downloadTgFile(fileId: string): Promise<Buffer> {
  const file = await call('getFile', { file_id: fileId });
  const res = await axios.get(`https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${file.file_path}`, {
    responseType: 'arraybuffer',
    timeout: HTTP_TIMEOUT_MS,
  });
  return Buffer.from(res.data);
}
