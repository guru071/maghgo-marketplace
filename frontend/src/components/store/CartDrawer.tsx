'use client';

import React, { useEffect, useCallback } from 'react';
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
            <div className="cart-drawer__total">
              <span className="cart-drawer__total-label">Total</span>
              <span className="cart-drawer__total-value">
                {formatPrice(total, currency)}
              </span>
            </div>
            <CheckoutButton phone={phone} storeName={storeName} items={items} instagramHandle={instagramHandle} />
          </div>
        )}
      </aside>
    </>
  );
}
