# 🔑 Maghgo API Keys Guide

To run your WhatsApp-to-Web Auto-Catalog platform, you need API keys from three different services. All of them offer generous free tiers. 

This guide explains exactly what you need, where to get it, and how to find it.

---

## 1. Supabase (Database & Storage)

**What you need:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**Where to get it:** [supabase.com](https://supabase.com)

**How to get it:**
1. Sign up and click **"New Project"**.
2. Give your project a name and database password, then click **Create new project**.
3. Once your project is ready, look at the left sidebar and click on the **Settings (gear icon ⚙️)** at the bottom.
4. In the settings menu, click on **API** (under Configuration).
5. **Project URL:** Copy the URL shown here. This is your `SUPABASE_URL`.
6. **Project API Keys:**
   - Look for the key labeled `anon` and `public`. Copy this. This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - Look for the key labeled `service_role` and `secret`. Click "Reveal" and copy this. This is your `SUPABASE_SERVICE_ROLE_KEY`.

> [!CAUTION]
> **Never** put your `service_role` key in your frontend `.env` file! It bypasses all security rules and should only ever be used in your backend server.

---

## 2. Meta for Developers (WhatsApp Business API)

**What you need:**
- `WHATSAPP_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_APP_SECRET`

**Where to get it:** [developers.facebook.com](https://developers.facebook.com)

**How to get it:**
1. Log in with your Facebook account and go to **My Apps**.
2. Click the **Create App** button.
3. Select **Other**, click Next, and then select **Business** as the app type.
4. Give your app a name and click **Create app**.
5. You will be taken to a page that says "Add products to your app". Scroll down and find **WhatsApp**, then click **Set up**.
6. **Get your Token and Phone ID:**
   - In the left sidebar, under WhatsApp, click on **API Setup**.
   - You will see a long **Temporary access token**. Copy this. This is your `WHATSAPP_TOKEN`.
   - Just below that, look for the **Phone number ID**. Copy this. This is your `WHATSAPP_PHONE_NUMBER_ID`.
7. **Get your App Secret:**
   - In the left sidebar, click on **App Settings**, then click **Basic**.
   - You will see a field for **App Secret**. Click "Show", enter your password if prompted, and copy it. This is your `WHATSAPP_APP_SECRET`.

---

## 3. Remove.bg (AI Background Removal)

**What you need:**
- `REMOVEBG_API_KEY`

**Where to get it:** [remove.bg/api](https://www.remove.bg/api)

**How to get it:**
1. Sign up for a free account.
2. In the top right corner, click on your profile/account name and select **Dashboard**.
3. Click on the **API Keys** tab.
4. Click the **New API Key** button.
5. A popup will appear showing a long string of letters and numbers. Copy this string. This is your `REMOVEBG_API_KEY`.

---

## 4. Razorpay (For Merchant Subscriptions)

**What you need:**
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`

**Where to get it:** [razorpay.com](https://razorpay.com)

**How to get it:**
1. Sign up for a Razorpay account and log into the Dashboard.
2. Ensure you are in **Test Mode** (toggle at the top) while developing.
3. In the left sidebar, go to **Account & Settings** → **API Keys**.
4. Click **Generate Key** to get your `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
5. To get the `RAZORPAY_WEBHOOK_SECRET`:
   - Go to **Account & Settings** → **Webhooks**.
   - Click **Add New Webhook**.
   - Set the URL to your deployed backend URL: `https://your-backend.com/payment/razorpay`.
   - Create a random password and enter it in the **Secret** field. This is your `RAZORPAY_WEBHOOK_SECRET`.
   - Check the `payment_link.paid` event and save.

---

## 5. Custom Environment Variables

These are variables you create yourself; you don't get them from any third-party service.

- `WEBHOOK_VERIFY_TOKEN`: Create a random, secure password (e.g., `my_super_secret_webhook_123`). You will enter this same password in the Meta Dashboard when you configure your Webhook, and also put it in your backend `.env`.
- `REVALIDATION_SECRET`: Create another random password (e.g., `update_my_store_123`). This must be exactly the same in both your frontend `.env` and backend `.env`. It proves that your backend has permission to force the frontend to refresh the product catalog.
- `FRONTEND_URL`: Your live frontend domain (e.g., `https://your-frontend-domain.com`). Used by the backend to trigger ISR revalidation.
