import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// ─── Environment Variable Schema ─────────────────────────────────────────────

const envSchema = z.object({
  // WhatsApp Cloud API
  WHATSAPP_TOKEN: z.string().min(1, 'WHATSAPP_TOKEN is required'),
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1, 'WHATSAPP_PHONE_NUMBER_ID is required'),
  WEBHOOK_VERIFY_TOKEN: z.string().min(1, 'WEBHOOK_VERIFY_TOKEN is required'),
  WHATSAPP_APP_SECRET: z.string().min(1, 'WHATSAPP_APP_SECRET is required'),

  META_PAGE_ACCESS_TOKEN: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),

  // Error Tracking (AI Debugging)
  SENTRY_DSN: z.string().optional(),

  // Supabase
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // Remove.bg
  REMOVEBG_API_KEY: z.string().min(1, 'REMOVEBG_API_KEY is required'),

  // Frontend / ISR
  FRONTEND_URL: z.string().url('FRONTEND_URL must be a valid URL'),
  REVALIDATION_SECRET: z.string().min(1, 'REVALIDATION_SECRET is required'),

  // Server
  PORT: z.string().default('4000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  RAZORPAY_KEY_ID: z.string().min(1, 'RAZORPAY_KEY_ID is required'),
  RAZORPAY_KEY_SECRET: z.string().min(1, 'RAZORPAY_KEY_SECRET is required'),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1, 'RAZORPAY_WEBHOOK_SECRET is required'),
});

// ─── Parse & Validate ─────────────────────────────────────────────────────────

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export type Env = z.infer<typeof envSchema>;
