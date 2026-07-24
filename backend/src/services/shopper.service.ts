import { getMerchantBySlug, isSubscriptionActive } from './merchant.service';
import { getProducts } from './product.service';
import { createOrder, attachOrderPaymentLink } from './order.service';
import { createOrderPaymentLink } from './payment.service';
import { validateCoupon } from './coupon.service';
import { decryptSecret } from '../utils/crypto';
import { sendNotification } from './whatsapp.service';
import { sendMetaReply } from './meta.service';
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

interface CartLine { productId: string; title: string; price: number; qty: number; image?: string; variant?: string; prebook?: boolean; }

// A product with options (Size/Colour…) mid-selection: the shopper picks one
// value per group before the line lands in the cart — same rule as the web.
interface PendingAdd {
  productId: string;
  title: string;
  price: number;
  image?: string;
  prebook?: boolean;
  variants: { name: string; values: string[] }[];
  chosen: Record<string, string>;
}

interface Session {
  storeSlug: string;
  storeName: string;
  merchantId: string;
  merchantPhone: string | null;
  cart: CartLine[];
  coupon?: string;
  pendingAdd?: PendingAdd;
  lang: 'en' | 'ta' | 'hi';
  awaitingAddress?: boolean;
  deliveryAddress?: string;
  addressAsked?: boolean;
  // Set once the cart is confirmed and we've asked how they want to pay, so the
  // next reply is read as the payment choice rather than a browse command.
  awaitingPayChoice?: boolean;
  payMethod?: 'online' | 'shop';
  nudged?: boolean;
  // Current browse view: search text, category, price band, sort and page.
  // Persisted on the session so FILTER choices compose (e.g. a category AND a
  // price cap) instead of each one resetting the last.
  view?: BrowseView;
  ts: number;
}

interface BrowseView {
  q?: string;
  category?: string;
  max?: number;
  sort?: 'price_asc' | 'price_desc' | 'new';
  page: number;
}

