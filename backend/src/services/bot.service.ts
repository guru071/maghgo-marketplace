import { getMerchantByChannel, isSubscriptionActive, createMerchant, getProductLimit, generateLinkCode, linkChannelToMerchant, updateStoreDescription, updateStoreAddress, updateStoreLogo, getSubscriptionStatus, updateStoreCategory, updateAnnouncement, updateBotLanguage, setCustomDomain, toggleStoreStatus, updateMerchantSocial, listThemes, applyThemeById, hasRazorpayKeys, setRazorpayKeys, clearRazorpayKeys, setShopTelegramBot, clearShopTelegramBot, Channel } from './merchant.service';
import { encryptSecret, decryptSecret } from '../utils/crypto';
import { parseCaption } from './parser.service';
import { removeBackground } from './media.service';
import { uploadImage } from './storage.service';
import { createProduct, getProducts, deleteProduct, getProductCount, updateProductPrice, deleteAllProducts, setProductFulfillment, setProductStock, setProductInfo } from './product.service';
import { getOrders, getAnalytics, updateOrderStatus, OrderStatus } from './order.service';
import { listCoupons, createCoupon, deleteCoupon } from './coupon.service';
import { importMetaCatalog, connectMetaCatalog } from './metaCatalog.service';
import { validateBotToken, setShopWebhook, deleteShopWebhook } from './telegram.service';
import { addReviewByPhone, getStoreRating } from './review.service';
import { isChannelEnabled } from './platform.service';
import { sendTextMessage } from './whatsapp.service';
import { supabase } from '../db/supabase';
import { normalizePhone } from '../utils/phone';
import { triggerRevalidation } from './revalidate.service';
import { createPaymentLink, getAmountFromPlan, getPlanFromAmount, getAllPlans } from './payment.service';
import { env, publicBaseUrl } from '../config/env';
import { buildStoreSlug } from '../utils/slug';
import { canUseChannel, minPlanForChannel, channelLabel, hasAccess, canUseFeature, featureLockedMessage, FEATURE_MIN_PLAN } from '../utils/plans';
import { isShopTrigger, hasSession, handleShopperMessage } from './shopper.service';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export interface BotMessage {
  channel: Channel;
  senderId: string;
  messageId: string;
  type: 'text' | 'image';
  text?: string;
  image?: {
    caption?: string;
    buffer: Buffer;
    mime_type: string;
  };
  // Set when the message arrived on a shop's DEDICATED WhatsApp number
  // (migration 24): customers are auto-scoped to that store, no "SHOP <name>".
  dedicatedStoreSlug?: string;
  sendReply: (text: string) => Promise<void>;
  // Optional richer senders — implemented for WhatsApp, absent elsewhere. The
  // bot always calls them through replyButtons/replyMenu, which fall back to a
  // plain-text list of the options when a channel can't render a GUI.
  sendButtons?: (body: string, buttons: { id: string; title: string }[]) => Promise<void>;
  sendMenu?: (
    body: string,
    buttonLabel: string,
    rows: { id: string; title: string; description?: string }[],
    header?: string
  ) => Promise<void>;
  // A link surfaced as a tappable button ("🛍️ View store") rather than raw URL.
  sendCtaUrl?: (body: string, buttonText: string, url: string) => Promise<void>;
  // A visual product catalogue — a carousel on Meta, image cards on WhatsApp.
  sendCards?: (cards: BotCard[], storeUrl?: string) => Promise<void>;
}

export interface BotCard {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  actionId?: string;    // postback command when tapped
  actionTitle?: string;
}

// Tappable buttons where supported, otherwise a bulleted text fallback so the
// same call works on every channel.
// Per-channel plain-text limits (Meta rejects anything longer, and the user
// sees NOTHING): WhatsApp 4096, Messenger ~2000, Instagram ~1000.
const TEXT_LIMIT: Record<string, number> = { whatsapp: 3900, messenger: 1800, instagram: 900, sms: 1500 };

/** Send text of any length: splits on paragraph boundaries per channel limit. */
async function sendChunkedReply(msg: BotMessage, text: string): Promise<void> {
  const limit = TEXT_LIMIT[msg.channel] ?? 900;
  if (text.length <= limit) return msg.sendReply(text);

  // A single paragraph can itself exceed the limit (e.g. a very long product
  // description) — hard-split those so no chunk can ever be rejected.
  const paras = text.split('\n\n').flatMap((p) => {
    if (p.length <= limit) return [p];
    const parts: string[] = [];
    for (let i = 0; i < p.length; i += limit - 1) parts.push(p.slice(i, i + limit - 1));
    return parts;
  });

  let chunk = '';
  for (const p of paras) {
    const next = chunk ? `${chunk}\n\n${p}` : p;
    if (next.length > limit && chunk) {
      await msg.sendReply(chunk);
      chunk = p;
    } else {
      chunk = next;
    }
  }
  if (chunk) await msg.sendReply(chunk);
}

async function replyButtons(
  msg: BotMessage,
  body: string,
  buttons: { id: string; title: string }[]
): Promise<void> {
  // Interactive-message bodies are even tighter than plain text (WhatsApp
  // buttons: 1024; Instagram quick replies ride the ~1000 text cap). Long
  // content goes as chunked plain text, then a short button prompt.
  const btnLimit = msg.channel === 'whatsapp' ? 1000 : 850;
  if (msg.sendButtons) {
    if (body.length > btnLimit) {
      await sendChunkedReply(msg, body);
      return msg.sendButtons('👇 Quick actions:', buttons);
    }
    return msg.sendButtons(body, buttons);
  }
  await sendChunkedReply(msg, `${body}\n\n${buttons.map((b) => `• ${b.title}`).join('\n')}`);
}

async function replyMenu(
  msg: BotMessage,
  body: string,
  buttonLabel: string,
  rows: { id: string; title: string; description?: string }[],
  header?: string
): Promise<void> {
  const bodyLimit = msg.channel === 'whatsapp' ? 1000 : 850;
  if (msg.sendMenu) {
    if (body.length > bodyLimit) {
      await sendChunkedReply(msg, body);
      return msg.sendMenu('👇 Choose:', buttonLabel, rows, header);
    }
    return msg.sendMenu(body, buttonLabel, rows, header);
  }
  await sendChunkedReply(
    msg,
    `${header ? `*${header}*\n` : ''}${body}\n\n${rows.map((r) => `• ${r.title}${r.description ? ` — ${r.description}` : ''}`).join('\n')}`
  );
}

// The main GUI menu — a tappable list mapping to existing commands.
async function sendMainMenu(msg: BotMessage, merchant?: { store_name?: string; subscription_plan?: string; subscription_ends_at?: string }): Promise<void> {
  const plan = merchant?.subscription_plan ?? 'basic';
  // Locked rows stay visible with a 🔒 so the merchant can SEE what upgrading
  // unlocks — tapping one gets the friendly upgrade prompt, never the feature.
  const lock = (feature: Parameters<typeof canUseFeature>[1], title: string, desc: string) =>
    canUseFeature(plan, feature)
      ? { title, description: desc }
      : { title: `🔒 ${title}`.slice(0, 24), description: `Needs ${FEATURE_MIN_PLAN[feature].toUpperCase()} plan — tap to see`.slice(0, 72) };

  await replyMenu(
    msg,
    // A plan about to lapse is worth one line at the top of every menu — the
    // merchant otherwise finds out when their storefront goes dark.
    (merchant?.store_name ? `What would you like to do for *${merchant.store_name}*?` : 'What would you like to do?') +
      (() => {
        if (!merchant?.subscription_ends_at) return '';
        const st = getSubscriptionStatus(merchant);
        if (st.expired) return `\n\n🔴 Your ${st.plan.toUpperCase()} plan expired on ${st.endsAtLabel} — tap *My plan* to renew.`;
        if (st.expiringSoon) return `\n\n🟠 Your ${st.plan.toUpperCase()} plan ends in ${st.daysLeft} day(s), on ${st.endsAtLabel}.`;
        return '';
      })(),
    '📋 Open menu',
    [
      { id: 'LIST', title: '📦 My products', description: 'See everything in your store' },
      { id: 'ADD', title: '➕ Add a product', description: 'Guided: photo → name → price' },
      { id: 'ORDERS', title: '🧾 Recent orders', description: 'View & update orders' },
      { id: 'SALES', title: '📊 Sales snapshot', description: 'Revenue & best seller' },
      { id: 'COUPONS', ...lock('coupons', '🏷️ Coupons', 'Discount codes for customers') },
      { id: 'THEMES', ...lock('premium_themes', '🎨 Change theme', 'Restyle your storefront') },
      { id: 'MYPLAN', title: '💳 My plan', description: 'Expiry, days left & renew' },
      { id: 'LOGIN', title: '🔐 Web dashboard', description: 'Manage on the web' },
      { id: 'PAUSE', title: '⏸️ Pause store', description: 'Temporarily go offline' },
      { id: 'MORE', title: '⚙️ More tools', description: 'Address, Meta import, QR…' },
    ],
    'Maghgo Menu'
  );
}

// Second page of tools — WhatsApp lists max out at 10 rows, so the main menu
// keeps daily actions and this holds setup/occasional ones.
async function sendMoreMenu(msg: BotMessage, merchant?: { subscription_plan?: string }): Promise<void> {
  const plan = merchant?.subscription_plan ?? 'basic';
  const metaLocked = !canUseFeature(plan, 'meta_import');
  await replyMenu(
    msg,
    'More store tools:',
    '⚙️ Tools',
    [
      { id: 'PAYMENTS', title: '💳 Online payments', description: 'Connect YOUR Razorpay in chat' },
      { id: 'QR', title: '🔳 Store QR code', description: 'Sent as an image, print it' },
      metaLocked
        ? { id: 'IMPORT META', title: '🔒 Import Meta Shop', description: 'Needs PRO plan — tap to see' }
        : { id: 'IMPORT META', title: '📷 Import Meta Shop', description: 'Pull your FB/Insta catalog in' },
      { id: 'CONNECT TELEGRAM', title: '✈️ My Telegram bot', description: 'Your own branded shop bot' },
      { id: 'SET LOGO', title: '🖼 Shop logo', description: 'Send a photo — shows on your store' },
      { id: 'RESUME', title: '▶️ Resume store', description: 'Go back online' },
      { id: 'LINK', title: '🔗 Link channels', description: 'Manage from Insta/Messenger too' },
      { id: 'MORE2', title: '➡️ More tools (2/2)', description: 'Address, socials, products, coupons' },
      { id: 'MENU', title: '⬅️ Back', description: 'Main menu' },
    ],
    'More Tools'
  );
}

// Page 2 of the tools list.
async function sendMoreMenu2(msg: BotMessage): Promise<void> {
  await replyMenu(
    msg,
    'More store tools (2 of 2):',
    '⚙️ Tools',
    [
      { id: 'HELP ADDRESS', title: '📍 Shop address', description: 'Show "Visit us" + directions' },
      { id: 'HELP SOCIALS', title: '📱 Social links', description: 'Set Instagram/Facebook/WhatsApp' },
      { id: 'HELP PRODUCT', title: '📝 Product tools', description: 'Details, options, stock, view' },
      { id: 'HELP COUPON', title: '🏷️ Coupon help', description: 'Create & delete discount codes' },
      { id: 'DESCRIBE', title: '✍️ Shop description', description: 'The blurb on your storefront' },
      { id: 'ANNOUNCE', title: '📢 Announcement bar', description: 'Scrolling notice on your store' },
      { id: 'DOMAIN', title: '🌐 Custom domain', description: 'Use your own web address' },
      { id: 'MORE', title: '⬅️ Back', description: 'Tools page 1' },
      { id: 'MENU', title: '🏠 Main menu', description: 'Start over' },
    ],
    'More Tools'
  );
}

// Surface a link as a CTA button where supported, else append the URL to text.
async function replyCta(msg: BotMessage, body: string, buttonText: string, url: string): Promise<void> {
  if (msg.sendCtaUrl) return msg.sendCtaUrl(body, buttonText, url);
  await msg.sendReply(`${body}\n\n${buttonText}: ${url}`);
}

const GREETINGS = new Set(['HI', 'HELLO', 'HEY', 'MENU', 'START', 'MAGHGO', 'HII', 'HELLO!', 'HÍ']);

// ─── Guided form flows ───────────────────────────────────────────────────────
// Instead of dumping "type REGISTER Your Store Name" instructions, the bot can
// walk the user through one question at a time, like a form:
//   register: shop name → pick a plan → payment link
//   product:  photo → name → price → created
// State lives in-memory with a TTL, keyed per channel+sender. CANCEL exits any
// flow. (For multi-instance scaling, back this with Redis.)
interface RegisterFlow {
  kind: 'register';
  step: 'name' | 'category' | 'contact' | 'address' | 'instagram' | 'logo' | 'plan';
  storeName?: string;
  category?: string;
  contact?: string;
  address?: string;
  instagram?: string;
  // Held in memory until the merchant row exists (created at the plan step),
  // then uploaded — we have nowhere to put the file before that.
  logo?: { buffer: Buffer; mime_type: string };
  logoUrl?: string;
}
interface ProductFlow {
  kind: 'product';
  step: 'photo' | 'name' | 'price' | 'bg' | 'desc' | 'opts';
  image?: { buffer: Buffer; mime_type: string };
  title?: string;
  price?: number;
}
// Connect the shop's own Razorpay from chat: key id → key secret → saved
// (secret encrypted at rest, exactly like the dashboard path).
interface PaymentsFlow { kind: 'payments'; step: 'keyid' | 'secret'; keyId?: string }
// Connect the shop's Meta (FB/Insta) catalogue from chat: catalog id → token.
interface MetaCatFlow { kind: 'metacat'; step: 'catalogid' | 'token'; catalogId?: string }
// The shop's own branded Telegram bot: paste the BotFather token → we verify,
// encrypt, store, and point its webhook at us automatically.
interface ShopBotFlow { kind: 'shopbot'; step: 'token' }
// Change the shop logo later: send a photo (or a link, or REMOVE).
interface LogoFlow { kind: 'logo'; step: 'image' }
type Flow = (RegisterFlow | ProductFlow | PaymentsFlow | MetaCatFlow | ShopBotFlow | LogoFlow) & { ts: number };

const SHOP_CATEGORIES = [
  '👕 Clothing & Fashion', '👟 Footwear', '📱 Electronics', '🛒 Grocery & Daily',
  '🍰 Food & Bakery', '💄 Beauty & Care', '🏠 Home & Decor', '🎁 Other',
];

const FLOW_TTL_MS = 30 * 60 * 1000; // 30 minutes
const flows = new Map<string, Flow>();

