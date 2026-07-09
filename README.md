# Maghgo — WhatsApp-to-Web Auto-Catalog

> Turn your WhatsApp into a premium web store. Just send photos. We do the rest.

![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18-green)
![Next.js](https://img.shields.io/badge/Next.js-14-black)

## What is Maghgo?

Maghgo is a platform that lets local shop owners create stunning e-commerce websites by simply sending product photos via WhatsApp. No tech skills needed. No website builders. Just chat.

### How it works

1. **Merchant sends a photo** with caption like `"Red Cotton T-Shirt Rs 499"` to the Maghgo WhatsApp bot
2. **AI processes the image** — removes messy backgrounds, makes it look professional
3. **Product goes live instantly** on their custom web store at `maghgo.com/store-name`
4. **Customers browse & checkout** — orders are sent directly to the merchant via WhatsApp

## Architecture

```
                    ┌─────────────────┐
                    │   WhatsApp      │
                    │   Cloud API     │
                    └────────┬────────┘
                             │ Webhook
                    ┌────────▼────────┐
                    │   Express.js    │ ◄── Backend (Port 4000)
                    │   Backend       │
                    └──┬──────┬──┬────┘
                       │      │  │
              ┌────────▼┐  ┌──▼──▼────────┐
              │remove.bg│  │   Supabase   │
              │  API    │  │ PostgreSQL + │
              └─────────┘  │   Storage    │
                           └──────┬───────┘
                                  │
                    ┌─────────────▼───────┐
                    │    Next.js 14       │ ◄── Frontend (Port 3000)
                    │    Storefront       │
                    └─────────────────────┘
```

## Project Structure

```
maghgo/
├── backend/          # Express.js WhatsApp webhook server
├── frontend/         # Next.js storefront
├── database/         # SQL migrations
└── README.md
```

## Prerequisites

- Node.js 18+
- npm or yarn
- A [Meta Developer Account](https://developers.facebook.com/) with WhatsApp Cloud API
- A [Supabase](https://supabase.com/) project
- A [remove.bg](https://www.remove.bg/api) API key

## Quick Start

### 1. Clone & Install

```bash
# Backend
cd maghgo/backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project
2. Run the migration in `database/migration.sql` via the SQL Editor
3. Create a Storage bucket called `product-images` (set to Public)
4. Copy your project URL, anon key, and service role key

### 3. Configure Environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit with your credentials

# Frontend
cp frontend/.env.example frontend/.env
# Edit with your credentials
```

### 4. Set Up WhatsApp Webhook

1. Go to [Meta Developer Console](https://developers.facebook.com/)
2. Create a new app → Select "Business" → Add WhatsApp
3. In the WhatsApp API Setup page:
   - Note your **Phone Number ID** and **Access Token**
   - Configure the webhook URL: `https://your-server.com/webhook`
   - Set the verify token to match your `WEBHOOK_VERIFY_TOKEN`
   - Subscribe to the `messages` field

### 5. Run Development Servers

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

### 6. Expose Backend (for WhatsApp webhook)

For local development, use ngrok to expose your backend:

```bash
ngrok http 4000
```

Copy the HTTPS URL and set it as your webhook URL in Meta Developer Console.

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `WHATSAPP_TOKEN` | Meta WhatsApp Cloud API access token |
| `WHATSAPP_PHONE_NUMBER_ID` | Your WhatsApp Business phone number ID |
| `WEBHOOK_VERIFY_TOKEN` | Custom string for webhook verification |
| `WHATSAPP_APP_SECRET` | App secret for signature verification |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only!) |
| `REMOVEBG_API_KEY` | remove.bg API key |
| `FRONTEND_URL` | Next.js frontend URL (for ISR revalidation) |
| `REVALIDATION_SECRET` | Shared secret for ISR revalidation |
| `PORT` | Server port (default: 4000) |

### Frontend (`frontend/.env`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key (safe for client) |
| `REVALIDATION_SECRET` | Shared secret for ISR revalidation |

## WhatsApp Bot Commands

| Command | Example | Action |
|---------|---------|--------|
| **Photo + Caption** | Send photo with `"Red T-Shirt Rs 499"` | Adds product |
| `LIST` | Send `LIST` | Shows all your products |
| `DELETE` | Send `DELETE Red T-Shirt` | Removes a product |
| `STATUS` | Send `STATUS` | Shows store URL & product count |
| `HELP` | Send `HELP` | Shows available commands |

## Pricing Format Support

The caption parser supports multiple Indian price formats:

- `Red Cotton T-Shirt Rs 499`
- `Blue Jeans ₹1,299`
- `Sneakers INR 2499`
- `Kurta 999` (just number at end)
- `Silk Saree Rs. 2,499.00`

## Deployment

### Backend (Railway / Render)

```bash
cd backend
npm run build
npm start
```

### Frontend (Vercel)

```bash
cd frontend
npx vercel
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| WhatsApp Gateway | Meta WhatsApp Cloud API |
| Backend | Node.js + Express.js + TypeScript |
| AI Processing | remove.bg API |
| Database | Supabase PostgreSQL |
| Image Storage | Supabase Storage |
| Frontend | Next.js 14 (App Router) |
| Styling | Vanilla CSS |
| Cart State | Zustand |
| Validation | Zod |

## License

MIT

---

Built with ❤️ by Maghgo
