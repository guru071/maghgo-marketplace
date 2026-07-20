'use client';

import React from 'react';
import { useCartStore } from '@/stores/cart';

export type SortMode = 'newest' | 'price_asc' | 'price_desc' | 'name';

interface StoreNavProps {
  storeName: string;
  storeSlug: string;
  logoUrl?: string | null;
  query: string;
  onQuery: (q: string) => void;
  sort: SortMode;
  onSort: (s: SortMode) => void;
}

/**
 * Traditional e-commerce top bar: brand, live search, sort, cart with count.
 * Sticky, white, sits above ANY theme (default or Puck) so every store gets a
 * real shop chrome. Cart button opens the existing drawer.
 */
export default function StoreNav({ storeName, storeSlug, logoUrl, query, onQuery, sort, onSort }: StoreNavProps) {
  const { openCart, getItemCount } = useCartStore();
  const count = getItemCount(storeSlug);

  return (
    <nav
      style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {/* Brand */}
        <a href={`/${storeSlug}`} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', minWidth: 0 }}>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--accent, #FF7518)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
              {storeName.charAt(0).toUpperCase()}
            </div>
          )}
          <span style={{ fontWeight: 800, color: '#111', fontSize: '1.02rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>
            {storeName}
          </span>
        </a>

        {/* Search */}
        <div style={{ flex: 1, minWidth: 160, display: 'flex', alignItems: 'center', background: '#f3f4f6', borderRadius: 999, padding: '0.45rem 0.9rem', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.5" y2="16.5" />
          </svg>
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search products…"
            aria-label="Search products"
            style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', fontSize: '0.9rem', color: '#111' }}
          />
          {query && (
            <button onClick={() => onQuery('')} aria-label="Clear search" style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>×</button>
          )}
        </div>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => onSort(e.target.value as SortMode)}
          aria-label="Sort products"
          style={{ border: '1px solid #e5e7eb', borderRadius: 999, padding: '0.45rem 0.75rem', fontSize: '0.85rem', background: '#fff', color: '#374151', cursor: 'pointer' }}
        >
          <option value="newest">✨ Newest</option>
          <option value="price_asc">₹ Low → High</option>
          <option value="price_desc">₹ High → Low</option>
          <option value="name">A → Z</option>
        </select>

        {/* Cart */}
        <button
          onClick={openCart}
          aria-label={`Open cart, ${count} items`}
          style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--accent, #FF7518)', color: '#fff', border: 'none', borderRadius: 999, padding: '0.5rem 1rem', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          Cart
          {count > 0 && (
            <span style={{ position: 'absolute', top: -6, right: -6, background: '#111', color: '#fff', fontSize: '0.68rem', fontWeight: 800, minWidth: 18, height: 18, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
              {count}
            </span>
          )}
        </button>
      </div>
    </nav>
  );
}