function pruneFlows(): void {
  const now = Date.now();
  for (const [key, val] of flows) {
    if (now - val.ts > FLOW_TTL_MS) flows.delete(key);
  }
}

// Idempotency guard: webhook providers (Meta/Twilio) retry deliveries, which
// would otherwise create duplicate products. We remember recently-processed
// message IDs for a short window and drop repeats.
const PROCESSED_MESSAGE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const processedMessages = new Map<string, number>();

function isDuplicateMessage(key: string): boolean {
  const now = Date.now();
  for (const [k, t] of processedMessages) {
    if (now - t > PROCESSED_MESSAGE_TTL_MS) processedMessages.delete(k);
  }
  if (processedMessages.has(key)) return true;
  processedMessages.set(key, now);
  return false;
}

/**
 * Send a plan's monthly/yearly payment links under the given headline.
 *
 * Razorpay is a third party and will eventually be slow, rate-limited or down.
 * When that happens the merchant must still get a comprehensible message: the
 * previous code let createPaymentLink throw out to the generic handler, so an
 * expired merchant saw "Sorry, something went wrong" and had no way to pay us.
 */
async function sendPaymentOptions(
  msg: BotMessage,
  plan: string,
  headline: string
): Promise<void> {
  try {
    const monthlyAmount = await getAmountFromPlan(plan as any, false);
    const yearlyAmount = await getAmountFromPlan(plan as any, true);
    const [monthlyLink, yearlyLink] = await Promise.all([
      createPaymentLink(msg.senderId, monthlyAmount),
      createPaymentLink(msg.senderId, yearlyAmount),
    ]);
    await msg.sendReply(
      `${headline}\n\n📅 *Pay Monthly (₹${monthlyAmount}/mo):*\n🔗 ${monthlyLink}\n\n🎉 *Pay Yearly (Save 15% - ₹${yearlyAmount}/yr):*\n🔗 ${yearlyLink}`
    );
  } catch (err) {
    console.error('❌ Could not build payment options:', err instanceof Error ? err.message : err);
    await msg.sendReply(
      `${headline}\n\n⚠️ We couldn't generate your payment link right now. Please try again in a few minutes — reply *UPGRADE* to retry.`
    );
  }
}

/**
 * Show every available plan as a tappable menu (GUI) or a numbered list
 * (fallback), instead of silently defaulting to Basic. Each row sends
 * "UPGRADE <slug>", which flows back into the existing payment-link handler.
 */
async function sendPlanMenu(msg: BotMessage, headline: string, currentPlan?: string): Promise<void> {
  const plans = await getAllPlans();
  if (plans.length === 0) {
    await msg.sendReply(`${headline}\n\nReply *UPGRADE <plan>* (e.g. UPGRADE PRO) to continue.`);
    return;
  }

  const rows = plans.slice(0, 10).map((p) => ({
    id: `UPGRADE ${p.slug}`,
    // WhatsApp list rows: title <= 24 chars, description <= 72.
    title: `${p.slug === currentPlan ? '✅ ' : ''}${p.is_custom ? `${p.name} — Let's talk` : `${p.name} · ₹${p.monthly_price}/mo`}`.slice(0, 24),
    description: (p.slug === currentPlan
      ? 'Your current plan'
      : p.is_custom
        ? 'Tailored to your needs'
        : `Up to ${p.product_limit.toLocaleString('en-IN')} products`).slice(0, 72),
  }));

  await replyMenu(msg, headline, '💳 Choose a plan', rows, 'Maghgo Plans');
}

export async function processBotMessage(msg: BotMessage): Promise<void> {
  const { channel, senderId, messageId, sendReply } = msg;

  // Drop duplicate webhook deliveries so retries don't double-process a message.
  if (messageId && isDuplicateMessage(`${channel}:${messageId}`)) {
    console.log(`↩️ Skipping duplicate message ${messageId} on ${channel}`);
    return;
  }

  // Admin kill-switch: a channel disabled in the admin panel gets one polite
  // notice and no processing. Cached (60s) and fail-open — see platform.service.
  if (!(await isChannelEnabled(channel))) {
    console.log(`⏸️ ${channel} is disabled by admin — ignoring message from ${senderId}`);
    const alt = channel === 'whatsapp'
      ? ''
      : ' — or message us on WhatsApp!';
    await sendReply(`🛠 We're briefly under maintenance on this channel. Please try again a little later${alt}`).catch(() => {});
    return;
  }

  // Bot is fully active and processing messages
  console.log(`▶️ Processing message from ${senderId} on ${channel}`);

  try {
    // ── A shop's OWN bot is a CUSTOMER channel, full stop ───────────────────
    // It exists to show that shop's products and take its orders. None of the
    // Maghgo merchant surface belongs here: before this, an unrecognised word
    // fell through to the Maghgo menu, and a customer sending a photo landed
    // in the merchant's add-product wizard ("Step 2 of 3 — what's this product
    // called?"). Store owners manage their shop on the Maghgo bot instead.
    if (msg.dedicatedStoreSlug) {
      await handleDedicatedShopMessage(msg, msg.dedicatedStoreSlug);
      return;
    }

    const flowKey = `${channel}:${senderId}`;
    pruneFlows();

    // An active form flow consumes messages first — the user is mid-wizard.
    const flow = flows.get(flowKey);
    if (flow) {
      const handled = await handleFlowMessage(msg, flow, flowKey);
      if (handled) return;
    }

    if (msg.type === 'image' && msg.image) {
      // A photo with no caption starts the add-product form: ask for the name
      // next instead of demanding a caption format. (Instagram and Facebook
      // don't support captions on images at all.)
      if (!msg.image.caption) {
        const merchant = await ensureCanAddProduct(msg);
        if (!merchant) return;
        flows.set(flowKey, { kind: 'product', step: 'name', image: { buffer: msg.image.buffer, mime_type: msg.image.mime_type }, ts: Date.now() });
        await sendReply('📸 Great photo!\n\n*Step 2 of 3 — What\'s this product called?*\n\n(e.g. Red Cotton T-Shirt. Reply CANCEL to stop.)');
        return;
      }
      await handleImageMessage(msg);
    } else if (msg.type === 'text' && msg.text) {
      // Customer shopping takes precedence: if they're mid-session or starting
      // one ("SHOP <store>"), handle it as a shopper, not a merchant command.
      if (isShopTrigger(msg.text) || hasSession(msg)) {
        const handled = await handleShopperMessage(msg, msg.text);
        if (handled) return;
      }

      await handleTextCommand(msg, msg.text!);
    }
  } catch (error) {
    console.error(`❌ Error processing message from ${senderId} on ${channel}:`, error);
    await sendReply('❌ Sorry, something went wrong on our end while processing your request. Please try again later.').catch(e => console.error('Failed to send error fallback:', e));
  }
}

/**
 * Everything arriving on a shop's own bot (its own Telegram bot, or a
 * dedicated WhatsApp number). Customer-only by design: product browsing,
 * search, cart and orders for that one shop.
 *
 * Anything the shopper flow doesn't recognise gets the shop's own help card —
 * never a Maghgo merchant reply, and never a fall-through to handleTextCommand.
 */
async function handleDedicatedShopMessage(msg: BotMessage, slug: string): Promise<void> {
  // Photos have no meaning to a shopper flow; acknowledge rather than ignore,
  // so the customer isn't left wondering, and never start a merchant wizard.
  if (msg.type === 'image') {
    if (!hasSession(msg)) await handleShopperMessage(msg, `SHOP ${slug}`);
    await msg.sendReply('📷 Thanks! I can\'t read photos — reply *SHOP* to browse products, or *HELP* to see what I can do.');
    return;
  }

  const text = (msg.text || '').trim();

  // Open (or reopen) this shop's session on first contact, so the customer is
  // scoped to the shop without ever typing "SHOP <name>".
  if (!hasSession(msg)) {
    const opened = await handleShopperMessage(msg, `SHOP ${slug}`);
    // A greeting or empty opener is fully served by the catalogue itself.
    if (!text || /^(HI|HELLO|HEY|START|MENU|HELP)$/i.test(text)) return;
    if (!opened) return;
  }

  // "SHOP <other-store>" must not let a customer hop to a different shop from
  // inside this one's bot.
  const hop = text.match(/^\s*SHOP\s+(\S+)\s*$/i);
  const normalised = hop && hop[1].toLowerCase() !== slug.toLowerCase() ? 'SHOP' : text;

  const handled = await handleShopperMessage(msg, normalised);
  if (!handled) await handleShopperMessage(msg, 'HELP');
}

/**
 * All the "may this user add a product right now?" checks in one place —
 * registered, channel allowed, subscription active, under the plan limit.
 * Replies with the right guidance itself; returns the merchant only when
 * adding may proceed.
 */
async function ensureCanAddProduct(msg: BotMessage): Promise<any | null> {
  const { channel, senderId, sendReply } = msg;

  const merchant = await getMerchantByChannel(channel, senderId);
  if (!merchant) {
    await replyButtons(msg, '❌ You\'re not registered yet on Maghgo.\n\nLet\'s set up your store — it takes under a minute!', [
      { id: 'REGISTER', title: '🚀 Create my store' },
    ]);
    return null;
  }

  if (!canUseChannel(merchant.subscription_plan, channel)) {
    const needed = minPlanForChannel(channel);
    await sendReply(
      `⚠️ *${channelLabel(channel)} needs the ${needed.toUpperCase()} plan*\n\n` +
      `Your store is on the *${merchant.subscription_plan.toUpperCase()}* plan, which doesn't include ${channelLabel(channel)}.\n\n` +
      `Reply *UPGRADE ${needed}* to unlock it.`
    );
    return null;
  }

  if (!isSubscriptionActive(merchant)) {
    if (merchant.subscription_plan === 'inactive') {
      await sendReply(`⚠️ *Store Inactive!*\n\nYour store is reserved but not yet active. Please reply with "UPGRADE" to select your plan and complete your payment.`);
    } else {
      await sendPaymentOptions(
        msg,
        merchant.subscription_plan,
        `⚠️ *Subscription Expired!*\n\nYour subscription has ended and your store is currently inactive. To reactivate your store and continue adding products, please renew your plan:`
      );
    }
    return null;
  }

  // Two independent reads → one round trip instead of two.
  const [currentProductCount, limit] = await Promise.all([
    getProductCount(merchant.id),
    getProductLimit(merchant.subscription_plan),
  ]);

  if (currentProductCount >= limit) {
    await sendReply(`⚠️ *Plan Limit Reached!*\n\nYour current plan allows a maximum of ${limit} products. Please reply with "UPGRADE" to see higher tier plans and unlock more capacity.`);
    return null;
  }

  return merchant;
}

/**
 * Smart product-type detection: classify what was just added from its title and
 * suggest the right category + buyer options (sizes for clothing, UK sizes for
 * footwear, storage for phones…). Rule-based on-device — deterministic, free,
 * and instant; no external AI call or key required.
 */
interface ProductKind {
  category: string;
  options?: string;      // ready-to-apply OPTIONS spec, e.g. "Size: S,M,L,XL"
  buttonTitle?: string;  // <= 20 chars (WhatsApp button limit)
}

function detectProductKind(title: string): ProductKind | null {
  const t = title.toLowerCase();
  if (/(t-?shirt|shirt|kurta|kurti|saree|sari|dress|top|jean|trouser|pant|hoodie|jacket|sweater|lehenga|salwar|cloth|apparel|wear)/.test(t)) {
    return { category: 'Clothing', options: 'Size: S,M,L,XL', buttonTitle: '📐 Add sizes S–XL' };
  }
  if (/(shoe|sneaker|sandal|slipper|boot|footwear|heel|loafer)/.test(t)) {
    return { category: 'Footwear', options: 'Size (UK): 6,7,8,9,10', buttonTitle: '👟 UK sizes 6–10' };
  }
  if (/(phone|mobile|laptop|tablet|ipad|macbook)/.test(t)) {
    return { category: 'Electronics', options: 'Storage: 64GB,128GB,256GB', buttonTitle: '💾 Add storage' };
  }
  if (/(earbud|headphone|earphone|speaker|smartwatch|watch|camera|charger|powerbank|tv|monitor)/.test(t)) {
    return { category: 'Electronics', options: 'Colour: Black,White', buttonTitle: '🎨 Add colours' };
  }
  if (/(bag|backpack|wallet|belt|purse|handbag|jewel|necklace|earring|bangle|ring|bracelet|accessor)/.test(t)) {
    return { category: 'Accessories', options: 'Colour: Black,Brown', buttonTitle: '🎨 Add colours' };
  }
  if (/(cake|sweet|snack|pickle|masala|spice|tea|coffee|chocolate|cookie|food)/.test(t)) {
    return { category: 'Food & Treats' };
  }
  if (/(sofa|chair|table|lamp|curtain|cushion|decor|vase|furniture|bedsheet|pillow)/.test(t)) {
    return { category: 'Home & Decor' };
  }
  return null;
}

/**
 * Every add-product path funnels here before creation: ask whether to clean the
 * background (each AI clean-up costs a credit, and many shop photos look great
 * as-is — the owner decides per product).
 */
async function askBgChoice(msg: BotMessage, flowKey: string, data: { image: { buffer: Buffer; mime_type: string }; title: string; price: number }): Promise<void> {
  flows.set(flowKey, { kind: 'product', step: 'bg', image: data.image, title: data.title, price: data.price, ts: Date.now() });
  await replyButtons(
    msg,
    `🖼 *${data.title}* — ₹${data.price.toLocaleString('en-IN')}\n\nLast thing: want me to *remove the photo background* with AI? Makes it look studio-shot.`,
    [
      { id: 'BG YES', title: '✨ Yes, clean it' },
      { id: 'BG NO', title: '📷 Keep original' },
    ]
  );
}

