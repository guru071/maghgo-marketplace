import { Request, Response } from 'express';
import { WhatsAppWebhookPayload, WhatsAppMessage } from '../types/whatsapp';
import { getMerchantByPhone, isSubscriptionActive, createMerchant, getProductLimit } from '../services/merchant.service';
import { parseCaption } from '../services/parser.service';
import { getMediaUrl, downloadMedia, sendReply } from '../services/whatsapp.service';
import { removeBackground } from '../services/media.service';
import { uploadImage } from '../services/storage.service';
import { createProduct, getProducts, deleteProduct, getProductCount } from '../services/product.service';
import { triggerRevalidation } from '../services/revalidate.service';
import { createPaymentLink } from '../services/payment.service';
import { env } from '../config/env';

// ─── Message Controller ──────────────────────────────────────────────────────

/**
 * Handle incoming WhatsApp webhook messages.
 * Returns 200 immediately and processes asynchronously.
 */
export function handleIncomingMessage(req: Request, res: Response): void {
  // Always ACK the webhook immediately to prevent retries
  res.sendStatus(200);

  const body = req.body as WhatsAppWebhookPayload;

  // Guard: only process WhatsApp messages
  if (body.object !== 'whatsapp_business_account') return;

  for (const entry of body.entry) {
    for (const change of entry.changes) {
      const messages = change.value.messages;
      if (!messages || messages.length === 0) continue;

      for (const message of messages) {
        // Fire-and-forget — errors are logged inside processMessage
        setImmediate(() => {
          processMessage(message).catch((err) => {
            console.error('❌ Error processing message:', err);
          });
        });
      }
    }
  }
}

// ─── Async Message Processor ─────────────────────────────────────────────────

async function processMessage(message: WhatsAppMessage): Promise<void> {
  const from = message.from;
  const messageId = message.id;

  if (message.type === 'image') {
    await handleImageMessage(from, messageId, message);
  } else if (message.type === 'text' && message.text) {
    await handleTextCommand(from, messageId, message.text.body);
  }
  // Silently ignore other message types
}

// ─── Image Message Handler ───────────────────────────────────────────────────

