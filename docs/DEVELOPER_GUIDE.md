# Maghgo — Developer Guide

> **New here? Start with this file.** It explains what Maghgo is, how the pieces
> fit together, how to run it on your own laptop, and how to change things
> safely — written so that even if this is your first real project, you can
> follow along.

---

## 1. What is Maghgo, in one paragraph

Maghgo turns a chat account into an online store. A shop owner messages a bot on
**WhatsApp / Instagram / Messenger / SMS**, sends a product photo with a caption
like `Red Shirt ₹499`, and Maghgo removes the background, saves the product, and
publishes it to a real web storefront at `yoursite.com/their-shop`. Customers can
browse that storefront (or chat the bot directly), add items to a cart, apply a
coupon, and **pay online — into the shop's own bank account**. The shop owner
manages everything from either the chat bot or a web dashboard.

---

## 2. The map: how the pieces fit

```
                    ┌──────────────────────────────────────────────┐
   Shop owner &     │                                              │
   customers  ─────▶│  Chat platforms (WhatsApp / IG / Messenger)  │
                    │              + SMS (Twilio)                   │
                    └───────────────────┬──────────────────────────┘
                                        │  webhooks (HTTP POST)
                                        ▼
                    ┌──────────────────────────────────────────────┐
                    │  BACKEND  (backend/)                          │
                    │  Node.js + Express + TypeScript               │
                    │  • receives webhooks, runs the bot logic      │
                    │  • REST API for the dashboard (/api/...)      │
                    │  • talks to Supabase, Razorpay, remove.bg     │
                    └───────────────┬───────────────┬──────────────┘
                                    │               │
                        Supabase    │               │  triggers page rebuilds
                        (Postgres   ▼               ▼  (ISR revalidation)
                         + Storage) ┌──────────────────────────────────────────┐
                                    │  FRONTEND  (frontend/)                    │
                                    │  Next.js (App Router) + React + Tailwind  │
                                    │  • landing page + pricing + live shops    │
                                    │  • each store's public storefront         │
                                    │  • the merchant dashboard                 │
                                    └──────────────────────────────────────────┘
```

**Two apps, one database.**
- `backend/` — the brain. Runs the bot, exposes the API, owns all writes.
- `frontend/` — what people see. The public site, storefronts, and dashboard.
- **Supabase** — a hosted Postgres database **plus** file storage (product images).

Both apps read from Supabase; **only the backend uses the powerful `service_role`
key** (which bypasses security rules). The frontend uses the limited `anon` key,
so a bug in the browser can never do more than a visitor is allowed to.

---

## 3. The technologies (and why)

| Piece | Tech | Why it's here |
|---|---|---|
| Backend | **Node.js + Express + TypeScript** | Simple, well-known HTTP server; TypeScript catches mistakes before they ship |
| Frontend | **Next.js (App Router) + React** | Renders storefronts on the server so they load fast and are Google-friendly |
| Styling | **Tailwind CSS** | Utility classes; storefront themes add their own CSS |
| Database | **Supabase (PostgreSQL)** | Managed SQL database with row-level security |
| Files | **Supabase Storage** | Public bucket `product-images` holds every product photo |
| Payments | **Razorpay** | Payment links for subscriptions (to us) and orders (to the shop) |
| Images | **remove.bg** | AI background removal for product photos |
| Chat | **Meta Cloud API + Twilio** | WhatsApp/Instagram/Messenger + SMS |
| Auth | **JWT** | The dashboard logs in with a signed token minted by the bot (`LOGIN`) |

---

## 4. Run it on your laptop (step by step)

You need **Node.js 20+** and a free **Supabase** account. You do **not** need
WhatsApp/Razorpay keys just to see the site run — those features simply stay off.

### 4.1 Get the code and install

```bash
git clone <your-repo-url> maghgo
cd maghgo

# install both apps
cd backend  && npm install && cd ..
cd frontend && npm install && cd ..
```

### 4.2 Create the database

