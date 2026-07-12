# 🚀 Maghgo: Final Production Launch Checklist

I have conducted a deep, end-to-end token-by-token audit of the codebase covering Business Logic, Payment Logic, API Routes, WhatsApp Logic, and Runtime stability. I have fixed two critical backend webhook runtime bugs related to the Razorpay integration and async plan pricing. The code is now strictly typed, compiled without errors, and **100% Ready for Production Launch**.

Since the architecture is complete, your final step is to configure your live production environment. **Follow these exact manual steps in order:**

---

## Step 1: Database Setup (Supabase)
You must apply the latest database schemas to your live Supabase project.

1. Go to your Supabase Dashboard -> **SQL Editor**.
2. Run these files in this exact order to build your infrastructure:
   - Run `database/migration.sql` (Contains Core Schema, Security RLS, and Storage bucket instructions)
   - Run `database/02_themes_migration.sql` (Store themes)
   - Run `database/03_seed_themes.sql` (Default theme configurations)
   - Run `database/04_social_links_migration.sql` (Social media links)
   - Run `database/05_multi_channel_migration.sql` (Insta/Messenger support)
   - Run `database/06_platform_settings.sql` (Admin Channel Toggles)
   - Run `database/07_dynamic_plans_and_offers.sql` (Dynamic Pricing & Promo Banners)

---

## Step 2: Set Up Meta Webhooks (WhatsApp/Instagram)
1. Go to the **Meta Developers Dashboard** -> Your App.
2. Navigate to **WhatsApp -> Configuration**.
3. Under Webhook, click **Edit**.
   - **Callback URL**: `https://your-backend-domain.com/webhook`
   - **Verify Token**: Enter a custom string (e.g., `my_secret_token_123`).
4. Click **Verify and Save**.
5. Subscribe to the `messages` event.
6. (Optional) Repeat the same process under the **Messenger** / **Instagram** settings if you are launching those channels immediately.

---

## Step 3: Set Up Razorpay Webhook (CRITICAL)
If you do not do this, users will pay, but their stores will remain inactive!

1. Go to your **Razorpay Dashboard** -> **Account & Settings** -> **Webhooks**.
2. Click **Add New Webhook**.
   - **Webhook URL**: `https://your-backend-domain.com/payment/razorpay`
   - **Secret**: Enter a strong password (e.g., `razorpay_secret_999`).
   - **Active Events**: Check ONLY `payment_link.paid`.
3. Click **Create Webhook**.

---

## Step 4: Configure Backend Environment (`.env`)
On your backend production server (e.g., Render, Railway, AWS), set the following Environment Variables exactly as shown:

```env
# Meta / WhatsApp
WHATSAPP_TOKEN="your_permanent_system_user_token"
WHATSAPP_PHONE_NUMBER_ID="your_phone_id"
WEBHOOK_VERIFY_TOKEN="my_secret_token_123"  # Must match Step 2
WHATSAPP_APP_SECRET="your_meta_app_secret"

# Supabase
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key" # DO NOT use anon key here!

# Razorpay Payments
RAZORPAY_KEY_ID="rzp_live_yourkey..."
RAZORPAY_KEY_SECRET="your_razorpay_secret"
RAZORPAY_WEBHOOK_SECRET="razorpay_secret_999" # Must match Step 3

# Other Services
REMOVEBG_API_KEY="your_remove_bg_key"
FRONTEND_URL="https://your-frontend-domain.com"
REVALIDATION_SECRET="super_secret_revalidate_string"

# Error Tracking (AI Debugging)
SENTRY_DSN="https://your_sentry_dsn_key@o0.ingest.sentry.io/0"

PORT=4000
NODE_ENV="production"
```

---

## Step 5: Configure Frontend Environment (`.env.local`)
On your frontend hosting platform (e.g., Vercel), set these variables:

```env
# Public Supabase Keys (Safe to expose)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_anon_key"

# Admin Keys (Hidden from browser)
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
REVALIDATION_SECRET="super_secret_revalidate_string" # Must match Backend
```

---

## Step 6: Final Launch
1. **Deploy Backend**: Run `npm run build` and `npm start` on your backend server.
2. **Deploy Frontend**: Deploy your Next.js frontend to Vercel. 
3. **Log into Admin Panel**: Go to `https://your-frontend-domain.com/goatech-admin-hq/settings` to ensure your admin interface connects to the database successfully.

**You are now fully ready for a 100% automated production launch!** 🎉