async function handleImageMessage(
  from: string,
  messageId: string,
  message: WhatsAppMessage
): Promise<void> {
  const image = message.image!;

  // 1. Look up merchant
  const merchant = await getMerchantByPhone(from);
  if (!merchant) {
    await sendReply(
      from,
      messageId,
      '❌ You\'re not registered yet on Maghgo.\n\nTo create your store instantly, reply with:\n\n*REGISTER Your Store Name*\n\nExample: REGISTER Ramesh Mobiles'
    );
    return;
  }

  // 1.5. Check if subscription is active
  if (!isSubscriptionActive(merchant)) {
    const paymentLink = await createPaymentLink(from, 149);
    await sendReply(
      from,
      messageId,
      `⚠️ *Trial Expired!*\n\nYour 4-day free trial has ended. To keep your store active and continue adding products, please pay your monthly subscription of ₹149 (Basic Plan) here:\n\n🔗 ${paymentLink}`
    );
    return;
  }

  // 1.6 Check Product Limits based on Plan
  const currentProductCount = await getProductCount(merchant.id);
  const limit = getProductLimit(merchant.subscription_plan);

  if (currentProductCount >= limit) {
    if (merchant.subscription_plan === 'trial') {
      const paymentLink = await createPaymentLink(from, 149);
      await sendReply(
        from,
        messageId,
        `⚠️ *Limit Reached!*\n\nThe Free Trial only allows 1 product. To add up to 20 products, please upgrade to the *Basic Plan* (₹149/mo) here:\n\n🔗 ${paymentLink}`
      );
    } else if (merchant.subscription_plan === 'basic') {
      const paymentLink = await createPaymentLink(from, 499);
      await sendReply(
        from,
        messageId,
        `⚠️ *Limit Reached!*\n\nThe Basic Plan allows a maximum of 20 products. To add up to 50 products, please upgrade to the *Premium Plan* (₹499/mo) here:\n\n🔗 ${paymentLink}`
      );
    } else if (merchant.subscription_plan === 'premium') {
      const paymentLink = await createPaymentLink(from, 2999);
      await sendReply(
        from,
        messageId,
        `⚠️ *Limit Reached!*\n\nThe Premium Plan allows a maximum of 50 products. To add up to 100 products and customize your web, please upgrade to the *Enterprise Plan* (₹2999/mo) here:\n\n🔗 ${paymentLink}`
      );
    } else if (merchant.subscription_plan === 'enterprise') {
      await sendReply(
        from,
        messageId,
        `⚠️ *Maximum Limit Reached!*\n\nYou have reached the absolute maximum of 100 products on the Enterprise Plan.\n\nTo add more capacity, please contact Maghgo Support directly for a custom plan.`
      );
    }
    return;
  }

  // 2. Parse caption
  const caption = image.caption || '';
  const parsed = parseCaption(caption);
  if (!parsed) {
    await sendReply(
      from,
      messageId,
      '⚠️ Could not parse product details from your caption.\n\n' +
      'Please use this format:\n' +
      '📝 *Product Name Price*\n\n' +
      'Examples:\n' +
      '• Red Cotton T-Shirt Rs 499\n' +
      '• Blue Jeans ₹1,299\n' +
      '• Sneakers INR 2499\n' +
      '• Kurta 999'
    );
    return;
  }

  // 3. Download media (2-step: get URL → download binary)
  const mediaUrl = await getMediaUrl(image.id);
  const imageBuffer = await downloadMedia(mediaUrl);

  // 4. Remove background
  let processedBuffer: Buffer;
  try {
    processedBuffer = await removeBackground(imageBuffer);
  } catch (err) {
    console.warn('⚠️ Background removal failed, using original image:', err instanceof Error ? err.message : err);
    processedBuffer = imageBuffer;
  }

  // 5. Generate a temporary product ID for storage paths
  const productId = crypto.randomUUID();

  // 6. Upload both original and processed images
  const [originalUrl, processedUrl] = await Promise.all([
    uploadImage(merchant.id, productId, imageBuffer, image.mime_type, '-original'),
    uploadImage(merchant.id, productId, processedBuffer, 'image/png', '-processed'),
  ]);

  // 7. Save product to database
  const product = await createProduct(
    merchant.id,
    parsed.title,
    parsed.price,
    originalUrl,
    processedUrl
  );

  // 8. Send confirmation reply
  const storeUrl = `${env.FRONTEND_URL}/${merchant.store_slug}`;
  await sendReply(
    from,
    messageId,
    `✅ *Product added successfully!*\n\n` +
    `📦 *${product.title}*\n` +
    `💰 ₹${product.price.toLocaleString('en-IN')}\n\n` +
    `🔗 View your store: ${storeUrl}`
  );

  // 9. Trigger ISR revalidation
  await triggerRevalidation(merchant.store_slug);
}

// ─── Text Command Handler ────────────────────────────────────────────────────

