'use client';

import React from 'react';
import { Merchant, Product } from '@/types';
import StoreHeader from '@/components/store/StoreHeader';
import ProductGrid from '@/components/store/ProductGrid';
import CartDrawer from '@/components/store/CartDrawer';
import FloatingCartButton from '@/components/store/FloatingCartButton';
import { useCartStore } from '@/stores/cart';
import EmptyStore from '@/components/store/EmptyStore';

interface StoreClientProps {
  merchant: Merchant;
  products: Product[];
}

export function StoreClient({ merchant, products }: StoreClientProps) {
  const { addItem, items } = useCartStore();

  const handleAddToCart = (product: Product) => {
    addItem({
      id: product.id,
      title: product.title,
      price: product.price,
      currency: product.currency,
      image_url: product.processed_image_url || product.original_image_url,
    });
  };

  if (!products || products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <StoreHeader merchant={merchant} />
        <EmptyStore />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <StoreHeader merchant={merchant} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProductGrid products={products} onAddToCart={handleAddToCart} />
      </main>
      <CartDrawer storeName={merchant.store_name} phone={merchant.phone_number} />
      <FloatingCartButton />
    </div>
  );
}
