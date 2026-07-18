import { getMerchantBySlug, isSubscriptionActive } from './merchant.service';
import { getProducts } from './product.service';
import { createOrder } from './order.service';
import { sendTextMessage } from './whatsapp.service';
import { env } from '../config/env';
import type { BotMessage, BotCard } from './bot.service';

/**
 * Customer-facing bot shopping.
 *
 * The bot is normally the *merchant's* tool. This lets a shopper who DMs the bot
 * browse a specific store's catalogue as a carousel and place an order — the bot
 * as a storefront, not just a dashboard.
 *
 * A shopper enters a session with "SHOP <store>" (usually via a deep link from
 * the storefront). While a session is open, their messages are treated as
 * shopping actions rather than merchant commands. Sessions are in-memory with a
 * TTL — fine for a single instance; back with Redis to scale horizontally.
 */

interface CartLine { productId: string; title: string; price: number; qty: number; image?: string; }
interface Session {
  storeSlug: string;
  storeName: string;
  merchantPhone: string | null;
  cart: CartLine[];
  ts: number;
}

const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour
const sessions = new Map<string, Session>();

function prune() {
  const now = Date.now();
  for (const [k, s] of sessions) if (now - s.ts > SESSION_TTL_MS) sessions.delete(k);
}
const key = (msg: BotMessage) => `${msg.channel}:${msg.senderId}`;

const rupee = (n: number) => `₹${n.toLocaleString('en-IN')}`;

/** Does this text look like a request to start/continue shopping? */
export function isShopTrigger(text: string): boolean {
  return /^\s*SHOP(\s+\S+)?\s*$/i.test(text || '');
}

export function hasSession(msg: BotMessage): boolean {
  prune();
  return sessions.has(key(msg));
}

async function sendCatalogue(msg: BotMessage, s: Session): Promise<void> {
  const merchant = await getMerchantBySlug(s.storeSlug);
  const products = merchant ? await getProducts(merchant.id) : [];
  if (products.length === 0) {
    await msg.sendReply(`🛍️ *${s.storeName}* has no products available right now. Please check back soon!`);
    return;
  }

  const storeUrl = `${env.FRONTEND_URL}/${s.storeSlug}`;
  if (msg.sendCards) {
    const cards: BotCard[] = products.slice(0, 10).map((p) => ({
      title: p.title,
      subtitle: rupee(Number(p.price)) + (p.fulfillment_type === 'prebook' ? ' · Pre-book' : ''),
      imageUrl: p.processed_image_url || p.original_image_url || undefined,
      actionId: `ADD ${p.id}`,
      actionTitle: '🛒 Add',
    }));
    await msg.sendCards(cards, storeUrl);
  } else {
    const list = products.slice(0, 20).map((p, i) => `${i + 1}. *${p.title}* — ${rupee(Number(p.price))}`).join('\n');
    await msg.sendReply(`🛍️ *${s.storeName}*\n\n${list}\n\nReply with a product name to add it to your cart, then *CART* to review.`);
  }

  if (msg.sendButtons) {
    await msg.sendButtons('Tap *Add* on a product, or:', [
      { id: 'CART', title: '🛒 View cart' },
      { id: 'SHOP', title: '🔄 Refresh' },
    ]);
  }
}

async function showCart(msg: BotMessage, s: Session): Promise<void> {
  if (s.cart.length === 0) {
    await msg.sendReply('🛒 Your cart is empty. Tap *Add* on a product to start.');
    return;
  }
  const lines = s.cart.map((c) => `• ${c.qty} × ${c.title} — ${rupee(c.price * c.qty)}`).join('\n');
  const total = s.cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  const body = `🛒 *Your cart — ${s.storeName}*\n\n${lines}\n\n*Total: ${rupee(total)}*`;
  if (msg.sendButtons) {
    await msg.sendButtons(body, [
      { id: 'CHECKOUT', title: '✅ Checkout' },
      { id: 'SHOP', title: '➕ Add more' },
      { id: 'CLEAR', title: '🗑️ Clear' },
    ]);
  } else {
    await msg.sendReply(`${body}\n\nReply *CHECKOUT* to place your order, or *SHOP* to add more.`);
  }
}