1. Make a project at [supabase.com](https://supabase.com).
2. Open the project's **SQL Editor**.
3. Run the migration files in `database/` **in number order**, starting with
   `migration.sql`, then `02_…`, `04_…`, up to the highest number. Each one is
   safe to run once. (See §7 for what each does.)
4. In **Storage**, create a **public** bucket named exactly `product-images`.

### 4.3 Configure environment variables

Copy the example files and fill in what you have:

```bash
cp backend/.env.example  backend/.env
cp frontend/.env.example frontend/.env.local
```

The **only** values you truly need to boot are the Supabase URL/keys and a
`JWT_SECRET`. Generate secrets with:

```bash
openssl rand -hex 32
```

See §5 for what every variable means.

### 4.4 Start both apps

Open two terminals:

```bash
# terminal 1 — backend on http://localhost:4000
cd backend && npm run dev

# terminal 2 — frontend on http://localhost:3000
cd frontend && npm run dev
```

Visit **http://localhost:3000**. 🎉

> **Tip:** the bot needs a public URL for Meta to reach it. For local bot
> testing use a tunnel like `ngrok http 4000` and point the Meta webhook at
> `https://<your-ngrok>.ngrok.io/webhook/whatsapp`.

---

## 5. Environment variables explained

### Backend (`backend/.env`)

| Variable | Required? | What it's for |
|---|---|---|
| `SUPABASE_URL` | ✅ | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Full-access DB key. **Server only — never expose.** |
| `JWT_SECRET` | ✅ | Signs dashboard login tokens. ≥ 32 random chars. |
| `FRONTEND_URL` | ✅ | e.g. `http://localhost:3000`; used to build store links |
| `REVALIDATION_SECRET` | ✅ | Shared secret so the backend can tell the frontend to rebuild a page. **Must match the frontend's copy.** |
| `REMOVEBG_API_KEY` | ✅* | AI background removal (\*required by config; bot falls back to the original image if the call fails) |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`, `WEBHOOK_VERIFY_TOKEN` | ✅* | WhatsApp Cloud API (\*validated at boot; needed for the bot) |
| `RAZORPAY_KEY_ID/SECRET/WEBHOOK_SECRET` | ✅* | **Platform** Razorpay — used for *subscription* payments to you |
| `PAYMENTS_ENCRYPTION_KEY` | optional | 64-hex key to encrypt shops' stored Razorpay secrets. Falls back to a key derived from `JWT_SECRET`. |
| `META_PAGE_ACCESS_TOKEN` | optional | Instagram/Messenger sending |
| `REQUIRE_INSTAGRAM_FOLLOW` | optional | `true` = IG bot only replies to followers |
| `TWILIO_*` | optional | SMS channel |
| `SENTRY_DSN` | optional | Error tracking |

### Frontend (`frontend/.env.local`)

| Variable | Required? | What it's for |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Same project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Limited public key (safe in the browser) |
| `NEXT_PUBLIC_API_URL` | ✅ | Where the backend lives, e.g. `http://localhost:4000` |
| `REVALIDATION_SECRET` | ✅ | **Must equal** the backend's value |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | ✅ | Basic-auth for the admin panel `/goatech-admin-hq` |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` / `_INSTAGRAM_HANDLE` / `_MESSENGER_PAGE` / `_SMS_NUMBER` | optional | Power the "Continue with…" buttons. Leave blank to hide a channel — **never** put a placeholder (a wrong number silently sends signups to an account you don't own). |

> **`NEXT_PUBLIC_` means public.** Anything with that prefix is baked into the
> browser bundle. Never put a secret behind it.

---

## 6. How a message becomes a product (follow the code)

This is the single most important flow. Trace it once and the codebase clicks.

```
Meta/Twilio  ──HTTP POST──▶  backend/src/routes/webhook.ts
                                     │
                                     ▼
        backend/src/controllers/message.controller.ts
        • responds 200 to Meta IMMEDIATELY (so it doesn't retry)
        • then processes in the background (setImmediate)
                                     │  builds a channel-agnostic "BotMessage"
                                     ▼
        backend/src/services/bot.service.ts  →  processBotMessage()
        • drops duplicate deliveries
        • routes: shopper shopping?  →  shopper.service.ts
        • otherwise merchant command / image
                                     │
                     image? ────────┤──────── text command?
                        ▼            │            ▼
        handleImageMessage()        │   handleTextCommand()
        1. instant "🎨 Adding…" ack │   REGISTER / LIST / ORDERS /
        2. remove.bg background     │   SALES / STOCK / COUPON …
        3. upload to Supabase       │
        4. createProduct()          │
        5. triggerRevalidation()    │   ← tells the storefront to rebuild
```

Key files to open in order:
1. `backend/src/controllers/message.controller.ts` — the entry point + the
   "ack first, work later" pattern (why replies feel fast).
2. `backend/src/services/bot.service.ts` — every merchant command lives here.
3. `backend/src/services/parser.service.ts` — turns `Red Shirt ₹499` into
   `{ title, price }`.
4. `backend/src/services/product.service.ts` — the database writes.

---

## 7. The database (Supabase)

Tables live in `database/*.sql`. Run them **in number order**. Highlights:

