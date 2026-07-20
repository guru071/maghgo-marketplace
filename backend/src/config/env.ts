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
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required'),

  // JWT Secret — must be a strong, unguessable value set via the environment.
  // No default is allowed: a hardcoded fallback would let anyone forge tokens.
  // The `error` callback also covers the missing/undefined case, so a fresh
  // deploy gets actionable guidance instead of "expected string, received undefined".
  JWT_SECRET: z
    .string({ error: 'JWT_SECRET is required. Generate one with: openssl rand -hex 32' })
    .min(32, 'JWT_SECRET must be at least 32 characters. Generate one with: openssl rand -hex 32'),

  // Frontend URL for generating links
  REMOVEBG_API_KEY: z.string().min(1, 'REMOVEBG_API_KEY is required'),

  // Frontend / ISR
  FRONTEND_URL: z.string().url('FRONTEND_URL must be a valid URL'),
  REVALIDATION_SECRET: z.string().min(1, 'REVALIDATION_SECRET is required'),

  // Server
  PORT: z.string().default('4000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  // When 'true', the Instagram bot only replies to users who follow the account.
  REQUIRE_INSTAGRAM_FOLLOW: z.string().optional().transform((v) => v === 'true' || v === '1'),
  RAZORPAY_KEY_ID: z.string().min(1, 'RAZORPAY_KEY_ID is required'),
  RAZORPAY_KEY_SECRET: z.string().min(1, 'RAZORPAY_KEY_SECRET is required'),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1, 'RAZORPAY_WEBHOOK_SECRET is required'),

  // Optional 32-byte hex key (64 chars) used to encrypt shops' stored Razorpay
  // secrets at rest. If unset, a key is derived from JWT_SECRET. Generate one
  // with: openssl rand -hex 32
  PAYMENTS_ENCRYPTION_KEY: z.string().optional(),

  // Optional: name of an APPROVED WhatsApp utility template whose body is a
  // single {{1}} placeholder. When set, notifications that fall outside the
  // free 24-hour reply window are re-sent as this template (billed by Meta)
  // instead of silently failing. Create it in WhatsApp Manager → Message
  // templates, category Utility.
  WHATSAPP_TEMPLATE_ORDER_UPDATE: z.string().optional(),
  WHATSAPP_TEMPLATE_LANG: z.string().optional(),

  // Telegram bot (optional channel). Both unset → the /webhook/telegram route
  // rejects everything and the channel is simply off.
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),

  // Background removal provider: 'removebg' (paid API, default) or 'local'
  // (free on-server AI — needs `npm i @imgly/background-removal-node` and
  // ~2GB RAM; silently falls back to remove.bg if unavailable).
  BG_REMOVAL_PROVIDER: z.enum(['removebg', 'local']).optional(),
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