/** The shared tail of every add-product path: optional AI clean-up, upload, create. */
async function finishProductCreation(
  msg: BotMessage,
  merchant: any,
  title: string,
  price: number,
  image: { buffer: Buffer; mime_type: string },
  removeBg = true
): Promise<void> {
  // Instant acknowledgement so the merchant isn't left staring at silence while
  // the AI background-removal + uploads run (a few seconds). Fire-and-forget:
  // its own latency must not delay the real work.
  msg.sendReply(removeBg ? `🎨 Got it! Adding *${title}* — one moment…` : `📦 Adding *${title}* — one moment…`).catch(() => {});

  let processedBuffer: Buffer;
  if (!removeBg) {
    processedBuffer = image.buffer;
  } else {
    try {
      processedBuffer = await removeBackground(image.buffer);
    } catch (err) {
      console.warn('⚠️ Background removal failed, using original image:', err instanceof Error ? err.message : err);
      processedBuffer = image.buffer;
    }
  }

  const productId = crypto.randomUUID();

  const [originalUrl, processedUrl] = await Promise.all([
    uploadImage(merchant.id, productId, image.buffer, image.mime_type, '-original'),
    uploadImage(merchant.id, productId, processedBuffer, 'image/png', '-processed'),
  ]);

  const product = await createProduct(merchant.id, title, price, originalUrl, processedUrl);
  const storeUrl = `${env.FRONTEND_URL}/${merchant.store_slug}`;

  await msg.sendReply(
    `✅ *Product added!*\n\n📦 *${product.title}*\n💰 ₹${product.price.toLocaleString('en-IN')}\n\n🔗 ${storeUrl}`
  );
  await triggerRevalidation(merchant.store_slug);

  // Smart assist: recognise what kind of product this is and quietly set its
  // category. Best-effort — never blocks the add.
  const kind = detectProductKind(product.title);
  if (kind) setProductInfo(merchant.id, product.title, { category: kind.category }).catch(() => {});

  // Continue the form: ask for the details & specs Flipkart-style listings
  // need, both skippable so a hurried owner is never blocked.
  flows.set(`${msg.channel}:${msg.senderId}`, { kind: 'product', step: 'desc', title: product.title, ts: Date.now() });
  await replyButtons(
    msg,
    `📝 *Add a short description?*\n\nBuyers see it when they tap the product.\ne.g. _"Soft premium cotton, made in India"_\n\nType it, or skip.`,
    [{ id: 'SKIP', title: '⏭ Skip' }]
  );
}

/** Ask the options/specs question (with a smart suggestion when we have one). */
async function askOptionsStep(msg: BotMessage, title: string): Promise<void> {
  const kind = detectProductKind(title);
  const buttons: { id: string; title: string }[] = [];
  if (kind?.options && kind.buttonTitle) buttons.push({ id: kind.options, title: kind.buttonTitle });
  buttons.push({ id: 'SKIP', title: '⏭ Skip' });
  await replyButtons(
    msg,
    `📐 *Options & specs — should buyers choose before ordering?*\n\nType like:\n*Size: S,M,L,XL* — one group\n*Size: S,M,L; Colour: Red,Blue* — two groups${kind?.options ? `\n\n🤖 Looks like ${kind.category} — tap below to apply *${kind.options}* in one tap.` : ''}\n\nOr skip.`,
    buttons
  );
}

async function handleImageMessage(msg: BotMessage): Promise<void> {
  const { image, sendReply } = msg;

  const merchant = await ensureCanAddProduct(msg);
  if (!merchant) return;

  const caption = image!.caption || '';
  const parsed = parseCaption(caption);
  if (!parsed) {
    await sendReply('⚠️ Could not parse product details from your caption.\n\nPlease include a currency symbol (Rs, ₹, INR, MRP) before the price:\n📝 *Product Name Rs Price*\n\nExamples:\n• Red Cotton T-Shirt Rs 499\n• Blue Jeans ₹1,299\n• Sneakers INR 2499\n\n_Tip: you can also send the photo with no caption and I\'ll ask step by step._');
    return;
  }

  await askBgChoice(msg, `${msg.channel}:${msg.senderId}`, {
    image: { buffer: image!.buffer, mime_type: image!.mime_type },
    title: parsed.title,
    price: parsed.price,
  });
}

/**
 * Drive an active form flow. Returns true when the message was consumed.
 * CANCEL always exits; MENU exits and falls through to the menu.
 */
async function handleFlowMessage(msg: BotMessage, flow: Flow, flowKey: string): Promise<boolean> {
  const text = (msg.type === 'text' ? msg.text || '' : '').trim();
  const upper = text.toUpperCase();

  // Universal escapes.
  if (upper === 'CANCEL' || upper === 'STOP' || upper === 'EXIT') {
    flows.delete(flowKey);
    await msg.sendReply('❎ Cancelled. Reply *MENU* any time.');
    return true;
  }
  if (upper === 'MENU' || isShopTrigger(text)) {
    flows.delete(flowKey);
    return false; // fall through to normal handling
  }
  flow.ts = Date.now();

  // ── Register wizard ────────────────────────────────────────────────────────
  if (flow.kind === 'register') {
    // The logo step is the one place a photo is the expected answer.
    if (flow.step !== 'logo' && (msg.type !== 'text' || !text)) {
      await msg.sendReply('✍️ Please reply with text (or CANCEL to stop).');
      return true;
    }

    if (flow.step === 'name') {
      const storeSlug = buildStoreSlug(text);
      if (!storeSlug) {
        await msg.sendReply('⚠️ Please choose a shop name with letters or numbers in it (e.g. Ramesh Mobiles).');
        return true;
      }
      flow.storeName = text;
      flow.step = 'category';
      await replyMenu(
        msg,
        `Nice — *${text}* it is! 🏪\n\n*Step 2 of 7 — what do you sell?* (tap one, or type your own)`,
        '🗂 Choose',
        SHOP_CATEGORIES.map((c) => ({ id: c, title: c.slice(0, 24) })),
        'Shop Category'
      );
      return true;
    }

    if (flow.step === 'category') {
      flow.category = text.replace(/^[^\w]*/, '').trim().slice(0, 60) || 'Other';
      flow.step = 'contact';
      const isWa = msg.channel === 'whatsapp';
      await replyButtons(
        msg,
        `*Step 3 of 7 — contact number for customers* 📞\n\nThis shows on your storefront's WhatsApp/Call buttons.${isWa ? '\n\nTap below to use this number, or type another.' : '\n\nType the number (e.g. 9198xxxxxxx), or SKIP.'}`,
        isWa
          ? [{ id: 'USE THIS NUMBER', title: '✅ Use this number' }, { id: 'SKIP', title: '⏭ Skip' }]
          : [{ id: 'SKIP', title: '⏭ Skip' }]
      );
      return true;
    }

    if (flow.step === 'contact') {
      if (upper === 'USE THIS NUMBER') flow.contact = msg.senderId;
      else if (upper !== 'SKIP') {
        const digits = text.replace(/\D/g, '');
        if (digits.length < 10) {
          await msg.sendReply('⚠️ That doesn\'t look like a phone number. Type it like 9198xxxxxxx, or SKIP.');
          return true;
        }
        flow.contact = digits;
      }
      flow.step = 'address';
      await replyButtons(msg, '*Step 4 of 7 — shop address* 📍\n\nCustomers see "Visit us" with a directions button.\n\nType it (e.g. 12 MG Road, Villupuram), or SKIP.', [
        { id: 'SKIP', title: '⏭ Skip' },
      ]);
      return true;
    }

    if (flow.step === 'address') {
      if (upper !== 'SKIP') flow.address = text.slice(0, 300);
      flow.step = 'instagram';
      await replyButtons(msg, '*Step 5 of 7 — Instagram handle* 📸\n\nShown as a button on your storefront.\n\nType it (e.g. mystore), or SKIP.', [
        { id: 'SKIP', title: '⏭ Skip' },
      ]);
      return true;
    }

    if (flow.step === 'instagram') {
      if (upper !== 'SKIP') flow.instagram = text.replace(/^@/, '').trim().slice(0, 60);
      flow.step = 'logo';
      await replyButtons(msg, '*Step 6 of 7 — your shop logo* 🖼\n\nSend it as a *photo* now, or paste an image link. It appears on your storefront, your share previews and the marketplace.\n\nNo logo yet? Tap Skip — you can add it later with *SET LOGO*.', [
        { id: 'SKIP', title: '⏭ Skip' },
      ]);
      return true;
    }

    if (flow.step === 'logo') {
      if (msg.type === 'image' && msg.image) {
        flow.logo = { buffer: msg.image.buffer, mime_type: msg.image.mime_type };
      } else if (upper !== 'SKIP') {
        // A pasted link is fine too; anything else, ask again rather than
        // silently dropping their logo.
        if (/^https?:\/\/\S+$/i.test(text)) {
          flow.logoUrl = text.trim().slice(0, 500);
        } else {
          await msg.sendReply('🖼 Send the logo as a *photo*, paste an image link, or reply SKIP.');
          return true;
        }
      }
      flow.step = 'plan';
      await sendPlanMenu(msg, `Almost done! 🎯\n\n*Step 7 of 7 — pick your plan:*\n(Reply with a plan name, or CANCEL to stop.)`);
      return true;
    }

    if (flow.step === 'plan') {
      // Accept a tapped "UPGRADE <slug>" row or a typed plan name.
      const token = (upper.startsWith('UPGRADE ') ? upper.substring(8) : upper).trim().toLowerCase();
      const plans = await getAllPlans();
      const plan = plans.find((p) => p.slug === token || p.name.toLowerCase() === token);
      if (!plan) {
        await msg.sendReply(`⚠️ I didn't recognise that plan. ${plans.length ? `Try one of: ${plans.map((p) => p.name).join(', ')}` : ''}\n\n(or CANCEL to stop)`);
        return true;
      }

      const storeName = flow.storeName!;
      flows.delete(flowKey);

      // Never register onto a plan that can't use the channel they're on.
      let requestedPlan = plan.slug.toUpperCase();
      let channelUpgradeNote = '';
      const minForChannel = minPlanForChannel(msg.channel);
      if (requestedPlan !== 'CUSTOM' && !hasAccess(minForChannel, plan.slug)) {
        channelUpgradeNote =
          `\n\n_Note: ${channelLabel(msg.channel)} needs the ${minForChannel.toUpperCase()} plan, ` +
          `so we've selected that instead of ${requestedPlan}._`;
        requestedPlan = minForChannel.toUpperCase();
      }

      try {
        // Validated at the name step, but re-check for the type system (and in
        // case a pathological name slips through).
        const storeSlug = buildStoreSlug(storeName);
        if (!storeSlug) {
          await msg.sendReply('⚠️ That shop name can\'t be used. Reply *REGISTER* to start again with a name containing letters or numbers.');
          return true;
        }
        const newMerchant = await createMerchant(msg.channel, msg.senderId, storeName, storeSlug);

        // Apply everything collected in the wizard. Best-effort: a failed
        // detail must never fail a successful registration.
        const applied: string[] = [];
        if (flow.category) { await updateStoreCategory(newMerchant.id, flow.category).then(() => applied.push(`🗂 ${flow.category}`), () => {}); }
        if (flow.contact) { await updateMerchantSocial(newMerchant.id, 'phone_number', flow.contact).then(() => applied.push('📞 contact'), () => {}); }
        if (flow.address) { await updateStoreAddress(newMerchant.id, flow.address).then(() => applied.push('📍 address'), () => {}); }
        if (flow.instagram) { await updateMerchantSocial(newMerchant.id, 'instagram_handle', flow.instagram).then(() => applied.push('📸 @' + flow.instagram), () => {}); }
        if (flow.logo || flow.logoUrl) {
          try {
            const url = flow.logo
              ? await uploadImage(newMerchant.id, 'store-logo', flow.logo.buffer, flow.logo.mime_type)
              : flow.logoUrl!;
            await updateStoreLogo(newMerchant.id, url);
            applied.push('🖼 logo');
          } catch { /* a logo must never fail a registration */ }
        }
        if (applied.length) {
          await msg.sendReply(`✅ Saved your shop details: ${applied.join(' · ')}`).catch(() => {});
        }

        if (requestedPlan === 'CUSTOM') {
          await msg.sendReply(`🎉 *Welcome to Maghgo!*\n\nYour store *${newMerchant.store_name}* has been reserved.\n\nOur team will contact you shortly to set up your Custom plan.`);
          return true;
        }
        await sendPaymentOptions(
          msg,
          requestedPlan,
          `🎉 *Welcome to Maghgo!*\n\nYour store *${newMerchant.store_name}* has been reserved.${channelUpgradeNote}\n\n🚀 To activate it and start adding products, complete your payment for the *${requestedPlan} Plan*:`
        );
      } catch (err: any) {
        await msg.sendReply(`❌ ${err.message || 'Failed to create store.'}`);
      }
      return true;
    }
  }

  // ── Change shop logo ───────────────────────────────────────────────────────
  if (flow.kind === 'logo') {
    const merchant = await getMerchantByChannel(msg.channel, msg.senderId);
    if (!merchant) { flows.delete(flowKey); await msg.sendReply('⚠️ Please register first — reply *REGISTER*.'); return true; }
    try {
      if (msg.type === 'image' && msg.image) {
        const url = await uploadImage(merchant.id, 'store-logo', msg.image.buffer, msg.image.mime_type);
        await updateStoreLogo(merchant.id, url);
      } else if (upper === 'REMOVE' || upper === 'OFF') {
        await updateStoreLogo(merchant.id, null);
        flows.delete(flowKey);
        await msg.sendReply('🖼 Logo removed from your storefront.');
        await triggerRevalidation(merchant.store_slug);
        return true;
      } else if (/^https?:\/\/\S+$/i.test(text)) {
        await updateStoreLogo(merchant.id, text.trim().slice(0, 500));
      } else {
        await msg.sendReply('🖼 Send your logo as a *photo*, paste an image link, reply REMOVE to clear it, or CANCEL.');
        return true;
      }
      flows.delete(flowKey);
      await msg.sendReply(`🖼 *Logo saved!*\n\nIt now shows on your storefront, share previews and the Maghgo marketplace.\n\n🔗 ${env.FRONTEND_URL}/${merchant.store_slug}`);
      await triggerRevalidation(merchant.store_slug);
    } catch (err: any) {
      flows.delete(flowKey);
      await msg.sendReply(`❌ ${err.message || 'Could not save the logo.'}`);
    }
    return true;
  }

  // ── Add-product wizard ─────────────────────────────────────────────────────
  if (flow.kind === 'product') {
    if (flow.step === 'photo') {
      if (msg.type === 'image' && msg.image) {
        // Caption with name+price short-circuits to the background question.
        const parsed = msg.image.caption ? parseCaption(msg.image.caption) : null;
        if (parsed) {
          const merchant = await ensureCanAddProduct(msg);
          if (!merchant) { flows.delete(flowKey); return true; }
          await askBgChoice(msg, flowKey, { image: { buffer: msg.image.buffer, mime_type: msg.image.mime_type }, title: parsed.title, price: parsed.price });
          return true;
        }
        flow.image = { buffer: msg.image.buffer, mime_type: msg.image.mime_type };
        flow.step = 'name';
        await msg.sendReply('📸 Great photo!\n\n*Step 2 of 3 — What\'s this product called?*\n\n(e.g. Red Cotton T-Shirt)');
        return true;
      }
      await msg.sendReply('📸 *Step 1 of 3 — Send me a photo of the product.*\n\n(Reply CANCEL to stop.)');
      return true;
    }

    if (flow.step === 'name') {
      if (msg.type !== 'text' || !text) {
        await msg.sendReply('✍️ Please reply with the product name (or CANCEL).');
        return true;
      }
      // "Red Shirt ₹499" in one go: accept name and price together.
      const parsed = parseCaption(text);
      if (parsed) {
        const merchant = await ensureCanAddProduct(msg);
        if (!merchant) { flows.delete(flowKey); return true; }
        await askBgChoice(msg, flowKey, { image: flow.image!, title: parsed.title, price: parsed.price });
        return true;
      }
      flow.title = text.slice(0, 200);
      flow.step = 'price';
      await msg.sendReply(`💰 *Step 3 of 3 — How much is "${flow.title}"?*\n\nJust the number (e.g. 499).`);
      return true;
    }

    if (flow.step === 'price') {
      const m = text.replace(/[₹,]/g, '').match(/(\d+(?:\.\d{1,2})?)/);
      const price = m ? Math.round(parseFloat(m[1])) : NaN;
      if (!Number.isFinite(price) || price <= 0) {
        await msg.sendReply('⚠️ Please send just the price as a number, e.g. *499* (or CANCEL).');
        return true;
      }
      const merchant = await ensureCanAddProduct(msg);
      if (!merchant) { flows.delete(flowKey); return true; }
      await askBgChoice(msg, flowKey, { image: flow.image!, title: flow.title!, price });
      return true;
    }

    // Post-creation: description → options, both skippable.
    if (flow.step === 'desc') {
      if (msg.type !== 'text' || !text) { await msg.sendReply('✍️ Type the description, or SKIP.'); return true; }
      if (upper !== 'SKIP') {
        const merchant = await getMerchantByChannel(msg.channel, msg.senderId);
        if (merchant) {
          await setProductInfo(merchant.id, flow.title!, { description: text }).catch(() => {});
          await triggerRevalidation(merchant.store_slug).catch(() => {});
          await msg.sendReply('📝 Description saved!');
        }
      }
      flow.step = 'opts';
      await askOptionsStep(msg, flow.title!);
      return true;
    }

    if (flow.step === 'opts') {
      if (msg.type !== 'text' || !text) { await msg.sendReply('✍️ Type the options (e.g. Size: S,M,L), or SKIP.'); return true; }
      if (upper === 'SKIP') {
        flows.delete(flowKey);
        await replyButtons(msg, '👍 All set! What next?', [
          { id: 'ADD', title: '➕ Add another' },
          { id: 'LIST', title: '📦 My products' },
          { id: 'MENU', title: '📋 Menu' },
        ]);
        return true;
      }
      // Accept "Size: S,M,L; Colour: Red,Blue" (also tolerate a pasted full
      // "OPTIONS name - spec" command).
      const spec = /^OPTIONS\s/i.test(text) ? text.split(/\s+-\s+/).slice(1).join(' - ') : text;
      const variants = spec.split(';').map((group) => {
        const [gName, gValues] = group.split(':');
        return {
          name: (gName || '').trim().slice(0, 40),
          values: (gValues || '').split(',').map((v) => v.trim().slice(0, 40)).filter(Boolean).slice(0, 20),
        };
      }).filter((g) => g.name && g.values.length > 0).slice(0, 6);

      if (variants.length === 0) {
        await msg.sendReply('⚠️ I couldn\'t read that. Example:\n*Size: S,M,L; Colour: Red,Blue*\n\n(or SKIP)');
        return true;
      }
      flows.delete(flowKey);
      const merchant = await getMerchantByChannel(msg.channel, msg.senderId);
      if (merchant) {
        try {
          await setProductInfo(merchant.id, flow.title!, { variants });
          await triggerRevalidation(merchant.store_slug).catch(() => {});
          const summary = variants.map((v) => `${v.name}: ${v.values.join(', ')}`).join(' · ');
          await replyButtons(msg, `📐 *Options saved!* ${summary}\n\nBuyers now pick these before adding to cart. What next?`, [
            { id: 'ADD', title: '➕ Add another' },
            { id: 'LIST', title: '📦 My products' },
            { id: 'MENU', title: '📋 Menu' },
          ]);
        } catch (err: any) {
          await msg.sendReply(`❌ ${err.message || 'Could not save the options.'}`);
        }
      }
      return true;
    }

    // The owner decides whether this photo gets the AI clean-up.
    if (flow.step === 'bg') {
      const yes = upper === 'BG YES' || upper === 'YES' || upper === 'Y';
      const no = upper === 'BG NO' || upper === 'NO' || upper === 'N';
      if (!yes && !no) {
        await replyButtons(msg, '🖼 Remove the photo background?', [
          { id: 'BG YES', title: '✨ Yes, clean it' },
          { id: 'BG NO', title: '📷 Keep original' },
        ]);
        return true;
      }
      flows.delete(flowKey);
      const merchant = await ensureCanAddProduct(msg);
      if (merchant) await finishProductCreation(msg, merchant, flow.title!, flow.price!, flow.image!, yes);
      return true;
    }
  }

  // ── Connect-payments wizard ────────────────────────────────────────────────
  if (flow.kind === 'payments') {
    if (msg.type !== 'text' || !text) {
      await msg.sendReply('✍️ Please reply with text (or CANCEL to stop).');
      return true;
    }

    if (flow.step === 'keyid') {
      const keyId = text.trim();
      if (!/^rzp_(live|test)_[A-Za-z0-9]+$/.test(keyId)) {
        await msg.sendReply('⚠️ That doesn\'t look like a Razorpay Key ID.\n\nIt starts with *rzp_live_* (or rzp_test_). Find it in your Razorpay Dashboard → Settings → API Keys.\n\n(or CANCEL)');
        return true;
      }
      flow.keyId = keyId;
      flow.step = 'secret';
      await msg.sendReply('🔑 Got it.\n\n*Step 2 of 2 — now paste your Key Secret* (shown next to the Key ID when you generate it).\n\n🔒 It\'s stored encrypted. For extra safety, delete your message after I confirm.');
      return true;
    }

    if (flow.step === 'secret') {
      const secret = text.trim();
      if (secret.length < 10) {
        await msg.sendReply('⚠️ That looks too short for a Key Secret. Paste the full secret (or CANCEL).');
        return true;
      }
      flows.delete(flowKey);
      try {
        const merchant = await getMerchantByChannel(msg.channel, msg.senderId);
        if (!merchant) { await msg.sendReply('❌ Please REGISTER first.'); return true; }
        await setRazorpayKeys(merchant.id, flow.keyId!, encryptSecret(secret));
        await msg.sendReply('✅ *Online payments connected!*\n\nCustomers now get a *Pay Online* option at checkout, and the money goes straight to *your* bank.\n\n🧹 _Tip: delete your last message (the secret) from this chat._');
      } catch (err: any) {
        await msg.sendReply(`❌ ${err.message || 'Could not save your payment keys.'}`);
      }
      return true;
    }
  }

  // ── Own-Telegram-bot wizard ────────────────────────────────────────────────
  if (flow.kind === 'shopbot') {
    if (msg.type !== 'text' || !text) {
      await msg.sendReply('✍️ Please paste the bot token (or CANCEL).');
      return true;
    }
    if (flow.step === 'token') {
      const tok = text.trim();
      if (!/^\d{6,}:[A-Za-z0-9_-]{30,}$/.test(tok)) {
        await msg.sendReply('⚠️ That doesn\'t look like a bot token (format: 123456789:AAAA…). Copy it exactly from @BotFather (or CANCEL).');
        return true;
      }
      flows.delete(flowKey);
      const merchant = await getMerchantByChannel(msg.channel, msg.senderId);
      if (!merchant) { await msg.sendReply('❌ Please REGISTER first.'); return true; }
      try {
        const username = await validateBotToken(tok);
        const secret = require('crypto').randomBytes(16).toString('hex');
        // Save BEFORE pointing the webhook, so the first update finds the row.
        await setShopTelegramBot(merchant.id, encryptSecret(tok), username, secret);
        await setShopWebhook(tok, merchant.id, secret, publicBaseUrl()!);
        await msg.sendReply(`🎉 *t.me/${username} is LIVE!*\n\nAnyone who messages it shops *${merchant.store_name}* directly — browsing, cart, coupons, payment, tracking. You (this account) get owner tools there too.\n\n📣 Put the link in your Instagram bio & posters!\n🧹 _Delete your last message (the token) from this chat._`);
      } catch (err: any) {
        await msg.sendReply(`❌ ${err.message || 'Could not connect your bot.'}\n\nReply *CONNECT TELEGRAM* to try again.`);
      }
      return true;
    }
  }

  // ── Connect-Meta-catalogue wizard ──────────────────────────────────────────
  if (flow.kind === 'metacat') {
    if (msg.type !== 'text' || !text) {
      await msg.sendReply('✍️ Please reply with text (or CANCEL to stop).');
      return true;
    }

    if (flow.step === 'catalogid') {
      const id = text.trim();
      if (!/^\d{5,}$/.test(id)) {
        await msg.sendReply('⚠️ A Catalog ID is a long number (e.g. 1234567890123456). Check Commerce Manager and paste it again (or CANCEL).');
        return true;
      }
      flow.catalogId = id;
      flow.step = 'token';
      await msg.sendReply('🔑 Got it.\n\n*Step 2 of 2 — paste your Meta access token* (Business Settings → System Users → generate with catalogue access).\n\n🔒 Stored encrypted. Delete your message after I confirm.');
      return true;
    }

    if (flow.step === 'token') {
      flows.delete(flowKey);
      const merchant = await getMerchantByChannel(msg.channel, msg.senderId);
      if (!merchant) { await msg.sendReply('❌ Please REGISTER first.'); return true; }
      try {
        await connectMetaCatalog(merchant.id, flow.catalogId!, text.trim());
        await replyButtons(msg, '✅ *Meta catalogue connected!*\n\n🧹 _Delete your last message (the token) from this chat._\n\nReady to pull your products in?', [
          { id: 'IMPORT META', title: '📷 Import now' },
          { id: 'MENU', title: '📋 Menu' },
        ]);
      } catch (err: any) {
        await msg.sendReply(`❌ ${err.message || 'Could not connect the catalogue.'}\n\nReply *CONNECT META* to try again.`);
      }
      return true;
    }
  }

  flows.delete(flowKey);
  return false;
}

