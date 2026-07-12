# 📱 Maghgo Application Tutorial

Welcome to your WhatsApp-to-Web Auto-Catalog platform! This tutorial explains exactly how to use the application from the perspective of **you (the platform owner)**, **the merchant (the shop owner)**, and **the customer (the buyer)**.

---

## 1. As the Platform Owner: Onboarding a Merchant

Since this is the MVP, merchants do not sign themselves up via a web portal. You onboard them directly in your database.

Let's assume a shop owner named "Ravi" runs a clothing store called "Chennai Threads" and his WhatsApp number is `+919876543210`.

**How to onboard him:**
Open your Supabase SQL Editor and run this command:
```sql
INSERT INTO merchants (phone_number, store_name, store_slug, store_description)
VALUES (
  '919876543210',               -- Must match exact WhatsApp number without the '+'
  'Chennai Threads', 
  'chennai-threads',            -- This will be his website URL: yourdomain.com/chennai-threads
  'Premium handpicked clothing from Chennai'
);
```
*That’s it! Ravi now has an active, 4-day trial account.*

---

## 2. As the Merchant (Ravi): Managing the Catalog via WhatsApp

Ravi does not need to learn any complex software, download any apps, or remember any passwords. He manages his entire e-commerce store directly from his existing WhatsApp.

**Adding a Product:**
1. Ravi takes a photo of a new blue cotton shirt using his phone's camera.
2. He opens the chat with your Maghgo WhatsApp Bot.
3. He attaches the photo and types a simple caption with the product name and price, for example:
   > *"Blue Cotton Shirt Rs 899"*
4. He taps **Send**.

**What happens next?**
1. Your backend receives the photo, strips away the messy background using AI, and saves a crisp, professional version.
2. The bot instantly replies to Ravi on WhatsApp:
   > *"✅ Product Added! View your live store here: maghgo.com/chennai-threads"*
3. Ravi's new shirt is instantly live on his website.

**Other WhatsApp Commands Ravi can use:**
- `LIST` - The bot replies with a numbered list of all active products.
- `DELETE [Product Name]` - Removes a product from the website instantly.
- `STATUS` - Tells Ravi how many products he has and how many days are left on his trial.

---

## 3. As the Customer: Browsing and Buying

A customer named Priya sees Ravi's store link (`maghgo.com/chennai-threads`) on his Instagram bio or WhatsApp status and taps it.

**Here is a video demonstrating the complete customer experience:**
![Customer Walkthrough Video](/home/guru/.gemini/antigravity/brain/8a840eb4-aa38-4e72-a3af-741f77e016fc/customer_walkthrough.mp4)

**The Shopping Experience:**
1. Priya lands on a lightning-fast, premium storefront. She sees the "Blue Cotton Shirt" with a clean white background.
2. She taps **"Add to Cart"**. 
3. A sleek cart drawer slides out from the side of the screen.
4. She taps **"Checkout via WhatsApp"**.

**The Magic Checkout:**
Priya is instantly redirected back to her WhatsApp app, opening a chat directly with Ravi's phone number. The message box is pre-filled with her order details:

> *"Hi! I'd like to order from Chennai Threads:*
> 
> *1x Blue Cotton Shirt — ₹899*
> 
> *Total: ₹899*
> 
> *Please share payment & delivery details. 🙏"*

Priya taps send. Ravi receives the order via WhatsApp, shares his UPI QR code or bank details, and ships the product. 

**No payment gateway fees, no abandoned checkout forms. Just instant, conversational commerce.**
