'use client';

import React, { useEffect, useRef } from 'react';
import { useCartStore } from '@/stores/cart';

export default function FloatingCartButton() {
  const { toggleCart, getItemCount } = useCartStore();
  const count = getItemCount();
  const badgeRef = useRef<HTMLSpanElement>(null);
  const prevCount = useRef(count);

  // Pulse animation when count changes
  useEffect(() => {
    if (count !== prevCount.current && count > 0 && badgeRef.current) {
      badgeRef.current.classList.remove('floating-cart-btn__badge--pulse');
      // Force reflow to restart animation
      void badgeRef.current.offsetWidth;
      badgeRef.current.classList.add('floating-cart-btn__badge--pulse');
    }
    prevCount.current = count;
  }, [count]);

  if (count === 0) return null;

  return (
    <button
      className="floating-cart-btn"
      onClick={toggleCart}
      aria-label={`Open cart with ${count} items`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
      <span ref={badgeRef} className="floating-cart-btn__badge">
        {count}
      </span>
    </button>
  );
}
