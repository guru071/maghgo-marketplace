import { Request, Response } from 'express';
import { env } from '../config/env';
import { WhatsAppWebhookPayload } from '../types/whatsapp';
import { processBotMessage, BotMessage } from '../services/bot.service';
import { getMerchantByDedicatedNumber } from '../services/merchant.service';
import { getMediaUrl, downloadMedia, sendReply as sendWhatsappReply, sendButtons as sendWhatsappButtons, sendList as sendWhatsappList, sendCtaUrl as sendWhatsappCta, sendImage as sendWhatsappImage } from '../services/whatsapp.service';
import { sendMetaReply, sendMetaQuickReplies, sendMetaCards, downloadMetaMedia, instagramUserFollows } from '../services/meta.service';
import { sendTgText, sendTgButtons, sendTgMenu, sendTgCta, sendTgPhoto, downloadTgFile, resolveCallback, answerCallback, telegramConfigured } from '../services/telegram.service';

export function handleIncomingMessage(req: Request, res: Response): void {
  console.log('📬 Webhook received:', JSON.stringify(req.body, null, 2));
  res.sendStatus(200);

  const body = req.body;

  if (body.object === 'whatsapp_business_account') {
    handleWhatsapp(body as WhatsAppWebhookPayload);
  } else if (body.object === 'instagram') {
    handleInstagram(body);
  } else if (body.object === 'page') {
    handleMessenger(body);
  }
}

function handleWhatsapp(body: WhatsAppWebhookPayload) {
  for (const entry of body.entry) {
    for (const change of entry.changes) {
      const messages = change.value.messages;
      if (!messages || messages.length === 0) continue;

      // Which of OUR numbers received this? The platform's shared number, or a
      // shop's dedicated one (migration 24). Replies must leave from the same
      // number the customer wrote to.
      const receivedOn = (change.value as any).metadata?.phone_number_id as string | undefined;
      const fromId = receivedOn && receivedOn !== env.WHATSAPP_PHONE_NUMBER_ID ? receivedOn : undefined;

      for (const message of messages) {
        setImmediate(async () => {
          try {
            // A tapped button/list row arrives as an interactive reply; its id
            // is the command we set (e.g. "LIST"), so feed it in as the text.
            const interactiveId =
              (message as any).interactive?.button_reply?.id ||
              (message as any).interactive?.list_reply?.id;

            // On a dedicated number, non-owners are auto-scoped to that store.
            let dedicatedStoreSlug: string | undefined;
            if (fromId) {
              const shop = await getMerchantByDedicatedNumber(fromId);
              if (shop) dedicatedStoreSlug = shop.store_slug;
            }

            const botMsg: BotMessage = {
              channel: 'whatsapp',
              senderId: message.from,
              messageId: message.id,
              type: message.type === 'image' ? 'image' : 'text',
              text: interactiveId || message.text?.body,
              dedicatedStoreSlug,
              sendReply: async (text: string) => {
                await sendWhatsappReply(message.from, message.id, text, fromId);
              },
              sendButtons: async (body, buttons) => {
                await sendWhatsappButtons(message.from, body, buttons, fromId);
              },
              sendMenu: async (body, buttonLabel, rows, header) => {
                await sendWhatsappList(message.from, body, buttonLabel, rows, header, fromId);
              },
              sendCtaUrl: async (body, buttonText, url) => {
                await sendWhatsappCta(message.from, body, buttonText, url, fromId);
              },
              // WhatsApp has no carousel: render each card as an image + caption.
              sendCards: async (cards) => {
                for (const c of cards) {
                  if (c.imageUrl) await sendWhatsappImage(message.from, c.imageUrl, `*${c.title}*${c.subtitle ? `\n${c.subtitle}` : ''}`, fromId);
                  else await sendWhatsappReply(message.from, message.id, `*${c.title}*${c.subtitle ? `\n${c.subtitle}` : ''}`, fromId);
                }
              },
            };

            if (message.type === 'image' && message.image) {
              const mediaUrl = await getMediaUrl(message.image.id);
              const buffer = await downloadMedia(mediaUrl);
              botMsg.image = {
                caption: message.image.caption,
                mime_type: message.image.mime_type,
                buffer
              };
            }

            await processBotMessage(botMsg);
          } catch (err: any) {
            console.error('❌ Error processing WA message:');
            if (err.response && err.response.data) {
              console.error('Meta API Error Details:', JSON.stringify(err.response.data, null, 2));
            } else {
              console.error(err);
            }
          }
        });
      }
    }
  }
}