async function handleTextCommand(
  from: string,
  messageId: string,
  text: string
): Promise<void> {
  const command = text.trim().toUpperCase();

  // ── REGISTER ───────────────────────────────────────────────────────────
  if (command.startsWith('REGISTER ')) {
    const storeName = text.trim().substring(9).trim();
    if (!storeName) {
      await sendReply(from, messageId, '⚠️ Please specify your store name.\n\nExample: REGISTER Ramesh Mobiles');
      return;
    }

    // Check if already registered
    const existing = await getMerchantByPhone(from);
    if (existing) {
      await sendReply(from, messageId, `✅ You already have a store registered: *${existing.store_name}*\n\nLink: ${env.FRONTEND_URL}/${existing.store_slug}`);
      return;
    }

    try {
      const storeSlug = storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      const newMerchant = await createMerchant(from, storeName, storeSlug);
      
      await sendReply(
        from,
        messageId,
        `🎉 *Welcome to Maghgo!*\n\nYour store *${newMerchant.store_name}* has been successfully created.\n\n` +
        `Your 4-day free trial starts now.\n\n` +
        `🔗 *Your Store Link:*\n${env.FRONTEND_URL}/${newMerchant.store_slug}\n\n` +
        `📸 *Next Step:* Send a product photo with a caption (e.g. "Red Shirt ₹499") to add your first product!`
      );
    } catch (err: any) {
      await sendReply(from, messageId, `❌ ${err.message || 'Failed to create store.'}`);
    }
    return;
  }

  // Look up merchant for all other commands
  const merchant = await getMerchantByPhone(from);
  if (!merchant) {
    await sendReply(
      from,
      messageId,
      '❌ You\'re not registered yet on Maghgo.\n\nTo create your store instantly, reply with:\n\n*REGISTER Your Store Name*\n\nExample: REGISTER Ramesh Mobiles'
    );
    return;
  }

  // If subscription is inactive, allow only HELP or STATUS, otherwise block
  if (!isSubscriptionActive(merchant) && command !== 'HELP' && command !== 'STATUS') {
    const paymentLink = await createPaymentLink(from, 149);
    await sendReply(
      from,
      messageId,
      `⚠️ *Subscription Inactive!*\n\nYour plan has expired. To continue using Maghgo commands, please renew your subscription of ₹149 (Basic Plan) here:\n\n🔗 ${paymentLink}`
    );
    return;
  }

  // ── LIST ───────────────────────────────────────────────────────────────
  if (command === 'LIST') {
    const products = await getProducts(merchant.id);

    if (products.length === 0) {
      await sendReply(from, messageId, '📭 Your store has no products yet.\n\nSend a product image with caption to add one!');
      return;
    }

    const productList = products
      .map((p, i) => `${i + 1}. *${p.title}* — ₹${p.price.toLocaleString('en-IN')}`)
      .join('\n');

    await sendReply(
      from,
      messageId,
      `📦 *Your Products (${products.length}):*\n\n${productList}`
    );
    return;
  }

  // ── DELETE ─────────────────────────────────────────────────────────────
  if (command.startsWith('DELETE ')) {
    const titleToDelete = text.trim().substring(7).trim();

    if (!titleToDelete) {
      await sendReply(from, messageId, '⚠️ Please specify the product name.\n\nExample: DELETE Red Cotton T-Shirt');
      return;
    }

    const deletedCount = await deleteProduct(merchant.id, titleToDelete);

    if (deletedCount === 0) {
      await sendReply(from, messageId, `❌ No product found matching "*${titleToDelete}*".`);
    } else {
      await sendReply(
        from,
        messageId,
        `🗑️ Removed ${deletedCount} product(s) matching "*${titleToDelete}*".`
      );
      await triggerRevalidation(merchant.store_slug);
    }
    return;
  }

  // ── STATUS ─────────────────────────────────────────────────────────────
  if (command === 'STATUS') {
    const count = await getProductCount(merchant.id);
    const storeUrl = `${env.FRONTEND_URL}/${merchant.store_slug}`;

    await sendReply(
      from,
      messageId,
      `📊 *Store Status*\n\n` +
      `🏪 *${merchant.store_name}*\n` +
      `📦 Products: ${count}\n` +
      `🔗 ${storeUrl}`
    );
    return;
  }

  // ── HELP ───────────────────────────────────────────────────────────────
  if (command === 'HELP') {
    await sendReply(
      from,
      messageId,
      `📖 *Maghgo Commands*\n\n` +
      `📸 *Add Product:* Send an image with caption\n` +
      `   Format: Product Name Price\n` +
      `   Example: Red Cotton T-Shirt ₹499\n\n` +
      `📋 *LIST* — View all your products\n` +
      `🗑️ *DELETE product name* — Remove a product\n` +
      `📊 *STATUS* — Store URL & product count\n` +
      `❓ *HELP* — Show this message`
    );
    return;
  }

  // ── Unknown command ────────────────────────────────────────────────────
  await sendReply(
    from,
    messageId,
    '🤔 I didn\'t understand that.\n\nType *HELP* to see available commands.'
  );
}