async function handleTextCommand(msg: BotMessage, text: string): Promise<void> {
  const { channel, senderId, sendReply } = msg;
  const command = text.trim().toUpperCase();

  // "RATE 5" / "RATE 4 great service" — a CUSTOMER rating their latest
  // delivered order (prompted by the delivered notification). Runs before any
  // merchant logic: raters usually aren't merchants.
  {
    const rm = command.match(/^RATE\s+([1-5])\b/);
    if (rm && (channel === 'whatsapp' || channel === 'sms')) {
      const rating = parseInt(rm[1], 10);
      const comment = text.trim().replace(/^RATE\s+[1-5]\s*/i, '').trim() || undefined;
      try {
        const storeName = await addReviewByPhone(senderId, rating, comment);
        if (storeName) {
          await sendReply(`${'⭐'.repeat(rating)} Thank you! Your ${rating}-star rating for *${storeName}* has been saved. 🙏`);
        } else {
          await sendReply('🙏 Thanks! I couldn\'t find a delivered order for this number to attach the rating to.');
        }
      } catch (err: any) {
        await sendReply('❌ Could not save your rating right now. Please try again later.');
      }
      return;
    }
  }

  // Bare REGISTER starts the guided form: name → category → contact → address
  // → instagram → plan. (REGISTER <name> [- PLAN] below still works one-shot.)
  if (command === 'REGISTER') {
    const existing = await getMerchantByChannel(channel, senderId);
    if (existing) {
      await sendReply(`✅ You already have a store registered: *${existing.store_name}*\n\nLink: ${env.FRONTEND_URL}/${existing.store_slug}`);
      return;
    }
    flows.set(`${channel}:${senderId}`, { kind: 'register', step: 'name', ts: Date.now() });
    await sendReply('🏪 *Let\'s create your store! — Step 1 of 6*\n\nWhat\'s your shop\'s name?\n\n(e.g. Ramesh Mobiles — reply CANCEL to stop)');
    return;
  }

  if (command.startsWith('REGISTER ')) {
    const input = text.substring(9).trim();
    let storeName = input;
    let requestedPlan = 'BASIC';
    
    if (input.includes('-')) {
      const parts = input.split('-');
      storeName = parts[0].trim();
      requestedPlan = parts[1].trim().toUpperCase();
      if (!['BASIC', 'STARTER', 'PRO', 'ADVANCED', 'PREMIUM', 'BUSINESS', 'AGENCY', 'VIP', 'ENTERPRISE', 'CUSTOM'].includes(requestedPlan)) {
        requestedPlan = 'BASIC';
      }
    }

    if (!storeName || storeName.toUpperCase() === '[TYPE YOUR STORE NAME HERE]') {
      await sendReply('⚠️ Please replace the brackets with your actual store name.\n\nExample: REGISTER Ramesh Mobiles - BASIC');
      return;
    }

    const existing = await getMerchantByChannel(channel, senderId);
    if (existing) {
      await sendReply(`✅ You already have a store registered: *${existing.store_name}*\n\nLink: ${env.FRONTEND_URL}/${existing.store_slug}`);
      return;
    }

    // Never register someone onto a plan that cannot use the channel they are
    // standing in — they'd be locked out of their own store the moment they
    // finished signing up. Raise the plan to the cheapest one that covers it
    // and say so, rather than silently charging them more.
    let channelUpgradeNote = '';
    const minForChannel = minPlanForChannel(channel);
    if (requestedPlan !== 'CUSTOM' && !hasAccess(minForChannel, requestedPlan.toLowerCase())) {
      channelUpgradeNote =
        `\n\n_Note: ${channelLabel(channel)} needs the ${minForChannel.toUpperCase()} plan, ` +
        `so we've selected that instead of ${requestedPlan}._`;
      requestedPlan = minForChannel.toUpperCase();
    }

    try {
      // Storefronts live at the URL root, so the slug must not collide with a
      // static page like /login — that store would be permanently unreachable.
      const storeSlug = buildStoreSlug(storeName);
      if (!storeSlug) {
        await sendReply('⚠️ Please choose a store name that contains letters or numbers.\n\nExample: REGISTER Ramesh Mobiles');
        return;
      }
      const newMerchant = await createMerchant(channel, senderId, storeName, storeSlug);
      
      if (requestedPlan === 'CUSTOM') {
        await sendReply(`🎉 *Welcome to Maghgo!*\n\nYour store *${newMerchant.store_name}* has been reserved.\n\nOur team will contact you shortly to set up your Custom plan.`);
        return;
      }

      // The store already exists at this point. sendPaymentOptions never
      // throws, so a Razorpay hiccup can't make us report "Failed to create
      // store" for a store that was in fact created — which would leave the
      // merchant re-registering into an "already registered" dead end.
      await sendPaymentOptions(
        msg,
        requestedPlan,
        `🎉 *Welcome to Maghgo!*\n\nYour store *${newMerchant.store_name}* has been reserved.${channelUpgradeNote}\n\n🚀 To activate your store and start adding products, please complete your payment for the *${requestedPlan} Plan*:`
      );
    } catch (err: any) {
      await sendReply(`❌ ${err.message || 'Failed to create store.'}`);
    }
    return;
  }

  if (command.startsWith('LINK ') || command === 'LINK') {
    const code = command.substring(4).trim().toUpperCase();
    
    // If they provided a code, they are trying to link THIS channel to an existing store.
    if (code) {
      try {
        const linkedMerchant = await linkChannelToMerchant(code, channel, senderId);
        await sendReply(`✅ *Successfully Linked!*\n\nThis account is now securely linked to your store: *${linkedMerchant.store_name}*.\n\nYou can now manage your store, add products, and check your status directly from here. Try typing *STATUS*.`);
      } catch (err: any) {
        await sendReply(`❌ ${err.message || 'Failed to link account.'}\n\nPlease make sure you generated the code from your original channel and that it hasn't expired.`);
      }
      return;
    }
  }

  const merchant = await getMerchantByChannel(channel, senderId);
  if (!merchant) {
    // Returning CUSTOMER, not a merchant: if this number has ordered before,
    // greet them as a shopper and offer one-tap re-entry to their recent
    // store(s) — don't pitch them "create a store".
    if (channel === 'whatsapp' || channel === 'sms') {
      const phone = normalizePhone(senderId);
      const { data: pastOrders } = await supabase
        .from('order_logs')
        .select('merchant_id')
        .eq('customer_phone', phone)
        .order('created_at', { ascending: false })
        .limit(10);
      const merchantIds = [...new Set((pastOrders ?? []).map((o: any) => o.merchant_id))].slice(0, 2);
      if (merchantIds.length > 0) {
        const { data: shops } = await supabase
          .from('merchants')
          .select('store_name, store_slug')
          .in('id', merchantIds)
          .eq('is_active', true);
        if (shops && shops.length > 0) {
          await replyButtons(
            msg,
            `👋 Welcome back! Continue shopping?`,
            [
              ...shops.map((sh: any) => ({ id: `SHOP ${sh.store_slug}`, title: `🛍️ ${sh.store_name}`.slice(0, 20) })),
              { id: 'REGISTER', title: '🚀 Open my own shop' },
            ].slice(0, 3)
          );
          return;
        }
      }
    }

    await replyButtons(
      msg,
      '👋 Welcome to *Maghgo* — turn your chats into a web store.\n\nTap the button (or reply *REGISTER*) and I\'ll set up your store step by step.\n\nAlready have a store on another app? Reply with your link code (e.g. LINK A9F3K2).',
      [{ id: 'REGISTER', title: '🚀 Create my store' }]
    );
    return;
  }

  // A greeting (or the Menu button) opens the tappable main menu.
  if (GREETINGS.has(command)) {
    await sendMainMenu(msg, merchant);
    return;
  }

  // If they typed LINK without a code, they are trying to generate a code to use elsewhere.
  if (command === 'LINK') {
    try {
      const code = await generateLinkCode(channel, senderId);
      await sendReply(`🔗 *Multi-Channel Link Code*\n\nYour secure link code is: *${code}*\n\nTo manage this store from another app (like Instagram or Messenger), message our bot on that app with this exact text:\n\nLINK ${code}\n\n_Note: This code will expire once used._`);
    } catch (err: any) {
      await sendReply('❌ Failed to generate link code. Please try again later.');
    }
    return;
  }

  if (command.startsWith('UPGRADE') || command.includes('I WANT TO BUY')) {
    const priceMatch = command.match(/₹(\d+)/);
    const planToken = command.split(' ')[1];

    // Just "UPGRADE" with no plan → show ALL plans to choose from, rather than
    // silently assuming Basic.
    if (!priceMatch && !planToken) {
      await sendPlanMenu(msg, '🚀 *Choose your Maghgo plan* — tap one to get a payment link:', merchant.subscription_plan);
      return;
    }

    let plan = 'BASIC';
    let amount = 99;

    if (priceMatch && priceMatch[1]) {
      amount = parseInt(priceMatch[1], 10);
      const matchedPlan = await getPlanFromAmount(amount);
      if (matchedPlan) {
        plan = matchedPlan;
      }
    } else {
      plan = planToken.toLowerCase(); // lowercased for getAmountFromPlan
      amount = await getAmountFromPlan(plan as any);
    }
    
    if (amount === 0 || plan.toLowerCase() === 'custom') {
      await sendReply(`🎉 Great! Your custom request is noted. If you haven't registered yet, simply type *REGISTER Your Store Name*. If you already registered, you're good to go!`);
      return;
    }
    
    await sendPaymentOptions(
      msg,
      plan,
      `🚀 *Upgrade your Maghgo Plan!*\n\nPlease complete your payment for the *${plan.toUpperCase()} Plan* to unlock your limits:`
    );
    return;
  }

  // Channel access. Deliberately placed AFTER the UPGRADE handler above, so a
  // merchant on the wrong plan can always reach the thing that fixes it, and
  // HELP/STATUS/RESUME/PAUSE/LOGIN stay available so they are never left without
  // an explanation or a way out.
  if (!canUseChannel(merchant.subscription_plan, channel)
      && command !== 'HELP' && command !== 'STATUS'
      && command !== 'RESUME' && command !== 'PAUSE' && command !== 'LOGIN') {
    const needed = minPlanForChannel(channel);
    await sendReply(
      `⚠️ *${channelLabel(channel)} needs the ${needed.toUpperCase()} plan*\n\n` +
      `Your store is on the *${merchant.subscription_plan.toUpperCase()}* plan, which doesn't include ${channelLabel(channel)}.\n\n` +
      `Reply *UPGRADE ${needed}* to unlock it — or keep managing your store on WhatsApp or your web dashboard.`
    );
    return;
  }

  // PAUSE and RESUME are operational store toggles — they must remain available
  // regardless of subscription status so a merchant is never permanently locked
  // out of their own pause switch. LOGIN is similarly always reachable so the
  // merchant can access the web dashboard to renew from there.
  const PLAN_CMDS = new Set(['MYPLAN', 'MY PLAN', 'PLAN', 'SUBSCRIPTION', 'EXPIRY', 'RENEW', 'BILLING', 'RESUME', 'PAUSE', 'LOGIN']);
  if (!isSubscriptionActive(merchant) && command !== 'HELP' && command !== 'STATUS' && !PLAN_CMDS.has(command)) {
    if (merchant.subscription_plan === 'inactive') {
      await sendReply(`⚠️ *Store Inactive!*\n\nYour store is reserved but not yet active. Please reply with "UPGRADE" to select your plan and complete your payment.`);
    } else {
      await sendPaymentOptions(
        msg,
        merchant.subscription_plan,
        `⚠️ *Subscription Expired!*\n\nYour *${merchant.subscription_plan.toUpperCase()}* plan ended on *${getSubscriptionStatus(merchant).endsAtLabel}* (${Math.abs(getSubscriptionStatus(merchant).daysLeft)} day(s) ago).\n\nYour storefront is offline until you renew. Everything — products, orders, theme — is safe and comes straight back.\n\nRenew your plan:`
      );
    }
    return;
  }

  // ── Plan & expiry ──────────────────────────────────────────────────────────
  // Reachable even when expired (see PLAN_CMDS above): a merchant whose plan has
  // lapsed is exactly the person who needs to see the date.
  if (PLAN_CMDS.has(command)) {
    const st = getSubscriptionStatus(merchant);
    const [count, limit] = await Promise.all([
      getProductCount(merchant.id),
      getProductLimit(merchant.subscription_plan),
    ]);

    let headline: string;
    if (st.plan === 'inactive') {
      headline = `⚠️ *No active plan*\n\nYour store *${merchant.store_name}* is reserved but not live yet. Pick a plan to switch it on.`;
    } else if (st.expired) {
      headline =
        `🔴 *Your ${st.plan.toUpperCase()} plan has expired*\n\n` +
        `📅 Ended: *${st.endsAtLabel}* (${Math.abs(st.daysLeft)} day(s) ago)\n` +
        `🏪 ${merchant.store_name} — storefront is *offline*\n` +
        `📦 Products: ${count}${limit ? ` / ${limit}` : ''} (all safe)\n\n` +
        `Renew and your store is back instantly.`;
    } else {
      const bar = st.expiringSoon ? '🟠' : '🟢';
      headline =
        `${bar} *Your plan: ${st.plan.toUpperCase()}*\n\n` +
        `📅 Renews/expires: *${st.endsAtLabel}*\n` +
        `⏳ *${st.daysLeft} day(s) left*\n` +
        `🏪 ${merchant.store_name} — storefront is *live*\n` +
        `📦 Products: ${count}${limit ? ` / ${limit}` : ''}\n` +
        (st.expiringSoon
          ? `\n⚠️ Renew soon — when a plan lapses your storefront goes offline until it's paid.`
          : '');
    }

    if (st.expired || st.plan === 'inactive') {
      await sendPaymentOptions(msg, st.plan === 'inactive' ? 'basic' : st.plan, headline);
    } else {
      await replyButtons(msg, headline, [
        { id: `UPGRADE ${st.plan}`, title: '🔄 Renew now' },
        { id: 'UPGRADE', title: '🚀 Change plan' },
        { id: 'MENU', title: '📋 Menu' },
      ]);
    }
    return;
  }

  if (command === 'LOGIN') {
    // Generate JWT token valid for 24 hours
    const token = jwt.sign({ merchantId: merchant.id }, env.JWT_SECRET, { expiresIn: '24h' });
    const dashboardUrl = `${env.FRONTEND_URL}/dashboard?token=${token}`;
    await sendReply(`🔐 *Merchant Dashboard Login*\n\nClick the link below to securely access your store dashboard on the web:\n\n🔗 ${dashboardUrl}\n\n_Note: This link will expire in 24 hours. Do not share it with anyone._`);
    return;
  }

  // Guided add-product form (also triggered by the ➕ menu row and buttons).
  if (command === 'ADD' || command === 'ADD PRODUCT' || command === 'NEW PRODUCT') {
    const ok = await ensureCanAddProduct(msg);
    if (!ok) return;
    flows.set(`${channel}:${senderId}`, { kind: 'product', step: 'photo', ts: Date.now() });
    await sendReply('🧾 *New product — Step 1 of 3*\n\n📸 Send me a photo of the product.\n\n_Tip: a photo with the caption "Red Shirt ₹499" skips straight to done._\n(Reply CANCEL to stop.)');
    return;
  }

  if (command === 'LIST') {
    const products = await getProducts(merchant.id);
    const storeUrl = `${env.FRONTEND_URL}/${merchant.store_slug}`;
    if (products.length === 0) {
      await replyButtons(msg, '📭 Your store has no products yet.\n\nSend a product photo with a caption to add one!', [
        { id: 'ADD', title: '➕ Add a product' },
        { id: 'MENU', title: '📋 Menu' },
      ]);
      return;
    }

    // Visual catalogue: image cards where the channel supports it, text otherwise.
    if (msg.sendCards) {
      const stockNote = (p: any) =>
        p.stock == null ? '' : Number(p.stock) === 0 ? ' · Out of stock' : ` · ${p.stock} in stock`;
      const cards: BotCard[] = products.slice(0, 10).map((p) => ({
        title: p.title,
        subtitle: `₹${p.price.toLocaleString('en-IN')}${stockNote(p)}`,
        imageUrl: p.processed_image_url || p.original_image_url || undefined,
        // Tapping a product opens its full info card (delete lives inside it —
        // a one-tap destructive default was a bad idea).
        actionId: `VIEW ${p.title}`,
        actionTitle: '👁 View',
      }));
      await msg.sendCards(cards, storeUrl);
      if (products.length > 10) {
        await sendReply(`…and ${products.length - 10} more. See all on your store: ${storeUrl}`);
      }
      await replyButtons(msg, `📦 You have *${products.length}* product(s).`, [
        { id: 'ADD', title: '➕ Add another' },
        { id: 'MENU', title: '📋 Menu' },
      ]);
      return;
    }

    const productList = products.map((p, i) => `${i + 1}. *${p.title}* — ₹${p.price.toLocaleString('en-IN')}`).join('\n');
    await replyCta(msg, `📦 *Your Products (${products.length}):*\n\n${productList}`, '🛍️ View store', storeUrl);
    return;
  }

  if (command.startsWith('DELETE ')) {
    const titleToDelete = text.trim().substring(7).trim();
    if (!titleToDelete) {
      await sendReply('⚠️ Please specify the product name.\n\nExample: DELETE Red Cotton T-Shirt');
      return;
    }
    const deletedCount = await deleteProduct(merchant.id, titleToDelete);
    if (deletedCount === 0) {
      await sendReply(`❌ No product found matching "*${titleToDelete}*".`);
    } else {
      await sendReply(`🗑️ Removed ${deletedCount} product(s) matching "*${titleToDelete}*".`);
      await triggerRevalidation(merchant.store_slug);
    }
    return;
  }

  if (command.startsWith('EDIT ')) {
    const editMatch = text.trim().substring(5).trim().match(/(.+)-\s*[₹rRsS$€£]+\s*([\d,]+)/i);
    if (!editMatch) {
      await sendReply('⚠️ Invalid EDIT format.\n\nExample: EDIT Red Cotton T-Shirt - ₹399');
      return;
    }
    const titleToEdit = editMatch[1].trim();
    const newPrice = parseInt(editMatch[2].replace(/,/g, ''), 10);
    
    if (!titleToEdit || isNaN(newPrice)) {
      await sendReply('⚠️ Please specify a valid product name and price.');
      return;
    }
    const updatedCount = await updateProductPrice(merchant.id, titleToEdit, newPrice);
    if (updatedCount === 0) {
      await sendReply(`❌ No product found matching "*${titleToEdit}*".`);
    } else {
      await sendReply(`✅ Updated ${updatedCount} product(s) matching "*${titleToEdit}*" to ₹${newPrice.toLocaleString('en-IN')}.`);
      await triggerRevalidation(merchant.store_slug);
    }
    return;
  }

  if (command.startsWith('DESCRIBE ')) {
    const description = text.trim().substring(9).trim();
    if (!description) {
      await sendReply('⚠️ Please provide a description.\n\nExample: DESCRIBE We sell the best quality shoes in Mumbai.');
      return;
    }
    await updateStoreDescription(merchant.id, description);
    await sendReply(`✅ Store description updated successfully!`);
    await triggerRevalidation(merchant.store_slug);
    return;
  }

  if (command === 'PAUSE') {
    await toggleStoreStatus(merchant.id, false);
    await sendReply(`⏸️ Your store is now **PAUSED**. Customers will not be able to view products or place orders.\n\nReply with *RESUME* to bring your store back online.`);
    await triggerRevalidation(merchant.store_slug);
    return;
  }

  if (command === 'RESUME') {
    await toggleStoreStatus(merchant.id, true);
    await sendReply(`▶️ Your store is now **ACTIVE** and ready to receive orders!`);
    await triggerRevalidation(merchant.store_slug);
    return;
  }

  if (command.startsWith('PREBOOK ') || command.startsWith('SELL ')) {
    const isPrebook = command.startsWith('PREBOOK ');
    const name = text.trim().substring(isPrebook ? 8 : 5).trim();
    if (!name) {
      await sendReply(`⚠️ Please name the product.\n\nExample: ${isPrebook ? 'PREBOOK Red Shirt' : 'SELL Red Shirt'}`);
      return;
    }
    try {
      const count = await setProductFulfillment(merchant.id, name, isPrebook ? 'prebook' : 'buy');
      if (count === 0) {
        await sendReply(`❌ No product found matching "*${name}*".`);
      } else if (isPrebook) {
        await sendReply(`📅 *${count} product(s) set to PRE-BOOK.*\n\nCustomers will now reserve "${name}" and collect it at your shop, instead of home delivery.`);
        await triggerRevalidation(merchant.store_slug);
      } else {
        await sendReply(`🛒 *${count} product(s) set to BUY.*\n\n"${name}" is now a normal delivery product again.`);
        await triggerRevalidation(merchant.store_slug);
      }
    } catch (err: any) {
      await sendReply(`❌ ${err.message || 'Could not update the product.'}`);
    }
    return;
  }

  // STOCK <name> <qty>  → set inventory.  STOCK <name> OFF → stop tracking.
  if (command.startsWith('STOCK ')) {
    const rest = text.trim().substring(6).trim();
    const m = rest.match(/^(.*?)[\s,]+(\d+|off|unlimited|none)$/i);
    if (!m || !m[1].trim()) {
      await sendReply('⚠️ Format: *STOCK <product> <quantity>*\n\nExamples:\n• STOCK Red Shirt 10\n• STOCK Red Shirt off  _(stop tracking)_');
      return;
    }
    const name = m[1].trim();
    const qtyRaw = m[2].toLowerCase();
    const qty = /^\d+$/.test(qtyRaw) ? parseInt(qtyRaw, 10) : null;
    try {
      const count = await setProductStock(merchant.id, name, qty);
      if (count === 0) {
        await sendReply(`❌ No product found matching "*${name}*".`);
      } else {
        await sendReply(
          qty === null
            ? `♾️ Stock tracking turned *off* for ${count} product(s) matching "*${name}*" — they'll always be available.`
            : `📦 Stock for ${count} product(s) matching "*${name}*" set to *${qty}*.${qty === 0 ? '\n\n⚠️ At 0 they show as *Out of stock*.' : ''}`
        );
        await triggerRevalidation(merchant.store_slug);
      }
    } catch (err: any) {
      await sendReply(`❌ ${err.message || 'Could not update stock.'}`);
    }
    return;
  }

  if (command === 'CLEAR CATALOG') {
    const deletedCount = await deleteAllProducts(merchant.id);
    await sendReply(`🗑️ Your catalog has been cleared. Removed ${deletedCount} products.`);
    await triggerRevalidation(merchant.store_slug);
    return;
  }

  if (command.startsWith('SET INSTAGRAM ')) {
    const handle = text.trim().substring(14).trim();
    await updateMerchantSocial(merchant.id, 'instagram_handle', handle);
    await sendReply(`✅ Instagram handle updated to: ${handle}`);
    await triggerRevalidation(merchant.store_slug);
    return;
  }

  if (command.startsWith('SET FACEBOOK ')) {
    const url = text.trim().substring(13).trim();
    await updateMerchantSocial(merchant.id, 'facebook_url', url);
    await sendReply(`✅ Facebook URL updated to: ${url}`);
    await triggerRevalidation(merchant.store_slug);
    return;
  }

  if (command.startsWith('SET WHATSAPP ')) {
    const number = text.trim().substring(13).trim();
    await updateMerchantSocial(merchant.id, 'phone_number', number);
    await sendReply(`✅ WhatsApp number updated to: ${number}`);
    await triggerRevalidation(merchant.store_slug);
    return;
  }

  // "Was" price → the ₹-Off badge + strike-through on the storefront.
  if (command.startsWith('MRP ')) {
    const rest = text.trim().substring(4).trim();
    const m = rest.match(/^(.*?)\s*-\s*(?:₹|RS\.?\s*)?([\d,]+)$/i) || rest.match(/^(.*?)\s+(?:₹|RS\.?\s*)?([\d,]+)$/i);
    if (!m || !m[1].trim()) {
      await sendReply('⚠️ Format: *MRP Red Shirt - ₹599*\n\nShows "₹100 Off" and ~~₹599~~ next to your selling price.\nRemove with: *MRP Red Shirt - 0*');
      return;
    }
    const name = m[1].trim();
    const mrp = parseInt(m[2].replace(/,/g, ''), 10);
    try {
      const count = await setProductInfo(merchant.id, name, { mrp: mrp > 0 ? mrp : null });
      if (count === 0) await sendReply(`❌ No product found matching "*${name}*".`);
      else {
        await sendReply(mrp > 0
          ? `🏷️ MRP ₹${mrp.toLocaleString('en-IN')} set for ${count} product(s) matching "*${name}*" — buyers now see the discount badge.`
          : `🏷️ MRP removed for ${count} product(s) matching "*${name}*".`);
        await triggerRevalidation(merchant.store_slug);
      }
    } catch (err: any) {
      await sendReply(`❌ ${err.message || 'Could not set the MRP.'}`);
    }
    return;
  }

  // The scrolling offer ticker at the top of the storefront.
  if (command.startsWith('ANNOUNCE')) {
    const value = text.trim().substring(8).trim();
    if (!value) {
      await sendReply('📢 *Storefront announcement*\n\nReply like:\n*ANNOUNCE Free delivery over ₹499 ✨ Fresh stock every Friday!*\n\nOr *ANNOUNCE off* to remove it.');
      return;
    }
    try {
      await updateAnnouncement(merchant.id, /^off$/i.test(value) ? '' : value);
      await sendReply(/^off$/i.test(value)
        ? '📢 Announcement removed.'
        : `📢 *Live!* Your store now shows a scrolling ticker:\n\n"${value}"`);
      await triggerRevalidation(merchant.store_slug);
    } catch (err: any) {
      await sendReply(`❌ ${err.message || 'Could not save the announcement.'}`);
    }
    return;
  }

  if (command.startsWith('SET CATEGORY ')) {
    const cat = text.trim().substring(13).trim();
    await updateStoreCategory(merchant.id, cat);
    await sendReply(`🗂 Shop category set to: *${cat}*`);
    await triggerRevalidation(merchant.store_slug);
    return;
  }

  // Custom domain from chat (plan-gated like the dashboard).
  if (command.startsWith('DOMAIN')) {
    const value = text.trim().substring(6).trim();
    if (!value) {
      await sendReply('🌐 *Custom domain*\n\n• DOMAIN mystore.com — connect yours\n• DOMAIN off — remove it\n\nAfter connecting, point your domain\'s DNS at your storefront host.');
      return;
    }
    const clearing = /^off$/i.test(value);
    if (!clearing && !canUseFeature(merchant.subscription_plan, 'custom_domain')) {
      await replyButtons(msg, `🔒 ${featureLockedMessage('custom_domain', merchant.subscription_plan)}`, [
        { id: 'UPGRADE', title: '🚀 See plans' },
        { id: 'MENU', title: '📋 Menu' },
      ]);
      return;
    }
    try {
      const domain = await setCustomDomain(merchant.id, clearing ? null : value);
      await sendReply(domain
        ? `🌐 *${domain} connected!*\n\nLast step (one time): add a DNS record for it pointing at your storefront host, and add the domain in your hosting panel.`
        : '🌐 Custom domain removed. Your store stays available at its Maghgo link.');
    } catch (err: any) {
      await sendReply(`❌ ${err.message}`);
    }
    return;
  }

  // The shop's OWN branded Telegram bot (their name, their t.me link) —
  // the Telegram twin of dedicated WhatsApp numbers, but fully self-serve.
  if (command === 'CONNECT TELEGRAM' || command === 'MY BOT') {
    if (!canUseFeature(merchant.subscription_plan, 'own_telegram_bot')) {
      await replyButtons(msg, `🔒 ${featureLockedMessage('own_telegram_bot', merchant.subscription_plan)}`, [
        { id: 'UPGRADE', title: '🚀 See plans' },
        { id: 'MENU', title: '📋 Menu' },
      ]);
      return;
    }
    if ((merchant as any).telegram_bot_username) {
      await replyButtons(msg, `🤖 *Your own bot is LIVE:* t.me/${(merchant as any).telegram_bot_username}\n\nCustomers who message it shop YOUR store directly — no store name needed.`, [
        { id: 'DISCONNECT TELEGRAM', title: '🔌 Disconnect' },
        { id: 'MENU', title: '📋 Menu' },
      ]);
      return;
    }
    if (!publicBaseUrl()) {
      await sendReply('⚠️ Your own Telegram bot isn\'t available just yet — the Maghgo server still needs its public URL configured. Everything else in your store works normally; please try again later.');
      return;
    }
    flows.set(`${channel}:${senderId}`, { kind: 'shopbot', step: 'token', ts: Date.now() });
    await sendReply('🤖 *Your own Telegram bot! — 2 minutes, free*\n\n1️⃣ Open *@BotFather* in Telegram\n2️⃣ Send /newbot → pick a name (your shop!) and a username ending in "bot"\n3️⃣ BotFather gives you a *token* — paste it here.\n\n🔒 Stored encrypted. (Reply CANCEL to stop.)');
    return;
  }

  if (command === 'DISCONNECT TELEGRAM') {
    const tok = decryptSecret((merchant as any).telegram_bot_token);
    if (tok) await deleteShopWebhook(tok);
    await clearShopTelegramBot(merchant.id);
    await sendReply('🔌 Your own bot is disconnected. Customers can still shop via the main Maghgo bot and your store link.');
    return;
  }

  // Connect the Meta (FB/Insta Shop) catalogue entirely in chat.
  if (command === 'CONNECT META') {
    if (!canUseFeature(merchant.subscription_plan, 'meta_import')) {
      await replyButtons(msg, `🔒 ${featureLockedMessage('meta_import', merchant.subscription_plan)}`, [
        { id: 'UPGRADE', title: '🚀 See plans' },
        { id: 'MENU', title: '📋 Menu' },
      ]);
      return;
    }
    flows.set(`${channel}:${senderId}`, { kind: 'metacat', step: 'catalogid', ts: Date.now() });
    await sendReply('📷 *Connect your Meta Shop! — Step 1 of 2*\n\nOpen *Meta Commerce Manager* → your catalogue → its settings show the *Catalog ID* (a long number). Paste it here.\n\n(Reply CANCEL to stop.)');
    return;
  }

  // Shopper-bot language: customers of this store get served in it.
  if (command.startsWith('LANGUAGE')) {
    const arg = command.substring(8).trim();
    const map: Record<string, 'en' | 'ta' | 'hi'> = { ENGLISH: 'en', EN: 'en', TAMIL: 'ta', TA: 'ta', HINDI: 'hi', HI: 'hi' };
    const lang = map[arg];
    if (!lang) {
      await replyButtons(msg, '🗣 *Customer language*\n\nYour customers\' shopping chat can be in:\n• LANGUAGE ENGLISH\n• LANGUAGE TAMIL\n• LANGUAGE HINDI\n\n(Your own merchant chat stays in English for now.)', [
        { id: 'LANGUAGE TAMIL', title: '🇮🇳 தமிழ்' },
        { id: 'LANGUAGE HINDI', title: '🇮🇳 हिन्दी' },
        { id: 'LANGUAGE ENGLISH', title: '🇬🇧 English' },
      ]);
      return;
    }
    await updateBotLanguage(merchant.id, lang);
    await sendReply(`🗣 Done! Your customers will now shop in *${arg.charAt(0) + arg.slice(1).toLowerCase()}*.`);
    return;
  }

  // Promo broadcast to recent customers — policy-safe: sent as normal messages,
  // so it DELIVERS only to customers active within WhatsApp's free 24h window.
  if (command.startsWith('BROADCAST')) {
    const message = text.trim().substring(9).trim();
    if (!message) {
      await sendReply('📣 *Broadcast to your customers*\n\nReply like:\n*BROADCAST 20% off everything this weekend! Use code FEST20*\n\n_Delivers to customers who chatted in the last 24h (WhatsApp rule). Keep it useful — spam gets numbers blocked._');
      return;
    }
    const { data: rows } = await supabase
      .from('order_logs')
      .select('customer_phone')
      .eq('merchant_id', merchant.id)
      .not('customer_phone', 'is', null)
      .order('created_at', { ascending: false })
      .limit(200);
    const phones = [...new Set((rows ?? []).map((r: any) => r.customer_phone).filter(Boolean))].slice(0, 50);
    if (phones.length === 0) {
      await sendReply('📣 No customer numbers yet — broadcasts go to people who have ordered from you.');
      return;
    }
    let sent = 0;
    for (const phone of phones) {
      try {
        await sendTextMessage(phone as string, `📣 *${merchant.store_name}*\n\n${message}\n\n🛍️ ${env.FRONTEND_URL}/${merchant.store_slug}`);
        sent++;
      } catch { /* outside 24h window or invalid — skip silently */ }
    }
    await sendReply(`📣 Broadcast done — delivered to *${sent}* of ${phones.length} recent customer(s).\n\n_Only customers active in the last 24h receive it (WhatsApp policy)._`);
    return;
  }

  if (command === 'STATUS') {
    const count = await getProductCount(merchant.id);
    const storeUrl = `${env.FRONTEND_URL}/${merchant.store_slug}`;
    await replyCta(
      msg,
      `📊 *Store Status*\n\n🏪 *${merchant.store_name}*\n📦 Products: ${count}\n` +
      (() => {
        const st = getSubscriptionStatus(merchant);
        if (st.plan === 'inactive') return `💳 Plan: *none yet* — reply MYPLAN\n`;
        return st.expired
          ? `💳 Plan: *${st.plan.toUpperCase()}* — 🔴 expired ${st.endsAtLabel}\n`
          : `💳 Plan: *${st.plan.toUpperCase()}* — ${st.expiringSoon ? '🟠' : '🟢'} ${st.daysLeft} day(s) left (till ${st.endsAtLabel})\n`;
      })() +
      `${count === 0 ? '\nSend a product photo to add your first one!' : ''}`,
      '🛍️ View my store',
      storeUrl
    );
    await replyButtons(msg, 'Anything else?', [
      { id: 'MYPLAN', title: '💳 My plan' },
      { id: 'ADD', title: '➕ Add product' },
      { id: 'MENU', title: '📋 Menu' },
    ]);
    return;
  }

  // Apply a theme by id (from the THEMES menu). Plan-enforced: premium themes
  // throw a friendly upgrade message for plans that don't include them.
  if (command.startsWith('THEME ')) {
    const themeId = text.trim().substring(6).trim();
    try {
      const name = await applyThemeById(merchant.id, themeId, merchant.subscription_plan);
      if (!name) {
        await sendReply('❌ That theme could not be found. Reply *THEMES* to see the list.');
        return;
      }
      await replyCta(msg, `🎨 Applied *${name}*! Your storefront is refreshing now.`, '🛍️ View store', `${env.FRONTEND_URL}/${merchant.store_slug}`);
      await triggerRevalidation(merchant.store_slug);
    } catch (err: any) {
      await sendReply(`❌ ${err.message || 'Could not apply that theme.'}`);
    }
    return;
  }

  // List themes to pick from — paged so the whole catalogue is reachable.
  if (command === 'THEMES' || command === 'THEME' || /^THEMES\s+\d+$/.test(command)) {
    const pm = command.match(/^THEMES\s+(\d+)$/);
    const page = pm ? Math.max(1, parseInt(pm[1], 10)) : 1;
    const PAGE_SIZE = 8;
    const { themes, total } = await listThemes(PAGE_SIZE, (page - 1) * PAGE_SIZE);
    if (themes.length === 0) {
      await sendReply(page === 1 ? '🎨 No themes are available right now.' : `🎨 No more themes — you're past the last page. Reply *THEMES* for page 1.`);
      return;
    }
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const rows = themes.map((t) => {
      const locked = !hasAccess(t.plan_required, merchant.subscription_plan);
      return {
        id: `THEME ${t.id}`,
        title: `${locked ? '🔒 ' : ''}${t.name}`.slice(0, 24),
        description: (locked ? `Needs ${t.plan_required.toUpperCase()} — tap to see` : 'Tap to apply instantly').slice(0, 72),
      };
    });
    if (page < totalPages) rows.push({ id: `THEMES ${page + 1}`, title: `➡️ More (${page + 1}/${totalPages})`, description: 'Next page of themes' });
    if (page > 1) rows.push({ id: `THEMES ${page - 1}`, title: '⬅️ Previous page', description: `Back to page ${page - 1}` });
    await replyMenu(msg, `🎨 *Pick a theme* (page ${page}/${totalPages}, ${total} designs) — tap to apply instantly:`, '🎨 Themes', rows.slice(0, 10), 'Store Themes');
    return;
  }

  // ── Online payments (shop's own Razorpay) from chat ────────────────────────
  if (command === 'PAYMENTS' || command === 'PAYMENT') {
    const connected = await hasRazorpayKeys(merchant.id);
    if (connected) {
      await replyButtons(msg, '💳 *Online payments: CONNECTED* ✅\n\nCustomers get a *Pay Online* option at checkout and the money settles straight to your bank.\n\nTo replace your keys, disconnect first.', [
        { id: 'DISCONNECT PAYMENTS', title: '🔌 Disconnect' },
        { id: 'MENU', title: '📋 Menu' },
      ]);
    } else {
      flows.set(`${channel}:${senderId}`, { kind: 'payments', step: 'keyid', ts: Date.now() });
      await sendReply('💳 *Let\'s connect your Razorpay! — Step 1 of 2*\n\nOpen your Razorpay Dashboard → Settings → API Keys → Generate, then paste your *Key ID* here (starts with rzp_live_).\n\n(Reply CANCEL to stop.)');
    }
    return;
  }

  if (command === 'DISCONNECT PAYMENTS') {
    await clearRazorpayKeys(merchant.id);
    await replyButtons(msg, '🔌 Online payments disconnected. Customers can still order and pay you directly in chat.\n\nReply *PAYMENTS* any time to reconnect.', [
      { id: 'PAYMENTS', title: '💳 Reconnect' },
      { id: 'MENU', title: '📋 Menu' },
    ]);
    return;
  }

  if (command === 'MORE' || command === 'TOOLS' || command === 'SETTINGS') {
    await sendMoreMenu(msg, merchant);
    return;
  }
  if (command === 'MORE2' || command === 'MORE 2') {
    await sendMoreMenu2(msg);
    return;
  }

  // Topic help — tapped from the More menu or typed directly.
  if (command.startsWith('HELP ')) {
    const topic = command.substring(5).trim();
    const topics: Record<string, string> = {
      ADDRESS: '📍 *Shop address*\n\nReply:\n*ADDRESS 12 MG Road, Villupuram, TN 605602*\n\nIt appears on your storefront with a "Get directions" button, and the shopper bot can share it too.\n\nTo remove it: *ADDRESS off*',
      SOCIALS: '📱 *Social links*\n\nThese power the contact buttons on your storefront:\n\n• SET INSTAGRAM yourhandle\n• SET FACEBOOK https://facebook.com/yourpage\n• SET WHATSAPP 9198xxxxxxx',
      DETAILS: '📝 *Product details*\n\n• DETAILS Red Shirt - Soft premium cotton, made in India\n• CATEGORY Red Shirt - T-Shirt\n\nDetails show when a customer taps the product on your store.',
      OPTIONS: '📐 *Sizes & colours*\n\nLet buyers choose options before adding to cart:\n\n*OPTIONS Red Shirt - Size: S,M,L,XL; Colour: Red,Blue*\n\nEach option becomes tappable chips on the product page.\n\nTo clear: *OPTIONS Red Shirt - off*',
      STOCK: '📦 *Stock tracking*\n\n• STOCK Red Shirt 10 — set quantity\n• STOCK Red Shirt off — stop tracking\n\nAt 0 the product shows "Out of stock" and can\'t be bought. Stock reduces automatically with each order.',
      PRODUCT: '📝 *Product tools*\n\n👁 VIEW Red Shirt — full info card\n✏️ EDIT Red Shirt - ₹399 — change price\n📝 DETAILS Red Shirt - soft cotton — description\n🗂 CATEGORY Red Shirt - T-Shirt\n📐 OPTIONS Red Shirt - Size: S,M,L — buyer choices\n📦 STOCK Red Shirt 10 — inventory\n📅 PREBOOK / SELL Red Shirt — collect vs deliver\n🗑 DELETE Red Shirt',
      COUPON: '🏷️ *Coupons*\n\nCreate:\n• COUPON CREATE DIWALI20 20%\n• COUPON CREATE FLAT100 ₹100\n• Add a minimum: COUPON CREATE BIG10 10% MIN 999\n\nDelete: COUPON DELETE DIWALI20\nSee all: COUPONS',
    };
    const help = topics[topic];
    if (help) {
      await replyButtons(msg, help, [
        { id: 'MORE', title: '⚙️ More tools' },
        { id: 'MENU', title: '📋 Menu' },
      ]);
      return;
    }
    // Unknown topic → fall through to the main HELP below via MENU.
  }

  // ── Coupons ────────────────────────────────────────────────────────────────
  if (command === 'COUPONS') {
    const coupons = await listCoupons(merchant.id);
    // No coupons + no access → straight to the upgrade prompt instead of
    // teaching a command that would only bounce off the plan gate.
    if (coupons.length === 0 && !canUseFeature(merchant.subscription_plan, 'coupons')) {
      await replyButtons(msg, `🔒 ${featureLockedMessage('coupons', merchant.subscription_plan)}`, [
        { id: 'UPGRADE', title: '🚀 See plans' },
        { id: 'MENU', title: '📋 Menu' },
      ]);
      return;
    }
    if (coupons.length === 0) {
      await replyButtons(msg, '🏷️ You have no coupons yet.\n\nCreate one like:\n*COUPON CREATE DIWALI20 20%*', [
        { id: 'HELP COUPON', title: '➕ How to create' },
        { id: 'MENU', title: '📋 Menu' },
      ]);
      return;
    }
    const lines = coupons.slice(0, 10).map((c) => {
      const value = c.discount_type === 'percent' ? `${c.discount_value}% off` : `₹${Number(c.discount_value).toLocaleString('en-IN')} off`;
      const min = Number(c.min_order) > 0 ? ` · min ₹${Number(c.min_order).toLocaleString('en-IN')}` : '';
      const uses = c.max_uses != null ? `${c.used_count}/${c.max_uses}` : `${c.used_count}`;
      return `• *${c.code}* — ${value}${min} · used ${uses}${c.is_active ? '' : ' · inactive'}`;
    }).join('\n');
    await replyButtons(msg, `🏷️ *Your coupons:*\n\n${lines}\n\nCustomers apply them at checkout (web or chat).`, [
      { id: 'HELP COUPON', title: '➕ Create / delete' },
      { id: 'MENU', title: '📋 Menu' },
    ]);
    return;
  }

  if (command.startsWith('COUPON CREATE ')) {
    if (!canUseFeature(merchant.subscription_plan, 'coupons')) {
      await replyButtons(msg, `🔒 ${featureLockedMessage('coupons', merchant.subscription_plan)}`, [
        { id: 'UPGRADE', title: '🚀 See plans' },
        { id: 'MENU', title: '📋 Menu' },
      ]);
      return;
    }
    const m = text.trim().match(/^COUPON\s+CREATE\s+(\S+)\s+(?:(\d+)\s*%|(?:₹|RS\.?\s*)(\d[\d,]*))(?:\s+MIN\s+(\d[\d,]*))?\s*$/i);
    if (!m) {
      await sendReply('⚠️ Format:\n• COUPON CREATE DIWALI20 20%\n• COUPON CREATE FLAT100 ₹100\n• COUPON CREATE BIG10 10% MIN 999');
      return;
    }
    try {
      const coupon = await createCoupon(merchant.id, {
        code: m[1],
        discount_type: m[2] ? 'percent' : 'flat',
        discount_value: Number((m[2] || m[3]).replace(/,/g, '')),
        min_order: m[4] ? Number(m[4].replace(/,/g, '')) : 0,
      });
      const value = coupon.discount_type === 'percent' ? `${coupon.discount_value}% off` : `₹${coupon.discount_value} off`;
      await sendReply(`🏷️ *Coupon ${coupon.code} created!* (${value}${Number(coupon.min_order) > 0 ? `, min order ₹${coupon.min_order}` : ''})\n\nShare it with your customers — they type it at checkout.`);
    } catch (err: any) {
      await sendReply(`❌ ${err.message || 'Could not create the coupon.'}`);
    }
    return;
  }

  if (command.startsWith('COUPON DELETE ')) {
    const code = command.substring(14).trim();
    const coupons = await listCoupons(merchant.id);
    const found = coupons.find((c) => c.code === code.toUpperCase());
    if (!found) {
      await sendReply(`❌ No coupon "*${code}*" found. Reply *COUPONS* to see your list.`);
      return;
    }
    await deleteCoupon(merchant.id, found.id);
    await sendReply(`🗑️ Coupon *${found.code}* deleted. Customers can no longer use it.`);
    return;
  }

  // ── Shop logo ──────────────────────────────────────────────────────────────
  if (command === 'LOGO' || command === 'SET LOGO' || command === 'SETLOGO') {
    flows.set(`${msg.channel}:${msg.senderId}`, { kind: 'logo', step: 'image', ts: Date.now() });
    await replyButtons(msg, '🖼 *Shop logo*\n\nSend your logo as a *photo* now, or paste an image link.\n\nIt appears on your storefront header, WhatsApp/social share previews and the Maghgo marketplace. Square images look best.', [
      { id: 'REMOVE', title: '🗑 Remove logo' },
      { id: 'CANCEL', title: '❎ Cancel' },
    ]);
    return;
  }

  // ── Shop address ───────────────────────────────────────────────────────────
  if (command.startsWith('ADDRESS')) {
    const value = text.trim().substring(7).trim();
    if (!value) {
      await sendReply('⚠️ Reply like:\n*ADDRESS 12 MG Road, Villupuram, TN 605602*\n\nOr *ADDRESS off* to remove it.');
      return;
    }
    try {
      await updateStoreAddress(merchant.id, /^off$/i.test(value) ? '' : value);
      await sendReply(/^off$/i.test(value)
        ? '📍 Address removed from your storefront.'
        : `📍 *Address saved!*\n\n${value}\n\nCustomers now see "Visit us" with a directions button on your store.`);
      await triggerRevalidation(merchant.store_slug);
    } catch (err: any) {
      await sendReply(`❌ ${err.message || 'Could not save the address.'}`);
    }
    return;
  }

  // ── Order actions: CONFIRM/SHIP/DELIVER/CANCEL <n> (n from the ORDERS list) ─
  {
    const om = command.match(/^(CONFIRM|SHIP|DELIVER|CANCEL)\s+(\d+)$/);
    if (om) {
      const statusMap: Record<string, OrderStatus> = { CONFIRM: 'confirmed', SHIP: 'processing', DELIVER: 'delivered', CANCEL: 'cancelled' };
      const idx = parseInt(om[2], 10);
      const orders = await getOrders(merchant.id, 9);
      const order = orders[idx - 1];
      if (!order) {
        await sendReply(`❌ Order #${idx} not found. Reply *ORDERS* to see the numbered list.`);
        return;
      }
      const status = statusMap[om[1]];
      await updateOrderStatus(merchant.id, order.id, status);
      const total = `₹${Number(order.total).toLocaleString('en-IN')}`;
      const notified = order.customer_phone ? ' The customer has been notified on WhatsApp. 📲' : '';
      await sendReply(`✅ Order #${idx} (${total}) marked *${status}*.${notified}`);
      return;
    }
  }

  // ── Meta catalogue import ──────────────────────────────────────────────────
  if (command === 'IMPORT META' || command === 'IMPORT') {
    if (!canUseFeature(merchant.subscription_plan, 'meta_import')) {
      await replyButtons(msg, `🔒 ${featureLockedMessage('meta_import', merchant.subscription_plan)}`, [
        { id: 'UPGRADE', title: '🚀 See plans' },
        { id: 'MENU', title: '📋 Menu' },
      ]);
      return;
    }
    await sendReply('📷 Importing your Meta Shop catalogue — one moment…');
    try {
      const r = await importMetaCatalog(merchant.id);
      await sendReply(
        `✅ *Meta import done!*\n\n📦 Imported: ${r.imported} new product(s)\n⏭️ Skipped: ${r.skipped} (already added or empty)` +
        (r.limitReached ? '\n\n⚠️ Some were skipped — you reached your plan\'s product limit. Reply *UPGRADE* to raise it.' : '')
      );
      if (r.imported > 0) await triggerRevalidation(merchant.store_slug);
    } catch (err: any) {
      const token = jwt.sign({ merchantId: merchant.id }, env.JWT_SECRET, { expiresIn: '24h' });
      await replyCta(
        msg,
        `❌ ${err.message || 'Import failed.'}\n\nConnect your catalogue on the web first:`,
        '📷 Open Meta Catalog',
        `${env.FRONTEND_URL}/dashboard/meta?token=${token}`
      );
    }
    return;
  }

  // ── Product details / category / options ───────────────────────────────────
  if (command.startsWith('DETAILS ') || command.startsWith('CATEGORY ')) {
    const isDetails = command.startsWith('DETAILS ');
    const rest = text.trim().substring(isDetails ? 8 : 9).trim();
    const parts = rest.split(/\s+-\s+/);
    if (parts.length < 2 || !parts[0].trim() || !parts[1].trim()) {
      await sendReply(isDetails
        ? '⚠️ Format: *DETAILS Red Shirt - Soft premium cotton, made in India*'
        : '⚠️ Format: *CATEGORY Red Shirt - T-Shirt*');
      return;
    }
    const name = parts[0].trim();
    const value = parts.slice(1).join(' - ').trim();
    try {
      const count = await setProductInfo(merchant.id, name, isDetails ? { description: value } : { category: value });
      if (count === 0) await sendReply(`❌ No product found matching "*${name}*".`);
      else {
        await sendReply(`✅ ${isDetails ? 'Details' : 'Category'} updated for ${count} product(s) matching "*${name}*".`);
        await triggerRevalidation(merchant.store_slug);
      }
    } catch (err: any) {
      await sendReply(`❌ ${err.message || 'Could not update the product.'}`);
    }
    return;
  }

  if (command.startsWith('OPTIONS ')) {
    const rest = text.trim().substring(8).trim();
    const parts = rest.split(/\s+-\s+/);
    if (parts.length < 2) {
      await sendReply('⚠️ Format:\n*OPTIONS Red Shirt - Size: S,M,L; Colour: Red,Blue*\n\nOr *OPTIONS Red Shirt - off* to clear.');
      return;
    }
    const name = parts[0].trim();
    const spec = parts.slice(1).join(' - ').trim();
    let variants: { name: string; values: string[] }[] = [];
    if (!/^off$/i.test(spec)) {
      variants = spec.split(';').map((group) => {
        const [gName, gValues] = group.split(':');
        return {
          name: (gName || '').trim().slice(0, 40),
          values: (gValues || '').split(',').map((v) => v.trim().slice(0, 40)).filter(Boolean).slice(0, 20),
        };
      }).filter((g) => g.name && g.values.length > 0).slice(0, 6);
      if (variants.length === 0) {
        await sendReply('⚠️ I couldn\'t read any options. Example:\n*OPTIONS Red Shirt - Size: S,M,L; Colour: Red,Blue*');
        return;
      }
    }
    try {
      const count = await setProductInfo(merchant.id, name, { variants });
      if (count === 0) await sendReply(`❌ No product found matching "*${name}*".`);
      else if (variants.length === 0) {
        await sendReply(`✅ Options cleared for ${count} product(s) matching "*${name}*".`);
        await triggerRevalidation(merchant.store_slug);
      } else {
        const summary = variants.map((v) => `${v.name}: ${v.values.join(', ')}`).join(' · ');
        await sendReply(`✅ *Options saved* for ${count} product(s) matching "*${name}*"\n\n${summary}\n\nBuyers now pick these before adding to cart.`);
        await triggerRevalidation(merchant.store_slug);
      }
    } catch (err: any) {
      await sendReply(`❌ ${err.message || 'Could not save the options.'}`);
    }
    return;
  }

  // ── Store QR code — generated and sent right here in the chat ──────────────
  if (command === 'QR') {
    try {
      const storeUrl = `${env.FRONTEND_URL}/${merchant.store_slug}`;
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const QRCode = require('qrcode');
      const png: Buffer = await QRCode.toBuffer(storeUrl, { width: 900, margin: 2, errorCorrectionLevel: 'H' });
      const url = await uploadImage(merchant.id, `qr-${merchant.store_slug}`, png, 'image/png', '');

      if (msg.sendCards) {
        await msg.sendCards([{ title: `🔳 ${merchant.store_name}`, subtitle: 'Scan to open your store — print it for your counter!', imageUrl: url }], storeUrl);
      } else {
        await msg.sendReply(`🔳 *Your store QR code*\n\nDownload & print it for your counter:\n${url}\n\nIt opens: ${storeUrl}`);
      }
    } catch (err: any) {
      console.error('QR generation failed:', err?.message || err);
      await msg.sendReply('❌ Could not generate the QR right now. Please try again in a moment.');
    }
    return;
  }

  // Full order detail, in chat: ORDER 1 / ORDER 2 …
  {
    const om = command.match(/^ORDER\s+(\d+)$/);
    if (om) {
      const idx = parseInt(om[1], 10);
      const orders = await getOrders(merchant.id, 9);
      const o = orders[idx - 1];
      if (!o) {
        await sendReply(`❌ Order #${idx} not found. Reply *ORDERS* for the list.`);
        return;
      }
      const rupee = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;
      const items = (o.items || []).map((li: any) =>
        `• ${li.quantity} × ${li.title}${li.variant ? ` (${li.variant})` : ''} — ${rupee(li.subtotal)}`
      ).join('\n');
      const when = new Date(o.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      const discount = Number(o.discount) > 0 ? `\n🎟️ Discount: −${rupee(Number(o.discount))}${o.coupon_code ? ` (${o.coupon_code})` : ''}` : '';
      await replyButtons(
        msg,
        `🧾 *Order #${idx}* · ${when}\n\n${items}${discount}\n\n*Total: ${rupee(Number(o.total))}* · ${o.payment_status === 'paid' ? '💰 PAID online' : '⏳ unpaid'}\n📍 Status: *${o.status}*` +
        (o.customer_phone ? `\n👤 Customer: ${o.customer_phone}` : '') +
        (o.customer_name ? ` (${o.customer_name})` : '') +
        ((o as any).delivery_address ? `\n📍 Deliver to: ${(o as any).delivery_address}` : ''),
        [
          { id: `CONFIRM ${idx}`, title: '✅ Confirm' },
          { id: `DELIVER ${idx}`, title: '🚚 Delivered' },
          { id: `CANCEL ${idx}`, title: '❌ Cancel' },
        ]
      );
      return;
    }
  }

  // Recent orders, straight in chat.
  if (command === 'ORDERS' || command === 'ORDER') {
    const orders = await getOrders(merchant.id, 5);
    if (orders.length === 0) {
      await replyCta(msg, '🧾 No orders yet.\n\nShare your store link so customers can start ordering!', '🛍️ My store', `${env.FRONTEND_URL}/${merchant.store_slug}`);
      return;
    }
    const lines = orders.map((o, i) => {
      const when = new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const paid = o.payment_status === 'paid' ? ' 💰' : '';
      const items = (o.items || []).reduce((n: number, x: any) => n + (x.quantity || 0), 0);
      return `*${i + 1}.* ${when} — ₹${Number(o.total).toLocaleString('en-IN')} · ${items} item(s) · _${o.status}_${paid}`;
    }).join('\n');
    await replyButtons(
      msg,
      `🧾 *Your last ${orders.length} order(s):*\n\n${lines}\n\n👁 Reply *ORDER 1* for full details.\nUpdate by number: *CONFIRM 1* · *SHIP 1* · *DELIVER 1* · *CANCEL 1*\n(The customer is notified automatically.)`,
      [
        { id: 'ORDER 1', title: '👁 View #1' },
        { id: 'CONFIRM 1', title: '✅ Confirm #1' },
        { id: 'DELIVER 1', title: '🚚 Deliver #1' },
      ]
    );
    return;
  }

  // Full product info card, in chat: VIEW <name>
  if (command.startsWith('VIEW ')) {
    const name = text.trim().substring(5).trim();
    const products = await getProducts(merchant.id);
    const p = products.find((x) => x.title.toLowerCase() === name.toLowerCase())
      || products.find((x) => x.title.toLowerCase().includes(name.toLowerCase()));
    if (!p) {
      await sendReply(`❌ No product found matching "*${name}*". Reply *LIST* to see your products.`);
      return;
    }
    const rupee = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;
    const variants = Array.isArray(p.variants) && p.variants.length
      ? p.variants.map((v: any) => `${v.name}: ${v.values.join(', ')}`).join(' · ')
      : null;
    const info =
      `📦 *${p.title}*\n\n💰 ${rupee(Number(p.price))}` +
      `${p.category ? `\n🗂 ${p.category}` : ''}` +
      `${p.stock != null ? `\n📦 Stock: ${Number(p.stock) === 0 ? 'OUT OF STOCK' : p.stock}` : ''}` +
      `${p.fulfillment_type === 'prebook' ? '\n📅 Pre-book (collect at shop)' : ''}` +
      `${variants ? `\n📐 Options: ${variants}` : ''}` +
      `${p.description ? `\n\n📝 ${String(p.description).slice(0, 300)}` : ''}`;

    if (msg.sendCards) {
      await msg.sendCards([{ title: p.title, subtitle: rupee(Number(p.price)), imageUrl: p.processed_image_url || p.original_image_url || undefined }], `${env.FRONTEND_URL}/${merchant.store_slug}`);
    }
    await replyButtons(msg, info, [
      { id: `STOCK ${p.title} 10`, title: '📦 Stock = 10' },
      { id: `DELETE ${p.title}`, title: '🗑 Delete' },
      { id: 'LIST', title: '⬅️ Back' },
    ]);
    return;
  }

  // Full analytics, rendered right in the chat — no dashboard needed.
  if (command === 'SALES' || command === 'STATS' || command === 'REVENUE' || command === 'ANALYTICS') {
    const a = await getAnalytics(merchant.id);
    const rupee = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;

    // Last-7-days revenue as a text sparkline.
    const days = a.recent_days.slice(-7);
    const max = Math.max(...days.map((d) => d.revenue), 1);
    const blocks = ['▁', '▂', '▃', '▄', '▅', '▆', '▇'];
    const spark = days.map((d) => blocks[Math.min(6, Math.floor((d.revenue / max) * 6))]).join('');
    const weekRevenue = days.reduce((s, d) => s + d.revenue, 0);

    const tops = a.top_products.slice(0, 3)
      .map((t, i) => `${['🥇', '🥈', '🥉'][i]} ${t.title} — ${t.quantity} sold · ${rupee(t.revenue)}`)
      .join('\n');

    const st = a.by_status;
    const rating = await getStoreRating(merchant.id).catch(() => null);
    await replyButtons(
      msg,
      `📊 *${merchant.store_name} — Sales*\n\n` +
      (rating ? `⭐ Rating: ${rating.average}/5 (${rating.count} review${rating.count === 1 ? '' : 's'})\n` : '') +
      `💰 Total revenue: *${rupee(a.revenue)}*\n` +
      `📅 This month: ${rupee(a.revenue_this_month)} (${a.orders_this_month} orders)\n` +
      `🧾 Orders: ${a.order_count} · Avg: ${rupee(a.average_order_value)}\n\n` +
      `📈 Last 7 days: ${spark}  ${rupee(weekRevenue)}\n\n` +
      `📦 New ${st.sent} · ✅ ${st.confirmed} · 🚚 ${st.processing} · 🎉 ${st.delivered} · ❌ ${st.cancelled}` +
      (tops ? `\n\n*Best sellers*\n${tops}` : ''),
      [
        { id: 'ORDERS', title: '🧾 Orders' },
        { id: 'LIST', title: '📦 Products' },
        { id: 'MENU', title: '📋 Menu' },
      ]
    );
    return;
  }

  if (command === 'HELP') {
    await replyButtons(
      msg,
      `📖 *MAGHGO — every command*\n\n` +
      `*➕ Add products*\n` +
      `• ADD — guided: photo → name → price → details\n` +
      `• Or send a photo captioned *Red Shirt ₹499*\n\n` +
      `*📦 Manage products*\n` +
      `• LIST — all products (tap to view)\n` +
      `• VIEW name — full info card\n` +
      `• EDIT name - ₹399 — change price\n` +
      `• DETAILS name - soft cotton — description\n` +
      `• OPTIONS name - Size: S,M,L — buyer choices\n` +
      `• CATEGORY name - T-Shirt · STOCK name 10\n` +
      `• PREBOOK name / SELL name · DELETE name\n\n` +
      `*🧾 Orders*\n` +
      `• ORDERS — recent list · ORDER 1 — full detail\n` +
      `• CONFIRM 1 · SHIP 1 · DELIVER 1 · CANCEL 1\n` +
      `  (customer is notified automatically)\n\n` +
      `*💰 Business*\n` +
      `• SALES — full analytics · COUPONS — discounts\n` +
      `• COUPON CREATE DIWALI20 20% [MIN 999]\n` +
      `• PAYMENTS — connect YOUR Razorpay\n` +
      `• MYPLAN — plan, expiry date & days left\n` +
      `• UPGRADE — see all plans\n\n` +
      `*🏪 Store*\n` +
      `• THEMES — 60+ designs · QR — printable code\n` +
      `• SET LOGO — send a photo, it's your shop logo\n` +
      `• DESCRIBE text · ADDRESS your address\n` +
      `• SET CATEGORY type · SET INSTAGRAM handle\n` +
      `• SET FACEBOOK url · SET WHATSAPP number\n` +
      `• DOMAIN mystore.com — custom domain\n` +
      `• IMPORT META / CONNECT META — FB/Insta shop\n` +
      `• CONNECT TELEGRAM — your OWN branded bot\n` +
      `• PAUSE / RESUME · LINK — other channels\n` +
      `• LOGIN — web dashboard (optional)\n\n` +
      `Reply *MENU* for tappable buttons of all this.`,
      [
        { id: 'MENU', title: '📋 Main menu' },
        { id: 'ADD', title: '➕ Add a product' },
      ]
    );
    return;
  }

  // Unknown input: open the GUI menu instead of a dead end.
  await sendMainMenu(msg, merchant);
}
