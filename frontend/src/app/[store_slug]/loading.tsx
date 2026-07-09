import React from 'react';
import Skeleton, { SkeletonCard } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header Skeleton (Matches StoreHeader layout) */}
      <div className="store-header">
        <div 
          className="store-header__logo skeleton mb-4" 
          style={{ width: 72, height: 72, margin: '0 auto', borderRadius: '50%' }} 
        />
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
           <Skeleton variant="text" className="mb-2" />
           <Skeleton variant="text-sm" />
           <Skeleton variant="text-sm" />
        </div>
      </div>

      {/* Grid Skeleton */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="product-grid">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </main>
    </div>
  );
}
