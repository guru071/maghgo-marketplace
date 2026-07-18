'use client';

import React, { useEffect, useCallback, useState } from 'react';
import { useParams } from 'next/navigation';
import { useCartStore } from '@/stores/cart';
import { formatPrice } from '@/lib/utils';
import CartItemComponent from './CartItem';
import CheckoutButton from './CheckoutButton';

interface CartDrawerProps {
  phone: string;
  storeName: string;
  currency?: string;
  instagramHandle?: string;
}

export default function CartDrawer({ phone, storeName, currency = 'INR', instagramHandle }: CartDrawerProps) {
  const params = useParams();
  const storeSlug = params.store_slug as string;
  const { isOpen, closeCart, updateQuantity, removeItem, getTotal, getItems } = useCartStore();
  const items = getItems(storeSlug);

  // Coupon state. The discount is only ever computed server-side (from real
  // prices); we just display what the API returns and pass the code to checkout.
  const [couponInput, setCouponInput] = useState('');
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const applyCoupon = useCallback(async () => {
    const code = couponInput.trim();
    if (!code || checking) return;
    setChecking(true);
    setCouponError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/api/store/${encodeURIComponent(storeSlug)}/coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, items: items.map((i) => ({ product_id: i.id, quantity: i.quantity })) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setApplied(null);
        setCouponError(data?.error || 'That coupon is not valid.');
      } else {
        setApplied({ code: data.code, discount: data.discount });
        setCouponError(null);
      }
    } catch {
      setCouponError('Could not check that coupon. Please try again.');
    } finally {
      setChecking(false);
    }
  }, [couponInput, checking, items, storeSlug]);

  // Escape key handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeCart();
      }
    },
    [isOpen, closeCart]
  );

  // Body scroll lock + escape listener
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('cart-open');
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.classList.remove('cart-open');
    }

    return () => {
      document.body.classList.remove('cart-open');
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const total = getTotal(storeSlug);

  return (
    <>
      {/* Overlay */}
      <div
        className="cart-drawer__overlay"
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        className="cart-drawer__panel"
        role="dialog"
        aria-label="Shopping cart"
        aria-modal="true"
      >
        {/* Header */}
        <div className="cart-drawer__header">
          <h2 className="cart-drawer__title">
            Your Cart
            {items.length > 0 && (
              <span className="cart-drawer__count">{items.length}</span>
            )}
          </h2>
          <button
            className="cart-drawer__close"
            onClick={closeCart}
            aria-label="Close cart"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="cart-drawer__items">
          {items.length === 0 ? (
            <div className="cart-drawer__empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              <p>Your cart is empty</p>
              <button className="btn btn--secondary" onClick={closeCart}>
                Continue Shopping
              </button>
            </div>
          ) : (
            items.map((item) => (
                <CartItemComponent
                  key={item.id}
                  item={item}
                  onUpdateQuantity={(id, qty) => updateQuantity(storeSlug, id, qty)}
                  onRemove={(id) => removeItem(storeSlug, id)}
                />
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="cart-drawer__footer">
            {/* Coupon */}
            <div style={{ marginBottom: '0.9rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === 'Enter') applyCoupon(); }}
                  placeholder="Discount code"
                  aria-label="Discount code"
                  style={{ flex: 1, minWidth: 0, padding: '0.55rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}
                />
                <button
                  className="btn btn--secondary"
                  onClick={applyCoupon}
                  disabled={checking || !couponInput.trim()}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {checking ? 'Checking…' : applied ? 'Update' : 'Apply'}
                </button>
              </div>
              {couponError && (
                <p style={{ margin: '0.4rem 0 0', fontSize: '0.78rem', color: '#dc2626' }}>{couponError}</p>
              )}
              {applied && (
                <p style={{ margin: '0.4rem 0 0', fontSize: '0.78rem', color: '#059669', fontWeight: 600 }}>
                  🎟️ {applied.code} applied — you save {formatPrice(applied.discount, currency)}
                </p>
              )}
            </div>

            {applied && (
              <div className="cart-drawer__total" style={{ opacity: 0.75, fontSize: '0.9rem' }}>
                <span className="cart-drawer__total-label">Subtotal</span>
                <span className="cart-drawer__total-value">{formatPrice(total, currency)}</span>
              </div>
            )}
            <div className="cart-drawer__total">
              <span className="cart-drawer__total-label">Total</span>
              <span className="cart-drawer__total-value">
                {formatPrice(Math.max(0, total - (applied?.discount ?? 0)), currency)}
              </span>
            </div>
            <CheckoutButton phone={phone} storeName={storeName} storeSlug={storeSlug} items={items} instagramHandle={instagramHandle} couponCode={applied?.code ?? null} />
          </div>
        )}
      </aside>
    </>
  );
}
