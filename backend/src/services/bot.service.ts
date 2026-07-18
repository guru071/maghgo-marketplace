import { getMerchantByChannel, isSubscriptionActive, createMerchant, getProductLimit, generateLinkCode, linkChannelToMerchant, updateStoreDescription, toggleStoreStatus, updateMerchantSocial, Channel } from './merchant.service';
import { parseCaption } from './parser.service';
import { removeBackground } from './media.service';
import { uploadImage } from './storage.service';
import { createProduct, getProducts, deleteProduct, getProductCount, updateProductPrice, deleteAllProducts, setProductFulfillment } from './product.service';
import { triggerRevalidation } from './revalidate.service';
import { createPaymentLink, getAmountFromPlan, getPlanFromAmount } from './payment.service';
import { env } from '../config/env';
import { buildStoreSlug } from '../utils/slug';
import { canUseChannel, minPlanForChannel, channelLabel, hasAccess } from '../utils/plans';
import jwt from 'jsonwebtoken';

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
}

// Tappable buttons where supported, otherwise a bulleted text fallback so the
// same call works on every channel.
async function replyButtons(
  msg: BotMessage,
  body: string,
  buttons: { id: string; title: string }[]
): Promise<void> {
  if (msg.sendButtons) return msg.sendButtons(body, buttons);
  await msg.sendReply(`${body}\n\n${buttons.map((b) => `• ${b.title}`).join('\n')}`);
}

async function replyMenu(
  msg: BotMessage,
  body: string,
  buttonLabel: string,
  rows: { id: string; title: string; description?: string }[],
  header?: string
): Promise<void> {
  if (msg.sendMenu) return msg.sendMenu(body, buttonLabel, rows, header);
  await msg.sendReply(
    `${header ? `*${header}*\n` : ''}${body}\n\n${rows.map((r) => `• ${r.title}${r.description ? ` — ${r.description}` : ''}`).join('\n')}`
  );
}

// The main GUI menu — a tappable list mapping to existing commands.
async function sendMainMenu(msg: BotMessage, storeName?: string): Promise<void> {
  await replyMenu(
    msg,
    storeName ? `What would you like to do for *${storeName}*?` : 'What would you like to do?',
    '📋 Open menu',
    [
      { id: 'LIST', title: '📦 My products', description: 'See everything in your store' },
      { id: 'HELP', title: '➕ Add a product', description: 'How to add with a photo' },
      { id: 'STATUS', title: '📊 Store status', description: 'Link & product count' },
      { id: 'UPGRADE', title: '🚀 Upgrade plan', description: 'Unlock higher limits' },
      { id: 'LOGIN', title: '🔐 Web dashboard', description: 'Manage on the web' },
      { id: 'PAUSE', title: '⏸️ Pause store', description: 'Temporarily go offline' },
    ],
    'Maghgo Menu'
  );
}

const GREETINGS = new Set(['HI', 'HELLO', 'HEY', 'MENU', 'START', 'MAGHGO', 'HII', 'HELLO!', 'HÍ']);

// In-memory state for conversational flows (e.g. Instagram/FB missing captions).
// Entries carry a timestamp so stale pending images are pruned and the map can
// never grow without bound. (For multi-instance scaling, back this with Redis.)
const PENDING_IMAGE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const pendingImages = new Map<string, { buffer: Buffer; mime_type: string; ts: number }>();