function handleInstagram(body: any) {
  for (const entry of body.entry) {
    for (const messaging of entry.messaging) {
      if (!messaging.message) continue;
      
      setImmediate(async () => {
        try {
          const senderId = messaging.sender.id;
          const message = messaging.message;
          const isImage = message.attachments && message.attachments[0]?.type === 'image';
          const qr = message.quick_reply?.payload;

          const botMsg: BotMessage = {
            channel: 'instagram',
            senderId,
            messageId: message.mid,
            type: isImage ? 'image' : 'text',
            text: qr || message.text,
            sendReply: async (text: string) => {
              await sendMetaReply(senderId, text);
            },
            sendButtons: async (body, buttons) => {
              await sendMetaQuickReplies(senderId, body, buttons);
            },
            sendMenu: async (body, _label, rows) => {
              await sendMetaQuickReplies(senderId, body, rows.map((r) => ({ id: r.id, title: r.title })));
            },
            sendCtaUrl: async (body, buttonText, url) => {
              await sendMetaCards(senderId, [{ title: buttonText, subtitle: body.slice(0, 80), buttons: [{ type: 'web_url', title: buttonText, url }] }]);
            },
            sendCards: async (cards, storeUrl) => {
              await sendMetaCards(senderId, cards.map((c) => ({
                title: c.title, subtitle: c.subtitle, image_url: c.imageUrl,
                buttons: [
                  ...(storeUrl ? [{ type: 'web_url' as const, title: '🛍️ View store', url: storeUrl }] : []),
                  ...(c.actionId ? [{ type: 'postback' as const, title: c.actionTitle || 'Select', payload: c.actionId }] : []),
                ],
              })));
            },
          };

          // Follow gate: on Instagram we only engage users who follow the
          // account. Fails open (see instagramUserFollows), so a real customer
          // is never wrongly blocked — only positively-not-following users are.
          if (env.REQUIRE_INSTAGRAM_FOLLOW && !(await instagramUserFollows(senderId))) {
            await sendMetaReply(
              senderId,
              '👋 Thanks for reaching out! Please *follow us* first, then send any message to start shopping. 🛍️'
            );
            return;
          }

          if (isImage) {
            const url = message.attachments[0].payload.url;
            const buffer = await downloadMetaMedia(url);
            botMsg.image = {
              caption: message.text,
              mime_type: 'image/jpeg',
              buffer
            };
          }

          await processBotMessage(botMsg);
        } catch (err: any) {
          console.error('❌ Error processing IG message:');
          if (err.response && err.response.data) {
            console.error('Meta API Error Details:', JSON.stringify(err.response.data, null, 2));
          } else {
            console.error(err);
          }
        }
      });
    }
  }
}

function handleMessenger(body: any) {
  for (const entry of body.entry) {
    for (const messaging of entry.messaging) {
      if (!messaging.message) continue;
      
      setImmediate(async () => {
        try {
          const senderId = messaging.sender.id;
          const message = messaging.message;
          const isImage = message.attachments && message.attachments[0]?.type === 'image';
          const qr = message.quick_reply?.payload;

          const botMsg: BotMessage = {
            channel: 'messenger',
            senderId,
            messageId: message.mid,
            type: isImage ? 'image' : 'text',
            text: qr || message.text,
            sendReply: async (text: string) => {
              await sendMetaReply(senderId, text);
            },
            sendButtons: async (body, buttons) => {
              await sendMetaQuickReplies(senderId, body, buttons);
            },
            sendMenu: async (body, _label, rows) => {
              await sendMetaQuickReplies(senderId, body, rows.map((r) => ({ id: r.id, title: r.title })));
            },
            sendCtaUrl: async (body, buttonText, url) => {
              await sendMetaCards(senderId, [{ title: buttonText, subtitle: body.slice(0, 80), buttons: [{ type: 'web_url', title: buttonText, url }] }]);
            },
            sendCards: async (cards, storeUrl) => {
              await sendMetaCards(senderId, cards.map((c) => ({
                title: c.title, subtitle: c.subtitle, image_url: c.imageUrl,
                buttons: [
                  ...(storeUrl ? [{ type: 'web_url' as const, title: '🛍️ View store', url: storeUrl }] : []),
                  ...(c.actionId ? [{ type: 'postback' as const, title: c.actionTitle || 'Select', payload: c.actionId }] : []),
                ],
              })));
            },
          };

          if (isImage) {
            const url = message.attachments[0].payload.url;
            const buffer = await downloadMetaMedia(url);
            botMsg.image = {
              caption: message.text,
              mime_type: 'image/jpeg',
              buffer
            };
          }

          await processBotMessage(botMsg);
        } catch (err: any) {
          console.error('❌ Error processing Messenger message:');
          if (err.response && err.response.data) {
            console.error('Meta API Error Details:', JSON.stringify(err.response.data, null, 2));
          } else {
            console.error(err);
          }
        }
      });
    }
  }
}


