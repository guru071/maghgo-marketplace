import twilio from 'twilio';
import axios from 'axios';
import { env } from '../config/env';

/**
 * Initializes the Twilio client lazily to avoid crashing on boot if keys are missing
 */
function getTwilioClient() {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    return null;
  }
  return twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
}

/**
 * Sends a text reply via Twilio SMS API.
 * Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER.
 * @param to The recipient's phone number.
 * @param text The text to send.
 */
export async function sendSmsReply(to: string, text: string): Promise<void> {
  const client = getTwilioClient();
  
  if (!client || !env.TWILIO_PHONE_NUMBER) {
    console.warn('⚠️ Twilio keys missing. Cannot send SMS.');
    console.log(`[MOCK SMS REPLY to ${to}]: ${text}`);
    return;
  }

  try {
    await client.messages.create({
      body: text,
      from: env.TWILIO_PHONE_NUMBER,
      to: to
    });
  } catch (error: any) {
    console.error('Error sending SMS reply:', error.message);
    throw new Error('Failed to send SMS reply');
  }
}

/**
 * Downloads media from a public Twilio MediaUrl provided in an incoming MMS.
 */
export async function downloadTwilioMedia(url: string): Promise<Buffer> {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  } catch (error: any) {
    console.error('Error downloading Twilio media:', error.message);
    throw new Error('Failed to download Twilio media');
  }
}