async function checkout(msg: BotMessage, s: Session): Promise<void> {
  if (s.cart.length === 0) {
    await msg.sendReply('🛒 Your cart is empty — nothing to check out.');
    return;
  }
  try {
    const order = await createOrder(
      s.storeSlug,
      s.cart.map((c) => ({ product_id: c.productId, quantity: c.qty })),
      { phone: msg.channel === 'whatsapp' || msg.channel === 'sms' ? msg.senderId : undefined }
    );
    if (!order) {
      await msg.sendReply('⚠️ Sorry, this store isn\'t taking orders right now. Please try again later.');
      return;
    }

    const total = rupee(Number(order.total));
    await msg.sendReply(
      `✅ *Order placed!*\n\nYour order at *${s.storeName}* for *${total}* has been sent to the shop. They'll confirm payment & delivery with you shortly. 🙏`
    );

    // Best-effort: ping the merchant on WhatsApp so they see it immediately.
    if (s.merchantPhone) {
      const items = order.items.map((i: any) => `• ${i.quantity} × ${i.title} — ${rupee(Number(i.subtotal))}`).join('\n');
      await sendTextMessage(
        s.merchantPhone,
        `🔔 *New order on Maghgo!*\n\n${items}\n\n*Total: ${total}*\n\nSee it in your dashboard: ${env.FRONTEND_URL}/dashboard`
      ).catch((e) => console.error('Failed to notify merchant of order:', e?.message || e));
    }

    sessions.delete(key(msg));
  } catch (err: any) {
    console.error('Shopper checkout failed:', err?.message || err);
    await msg.sendReply('⚠️ Something went wrong placing your order. Please try again in a moment.');
  }
}

/**
 * Handle a message as a shopper action. Returns true if it consumed the message
 * (so the merchant command flow is skipped).
 */
export async function handleShopperMessage(msg: BotMessage, text: string): Promise<boolean> {
  prune();
  const raw = (text || '').trim();
  const upper = raw.toUpperCase();
  const k = key(msg);

  // Start / switch store: "SHOP <slug>"
  const shopMatch = raw.match(/^\s*SHOP\s+(\S+)\s*$/i);
  if (shopMatch) {
    const slug = shopMatch[1].toLowerCase();
    const merchant = await getMerchantBySlug(slug);
    if (!merchant || !merchant.is_active || !isSubscriptionActive(merchant)) {
      await msg.sendReply('🔎 Sorry, I couldn\'t find that store. Please check the link and try again.');
      return true;
    }
    const existing = sessions.get(k);
    sessions.set(k, {
      storeSlug: merchant.store_slug,
      storeName: merchant.store_name,
      merchantPhone: merchant.phone_number || null,
      cart: existing && existing.storeSlug === merchant.store_slug ? existing.cart : [],
      ts: Date.now(),
    });
    await msg.sendReply(`🛍️ Welcome to *${merchant.store_name}*! Here's what's available:`);
    await sendCatalogue(msg, sessions.get(k)!);
    return true;
  }

  const s = sessions.get(k);
  if (!s) return false; // not shopping → let the merchant flow handle it
  s.ts = Date.now();

  // "SHOP" alone → re-show the catalogue
  if (upper === 'SHOP' || upper === 'REFRESH') { await sendCatalogue(msg, s); return true; }
  if (upper === 'CART') { await showCart(msg, s); return true; }
  if (upper === 'CHECKOUT' || upper === 'BUY' || upper === 'PAY') { await checkout(msg, s); return true; }
  if (upper === 'CLEAR') { s.cart = []; await msg.sendReply('🗑️ Cart cleared.'); return true; }
  if (upper === 'EXIT' || upper === 'STOP' || upper === 'CANCEL') {
    sessions.delete(k);
    await msg.sendReply('👋 Thanks for visiting! Send *SHOP* any time to browse again.');
    return true;
  }

  // "ADD <productId>" (from a tapped card) or a product name typed directly.
  const addMatch = raw.match(/^\s*ADD\s+(.+)$/i);
  const query = addMatch ? addMatch[1].trim() : raw;

  const merchant = await getMerchantBySlug(s.storeSlug);
  const products = merchant ? await getProducts(merchant.id) : [];
  const product =
    products.find((p) => p.id === query) ||
    products.find((p) => p.title.toLowerCase() === query.toLowerCase()) ||
    products.find((p) => p.title.toLowerCase().includes(query.toLowerCase()));

  if (!product) {
    await msg.sendReply(`🔎 I couldn't find "${query}". Tap *Add* on a product card, or reply *CART* / *CHECKOUT*.`);
    return true;
  }

  const line = s.cart.find((c) => c.productId === product.id);
  if (line) line.qty += 1;
  else s.cart.push({ productId: product.id, title: product.title, price: Number(product.price), qty: 1, image: product.processed_image_url || undefined });

  const count = s.cart.reduce((n, c) => n + c.qty, 0);
  if (msg.sendButtons) {
    await msg.sendButtons(`✅ Added *${product.title}*. Cart: ${count} item(s).`, [
      { id: 'CHECKOUT', title: '✅ Checkout' },
      { id: 'CART', title: '🛒 View cart' },
      { id: 'SHOP', title: '➕ Add more' },
    ]);
  } else {
    await msg.sendReply(`✅ Added *${product.title}*. Cart has ${count} item(s). Reply *CHECKOUT* or *CART*.`);
  }
  return true;
}
