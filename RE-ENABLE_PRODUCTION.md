# Production Feature Status

Both testing toggles have now been turned **OFF** — the platform runs in real
production mode:

1. **Razorpay Payments are LIVE.** The dashboard `POST /api/dashboard/upgrade`
   endpoint now generates a real Razorpay payment link. A merchant's plan is only
   activated after the Razorpay webhook (`routes/payment.ts`) verifies the payment
   signature and amount. No plan is granted for free.
2. **Bots are ACTIVE.** The WhatsApp / Instagram / Messenger kill-switch has been
   removed; incoming messages are processed normally.

## Related hardening applied

- `JWT_SECRET` is now **required** (min 32 chars) — the server refuses to boot
  without it. Set it in your backend environment (`openssl rand -hex 32`).
- The Visual Builder now saves through the authenticated `PUT /api/dashboard/theme`
  endpoint, scoped to the logged-in merchant. The old unauthenticated
  `/api/builder/save` route has been removed.
- `trust proxy` is enabled so rate-limiting keys on the real client IP.
- Webhook message deliveries are de-duplicated to prevent duplicate products on
  provider retries.

If you ever need to return to testing mode, revert the `POST /upgrade` handler in
`backend/src/routes/dashboard.ts` to instantly set the plan — but never deploy that
to real customers.
