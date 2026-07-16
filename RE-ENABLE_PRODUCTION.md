# How to Re-enable Production Features

Currently, the Maghgo platform is in a temporary "Testing Mode" as requested. This means that:
1. **Razorpay Payments are bypassed.** Clicking "Upgrade" instantly gives the merchant the plan for free so you can test features without paying.
2. **All Bots are killed.** The WhatsApp, Instagram, and Messenger bots will silently ignore all incoming messages.

Once you are done testing and want to deploy to real customers, follow the instructions below to turn the real backend logic back on.

---

## 1. How to Re-enable Razorpay Payments 💳

1. Open `backend/src/routes/dashboard.ts`
2. Scroll to approximately **Line 170** where you see the `router.post('/upgrade')` endpoint.
3. Delete the entire `// TEMPORARY BYPASS` block.
4. Replace it with the original Razorpay logic below:

```typescript
// Upgrade Plan - Generate Razorpay Link
router.post('/upgrade', async (req: AuthRequest, res) => {
  try {
    const { amount } = req.body;
    if (!amount) return res.status(400).json({ error: 'Amount is required' });

    // We need the merchant's phone number to pass as senderId to Razorpay
    const { data: merchant } = await supabase.from('merchants').select('phone_number').eq('id', req.merchantId).single();
    if (!merchant) return res.status(404).json({ error: 'Merchant not found' });

    const paymentLink = await createPaymentLink(merchant.phone_number, Number(amount));
    
    res.json({ url: paymentLink });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
```

---

## 2. How to Re-enable the Bots 🤖

1. Open `backend/src/services/bot.service.ts`
2. Scroll to approximately **Line 16**, inside the `export const handleMessage = async (message: any, channel: 'whatsapp' | 'instagram' | 'messenger') => {` function.
3. You will see these two lines:
```typescript
  // TEMPORARY KILL-SWITCH: Silently drop all messages to pause bots
  return;
```
4. **Delete those two lines.** 

The bots will instantly wake up and start reading the database and responding to customers again.