| File | Adds |
|---|---|
| `migration.sql` | Core tables: `merchants`, `products`, `order_logs`, `payments` |
| `06_…`, `07_…` | Platform settings; **plans** & promotional **offers** |
| `09_…` | Locks sensitive merchant columns away from the public `anon` key |
| `13_…` | Product `fulfillment_type` (buy vs pre-book) |
| `14_…`, `15_…` | Custom domains; store address/contacts |
| `16_commerce_features.sql` | Order **payment status**, product **stock**, **coupons** |
| `17_merchant_payments_and_specs.sql` | Shops' **own Razorpay keys**; product **category + specifications** |

### The golden rule: the code degrades gracefully

You'll see this pattern everywhere:

```ts
let { data, error } = await supabase.from('x').select('new_column, ...');
if (error && /new_column|schema cache|42703/i.test(error.message)) {
  // The migration for new_column hasn't been run yet — retry without it.
  ({ data, error } = await supabase.from('x').select('...'));
}
```

**Why:** a running production app might be a migration behind. Instead of
crashing, the feature simply stays off until the migration is applied. When you
add a column, follow the same pattern so nothing breaks between deploy and
migration.

---

## 8. The bot command reference

Message the bot (any channel). Commands are case-insensitive.

**Merchant — setup**
| Command | Does |
|---|---|
| `REGISTER My Store - PRO` | Create a store on a plan |
| `LINK` / `LINK A9F3K2` | Connect another chat channel to the same store |
| `LOGIN` | Get a one-time link into the web dashboard |
| `DESCRIBE <text>` | Set the store description |

**Merchant — products**
| Command | Does |
|---|---|
| *(send a photo + caption `Name ₹499`)* | Add a product |
| `LIST` | Show products (image cards where supported) |
| `EDIT Red Shirt - ₹399` | Change a price |
| `DELETE Red Shirt` | Remove a product (and its images) |
| `STOCK Red Shirt 10` / `STOCK Red Shirt off` | Set / stop tracking inventory |
| `PREBOOK Red Shirt` / `SELL Red Shirt` | Reserve-at-shop vs normal delivery |
| `CLEAR CATALOG` | Delete all products |

**Merchant — business**
| Command | Does |
|---|---|
| `ORDERS` | Your last 5 orders |
| `SALES` (or `STATS`) | Revenue, this month, best seller |
| `STATUS` | Store link & product count |
| `UPGRADE PRO` | Get a payment link to change plan |
| `PAUSE` / `RESUME` | Take the store offline / back online |

**Customer (shopper) — chat shopping**
| Command | Does |
|---|---|
| `SHOP <store-slug>` | Start browsing a store (usually via a deep link) |
| `ADD <id>` / product name | Add to cart |
| `CART` | Review cart |
| `COUPON <code>` | Apply a discount |
| `CHECKOUT` | Place the order (returns a "Pay now" link if the shop connected Razorpay) |
| `CONTACT` | Store address + directions |

---

## 9. The two payment flows (don't mix them up)

There are **two completely separate** money paths:

**A) Subscription — the shop pays *Maghgo*.**
Uses the **platform** Razorpay keys (`RAZORPAY_*` env). Confirmed by the Razorpay
**webhook** at `/webhook/payment/razorpay`. Activates/renews the shop's plan.
Code: `payment.service.ts` → `createPaymentLink`, `routes/payment.ts`.

**B) Order — the customer pays *the shop*.**
Uses the **shop's own** Razorpay keys (they connect them in Settings). The
customer is redirected to `/pay/success`, which asks the backend to verify the
signature with the **shop's** secret and mark the order paid. **Money goes to the
shop, never to us.** Code: `payment.service.ts` → `createOrderPaymentLink` +
`verifyOrderPaymentSignature`, `routes/store.ts` → `/pay/verify`.

Shops' Razorpay secrets are **encrypted at rest** (`backend/src/utils/crypto.ts`,
AES-256-GCM) and never sent to any browser.

---

## 10. The REST API (dashboard)

All under `/api/dashboard`, all require a `Authorization: Bearer <jwt>` header
(the token from `LOGIN`). Scoped to the caller's own store.

| Method + path | Purpose |
|---|---|
| `GET /store` · `PUT /store` | Read / update store details |
| `GET /products` · `POST /products` · `PUT /products/:id` · `DELETE /products/:id` | Product CRUD (stock, description, category, specs included) |
| `GET /orders` · `PATCH /orders/:id` | List orders / change status (notifies the customer) |
| `GET /analytics` | Real revenue & top products |
| `GET /coupons` · `POST /coupons` · `DELETE /coupons/:id` | Discount codes |
| `PUT /payment-keys` | Connect/disconnect the shop's Razorpay |
| `GET /themes` · `PUT /theme` | Storefront themes |
| `PUT /address` · `PUT /domain` | Store address / custom domain |
| `POST /upgrade` | Generate a subscription payment link |

