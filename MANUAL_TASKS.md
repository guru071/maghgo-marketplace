# Maghgo - Production Launch Manual Checklist

This document outlines the exact manual steps you need to take to finalize the deployment of your platform to production. The codebase has been fully audited, secured, and fixed by Antigravity, but these environment and API configurations must be done by you.

## 1. Required API Keys (What, Where, How)

Your application relies on 4 core external APIs. You must obtain keys for each of these and store them securely in your production hosting environment (e.g., **Vercel** for the frontend, **DigitalOcean/Railway/Heroku** for the backend).

### A. Supabase (Database & Auth)
*   **What you need:** `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
*   **How to get it:**
    1. Go to your [Supabase Dashboard](https://supabase.com/dashboard).
    2. Select your Maghgo project.
    3. Go to **Project Settings** (gear icon) -> **API**.
    4. Copy the "Project URL" and the "anon/public" key.
    5. Scroll down to "service_role" and copy that secret key.
*   **Where to put it:**
    *   **Frontend (.env in Vercel):** Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
    *   **Backend (.env in your Node server):** Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

### B. Razorpay (Payments)
*   **What you need:** `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
*   **How to get it:**
    1. Log in to your [Razorpay Dashboard](https://dashboard.razorpay.com/).
    2. Go to **Settings** -> **API Keys**.
    3. Click **Generate Live Key** (or use Test Key for now).
    4. Copy the Key ID and Key Secret.
*   **Where to put it:**
    *   **Backend (.env):** Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.

### C. Meta / WhatsApp (Chatbot)
*   **What you need:** `WEBHOOK_VERIFY_TOKEN`
*   **How to get it:**
    1. Log in to your [Meta Developer Dashboard](https://developers.facebook.com/).
    2. Go to your WhatsApp app -> **WhatsApp** -> **Configuration**.
    3. Under Webhook, you will see a "Verify Token" that you created yourself when setting up the webhook.
*   **Where to put it:**
    *   **Backend (.env):** Add `WEBHOOK_VERIFY_TOKEN`.

### D. Twilio (SMS Fallback / Text Orders)
*   **What you need:** `TWILIO_AUTH_TOKEN` (Optional: Only if using SMS orders)
*   **How to get it:**
    1. Log in to your [Twilio Console](https://console.twilio.com/).
    2. Scroll down on the homepage to the "Account Info" section.
    3. Copy the "Auth Token" (click the eye icon to reveal).
*   **Where to put it:**
    *   **Backend (.env):** Add `TWILIO_AUTH_TOKEN`.
    *   *Also configure the webhook URL in Twilio: Phone Numbers -> Manage -> Active Numbers -> Click your number -> Set "A MESSAGE COMES IN" to `https://your-backend-domain.com/webhook/sms` (HTTP POST).*


## 2. Environment Variables Summary Checklist

### Frontend (Vercel)
Ensure these are set in your Vercel Project Settings -> Environment Variables:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
ADMIN_USERNAME=secure_admin
ADMIN_PASSWORD=secure_password
REVALIDATION_SECRET=random_secure_string
```

### Backend (DigitalOcean / Railway)
Ensure these are set in your backend server's environment:
```env
SUPABASE_URL=https://xyz.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=xyz123
WEBHOOK_VERIFY_TOKEN=my_whatsapp_secret
TWILIO_AUTH_TOKEN=twilio_secret
FRONTEND_URL=https://your-vercel-domain.com
```

## 3. Themes
The 60 premium themes are already seeded in your database. To regenerate or
change them, run: `node backend/scripts/generate-rich-themes.js --apply`


## 4. Final Live Test
Once deployed to production:
1. Visit `https://your-frontend-domain.com/goatech-admin-hq`. You should be prompted for a username and password.
2. Go to a store link (e.g., `/demo`) and verify that adding an item to the cart opens the drawer and the UI is fully styled.
3. Send a test WhatsApp message to your bot to verify the webhook responds securely.
4. Process a $1 (or ₹1) test transaction through Razorpay to ensure the backend validates the amount properly.

You are now 100% ready for production! 🚀
