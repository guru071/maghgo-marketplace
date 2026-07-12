import { getMerchantByChannel, isSubscriptionActive, createMerchant, getProductLimit, Channel } from './merchant.service';
import { parseCaption } from './parser.service';
import { removeBackground } from './media.service';
import { uploadImage } from './storage.service';
import { createProduct, getProducts, deleteProduct, getProductCount } from './product.service';
import { triggerRevalidation } from './revalidate.service';
import { createPaymentLink, getAmountFromPlan } from './payment.service';
import { env } from '../config/env';

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
}

export async function processBotMessage(msg: BotMessage): Promise<void> {
  const { channel, senderId, messageId, sendReply } = msg;

  try {
    if (msg.type === 'image' && msg.image) {
      await handleImageMessage(msg);
    } else if (msg.type === 'text' && msg.text) {
      await handleTextCommand(msg, msg.text);
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

  if (!isSubscriptionActive(merchant)) {
    if (merchant.subscription_plan === 'inactive' || merchant.subscription_plan === 'trial') {
      await sendReply(`⚠️ *Store Inactive!*\n\nYour store is reserved but not yet active. Please reply with "UPGRADE" to select your plan and complete your payment.`);
    } else {
      const monthlyAmount = await getAmountFromPlan(merchant.subscription_plan as any, false);
      const yearlyAmount = await getAmountFromPlan(merchant.subscription_plan as any, true);
      const monthlyLink = await createPaymentLink(senderId, monthlyAmount);
      const yearlyLink = await createPaymentLink(senderId, yearlyAmount);
      await sendReply(`⚠️ *Subscription Expired!*\n\nYour subscription has ended and your store is currently inactive. To reactivate your store and continue adding products, please renew your plan:\n\n📅 *Pay Monthly (₹${monthlyAmount}/mo):*\n🔗 ${monthlyLink}\n\n🎉 *Pay Yearly (Save 15% - ₹${yearlyAmount}/yr):*\n🔗 ${yearlyLink}`);
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

  await sendReply(`✅ *Product added successfully!*\n\n📦 *${product.title}*\n💰 ₹${product.price.toLocaleString('en-IN')}\n\n🔗 View your store: ${storeUrl}`);
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

    try {
      const storeSlug = storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      const newMerchant = await createMerchant(channel, senderId, storeName, storeSlug);
      
      if (requestedPlan === 'CUSTOM') {
        await sendReply(`🎉 *Welcome to Maghgo!*\n\nYour store *${newMerchant.store_name}* has been reserved.\n\nOur team will contact you shortly to set up your Custom plan.`);
        return;
      }

      const monthlyAmount = await getAmountFromPlan(requestedPlan as any, false);
      const yearlyAmount = await getAmountFromPlan(requestedPlan as any, true);
      const monthlyLink = await createPaymentLink(senderId, monthlyAmount);
      const yearlyLink = await createPaymentLink(senderId, yearlyAmount);

      await sendReply(`🎉 *Welcome to Maghgo!*\n\nYour store *${newMerchant.store_name}* has been reserved.\n\n🚀 To activate your store and start adding products, please complete your payment for the *${requestedPlan} Plan*:\n\n📅 *Pay Monthly (₹${monthlyAmount}/mo):*\n🔗 ${monthlyLink}\n\n🎉 *Pay Yearly (Save 15% - ₹${yearlyAmount}/yr):*\n🔗 ${yearlyLink}`);
    } catch (err: any) {
      await sendReply(`❌ ${err.message || 'Failed to create store.'}`);
    }
    return;
  }

  const merchant = await getMerchantByChannel(channel, senderId);
  if (!merchant) {
    await sendReply('❌ You\'re not registered yet on Maghgo.\n\nTo create your store instantly, reply with:\n\n*REGISTER Your Store Name*\n\nExample: REGISTER Ramesh Mobiles');
    return;
  }

  if (command.startsWith('UPGRADE') || command.includes('I WANT TO BUY') || command.includes('I WANT TO START THE FREE TRIAL')) {
    const priceMatch = command.match(/₹(\d+)/);
    let plan = 'BASIC';
    let amount = 99;
    
    if (priceMatch && priceMatch[1]) {
      amount = parseInt(priceMatch[1], 10);
      const testPlans = ['basic', 'starter', 'pro', 'advanced', 'premium', 'business', 'agency', 'vip', 'enterprise'];
      for (const p of testPlans) {
        if ((await getAmountFromPlan(p as any, false)) === amount) {
          plan = p;
          break;
        }
      }
    } else {
      plan = command.split(' ')[1] || 'BASIC';
      amount = await getAmountFromPlan(plan as any);
    }
    
    if (amount === 0 || plan.toLowerCase() === 'custom') {
      await sendReply(`🎉 Great! Your custom request is noted. If you haven't registered yet, simply type *REGISTER Your Store Name*. If you already registered, you're good to go!`);
      return;
    }
    
    const monthlyAmount = await getAmountFromPlan(plan as any, false);
    const yearlyAmount = await getAmountFromPlan(plan as any, true);
    const monthlyLink = await createPaymentLink(senderId, monthlyAmount);
    const yearlyLink = await createPaymentLink(senderId, yearlyAmount);

    await sendReply(`🚀 *Upgrade your Maghgo Plan!*\n\nPlease complete your payment for the *${plan.toUpperCase()} Plan* to unlock your limits:\n\n📅 *Pay Monthly (₹${monthlyAmount}/mo):*\n🔗 ${monthlyLink}\n\n🎉 *Pay Yearly (Save 15% - ₹${yearlyAmount}/yr):*\n🔗 ${yearlyLink}`);
    return;
  }

  if (!isSubscriptionActive(merchant) && command !== 'HELP' && command !== 'STATUS') {
    if (merchant.subscription_plan === 'inactive' || merchant.subscription_plan === 'trial') {
      await sendReply(`⚠️ *Store Inactive!*\n\nYour store is reserved but not yet active. Please reply with "UPGRADE" to select your plan and complete your payment.`);
    } else {
      const monthlyAmount = await getAmountFromPlan(merchant.subscription_plan as any, false);
      const yearlyAmount = await getAmountFromPlan(merchant.subscription_plan as any, true);
      const monthlyLink = await createPaymentLink(senderId, monthlyAmount);
      const yearlyLink = await createPaymentLink(senderId, yearlyAmount);
      await sendReply(`⚠️ *Subscription Expired!*\n\nYour subscription has ended. To continue using Maghgo commands and reactivate your store, please renew your plan:\n\n📅 *Pay Monthly (₹${monthlyAmount}/mo):*\n🔗 ${monthlyLink}\n\n🎉 *Pay Yearly (Save 15% - ₹${yearlyAmount}/yr):*\n🔗 ${yearlyLink}`);
    }
    return;
  }

  if (command === 'LIST') {
    const products = await getProducts(merchant.id);
    if (products.length === 0) {
      await sendReply('📭 Your store has no products yet.\n\nSend a product image with caption to add one!');
      return;
    }
    const productList = products.map((p, i) => `${i + 1}. *${p.title}* — ₹${p.price.toLocaleString('en-IN')}`).join('\n');
    await sendReply(`📦 *Your Products (${products.length}):*\n\n${productList}`);
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

  if (command === 'STATUS') {
    const count = await getProductCount(merchant.id);
    const storeUrl = `${env.FRONTEND_URL}/${merchant.store_slug}`;
    await sendReply(`📊 *Store Status*\n\n🏪 *${merchant.store_name}*\n📦 Products: ${count}\n🔗 ${storeUrl}`);
    return;
  }

  if (command === 'HELP') {
    await sendReply(`📖 *Maghgo Commands*\n\n📸 *Add Product:* Send an image with caption\n   Format: Product Name Price\n   Example: Red Cotton T-Shirt ₹499\n\n📋 *LIST* — View all your products\n🗑️ *DELETE product name* — Remove a product\n📊 *STATUS* — Store URL & product count\n🚀 *UPGRADE* — Unlock higher product limits\n❓ *HELP* — Show this message`);
    return;
  }

  await sendReply('🤔 I didn\'t understand that.\n\nType *HELP* to see available commands.');
}
