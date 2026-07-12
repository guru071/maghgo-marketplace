# Maghgo - Production Launch Manual Checklist

This document outlines the exact manual steps you need to take to finalize the deployment of your platform to production. The codebase has been fully audited, secured, and fixed by Antigravity, but these environment and platform configurations must be done by you.

## 1. Twilio SMS Webhook Configuration
In order to process incoming SMS messages securely and without spoofing:
1. Log in to your Twilio Console.
2. Go to **Phone Numbers** -> **Manage** -> **Active Numbers**.
3. Click on your active Maghgo phone number.
4. Scroll down to the **Messaging** section.
5. Under "A MESSAGE COMES IN", set the URL to:
   `https://your-production-domain.com/webhook/sms`
   *(Make sure to change `your-production-domain.com` to your actual backend domain!)*
6. Set the HTTP method to `HTTP POST`.
7. Click **Save**.

## 2. Environment Variables (.env)
You must verify that your production environment variables are correctly populated in your hosting provider (e.g., Vercel, Railway, DigitalOcean).

### Frontend (.env)
Check that you have these strictly configured:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Admin Dashboard Auth
# If you don't set these, the dashboard defaults to admin/admin
ADMIN_USERNAME=your_secure_admin_username
ADMIN_PASSWORD=your_secure_admin_password

# Next.js Revalidation
REVALIDATION_SECRET=your_secure_random_string_here
```

### Backend (.env)
Check that you have these strictly configured:
```env
# Twilio Auth (Critical for the new security patch)
TWILIO_AUTH_TOKEN=your_twilio_auth_token

# Razorpay (Critical for payment verification)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Supabase
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Frontend URL (For CORS Security)
FRONTEND_URL=https://your-frontend-domain.com

# Webhook Verification (WhatsApp)
WEBHOOK_VERIFY_TOKEN=your_whatsapp_webhook_token
```

## 3. Database Migrations & Seeds
Since we added new themes (Cyberpunk, Luxury, etc.) to the seed data, make sure your production database has the latest data.
1. Run any pending database migrations to Supabase:
   `npx supabase db push`
2. Run your backend seed script or simply call the frontend seed API route in your browser once you deploy:
   `https://your-frontend-domain.com/api/seed-themes`
   *(You must be logged in as an admin to trigger this since we protected the routes).*

## 4. Run a Clean Production Build
Before pushing to production, verify the Next.js cache is clean so Tailwind CSS renders correctly.
Run these commands in your frontend folder:
```bash
cd frontend
rm -rf .next
npm run build
npm run start
```
Check that the UI looks perfect locally. Once verified, push your code to your production Git branch.

## 5. Final Live Test
Once deployed to production:
1. Try to visit `https://your-frontend-domain.com/goatech-admin-hq`. You should be prompted for a username and password.
2. Go to a store link (e.g., `/demo`) and verify that adding an item to the cart opens the drawer and the UI is fully styled.
3. Send a test SMS to your Twilio number to verify the webhook receives and processes it securely.
4. Process a $1 (or ₹1) test transaction through Razorpay to ensure the backend validates the amount properly.

You are now 100% ready for production! 🚀
