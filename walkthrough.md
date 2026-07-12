# Feature Walkthrough: Dynamic Plans & Offers

I have successfully re-architected the system to give you full control over pricing and promotional offers. Here's a breakdown of what was implemented:

## What was built:

### 1. Database Upgrade
I created the `database/07_dynamic_plans_and_offers.sql` migration file. This will create:
- A `plans` table to hold all your pricing plans (and pre-populates it with your 9 existing plans).
- An `offers` table to store dynamic promotional banners (like Diwali sales).

### 2. Admin Dashboards
You now have two new powerful interfaces in your admin panel:
- **Pricing Dashboard (`/goatech-admin-hq/plans`)**: View all your subscription plans side-by-side. You can click "Edit Pricing" to instantly change the **Monthly Price**, **Yearly Price**, or **Product Limit** of any plan. 
- **Offers Dashboard (`/goatech-admin-hq/offers`)**: Create gorgeous promotional banners. You can write a title (e.g., "Diwali Mega Sale!"), subtitle, and upload a poster image URL. Toggling an offer to "Active" instantly displays it to everyone visiting the landing page.

### 3. Smart Dynamic Frontend
- The landing page (`page.tsx`) now queries the database *live*.
- The `<Pricing />` component builds itself automatically based on the database, so price changes made in the admin panel appear instantly without needing to redeploy the frontend.
- When an offer is active, an elegant sticky `<OfferBanner />` appears at the very top of the landing page to drive conversions.

### 4. Intelligent Backend Bot
- I completely overhauled the Express.js backend logic (`bot.service.ts`, `payment.service.ts`, `merchant.service.ts`).
- Now, when a user messages `UPGRADE PRO`, the WhatsApp bot doesn't look at a hardcoded price. It queries the Supabase database to fetch the exact, live price of the "Pro" plan that you set in the admin dashboard, and generates a Razorpay link for that specific amount! 

## 🛠️ Manual Action Required

Because I created new tables, you will need to run the SQL migration on your live database to make everything work.

1. Open your **Supabase Dashboard**.
2. Go to the **SQL Editor**.
3. Copy the contents of `database/07_dynamic_plans_and_offers.sql` and hit **Run**.
4. Visit your `/goatech-admin-hq/plans` and `/goatech-admin-hq/offers` pages to test out your new superpowers!
