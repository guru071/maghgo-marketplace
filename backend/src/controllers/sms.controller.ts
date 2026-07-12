import { Request, Response } from 'express';
import { processBotMessage, BotMessage } from '../services/bot.service';
import { sendSmsReply, downloadTwilioMedia } from '../services/sms.service';

/**
 * Handles incoming Twilio SMS/MMS webhooks.
 * Twilio sends data as application/x-www-form-urlencoded.
 */
export function handleIncomingSms(req: Request, res: Response): void {
  // Twilio expects a TwiML response, but since we handle replies asynchronously via REST API, 
  // we just return an empty TwiML document to acknowledge receipt.
  res.set('Content-Type', 'text/xml');
  res.send('<Response></Response>');

  const body = req.body;
  if (!body) return;

  setImmediate(async () => {
    try {
      const senderId = body.From;
      const messageId = body.MessageSid;
      const text = body.Body;
      const numMedia = parseInt(body.NumMedia || '0', 10);
      const isImage = numMedia > 0 && body.MediaContentType0 && body.MediaContentType0.startsWith('image/');

      const botMsg: BotMessage = {
        channel: 'sms',
        senderId,
        messageId,
        type: isImage ? 'image' : 'text',
        text: text,
        sendReply: async (replyText: string) => {
          await sendSmsReply(senderId, replyText);
        }
      };

      if (isImage) {
        const mediaUrl = body.MediaUrl0;
        const mimeType = body.MediaContentType0;
        const buffer = await downloadTwilioMedia(mediaUrl);
        botMsg.image = {
          caption: text, // MMS usually sends text and image together
          mime_type: mimeType,
          buffer
        };
      }

      await processBotMessage(botMsg);
    } catch (err) {
      console.error('Error processing Twilio SMS message:', err);
    }
  });
}
