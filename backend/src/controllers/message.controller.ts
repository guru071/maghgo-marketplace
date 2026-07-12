import { Request, Response } from 'express';
import { WhatsAppWebhookPayload } from '../types/whatsapp';
import { processBotMessage, BotMessage } from '../services/bot.service';
import { getMediaUrl, downloadMedia, sendReply as sendWhatsappReply } from '../services/whatsapp.service';

export function handleIncomingMessage(req: Request, res: Response): void {
  console.log('📬 Webhook received:', JSON.stringify(req.body, null, 2));
  res.sendStatus(200);

  const body = req.body;

  if (body.object === 'whatsapp_business_account') {
    handleWhatsapp(body as WhatsAppWebhookPayload);
  }
}

function handleWhatsapp(body: WhatsAppWebhookPayload) {
  for (const entry of body.entry) {
    for (const change of entry.changes) {
      const messages = change.value.messages;
      if (!messages || messages.length === 0) continue;

      for (const message of messages) {
        setImmediate(async () => {
          try {
            const botMsg: BotMessage = {
              channel: 'whatsapp',
              senderId: message.from,
              messageId: message.id,
              type: message.type === 'image' ? 'image' : 'text',
              text: message.text?.body,
              sendReply: async (text: string) => {
                await sendWhatsappReply(message.from, message.id, text);
              }
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
          } catch (err) {
            console.error('Error processing WA message', err);
          }
        });
      }
    }
  }
}


