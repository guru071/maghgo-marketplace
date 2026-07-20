'use client';

import React from 'react';
import { Product } from '@/types';
import { groupByCategory } from '@/lib/categorize';

interface CategoryTilesProps {
  products: Product[];
  selected: string;
  onSelect: (key: string) => void;
}

/**
 * "Explore Categories" — image tiles auto-built from the catalogue (each tile
 * wears its first product's photo), like classic Indian shop sites. Tapping a
 * tile filters the grid below.
 */
export default function CategoryTiles({ products, selected, onSelect }: CategoryTilesProps) {
  const groups = groupByCategory(products);
  if (groups.length < 2) return null;

  const tiles = [
    { key: 'all', label: 'All Products', icon: '🛍️', image: products[0]?.processed_image_url || products[0]?.original_image_url },
    ...groups.map((g) => ({
      key: g.category.key,
      label: g.category.label,
      icon: g.category.icon,
      image: g.products[0]?.processed_image_url || g.products[0]?.original_image_url,
    })),
  ];

  return (
    <section style={{ maxWidth: 1280, margin: '0 auto', padding: '1.5rem 1rem 0' }}>
      <h2 style={{ textAlign: 'center', fontSize: '1.4rem', fontWeight: 900, margin: '0 0 1rem' }}>Explore Categories</h2>
      <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8, justifyContent: 'safe center' }}>
        {tiles.map((t) => {
          const active = selected === t.key;
          return (
            <button
              key={t.key}
              onClick={() => onSelect(t.key)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', flex: '0 0 auto', width: 96 }}
              aria-pressed={active}
            >
              <div style={{ width: 84, height: 84, margin: '0 auto', borderRadius: 20, overflow: 'hidden', background: '#f3f4f6', border: active ? '3px solid var(--accent, #FF7518)' : '3px solid transparent', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {t.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '2rem' }}>{t.icon}</span>
                )}
              </div>
              <p style={{ margin: '6px 0 0', fontSize: '0.78rem', fontWeight: active ? 800 : 600, color: active ? 'var(--accent, #FF7518)' : 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {t.icon} {t.label}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
