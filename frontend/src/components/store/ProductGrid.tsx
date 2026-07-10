'use client';

import React, { useState, useMemo } from 'react';
import { Product } from '@/types';
import ProductCard from './ProductCard';

interface ProductGridProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
}

export default function ProductGrid({ products, onAddToCart }: ProductGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Extract all unique hashtags from product titles
  const categories = useMemo(() => {
    const tags = new Set<string>();
    products.forEach((product) => {
      const matches = product.title.match(/#[\w]+/g);
      if (matches) {
        matches.forEach((tag) => tags.add(tag));
      }
    });
    return ['All', ...Array.from(tags).sort()];
  }, [products]);

  // Filter products based on selected category
  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'All') return products;
    return products.filter((product) =>
      product.title.toLowerCase().includes(selectedCategory.toLowerCase())
    );
  }, [products, selectedCategory]);

  return (
    <div className="product-grid-container">
      {categories.length > 1 && (
        <div className="category-tabs flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-white/5 text-[var(--foreground)] hover:bg-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <div className="product-grid">
        {filteredProducts.map((product, index) => (
          <div
            key={product.id}
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <ProductCard product={product} onAddToCart={onAddToCart} />
          </div>
        ))}
      </div>
    </div>
  );
}
