'use client';

import React, { useRef, useState } from 'react';
import { CartItem as CartItemType } from '@/types';
import { generateWhatsAppLink, generateCheckoutMessage } from '@/lib/utils';
import { Camera, MessageSquare, Phone, CreditCard, Loader2 } from 'lucide-react';

interface CheckoutButtonProps {
  phone: string;
  storeName: string;
  storeSlug: string;
  items: CartItemType[];
  instagramHandle?: string;
  couponCode?: string | null;
  deliveryAddress?: string;
  // Only true when THIS shop has connected its own Razorpay.
  paymentsEnabled?: boolean;
}

/** WhatsApp SVG icon */
function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

export default function CheckoutButton({ phone, storeName, storeSlug, items, instagramHandle, couponCode, deliveryAddress, paymentsEnabled }: CheckoutButtonProps) {
  // One cart = one recorded order, however many times the shopper taps a
  // channel button (they often try WhatsApp, then SMS). The recording promise is
  // memoised so "Pay online" and "WhatsApp" both reuse the same server order.
  const orderPromise = useRef<Promise<{ payment_url?: string | null; total?: number } | null> | null>(null);
  const [paying, setPaying] = useState(false);

  if (items.length === 0) return null;

  const baseMessage = generateCheckoutMessage(storeName, items);
  const message = deliveryAddress?.trim() ? `${baseMessage}\n\n📍 Deliver to: ${deliveryAddress.trim()}` : baseMessage;
  const waLink = generateWhatsAppLink(phone, message);
  const smsLink = `sms:${phone}?body=${encodeURIComponent(message)}`;
  const telLink = `tel:${phone}`;
  const igLink = instagramHandle ? `https://ig.me/m/${instagramHandle.replace('@', '')}` : null;

  /**
   * Log the order so it reaches the merchant's dashboard and analytics, and
   * returns the server's response (which includes an online payment link).
   *
   * Only product ids, quantities and a coupon code are sent — the server
   * re-reads prices from the database, so nothing here is trusted for money.
   * `keepalive` lets the request finish even if the browser hands off to the
   * SMS or phone app.
   */
  const recordOrder = () => {
    if (orderPromise.current) return orderPromise.current;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    orderPromise.current = fetch(`${apiUrl}/api/store/${encodeURIComponent(storeSlug)}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        items: items.map((i) => ({ product_id: i.productId || i.id, quantity: i.quantity, variant: i.variant })),
        coupon_code: couponCode || undefined,
        delivery_address: deliveryAddress?.trim() || undefined,
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .catch((err) => {
        // Never surface this: the sale can still happen in the chat app.
        console.warn('Could not record order:', err);
        return null;
      });
    return orderPromise.current;
  };

  // Fire-and-forget for the chat channels — the shopper's app must open regardless.
  const fireAndForget = () => { void recordOrder(); };

  const payOnline = async () => {
    if (paying) return;
    setPaying(true);
    const res = await recordOrder();
    if (res?.payment_url) {
      window.location.href = res.payment_url;
      return;
    }
    // No link (Razorpay unavailable, or the store hasn't run migration 16):
    // fall back to completing the order over WhatsApp.
    setPaying(false);
    window.open(waLink, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-col gap-3">
      {paymentsEnabled && (
        <button
          onClick={payOnline}
          disabled={paying}
          className="btn btn--primary btn--full"
          aria-label="Pay online now"
        >
          {paying ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CreditCard className="w-5 h-5 mr-2" />}
          {paying ? 'Opening secure payment…' : 'Pay Online Now'}
        </button>
      )}

      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        onClick={fireAndForget}
        className="btn btn--whatsapp btn--full"
        aria-label="Complete order via WhatsApp"
      >
        <WhatsAppIcon />
        Order via WhatsApp
      </a>

      {igLink && (
        <button
          onClick={() => {
            fireAndForget();
            navigator.clipboard.writeText(message);
            window.open(igLink, '_blank');
          }}
          className="btn btn--primary btn--full bg-pink-600 hover:bg-pink-700"
          aria-label="Order via Instagram DM"
        >
          <Camera className="w-5 h-5 mr-2" />
          Copy Order & Open Instagram
        </button>
      )}

      <div className="grid grid-cols-2 gap-3">
        <a
          href={smsLink}
          onClick={fireAndForget}
          className="btn btn--secondary w-full"
          aria-label="Order via SMS"
        >
          <MessageSquare className="w-4 h-4" />
          SMS
        </a>
        <a
          href={telLink}
          onClick={fireAndForget}
          className="btn btn--secondary w-full"
          aria-label="Call Store"
        >
          <Phone className="w-4 h-4" />
          Call
        </a>
      </div>
    </div>
  );
}
