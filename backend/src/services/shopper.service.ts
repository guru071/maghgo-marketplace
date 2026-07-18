import { getMerchantBySlug, isSubscriptionActive } from './merchant.service';
import { getProducts } from './product.service';
import { createOrder, attachOrderPaymentLink } from './order.service';
import { createOrderPaymentLink } from './payment.service';
import { validateCoupon } from './coupon.service';
import { decryptSecret } from '../utils/crypto';
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
  merchantId: string;
  merchantPhone: string | null;
  cart: CartLine[];
  coupon?: string;
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

  const inStock = (p: any) => p.stock == null || Number(p.stock) > 0;
  const storeUrl = `${env.FRONTEND_URL}/${s.storeSlug}`;
  if (msg.sendCards) {
    const cards: BotCard[] = products.slice(0, 10).map((p) => {
      const stocked = inStock(p);
      return {
        title: p.title,
        subtitle:
          rupee(Number(p.price)) +
          (p.fulfillment_type === 'prebook' ? ' · Pre-book' : '') +
          (stocked ? '' : ' · Out of stock'),
        imageUrl: p.processed_image_url || p.original_image_url || undefined,
        // Only offer an Add button for products that can actually be bought.
        ...(stocked ? { actionId: `ADD ${p.id}`, actionTitle: '🛒 Add' } : {}),
      };
    });
    await msg.sendCards(cards, storeUrl);
  } else {
    const list = products
      .slice(0, 20)
      .map((p, i) => `${i + 1}. *${p.title}* — ${rupee(Number(p.price))}${inStock(p) ? '' : ' _(out of stock)_'}`)
      .join('\n');
    await msg.sendReply(`🛍️ *${s.storeName}*\n\n${list}\n\nReply with a product name to add it to your cart, then *CART* to review.`);
  }

  if (msg.sendButtons) {
    await msg.sendButtons('Tap *Add* on a product, or:', [
      { id: 'CART', title: '🛒 View cart' },
      { id: 'CONTACT', title: '📍 Contact & visit' },
      { id: 'SHOP', title: '🔄 Refresh' },
    ]);
  }
}

async function showContact(msg: BotMessage, s: Session): Promise<void> {
  const merchant = await getMerchantBySlug(s.storeSlug);
  const address = (merchant as any)?.store_address as string | undefined;
  const phone = merchant?.phone_number;
  const storeUrl = `${env.FRONTEND_URL}/${s.storeSlug}`;

  let body = `📍 *${s.storeName}*\n`;
  if (address) body += `\n🏠 ${address}`;
  if (phone) body += `\n📞 ${phone}`;
  body += `\n\n🔗 Full store: ${storeUrl}`;

  if (address && msg.sendCtaUrl) {
    await msg.sendCtaUrl(body, '🧭 Directions', `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`);
  } else {
    await msg.sendReply(body);
  }
  if (msg.sendButtons) {
    await msg.sendButtons('Ready to shop?', [
      { id: 'SHOP', title: '🛍️ Browse products' },
      { id: 'CART', title: '🛒 View cart' },
    ]);
  }
}

/** Subtotal, discount (from an applied coupon) and payable total for a session. */
async function cartTotals(s: Session): Promise<{ subtotal: number; discount: number; total: number; couponNote: string }> {
  const subtotal = s.cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  let discount = 0;
  let couponNote = '';
  if (s.coupon) {
    try {
      const applied = await validateCoupon(s.merchantId, s.coupon, subtotal);
      if (applied) {
        discount = applied.discount;
        couponNote = `\n🎟️ Coupon *${applied.code}*: −${rupee(discount)}`;
      } else {
        s.coupon = undefined;
      }
    } catch (e: any) {
      // Coupon no longer valid for this cart — drop it and tell the shopper why.
      s.coupon = undefined;
      couponNote = `\n⚠️ ${e?.message || 'Coupon could not be applied.'}`;
    }
  }
  return { subtotal, discount, total: Math.max(0, subtotal - discount), couponNote };
}

async function showCart(msg: BotMessage, s: Session): Promise<void> {
  if (s.cart.length === 0) {
    await msg.sendReply('🛒 Your cart is empty. Tap *Add* on a product to start.');
    return;
  }
  const lines = s.cart.map((c) => `• ${c.qty} × ${c.title} — ${rupee(c.price * c.qty)}`).join('\n');
  const { subtotal, discount, total, couponNote } = await cartTotals(s);
  const totalBlock = discount > 0
    ? `Subtotal: ${rupee(subtotal)}${couponNote}\n*Total: ${rupee(total)}*`
    : `*Total: ${rupee(total)}*${couponNote}`;
  const body = `🛒 *Your cart — ${s.storeName}*\n\n${lines}\n\n${totalBlock}`;
  if (msg.sendButtons) {
    await msg.sendButtons(body, [
      { id: 'CHECKOUT', title: '✅ Checkout' },
      { id: 'SHOP', title: '➕ Add more' },
      { id: 'CLEAR', title: '🗑️ Clear' },
    ]);
  } else {
    await msg.sendReply(`${body}\n\nReply *CHECKOUT* to place your order, *COUPON <code>* to apply a discount, or *SHOP* to add more.`);
  }
}