// ─── Shopper-facing translations ─────────────────────────────────────────────
// The store owner picks the language (LANGUAGE TAMIL/HINDI in the bot) and
// their customers are served in it. Buttons stay short/emoji (API length
// limits); message bodies are translated. Fallback is always English.
const TR: Record<string, Record<'en' | 'ta' | 'hi', (...a: any[]) => string>> = {
  welcome: {
    en: (store) => `🛍️ Welcome to *${store}*! Here's what's available:`,
    ta: (store) => `🛍️ *${store}*-க்கு வரவேற்கிறோம்! இங்கே கிடைப்பவை:`,
    hi: (store) => `🛍️ *${store}* में आपका स्वागत है! ये उपलब्ध हैं:`,
  },
  added: {
    en: (label, count) => `✅ Added *${label}*. Cart: ${count} item(s).`,
    ta: (label, count) => `✅ *${label}* கார்ட்டில் சேர்க்கப்பட்டது. மொத்தம்: ${count}.`,
    hi: (label, count) => `✅ *${label}* कार्ट में जोड़ा गया। कुल: ${count} आइटम।`,
  },
  cartEmpty: {
    en: () => '🛒 Your cart is empty. Tap *Add* on a product to start.',
    ta: () => '🛒 உங்கள் கார்ட் காலியாக உள்ளது. ஒரு பொருளில் *Add* தட்டுங்கள்.',
    hi: () => '🛒 आपकी कार्ट खाली है। किसी प्रोडक्ट पर *Add* दबाएँ।',
  },
  outOfStock: {
    en: (t) => `😔 *${t}* is out of stock right now. Reply *SHOP* to see what's available.`,
    ta: (t) => `😔 *${t}* இப்போது கையிருப்பில் இல்லை. *SHOP* என்று அனுப்புங்கள்.`,
    hi: (t) => `😔 *${t}* अभी स्टॉक में नहीं है। *SHOP* भेजें।`,
  },
  askAddress: {
    en: () => '📍 *Where should we deliver?*\n\nPlease send your full delivery address (or SKIP to arrange it with the shop).',
    ta: () => '📍 *எங்கு டெலிவரி செய்ய வேண்டும்?*\n\nஉங்கள் முழு முகவரியை அனுப்புங்கள் (அல்லது SKIP).',
    hi: () => '📍 *डिलीवरी कहाँ करनी है?*\n\nअपना पूरा पता भेजें (या SKIP)।',
  },
  askPayMethod: {
    en: () => '💰 *How would you like to pay?*\n\nPay securely online now, or settle directly with the shop (cash / UPI on delivery).',
    ta: () => '💰 *எப்படி பணம் செலுத்த விரும்புகிறீர்கள்?*\n\nஇப்போது ஆன்லைனில் பணம் செலுத்துங்கள், அல்லது கடையில் நேரடியாக செலுத்துங்கள்.',
    hi: () => '💰 *आप भुगतान कैसे करना चाहेंगे?*\n\nअभी ऑनलाइन सुरक्षित भुगतान करें, या दुकान को सीधे भुगतान करें (कैश / UPI)।',
  },
  orderPlaced: {
    en: (store, total) => `✅ *Order placed!*\n\nYour order at *${store}* for *${total}* has been sent to the shop. They'll confirm payment & delivery with you shortly. 🙏`,
    ta: (store, total) => `✅ *ஆர்டர் வெற்றிகரமாக!*\n\n*${store}*-இல் *${total}*-க்கான உங்கள் ஆர்டர் கடைக்கு அனுப்பப்பட்டது. விரைவில் உறுதிப்படுத்துவார்கள். 🙏`,
    hi: (store, total) => `✅ *ऑर्डर हो गया!*\n\n*${store}* पर *${total}* का आपका ऑर्डर दुकान को भेज दिया गया है। वे जल्द पुष्टि करेंगे। 🙏`,
  },
  noMatch: {
    en: (what) => `🔎 Nothing matched *${what}*.\n\nTry another word, or reply *CLEARFILTER* to see everything.`,
    ta: (what) => `🔎 *${what}*-க்கு எதுவும் கிடைக்கவில்லை.\n\nவேறு வார்த்தை முயற்சிக்கவும், அல்லது *CLEARFILTER*.`,
    hi: (what) => `🔎 *${what}* से कुछ नहीं मिला।\n\nदूसरा शब्द आज़माएँ, या *CLEARFILTER* भेजें।`,
  },
  filterMenu: {
    en: () => '🔎 *Find what you want*\n\nPick a filter, or type *SEARCH <word>*:',
    ta: () => '🔎 *நீங்கள் விரும்புவதைத் தேடுங்கள்*\n\nஒரு வடிகட்டியைத் தேர்வுசெய்யவும், அல்லது *SEARCH <சொல்>*:',
    hi: () => '🔎 *अपनी पसंद खोजें*\n\nफ़िल्टर चुनें, या *SEARCH <शब्द>* भेजें:',
  },
  help: {
    en: (store, contact) =>
      `🛍️ *${store}* — how to order\n\n` +
      `• *SHOP* — see all products\n` +
      `• Type a product name to add it\n` +
      `• *SEARCH <word>* — find a product\n` +
      `• *FILTER* — by category, price, sort\n` +
      `• *CART* — review your basket\n` +
      `• *CHECKOUT* — place your order\n` +
      `• *COUPON <code>* — apply a discount\n` +
      (contact ? `• *CONTACT* — call or visit the shop\n` : '') +
      `• *EXIT* — end this chat\n\n` +
      `Just reply with what you need 🙂`,
    ta: (store, contact) =>
      `🛍️ *${store}* — எப்படி ஆர்டர் செய்வது\n\n` +
      `• *SHOP* — அனைத்து பொருட்களும்\n` +
      `• பொருளின் பெயரை அனுப்பினால் கார்ட்டில் சேரும்\n` +
      `• *SEARCH <சொல்>* — பொருளைத் தேட\n` +
      `• *FILTER* — வகை, விலை, வரிசை\n` +
      `• *CART* — உங்கள் கார்ட்\n` +
      `• *CHECKOUT* — ஆர்டர் செய்ய\n` +
      `• *COUPON <code>* — தள்ளுபடி குறியீடு\n` +
      (contact ? `• *CONTACT* — கடையை தொடர்பு கொள்ள\n` : '') +
      `• *EXIT* — உரையாடலை முடிக்க\n\n` +
      `உங்களுக்கு தேவையானதை அனுப்புங்கள் 🙂`,
    hi: (store, contact) =>
      `🛍️ *${store}* — ऑर्डर कैसे करें\n\n` +
      `• *SHOP* — सभी प्रोडक्ट देखें\n` +
      `• प्रोडक्ट का नाम भेजें, कार्ट में जुड़ जाएगा\n` +
      `• *SEARCH <शब्द>* — प्रोडक्ट खोजें\n` +
      `• *FILTER* — कैटेगरी, कीमत, क्रम\n` +
      `• *CART* — अपनी कार्ट देखें\n` +
      `• *CHECKOUT* — ऑर्डर करें\n` +
      `• *COUPON <code>* — डिस्काउंट कोड लगाएँ\n` +
      (contact ? `• *CONTACT* — दुकान से संपर्क करें\n` : '') +
      `• *EXIT* — चैट बंद करें\n\n` +
      `जो चाहिए वो भेजें 🙂`,
  },
  bye: {
    en: () => '👋 Thanks for visiting! Send *SHOP* any time to browse again.',
    ta: () => '👋 வந்ததற்கு நன்றி! மீண்டும் பார்க்க *SHOP* அனுப்புங்கள்.',
    hi: () => '👋 आने के लिए धन्यवाद! फिर देखने के लिए *SHOP* भेजें।',
  },
};

