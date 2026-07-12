# Implementation Plan: Dynamic Pricing & Offers (Full Admin Control)

This plan outlines the architecture to give you 100% control over pricing, product limits, and promotional offers (like Diwali banners) directly from the Admin Panel.

## Proposed Changes

### 1. Database Schema (`07_dynamic_plans_and_offers.sql`)
I will create two new tables:
- **`plans`**: Will store `slug` (e.g. 'basic'), `name`, `monthly_price`, `yearly_price`, `product_limit`, `features` (JSON array), and visual properties (color theme).
- **`offers`**: Will store promotional banners including `title`, `subtitle`, `poster_url`, and an `is_active` toggle.

*We will automatically seed the database with your current 9 plans so you don't lose any data.*

### 2. Backend Restructuring
Currently, the backend Express bot has hardcoded plan prices and limits to generate Razorpay links.
- I will modify `payment.service.ts` and `merchant.service.ts` to dynamically fetch the prices and limits from the `plans` table in your Supabase database.
- The WhatsApp bot logic will be updated to calculate Razorpay links based on the *live* prices from the database.

### 3. Frontend Landing Page
- **Offer Banner**: I will create a new `<OfferBanner />` component that appears at the top of the landing page when an offer is `is_active = true` in the DB.
- **Dynamic Pricing**: The `<Pricing />` component will no longer use hardcoded data. It will fetch all plans from the database so any price change you make in the admin panel instantly reflects on the live site.

### 4. Admin Panel Pages
- **`[NEW] /goatech-admin-hq/offers`**: A dashboard to create/edit promotional banners, write promotional text, and toggle them on/off.
- **`[NEW] /goatech-admin-hq/plans`**: A dashboard listing all your plans (Basic, Starter, Pro, etc.), allowing you to edit the monthly price, yearly price, and product limits in real-time.

## Open Questions

> [!IMPORTANT]  
> 1. For the "Offer Banner" (e.g., Diwali Offer), do you want this to be a large modal pop-up when the user first visits the site, or a sticky banner at the very top of the page?
> 2. Currently, the WhatsApp bot allows users to type "UPGRADE PRO" to get a payment link. Since prices will be dynamic, the bot will use the live database price. Is that correct?

## Verification Plan
1. Run the new database migrations to create the tables.
2. Log into the Admin panel and modify the "Basic" plan price from ₹99 to ₹49.
3. Verify the frontend landing page updates instantly.
4. Message the bot to `REGISTER My Store - BASIC` and verify the Razorpay payment link requests ₹49 instead of ₹99.