async function checkout(msg: BotMessage, s: Session): Promise<void> {
  if (s.cart.length === 0) {
    await msg.sendReply('🛒 Your cart is empty — nothing to check out.');
    return;
  }
  try {
    const customerPhone = msg.channel === 'whatsapp' || msg.channel === 'sms' ? msg.senderId : undefined;
    const order = await createOrder(
      s.storeSlug,
      s.cart.map((c) => ({ product_id: c.productId, quantity: c.qty })),
      { phone: customerPhone, couponCode: s.coupon }
    );
    if (!order) {
      await msg.sendReply('⚠️ Sorry, this store isn\'t taking orders right now — the items may be out of stock. Please try again later.');
      return;
    }

    const total = rupee(Number(order.total));
    const discountNote = Number(order.discount) > 0 ? ` _(incl. ${rupee(Number(order.discount))} discount)_` : '';

    // Offer online payment via the SHOP's own Razorpay account (money goes to
    // them, not us). Best-effort: no connected account or an API hiccup just
    // means the shopper settles manually with the shop.
    const shop = await getMerchantBySlug(s.storeSlug);
    const payLink = await createOrderPaymentLink({
      orderId: order.id,
      merchantId: order.merchant_id,
      storeName: s.storeName,
      amount: Number(order.total),
      customerPhone,
      razorpayKeyId: shop?.razorpay_key_id,
      razorpayKeySecret: decryptSecret(shop?.razorpay_key_secret),
    });

    if (payLink) {
      await attachOrderPaymentLink(order.id, payLink.url, payLink.id);
      const body = `✅ *Order placed!*\n\nYour order at *${s.storeName}* for *${total}*${discountNote} is ready.\n\n💳 Pay securely online to confirm it instantly:`;
      if (msg.sendCtaUrl) await msg.sendCtaUrl(body, `Pay ${total} now`, payLink.url);
      else await msg.sendReply(`${body}\n🔗 ${payLink.url}\n\n_Or arrange payment with the shop directly._`);
    } else {
      await msg.sendReply(
        `✅ *Order placed!*\n\nYour order at *${s.storeName}* for *${total}*${discountNote} has been sent to the shop. They'll confirm payment & delivery with you shortly. 🙏`
      );
    }

    // Best-effort: ping the merchant on WhatsApp so they see it immediately.
    if (s.merchantPhone) {
      const items = order.items.map((i: any) => `• ${i.quantity} × ${i.title} — ${rupee(Number(i.subtotal))}`).join('\n');
      await sendTextMessage(
        s.merchantPhone,
        `🔔 *New order on Maghgo!*\n\n${items}\n\n*Total: ${total}*${discountNote}\n\nSee it in your dashboard: ${env.FRONTEND_URL}/dashboard/orders`
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
      merchantId: merchant.id,
      merchantPhone: merchant.phone_number || null,
      cart: existing && existing.storeSlug === merchant.store_slug ? existing.cart : [],
      coupon: existing && existing.storeSlug === merchant.store_slug ? existing.coupon : undefined,
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
  if (upper === 'SHOP' || upper === 'REFRESH' || upper === 'BROWSE') { await sendCatalogue(msg, s); return true; }
  if (upper === 'CART') { await showCart(msg, s); return true; }

  // "COUPON <code>" — apply a discount code to the current cart.
  const couponMatch = raw.match(/^\s*(?:COUPON|CODE|PROMO)\s+(\S+)\s*$/i);
  if (couponMatch) {
    if (s.cart.length === 0) {
      await msg.sendReply('🛒 Add something to your cart first, then apply a coupon.');
      return true;
    }
    const subtotal = s.cart.reduce((sum, c) => sum + c.price * c.qty, 0);
    try {
      const applied = await validateCoupon(s.merchantId, couponMatch[1], subtotal);
      if (applied) {
        s.coupon = applied.code;
        await msg.sendReply(`🎟️ Coupon *${applied.code}* applied — you save ${rupee(applied.discount)}!`);
        await showCart(msg, s);
      } else {
        await msg.sendReply(`❌ "${couponMatch[1].toUpperCase()}" isn't a valid coupon for this store.`);
      }
    } catch (e: any) {
      await msg.sendReply(`❌ ${e?.message || 'That coupon could not be applied.'}`);
    }
    return true;
  }
  if (upper === 'CONTACT' || upper === 'VISIT' || upper === 'LOCATION') { await showContact(msg, s); return true; }
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