const tr = (s: Session, key: keyof typeof TR, ...a: any[]) => (TR[key][s.lang] ?? TR[key].en)(...a);

const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour
const sessions = new Map<string, Session>();

const NUDGE_AFTER_MS = 45 * 60 * 1000; // idle 45min with items → one nudge

function prune() {
  const now = Date.now();
  for (const [k, s] of sessions) {
    // Abandoned cart: idle with items → one friendly reminder (free — it's
    // within WhatsApp's 24h service window), then normal expiry.
    if (!s.nudged && s.cart.length > 0 && now - s.ts > NUDGE_AFTER_MS) {
      s.nudged = true;
      const [channel, senderId] = [k.slice(0, k.indexOf(':')), k.slice(k.indexOf(':') + 1)];
      const count = s.cart.reduce((n, c) => n + c.qty, 0);
      const text = `🛒 You left ${count} item(s) in your cart at *${s.storeName}*!\n\nReply *CART* to finish your order.`;
      const send = channel === 'instagram' || channel === 'messenger'
        ? sendMetaReply(senderId, text)
        : sendNotification(senderId, text);
      send.catch((e: any) => console.error('cart nudge failed:', e?.message || e));
      continue; // keep the session alive so CART still works
    }
    if (now - s.ts > SESSION_TTL_MS) sessions.delete(k);
  }
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

const PAGE_SIZE = 10;

/** Products matching the session's current view, in the requested order. */
function applyView(products: any[], view?: BrowseView): any[] {
  if (!view) return products;
  let out = products;

  if (view.q) {
    const q = view.q.toLowerCase();
    // Match the name first, then description/category, so a search for "shirt"
    // ranks actual shirts above things that merely mention one.
    const byTitle = out.filter((p) => String(p.title || '').toLowerCase().includes(q));
    const byOther = out.filter(
      (p) => !byTitle.includes(p) &&
        (String(p.description || '').toLowerCase().includes(q) ||
         String(p.category || '').toLowerCase().includes(q))
    );
    out = [...byTitle, ...byOther];
  }
  if (view.category) {
    const c = view.category.toLowerCase();
    out = out.filter((p) => String(p.category || '').toLowerCase() === c);
  }
  if (view.max != null) {
    out = out.filter((p) => Number(p.price) <= view.max!);
  }

  if (view.sort === 'price_asc') out = [...out].sort((a, b) => Number(a.price) - Number(b.price));
  else if (view.sort === 'price_desc') out = [...out].sort((a, b) => Number(b.price) - Number(a.price));
  // 'new' is the order getProducts already returns (created_at desc).

  return out;
}

/** One-line description of what's currently filtered, for the list header. */
function viewLabel(view?: BrowseView): string {
  if (!view) return '';
  const bits: string[] = [];
  if (view.q) bits.push(`"${view.q}"`);
  if (view.category) bits.push(view.category);
  if (view.max != null) bits.push(`under ${rupee(view.max)}`);
  if (view.sort === 'price_asc') bits.push('cheapest first');
  if (view.sort === 'price_desc') bits.push('priciest first');
  return bits.length ? `\n_Showing: ${bits.join(' · ')}_` : '';
}

/** The filter menu — categories the shop actually uses, plus price and sort. */
async function sendFilterMenu(msg: BotMessage, s: Session): Promise<void> {
  const merchant = await getMerchantBySlug(s.storeSlug);
  const products = merchant ? await getProducts(merchant.id) : [];

  // Only offer categories and price bands that exist in this shop — a filter
  // that returns nothing is worse than no filter.
  const categories = [...new Set(products.map((p: any) => String(p.category || '').trim()).filter(Boolean))].slice(0, 5);
  const prices = products.map((p: any) => Number(p.price)).filter((n) => n > 0).sort((a, b) => a - b);
  const bands: number[] = [];
  if (prices.length > 2) {
    const mid = prices[Math.floor(prices.length / 2)];
    const high = prices[Math.floor(prices.length * 0.85)];
    for (const b of [Math.ceil(mid / 100) * 100, Math.ceil(high / 100) * 100]) {
      if (b > 0 && !bands.includes(b) && b < prices[prices.length - 1]) bands.push(b);
    }
  }

  const rows = [
    ...categories.map((c) => ({ id: `CATEGORY ${c}`, title: `🗂 ${c}`.slice(0, 24), description: 'Show only this category' })),
    ...bands.map((b) => ({ id: `UNDER ${b}`, title: `💰 Under ${rupee(b)}`.slice(0, 24), description: 'Budget-friendly picks' })),
    { id: 'SORT LOW', title: '⬆️ Price: low to high', description: 'Cheapest first' },
    { id: 'SORT HIGH', title: '⬇️ Price: high to low', description: 'Priciest first' },
    { id: 'CLEARFILTER', title: '♻️ Show everything', description: 'Clear all filters' },
  ].slice(0, 10);

  if (msg.sendMenu) await msg.sendMenu(tr(s, 'filterMenu'), '🔎 Filter', rows, 'Find products');
  else await msg.sendReply(tr(s, 'filterMenu') + '\n\n' + rows.map((r) => `• ${r.title}`).join('\n'));
}

async function sendCatalogue(msg: BotMessage, s: Session): Promise<void> {
  const merchant = await getMerchantBySlug(s.storeSlug);
  const all = merchant ? await getProducts(merchant.id) : [];
  if (all.length === 0) {
    await msg.sendReply(`🛍️ *${s.storeName}* has no products available right now. Please check back soon!`);
    return;
  }

  const matched = applyView(all, s.view);
  if (matched.length === 0) {
    await msg.sendReply(tr(s, 'noMatch', s.view?.q || viewLabel(s.view).trim() || 'that'));
    if (msg.sendButtons) {
      await msg.sendButtons('What next?', [
        { id: 'CLEARFILTER', title: '♻️ Show everything' },
        { id: 'FILTER', title: '🔎 Filter' },
      ]);
    }
    return;
  }

  // Clamp the page: MORE past the end used to slice an empty window and send a
  // card list with nothing in it.
  const totalPages = Math.max(1, Math.ceil(matched.length / PAGE_SIZE));
  const requested = s.view?.page ?? 0;
  const page = Math.min(requested, totalPages - 1);
  if (requested > page) {
    if (s.view) s.view.page = page;
    await msg.sendReply(`✅ That's everything — you've seen all ${matched.length} product${matched.length === 1 ? '' : 's'}.`);
    if (msg.sendButtons) {
      await msg.sendButtons('What next?', [
        { id: 'FILTER', title: '🔎 Filter & search' },
        { id: 'CART', title: '🛒 View cart' },
      ]);
    }
    return;
  }
  const start = page * PAGE_SIZE;
  const products = matched.slice(start, start + PAGE_SIZE);
  const hasMore = matched.length > start + PAGE_SIZE;
  const header = `🛍️ *${s.storeName}* — ${matched.length} product${matched.length === 1 ? '' : 's'}${viewLabel(s.view)}`;

  const inStock = (p: any) => p.stock == null || Number(p.stock) > 0;
  const storeUrl = `${env.FRONTEND_URL}/${s.storeSlug}`;
  if (msg.sendCards) {
    // Cards carry no header of their own, so say what's being shown first.
    if (s.view || page > 0) await msg.sendReply(header);
    const cards: BotCard[] = products.map((p) => {
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
      .map((p, i) => `${start + i + 1}. *${p.title}* — ${rupee(Number(p.price))}${inStock(p) ? '' : ' _(out of stock)_'}`)
      .join('\n');
    await msg.sendReply(`${header}\n\n${list}\n\nReply with a product name to add it to your cart, then *CART* to review.`);
  }

  if (msg.sendButtons) {
    await msg.sendButtons(
      hasMore ? `Showing ${start + 1}–${start + products.length} of ${matched.length}.` : 'Tap *Add* on a product, or:',
      [
        ...(hasMore ? [{ id: 'MORE', title: '➡️ Show more' }] : []),
        { id: 'FILTER', title: '🔎 Filter & search' },
        { id: 'CART', title: '🛒 View cart' },
      ]
    );
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
    await msg.sendReply(tr(s, 'cartEmpty'));
    return;
  }
  const lines = s.cart.map((c) => `• ${c.qty} × ${c.title}${c.variant ? ` (${c.variant})` : ''} — ${rupee(c.price * c.qty)}`).join('\n');
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

/** Prompt for the next unchosen option group (Size, Colour, …). */
async function askVariant(msg: BotMessage, s: Session): Promise<void> {
  const p = s.pendingAdd!;
  const group = p.variants.find((v) => !p.chosen[v.name])!;
  const body = `📐 *${p.title}* — which *${group.name}*?`;

  if (msg.sendButtons && group.values.length <= 3) {
    await msg.sendButtons(body, group.values.map((v) => ({ id: v, title: v.slice(0, 20) })));
  } else if (msg.sendMenu && group.values.length <= 10) {
    await msg.sendMenu(body, `Choose ${group.name}`.slice(0, 20), group.values.map((v) => ({ id: v, title: v.slice(0, 24) })));
  } else {
    await msg.sendReply(`${body}\n\nReply with one of: ${group.values.join(', ')}\n\n(or CANCEL)`);
  }
}

/** Add a resolved line (with any chosen variant) to the cart and confirm. */
async function pushCartLine(
  msg: BotMessage,
  s: Session,
  item: { productId: string; title: string; price: number; image?: string; variant?: string; prebook?: boolean }
): Promise<void> {
  const line = s.cart.find((c) => c.productId === item.productId && (c.variant ?? '') === (item.variant ?? ''));
  if (line) line.qty += 1;
  else s.cart.push({ ...item, qty: 1 });

  const count = s.cart.reduce((n, c) => n + c.qty, 0);
  const label = item.variant ? `${item.title} (${item.variant})` : item.title;
  if (msg.sendButtons) {
    await msg.sendButtons(tr(s, 'added', label, count), [
      { id: 'CHECKOUT', title: '✅ Checkout' },
      { id: 'CART', title: '🛒 View cart' },
      { id: 'SHOP', title: '➕ Add more' },
    ]);
  } else {
    await msg.sendReply(`✅ Added *${label}*. Cart has ${count} item(s). Reply *CHECKOUT* or *CART*.`);
  }
}

async function checkout(msg: BotMessage, s: Session): Promise<void> {
  if (s.cart.length === 0) {
    await msg.sendReply('🛒 Your cart is empty — nothing to check out.');
    return;
  }

  // Delivery orders need somewhere to deliver. Ask once (SKIP allowed);
  // all-prebook carts are collected at the shop, so no address needed.
  const needsDelivery = s.cart.some((c) => !c.prebook);
  if (needsDelivery && !s.addressAsked) {
    s.awaitingAddress = true;
    s.addressAsked = true;
    if (msg.sendButtons) await msg.sendButtons(tr(s, 'askAddress'), [{ id: 'SKIP', title: '⏭ Skip' }]);
    else await msg.sendReply(tr(s, 'askAddress'));
    return;
  }

  // Ask how they want to pay before placing the order. Previously we always
  // pushed a payment link, which reads as "pay now or nothing" — plenty of
  // shoppers here expect to settle with the shop directly (cash on delivery or
  // over chat), and were dropping off at that step.
  const shopForPay = await getMerchantBySlug(s.storeSlug);
  const canPayOnline = Boolean(shopForPay?.razorpay_key_id && shopForPay?.razorpay_key_secret);
  if (canPayOnline && !s.awaitingPayChoice) {
    s.awaitingPayChoice = true;
    const body = tr(s, 'askPayMethod');
    if (msg.sendButtons) {
      await msg.sendButtons(body, [
        { id: 'PAY_ONLINE', title: '💳 Pay online' },
        { id: 'PAY_CHAT', title: '💬 Pay to shop' },
      ]);
    } else {
      await msg.sendReply(`${body}\n\nReply *ONLINE* to pay now, or *SHOP* to settle directly with the shop.`);
    }
    return;
  }

  try {
    const customerPhone = msg.channel === 'whatsapp' || msg.channel === 'sms' ? msg.senderId : undefined;
    const order = await createOrder(
      s.storeSlug,
      s.cart.map((c) => ({ product_id: c.productId, quantity: c.qty, variant: c.variant })),
      { phone: customerPhone, couponCode: s.coupon, deliveryAddress: s.deliveryAddress }
    );
    if (!order) {
      await msg.sendReply('⚠️ Sorry, this store isn\'t taking orders right now — the items may be out of stock. Please try again later.');
      return;
    }

    const total = rupee(Number(order.total));
    const discountNote = Number(order.discount) > 0 ? ` _(incl. ${rupee(Number(order.discount))} discount)_` : '';

    // Only generate a payment link if the shopper actually chose to pay online.
    // Money goes to the SHOP's own Razorpay account, not ours. Best-effort: an
    // API hiccup just means they settle with the shop instead.
    const shop = shopForPay;
    const payLink = s.payMethod === 'online'
      ? await createOrderPaymentLink({
          orderId: order.id,
          merchantId: order.merchant_id,
          storeName: s.storeName,
          amount: Number(order.total),
          customerPhone,
          razorpayKeyId: shop?.razorpay_key_id,
          razorpayKeySecret: decryptSecret(shop?.razorpay_key_secret),
        })
      : null;

    if (payLink) {
      await attachOrderPaymentLink(order.id, payLink.url, payLink.id);
      const body = `✅ *Order placed!*\n\nYour order at *${s.storeName}* for *${total}*${discountNote} is ready.\n\n💳 Pay securely online to confirm it instantly:`;
      if (msg.sendCtaUrl) await msg.sendCtaUrl(body, `Pay ${total} now`, payLink.url);
      else await msg.sendReply(`${body}\n🔗 ${payLink.url}\n\n_Or arrange payment with the shop directly._`);
    } else {
      // Paying the shop directly — say so explicitly, so nobody sits waiting
      // for a payment link that isn't coming.
      const payNote = s.payMethod === 'shop'
        ? `\n\n💬 The shop will contact you to arrange payment${s.deliveryAddress ? ' and delivery' : ''}.`
        : '';
      await msg.sendReply(`${tr(s, 'orderPlaced', s.storeName, total)}${discountNote}${payNote}\n\n🔎 ${env.FRONTEND_URL}/o/${order.id}`);
    }

    // The merchant is notified by createOrder (multi-channel, covers WhatsApp,
    // Telegram, Instagram and Messenger). The old WhatsApp-only ping here was
    // sending shop owners a second, duplicate message for every bot order.

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
    const lang = ((merchant as any).bot_language === 'ta' || (merchant as any).bot_language === 'hi')
      ? (merchant as any).bot_language : 'en';
    sessions.set(k, {
      storeSlug: merchant.store_slug,
      storeName: merchant.store_name,
      merchantId: merchant.id,
      merchantPhone: merchant.phone_number || null,
      cart: existing && existing.storeSlug === merchant.store_slug ? existing.cart : [],
      coupon: existing && existing.storeSlug === merchant.store_slug ? existing.coupon : undefined,
      lang,
      ts: Date.now(),
    });
    await msg.sendReply(tr(sessions.get(k)!, 'welcome', merchant.store_name));
    await sendCatalogue(msg, sessions.get(k)!);
    return true;
  }

  const s = sessions.get(k);
  if (!s) return false; // not shopping → let the merchant flow handle it
  s.ts = Date.now();

  // Mid-checkout, we're waiting for their delivery address.
  if (s.awaitingAddress) {
    s.awaitingAddress = false;
    if (upper === 'CANCEL' || upper === 'EXIT' || upper === 'STOP') {
      s.addressAsked = false;
      await msg.sendReply('❎ Okay, checkout cancelled. Reply *CART* to review your items.');
      return true;
    }
    if (upper !== 'SKIP') {
      if (raw.length < 10) {
        s.awaitingAddress = true;
        await msg.sendReply('⚠️ That address looks too short — please send the full address (or SKIP).');
        return true;
      }
      s.deliveryAddress = raw.slice(0, 400);
    }
    await checkout(msg, s);
    return true;
  }

  // How they want to pay. Accepts the button ids and the plain words a shopper
  // is likely to type on channels without buttons (SMS, or a typed reply).
  if (s.awaitingPayChoice) {
    const online = ['PAY_ONLINE', 'ONLINE', 'PAY ONLINE', 'CARD', 'UPI', '1'].includes(upper);
    const toShop = ['PAY_CHAT', 'SHOP', 'PAY TO SHOP', 'CASH', 'COD', 'LATER', '2'].includes(upper);

    if (upper === 'CANCEL' || upper === 'EXIT' || upper === 'STOP') {
      s.awaitingPayChoice = false;
      await msg.sendReply('❎ Okay, checkout cancelled. Reply *CART* to review your items.');
      return true;
    }
    if (!online && !toShop) {
      await msg.sendReply('Please choose how to pay — reply *ONLINE* to pay now, or *SHOP* to pay the shop directly.');
      return true;
    }

    s.payMethod = online ? 'online' : 'shop';
    s.awaitingPayChoice = false;
    await checkout(msg, s);
    return true;
  }

  // HELP — and the greetings a shopper naturally opens with, which otherwise
  // fell through to product search ("I couldn't find \"HI\"").
  // Kept deliberately short: Instagram truncates bodies near 1000 characters,
  // which is exactly what once broke the merchant-side HELP.
  if (['HELP', 'MENU', 'COMMANDS', '?', 'HOW', 'HI', 'HELLO', 'HEY', 'உதவி', 'मदद'].includes(upper)) {
    const buttons = [
      { id: 'SHOP', title: '🛍️ See products' },
      { id: 'CART', title: '🛒 My cart' },
      ...(s.merchantPhone ? [{ id: 'CONTACT', title: '📞 Contact shop' }] : []),
    ];
    const body = tr(s, 'help', s.storeName, Boolean(s.merchantPhone));
    if (msg.sendButtons) await msg.sendButtons(body, buttons);
    else await msg.sendReply(body);
    return true;
  }

  // ── Search & filter ────────────────────────────────────────────────────────
  if (upper === 'FILTER' || upper === 'SEARCH' || upper === 'FIND' || upper === 'SORT') {
    await sendFilterMenu(msg, s);
    return true;
  }

  // SEARCH <word> / FIND <word> — free-text search.
  const searchMatch = raw.match(/^\s*(?:SEARCH|FIND|LOOKING FOR)\s+(.{1,60})$/i);
  if (searchMatch) {
    s.view = { ...(s.view ?? {}), q: searchMatch[1].trim(), page: 0 };
    await sendCatalogue(msg, s);
    return true;
  }

  const categoryMatch = raw.match(/^\s*CATEGORY\s+(.{1,60})$/i);
  if (categoryMatch) {
    s.view = { ...(s.view ?? {}), category: categoryMatch[1].trim(), page: 0 };
    await sendCatalogue(msg, s);
    return true;
  }

  // UNDER 500 / BELOW 500 — price cap.
  const underMatch = raw.match(/^\s*(?:UNDER|BELOW|MAX)\s*₹?\s*(\d{1,7})\s*$/i);
  if (underMatch) {
    s.view = { ...(s.view ?? {}), max: Number(underMatch[1]), page: 0 };
    await sendCatalogue(msg, s);
    return true;
  }

  if (upper === 'SORT LOW' || upper === 'CHEAPEST') {
    s.view = { ...(s.view ?? {}), sort: 'price_asc', page: 0 };
    await sendCatalogue(msg, s);
    return true;
  }
  if (upper === 'SORT HIGH') {
    s.view = { ...(s.view ?? {}), sort: 'price_desc', page: 0 };
    await sendCatalogue(msg, s);
    return true;
  }
  if (upper === 'CLEARFILTER' || upper === 'CLEAR FILTER' || upper === 'ALL' || upper === 'SHOW ALL') {
    s.view = undefined;
    await sendCatalogue(msg, s);
    return true;
  }
  // MORE — next page of the CURRENT view, so paging doesn't drop the filters.
  if (upper === 'MORE' || upper === 'NEXT') {
    s.view = { ...(s.view ?? {}), page: (s.view?.page ?? 0) + 1 };
    await sendCatalogue(msg, s);
    return true;
  }

  // "SHOP" alone → re-show the catalogue (and start fresh: an old filter
  // silently still applied is the most confusing possible result).
  if (upper === 'SHOP' || upper === 'REFRESH' || upper === 'BROWSE') {
    s.view = undefined;
    await sendCatalogue(msg, s);
    return true;
  }
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
  if (upper === 'CANCEL' && s.pendingAdd) {
    // Cancelling mid option-pick abandons that product, not the whole visit.
    s.pendingAdd = undefined;
    await msg.sendReply('❎ Okay, not added. Reply *SHOP* to keep browsing or *CART* to review.');
    return true;
  }
  if (upper === 'EXIT' || upper === 'STOP' || upper === 'CANCEL') {
    sessions.delete(k);
    await msg.sendReply(tr(s, 'bye'));
    return true;
  }

  // Mid option-pick: this message should be one of the current group's values.
  if (s.pendingAdd) {
    const p = s.pendingAdd;
    const group = p.variants.find((v) => !p.chosen[v.name]);
    const match = group?.values.find((v) => v.toLowerCase() === raw.toLowerCase());
    if (group && match) {
      p.chosen[group.name] = match;
      if (p.variants.every((v) => p.chosen[v.name])) {
        const variant = p.variants.map((v) => `${v.name}: ${p.chosen[v.name]}`).join(' · ');
        s.pendingAdd = undefined;
        await pushCartLine(msg, s, { productId: p.productId, title: p.title, price: p.price, image: p.image, variant });
      } else {
        await askVariant(msg, s);
      }
      return true;
    }
    // Not a valid value — re-ask rather than guessing.
    await askVariant(msg, s);
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
    // Before giving up, treat what they typed as a search — a shopper writing
    // "shirt" wants results, not an error.
    const asSearch = applyView(products, { q: query, page: 0 });
    if (asSearch.length > 0) {
      s.view = { q: query, page: 0 };
      await sendCatalogue(msg, s);
      return true;
    }
    await msg.sendReply(`🔎 I couldn't find "${query}". Reply *SHOP* to browse everything, *FILTER* to search by category or price — or *HELP* for what I can do.`);
    return true;
  }

  // Same rules as the web store: no selling what's out of stock, and options
  // (Size/Colour…) must be chosen before the cart.
  if (product.stock != null && Number(product.stock) <= 0) {
    await msg.sendReply(tr(s, 'outOfStock', product.title));
    return true;
  }

  const variants = (Array.isArray(product.variants) ? product.variants : [])
    .filter((v: any) => v?.name && Array.isArray(v.values) && v.values.length > 0);
  const base = {
    productId: product.id,
    title: product.title,
    price: Number(product.price),
    image: product.processed_image_url || undefined,
    prebook: product.fulfillment_type === 'prebook',
  };

  if (variants.length > 0) {
    s.pendingAdd = { ...base, variants, chosen: {} };
    await askVariant(msg, s);
    return true;
  }

  await pushCartLine(msg, s, base);
  return true;
}