function prunePendingImages(): void {
  const now = Date.now();
  for (const [key, val] of pendingImages) {
    if (now - val.ts > PENDING_IMAGE_TTL_MS) pendingImages.delete(key);
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

export async function processBotMessage(msg: BotMessage): Promise<void> {
  const { channel, senderId, messageId, sendReply } = msg;

  // Drop duplicate webhook deliveries so retries don't double-process a message.
  if (messageId && isDuplicateMessage(`${channel}:${messageId}`)) {
    console.log(`↩️ Skipping duplicate message ${messageId} on ${channel}`);
    return;
  }

  // Bot is fully active and processing messages
  console.log(`▶️ Processing message from ${senderId} on ${channel}`);

  try {
    const pendingKey = `${channel}:${senderId}`;

    if (msg.type === 'image' && msg.image) {
      // Instagram and Facebook do not support captions on images.
      if (!msg.image.caption) {
        prunePendingImages();
        pendingImages.set(pendingKey, { buffer: msg.image.buffer, mime_type: msg.image.mime_type, ts: Date.now() });
        await sendReply('📸 Image received! Now please reply with the product name and price (e.g. "Red Shirt ₹499").');
        return;
      }
      await handleImageMessage(msg);
    } else if (msg.type === 'text' && msg.text) {
      if (pendingImages.has(pendingKey)) {
        // Treat text as caption for the pending image
        const pending = pendingImages.get(pendingKey)!;
        pendingImages.delete(pendingKey);
        
        msg.type = 'image';
        msg.image = { caption: msg.text, buffer: pending.buffer, mime_type: pending.mime_type };
        await handleImageMessage(msg);
        return;
      }
      await handleTextCommand(msg, msg.text!);
    }
  } catch (error) {
    console.error(`❌ Error processing message from ${senderId} on ${channel}:`, error);
    await sendReply('❌ Sorry, something went wrong on our end while processing your request. Please try again later.').catch(e => console.error('Failed to send error fallback:', e));
  }
}

async function handleImageMessage(msg: BotMessage): Promise<void> {
  const { channel, senderId, image, sendReply } = msg;

  const merchant = await getMerchantByChannel(channel, senderId);
  if (!merchant) {
    await sendReply('❌ You\'re not registered yet on Maghgo.\n\nTo create your store instantly, reply with:\n\n*REGISTER Your Store Name*\n\nExample: REGISTER Ramesh Mobiles');
    return;
  }

  if (!canUseChannel(merchant.subscription_plan, channel)) {
    const needed = minPlanForChannel(channel);
    await sendReply(
      `⚠️ *${channelLabel(channel)} needs the ${needed.toUpperCase()} plan*\n\n` +
      `Your store is on the *${merchant.subscription_plan.toUpperCase()}* plan, which doesn't include ${channelLabel(channel)}.\n\n` +
      `Reply *UPGRADE ${needed}* to unlock it.`
    );
    return;
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
    return;
  }

  const currentProductCount = await getProductCount(merchant.id);
  const limit = await getProductLimit(merchant.subscription_plan);

  if (currentProductCount >= limit) {
    await sendReply(`⚠️ *Plan Limit Reached!*\n\nYour current plan allows a maximum of ${limit} products. Please reply with "UPGRADE" to see higher tier plans and unlock more capacity.`);
    return;
  }

  const caption = image!.caption || '';
  const parsed = parseCaption(caption);
  if (!parsed) {
    await sendReply('⚠️ Could not parse product details from your caption.\n\nPlease include a currency symbol (Rs, ₹, INR, MRP) before the price:\n📝 *Product Name Rs Price*\n\nExamples:\n• Red Cotton T-Shirt Rs 499\n• Blue Jeans ₹1,299\n• Sneakers INR 2499');
    return;
  }

  let processedBuffer: Buffer;
  try {
    processedBuffer = await removeBackground(image!.buffer);
  } catch (err) {
    console.warn('⚠️ Background removal failed, using original image:', err instanceof Error ? err.message : err);
    processedBuffer = image!.buffer;
  }

  const crypto = require('crypto');
  const productId = crypto.randomUUID();

  const [originalUrl, processedUrl] = await Promise.all([
    uploadImage(merchant.id, productId, image!.buffer, image!.mime_type, '-original'),
    uploadImage(merchant.id, productId, processedBuffer, 'image/png', '-processed'),
  ]);

  const product = await createProduct(merchant.id, parsed.title, parsed.price, originalUrl, processedUrl);
  const storeUrl = `${env.FRONTEND_URL}/${merchant.store_slug}`;

  await replyButtons(
    msg,
    `✅ *Product added successfully!*\n\n📦 *${product.title}*\n💰 ₹${product.price.toLocaleString('en-IN')}\n\n🔗 View your store: ${storeUrl}`,
    [
      { id: 'LIST', title: '📦 My products' },
      { id: 'STATUS', title: '📊 Status' },
      { id: 'MENU', title: '📋 Menu' },
    ]
  );
  await triggerRevalidation(merchant.store_slug);
}

async function handleTextCommand(msg: BotMessage, text: string): Promise<void> {
  const { channel, senderId, sendReply } = msg;
  const command = text.trim().toUpperCase();

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
    await replyButtons(
      msg,
      '👋 Welcome to *Maghgo* — turn your chats into a web store.\n\nTo create your store instantly, reply:\n\n*REGISTER Your Store Name*\n\nAlready have a store? Reply with your link code (e.g. LINK A9F3K2).',
      [{ id: 'REGISTER Your Store Name', title: '🚀 Create my store' }]
    );
    return;
  }

  // A greeting (or the Menu button) opens the tappable main menu.
  if (GREETINGS.has(command)) {
    await sendMainMenu(msg, merchant.store_name);
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
    let plan = 'BASIC';
    let amount = 99;
    
    if (priceMatch && priceMatch[1]) {
      amount = parseInt(priceMatch[1], 10);
      const matchedPlan = await getPlanFromAmount(amount);
      if (matchedPlan) {
        plan = matchedPlan;
      }
    } else {
      plan = command.split(' ')[1] || 'BASIC';
      plan = plan.toLowerCase(); // Ensure plan is lowercased for getAmountFromPlan
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
  // HELP/STATUS stay available so they are never left without an explanation.
  if (!canUseChannel(merchant.subscription_plan, channel) && command !== 'HELP' && command !== 'STATUS') {
    const needed = minPlanForChannel(channel);
    await sendReply(
      `⚠️ *${channelLabel(channel)} needs the ${needed.toUpperCase()} plan*\n\n` +
      `Your store is on the *${merchant.subscription_plan.toUpperCase()}* plan, which doesn't include ${channelLabel(channel)}.\n\n` +
      `Reply *UPGRADE ${needed}* to unlock it — or keep managing your store on WhatsApp or your web dashboard.`
    );
    return;
  }

  if (!isSubscriptionActive(merchant) && command !== 'HELP' && command !== 'STATUS') {
    if (merchant.subscription_plan === 'inactive') {
      await sendReply(`⚠️ *Store Inactive!*\n\nYour store is reserved but not yet active. Please reply with "UPGRADE" to select your plan and complete your payment.`);
    } else {
      await sendPaymentOptions(
        msg,
        merchant.subscription_plan,
        `⚠️ *Subscription Expired!*\n\nYour subscription has ended. To continue using Maghgo commands and reactivate your store, please renew your plan:`
      );
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

  if (command === 'LIST') {
    const products = await getProducts(merchant.id);
    if (products.length === 0) {
      await replyButtons(msg, '📭 Your store has no products yet.\n\nSend a product photo with a caption to add one!', [
        { id: 'HELP', title: '➕ How to add' },
        { id: 'MENU', title: '📋 Menu' },
      ]);
      return;
    }
    const productList = products.map((p, i) => `${i + 1}. *${p.title}* — ₹${p.price.toLocaleString('en-IN')}`).join('\n');
    await replyButtons(msg, `📦 *Your Products (${products.length}):*\n\n${productList}`, [
      { id: 'HELP', title: '➕ Add another' },
      { id: 'STATUS', title: '📊 Status' },
      { id: 'MENU', title: '📋 Menu' },
    ]);
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

  if (command === 'STATUS') {
    const count = await getProductCount(merchant.id);
    const storeUrl = `${env.FRONTEND_URL}/${merchant.store_slug}`;
    await replyButtons(
      msg,
      `📊 *Store Status*\n\n🏪 *${merchant.store_name}*\n📦 Products: ${count}\n🔗 ${storeUrl}`,
      [
        { id: 'LIST', title: '📦 My products' },
        { id: 'HELP', title: '➕ Add product' },
        { id: 'MENU', title: '📋 Menu' },
      ]
    );
    return;
  }

  if (command === 'HELP') {
    await replyButtons(
      msg,
      `➕ *Add a product*\n\nSend a *photo* of your product with a caption:\n\n_Product name  Price_\nExample: *Red Cotton T-Shirt ₹499*\n\n(Include ₹, Rs, INR or MRP before the price.)\n\nOther things you can type:\n✏️ EDIT name - ₹price\n🗑️ DELETE name\n📅 PREBOOK name  ·  🛒 SELL name\n📝 DESCRIBE your store text`,
      [
        { id: 'MENU', title: '📋 Main menu' },
        { id: 'LIST', title: '📦 My products' },
      ]
    );
    return;
  }

  // Unknown input: open the GUI menu instead of a dead end.
  await sendMainMenu(msg, merchant.store_name);
}