Public storefront API (no auth) under `/api/store`:
`POST /:slug/orders`, `POST /:slug/coupon`, `POST /pay/verify`.

---

## 11. Making a change safely (a worked example)

Say you want to add a **"weight"** field to products.

1. **Database** — new migration `database/18_product_weight.sql`:
   ```sql
   ALTER TABLE products ADD COLUMN IF NOT EXISTS weight TEXT;
   ```
2. **Backend type** — add `weight?: string` to `backend/src/types/whatsapp.ts`.
3. **Backend write** — accept `weight` in `dashboard.ts` product routes, using
   the graceful-degradation retry (§7) so it works before the migration runs.
4. **Frontend type** — add `weight?` to `frontend/src/types/index.ts`.
5. **Frontend UI** — a field in the dashboard add-product modal; show it in the
   storefront product detail modal (`ProductCard.tsx`).
6. **Build both**: `cd backend && npm run build` and `cd frontend && npm run build`.
   Both must print no errors.
7. **Commit** on a branch, open a PR.

> **Always build both apps before committing.** A green `npm run build` is the
> minimum bar — it means the TypeScript types line up end to end.

---

## 12. Deploying

- **Backend** → a Node host (e.g. Render). Set every backend env var. Start
  command: `npm run build && npm start`.
- **Frontend** → Vercel. Set every `NEXT_PUBLIC_*` var **and** the server-side
  `SUPABASE_SERVICE_ROLE_KEY`, `REVALIDATION_SECRET`, `ADMIN_*`.
- **Database** → run any new `database/*.sql` migrations in Supabase.
- **Webhooks** → point Meta and Razorpay at the deployed backend URL.

The repo has more detail in `docs/production_deployment_guide.md` and
`MANUAL_TASKS.md`.

---

## 13. Troubleshooting

| Symptom | Likely cause |
|---|---|
| Storefront says "Store Unavailable" | Store is paused, or its subscription lapsed (`subscription_ends_at` in the past) |
| "No products yet" but there are products | Migration behind, or the `product-images` bucket is missing/not public |
| Bot never replies | Webhook URL wrong, or `WEBHOOK_VERIFY_TOKEN` mismatch, or (for IG/Messenger) Meta App Review not approved yet |
| Bot reply is slow | External call stalling — remove.bg / Meta / Razorpay (all now time-bounded; check logs) |
| Product edits take ~1 min to show | `REVALIDATION_SECRET` differs between backend and frontend |
| "Pay Online" missing on a store | That shop hasn't connected its own Razorpay in Settings |
| Dashboard 401 | The `LOGIN` token expired (24h) — send `LOGIN` again |

---

## 14. Where things live (cheat sheet)

```
backend/src/
  index.ts                    app setup, route mounting, body parsing
  config/env.ts               validates every env var at boot (fails fast)
  controllers/                webhook entry points (WhatsApp/IG/Messenger, SMS)
  routes/                     HTTP endpoints (dashboard, store, payment, auth…)
  services/                   the real logic:
    bot.service.ts              merchant commands
    shopper.service.ts          customer chat shopping
    product.service.ts          product DB operations
    order.service.ts            orders, analytics, payment settlement
    payment.service.ts          Razorpay (subscriptions + per-shop orders)
    coupon.service.ts           discount codes
    merchant.service.ts         stores, plans, channel linking
    whatsapp.service.ts         Meta Cloud API senders (timeouts here)
    meta.service.ts             Instagram/Messenger senders
    media.service.ts            remove.bg background removal
    storage.service.ts          Supabase image upload/delete
  utils/                      crypto (secret encryption), phone, slug, plans

frontend/src/
  app/
    page.tsx                  landing: hero, live shops, pricing
    [store_slug]/             a store's public storefront
    dashboard/                the merchant dashboard (one folder per page)
    pay/success/              order payment confirmation
    goatech-admin-hq/         internal admin panel (basic-auth)
  components/                 landing/, store/, dashboard UI
  stores/cart.ts              client-side cart (Zustand)
  lib/                        utils, supabase clients, plans, site-config

database/                     numbered SQL migrations — run in order
docs/                         this guide + deployment/architecture notes
```

---

**Golden rules, one more time:**
1. The **backend owns all writes**; the frontend `anon` key is deliberately weak.
2. New DB columns → **graceful-degradation** retry so nothing breaks pre-migration.
3. **Build both apps** before committing.
4. Never expose a secret behind `NEXT_PUBLIC_`, and never commit a `.env` file.
5. Customer money goes to the **shop's** Razorpay; only subscriptions go to the platform.

Welcome aboard. 🐐