// ─── Telegram ────────────────────────────────────────────────────────────────

/**
 * Telegram webhook entry (POST /webhook/telegram). Verified by the secret
 * header configured in setWebhook. Maps messages, photos and inline-button
 * taps onto the same channel-agnostic BotMessage every other channel uses.
 */
export function handleTelegramUpdate(req: Request, res: Response): void {
  if (!telegramConfigured() || !env.TELEGRAM_WEBHOOK_SECRET) {
    res.sendStatus(404);
    return;
  }
  if (req.headers['x-telegram-bot-api-secret-token'] !== env.TELEGRAM_WEBHOOK_SECRET) {
    res.sendStatus(403);
    return;
  }
  res.sendStatus(200); // ack first, like every other webhook

  const update = req.body;
  setImmediate(async () => {
    try {
      const message = update.message;
      const callback = update.callback_query;
      if (!message && !callback) return;

      const chatId = String(callback ? callback.message?.chat?.id : message.chat?.id);
      if (!chatId || chatId === 'undefined') return;

      if (callback) await answerCallback(callback.id); // stop the button spinner

      // Inline-button taps carry our command id (via the 64-byte token map);
      // "/start" is Telegram's universal opener — treat it as a greeting.
      let text: string | undefined = callback
        ? resolveCallback(String(callback.data ?? ''))
        : message.text || message.caption;
      // Telegram slash-commands (/start, /register, /add…) map onto our plain
      // command vocabulary; /start is the universal opener → greeting.
      if (text?.startsWith('/')) {
        text = text === '/start' ? 'HI' : text.slice(1).split('@')[0];
      }

      const isPhoto = !callback && Array.isArray(message.photo) && message.photo.length > 0;

      const botMsg: BotMessage = {
        channel: 'telegram',
        senderId: chatId,
        messageId: String(callback ? `cbq-${callback.id}` : message.message_id),
        type: isPhoto ? 'image' : 'text',
        text: isPhoto ? undefined : text,
        sendReply: async (t) => { await sendTgText(chatId, t); },
        sendButtons: async (body, buttons) => { await sendTgButtons(chatId, body, buttons); },
        sendMenu: async (body, _label, rows, header) => { await sendTgMenu(chatId, body, rows, header); },
        sendCtaUrl: async (body, buttonText, url) => { await sendTgCta(chatId, body, buttonText, url); },
        sendCards: async (cards, storeUrl) => {
          for (const c of cards) {
            const caption = `*${c.title}*${c.subtitle ? `\n${c.subtitle}` : ''}`;
            if (c.imageUrl) {
              await sendTgPhoto(chatId, c.imageUrl, caption, c.actionId ? { id: c.actionId, title: c.actionTitle || 'Select' } : undefined);
            } else {
              await sendTgText(chatId, caption);
            }
          }
          if (storeUrl) await sendTgCta(chatId, 'See everything on the web:', '🛍️ View store', storeUrl);
        },
      };

      if (isPhoto) {
        // Telegram sends multiple sizes; the last is the largest.
        const fileId = message.photo[message.photo.length - 1].file_id;
        botMsg.image = {
          caption: message.caption,
          mime_type: 'image/jpeg',
          buffer: await downloadTgFile(fileId),
        };
      }

      await processBotMessage(botMsg);
    } catch (err: any) {
      console.error('❌ Error processing Telegram update:', err?.response?.data || err?.message || err);
    }
  });
}
