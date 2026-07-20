'use client';

import React, { useState, useMemo } from 'react';
import { Product } from '@/types';
import ProductCard from './ProductCard';
import { groupByCategory, type Category } from '@/lib/categorize';

interface ProductGridProps {
  products: Product[];
  onAddToCart: (product: Product, opts?: { variant?: string }) => void;
  // Optional controlled mode: the page (e.g. category tiles) owns the selection.
  selectedCategory?: string;
  onSelectCategory?: (key: string) => void;
}

const ALL: Category = { key: 'all', label: 'All', icon: '🛍️' };

export default function ProductGrid({ products, onAddToCart, selectedCategory, onSelectCategory }: ProductGridProps) {
  const [internal, setInternal] = useState<string>('all');
  const selected = selectedCategory ?? internal;
  const setSelected = (k: string) => { onSelectCategory ? onSelectCategory(k) : setInternal(k); };

  // The store organises itself around what's actually sold: categories are
  // auto-detected from product titles, so a fashion shop shows Clothing /
  // Footwear tabs and an electronics shop shows Phones / Audio — no tagging.
  const groups = useMemo(() => groupByCategory(products), [products]);

  // Only worth showing tabs when the catalogue genuinely spans product types.
  const tabs = groups.length > 1 ? [ALL, ...groups.map((g) => g.category)] : [];

  const visible = useMemo(() => {
    if (selected === 'all') return products;
    return groups.find((g) => g.category.key === selected)?.products ?? products;
  }, [selected, groups, products]);

  return (
    <div className="product-grid-container">
      {tabs.length > 0 && (
        <div className="category-tabs flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {tabs.map((cat) => {
            const count = cat.key === 'all' ? products.length : groups.find((g) => g.category.key === cat.key)?.products.length ?? 0;
            return (
              <button
                key={cat.key}
                onClick={() => setSelected(cat.key)}
                className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  selected === cat.key
                    ? 'bg-accent text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{cat.icon}</span>
                {cat.label}
                <span className={`text-xs ${selected === cat.key ? 'opacity-80' : 'text-gray-400'}`}>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="product-grid">
        {visible.map((product, index) => (
          <div key={product.id} style={{ animationDelay: `${index * 60}ms` }}>
            <ProductCard product={product} onAddToCart={onAddToCart} />
          </div>
        ))}
      </div>
    </div>
  );
}
