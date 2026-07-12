import { Request, Response } from 'express';
import { WhatsAppWebhookPayload } from '../types/whatsapp';
import { processBotMessage, BotMessage } from '../services/bot.service';
import { getMediaUrl, downloadMedia, sendReply as sendWhatsappReply } from '../services/whatsapp.service';
import { sendMetaReply, downloadMetaMedia } from '../services/meta.service';

export function handleIncomingMessage(req: Request, res: Response): void {
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

function handleInstagram(body: any) {
  for (const entry of body.entry) {
    for (const messaging of entry.messaging) {
      if (!messaging.message) continue;
      
      setImmediate(async () => {
        try {
          const senderId = messaging.sender.id;
          const message = messaging.message;
          const isImage = message.attachments && message.attachments[0]?.type === 'image';

          const botMsg: BotMessage = {
            channel: 'instagram',
            senderId,
            messageId: message.mid,
            type: isImage ? 'image' : 'text',
            text: message.text,
            sendReply: async (text: string) => {
              await sendMetaReply(senderId, text);
            }
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
        } catch (err) {
          console.error('Error processing IG message', err);
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

          const botMsg: BotMessage = {
            channel: 'messenger',
            senderId,
            messageId: message.mid,
            type: isImage ? 'image' : 'text',
            text: message.text,
            sendReply: async (text: string) => {
              await sendMetaReply(senderId, text);
            }
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
        } catch (err) {
          console.error('Error processing Messenger message', err);
        }
      });
    }
  }
}
