'use client';

import React, { useRef } from 'react';
import { CartItem as CartItemType } from '@/types';
import { generateWhatsAppLink, generateCheckoutMessage } from '@/lib/utils';
import { Camera, MessageSquare, Phone } from 'lucide-react';

interface CheckoutButtonProps {
  phone: string;
  storeName: string;
  storeSlug: string;
  items: CartItemType[];
  instagramHandle?: string;
}

/** WhatsApp SVG icon */
function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

export default function CheckoutButton({ phone, storeName, storeSlug, items, instagramHandle }: CheckoutButtonProps) {
  // One cart = one recorded order, however many times the shopper taps a
  // channel button (they often try WhatsApp, then SMS).
  const recorded = useRef(false);

  if (items.length === 0) return null;

  const message = generateCheckoutMessage(storeName, items);
  const waLink = generateWhatsAppLink(phone, message);
  const smsLink = `sms:${phone}?body=${encodeURIComponent(message)}`;
  const telLink = `tel:${phone}`;
  const igLink = instagramHandle ? `https://ig.me/m/${instagramHandle.replace('@', '')}` : null;

  /**
   * Log the order so it reaches the merchant's dashboard and analytics.
   *
   * Deliberately fire-and-forget: the shopper's chat must open whatever happens
   * here. Losing an analytics row is a nuisance; blocking a real sale on our
   * database being slow would be far worse. `keepalive` lets the request finish
   * even if the browser hands off to the SMS or phone app.
   *
   * Only product ids and quantities are sent — the server re-reads prices from
   * the database, so nothing here is trusted for money.
   */
  const recordOrder = () => {
    if (recorded.current) return;
    recorded.current = true;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    fetch(`${apiUrl}/api/store/${encodeURIComponent(storeSlug)}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        items: items.map((i) => ({ product_id: i.id, quantity: i.quantity })),
      }),
    }).catch((err) => {
      // Never surface this: the sale is happening in the chat app regardless.
      console.warn('Could not record order for analytics:', err);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        onClick={recordOrder}
        className="btn btn--whatsapp btn--full"
        aria-label="Complete order via WhatsApp"
      >
        <WhatsAppIcon />
        Order via WhatsApp
      </a>

      {igLink && (
        <button
          onClick={() => {
            recordOrder();
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
          onClick={recordOrder}
          className="btn btn--secondary w-full"
          aria-label="Order via SMS"
        >
          <MessageSquare className="w-4 h-4" />
          SMS
        </a>
        <a
          href={telLink}
          onClick={recordOrder}
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
