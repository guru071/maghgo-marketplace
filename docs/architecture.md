# Maghgo System Architecture & Developer Guide

Maghgo is a multi-channel (WhatsApp, Instagram, Messenger) e-commerce platform that allows merchants to instantly create and manage web storefronts purely through chat interfaces.

This document serves as the central architectural reference and developer onboarding guide.

---

## 1. High-Level Architecture

The system is composed of three primary pillars:
1. **The Node.js Backend**: Serves as the central webhook receiver for Meta (WhatsApp/IG/Messenger) and Razorpay. It processes chat commands, runs AI image processing, and manages the database.
2. **The Next.js Frontend**: Serves the merchant landing page, the admin dashboard, and dynamically generates thousands of heavily cached, SEO-optimized merchant storefronts.
3. **Supabase (PostgreSQL)**: The central source of truth for all data, utilizing Row Level Security (RLS) for frontend queries and service roles for backend operations.

```mermaid
graph TD
    subgraph Users
    M[Merchant]
    C[Customer]
    end

    subgraph External APIs
    META[Meta Webhooks\nWhatsApp/IG/FB]
    PAY[Razorpay]
    BG[Remove.bg]
    end

    subgraph Backend - Express/Node
    BOT[Bot Service\nCommand Parser]
    HOOKS[Webhook Receivers]
    MEDIA[Media Processing]
    JOBS[Cron Jobs]
    end

    subgraph Frontend - Next.js
    LAND[Landing Page]
    STORE[Dynamic Storefronts\n/[store_slug]]
    BUILD[Store Builder\nPuck.js]
    ADMIN[Admin HQ]
    end

    subgraph Database - Supabase
    DB[(PostgreSQL)]
    STORAGE[(Storage Buckets)]
    end

    M <--> META
    META --> HOOKS
    HOOKS --> BOT
    BOT --> BG
    BOT <--> DB
    BOT --> STORAGE

    PAY --> HOOKS
    
    C --> STORE
    STORE <--> DB
    
    M --> BUILD
    BUILD <--> DB
```

---

## 2. Core Data Models

The PostgreSQL database is hosted on Supabase. Key tables include:

| Table | Purpose | Key Fields |
|-------|---------|------------|
| **`merchants`** | Stores merchant profiles and billing status. | `store_slug`, `phone_number`, `subscription_plan`, `trial_ends_at`, `theme_config` |
| **`products`** | Stores products uploaded via chat. | `merchant_id`, `title`, `price`, `original_image_url`, `processed_image_url` |
| **`payments`** | Audit log of all Razorpay transactions. | `merchant_id`, `razorpay_payment_id`, `amount`, `status` |
| **`order_logs`** | Tracks orders placed on storefronts. | `merchant_id`, `customer_phone`, `items`, `total`, `status` |

> [!TIP]
> **Row Level Security (RLS)** is enabled on all tables. The frontend queries Supabase directly using the `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and RLS policies ensure customers can only see `is_active=true` merchants and `is_available=true` products. The backend uses the `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS for administrative actions.

---

## 3. Core Business Workflows

### A. Merchant Registration & Payment
1. Merchant sends `REGISTER Store Name - PLAN` to the WhatsApp/IG bot.
2. The `bot.service.ts` parses the command, reserves a `store_slug` in the DB, and sets the plan to `inactive`.
3. The backend generates a Razorpay payment link via API and replies with the URL.
4. Merchant pays. Razorpay fires the `payment_link.paid` webhook to `/api/payment/razorpay`.
5. The backend validates the signature, performs an **idempotency check**, updates the merchant to `is_active=true`, and extends `trial_ends_at`.

### B. AI Product Upload
1. Merchant sends an image with a caption (e.g., "Red Shirt Rs 500").
2. `webhook.ts` receives the binary media and passes it to `media.service.ts`.
3. The image is sent to **Remove.bg** to strip the background.
4. Both original and processed images are uploaded to the Supabase `product-images` storage bucket.
5. A new row is inserted into `products`.
6. **Crucial Step**: The backend makes a POST request to the Frontend's `/api/revalidate` endpoint to instantly clear the Next.js cache for that specific `store_slug`.

### C. Frontend Dynamic Storefronts
1. Customers visit `maghgo.com/their-store`.
2. Next.js App Router catches the dynamic `[store_slug]` route.
3. The server fetches the merchant's `theme_config` (JSON) and products.
4. The page is rendered utilizing **Puck.js** components if a custom theme is applied.
5. The page uses Incremental Static Regeneration (ISR) with `revalidate = 60` to ensure lightning-fast loads while keeping data relatively fresh if revalidation webhooks fail.

---

## 4. Security & Environment Variables

> [!IMPORTANT]
> The backend and frontend must **never** share `.env` files in production. The backend contains highly sensitive secrets that must remain out of the browser bundle.

### Backend Requirements (`backend/.env`)
- `WHATSAPP_TOKEN`, `META_PAGE_ACCESS_TOKEN`: For sending messages.
- `SUPABASE_SERVICE_ROLE_KEY`: **CRITICAL**. Grants full admin access to the database. Keep strictly on the server.
- `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`: For payment processing and validation.

### Frontend Requirements (`frontend/.env`)
- `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Safe for the browser.
- `ADMIN_USERNAME` & `ADMIN_PASSWORD`: Used by the Next.js `middleware.ts` for Basic Auth protecting the `/goatech-admin-hq` dashboard and the `/api/builder/save` endpoint.

---

## 5. Known Limitations & Future Roadmap

1. **WhatsApp Media Expiry**: Meta's media URLs expire quickly. The backend must download images immediately upon webhook receipt, which it currently does.
2. **Store Builder Authentication**: Currently, the Store Builder API is protected by global Admin Basic Auth. In the future, this should be migrated to a Magic Link or OTP system so individual merchants can log in and design their own stores securely.
3. **Payment Idempotency**: Handled via the `payments` table. If the database is wiped or reset, ensure the webhook logic is thoroughly tested to prevent double-billing.

## 6. Developer Commands

### Backend
```bash
cd backend
npm install
npm run dev      # Starts Express on port 4000
npm run build    # Compiles TypeScript to /dist
```

### Frontend
```bash
cd frontend
npm install
npm run dev      # Starts Next.js on port 3000
npm run build    # Creates optimized production build
```
