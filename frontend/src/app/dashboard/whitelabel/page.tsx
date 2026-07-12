'use client';

import React, { useEffect, useState } from 'react';

export default function WhiteLabelPage() {
  const [storeSlug, setStoreSlug] = useState<string>('');
  
  useEffect(() => {
    const fetchStore = async () => {
      const token = localStorage.getItem('maghgo_merchant_token');
      if (!token) return;
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const res = await fetch(`${apiUrl}/api/dashboard/store`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setStoreSlug(data.store_slug);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchStore();
  }, []);

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-black text-gray-900 mb-2">White-Label Branding</h1>
      <p className="text-gray-600 mb-8">Your storefront is currently fully white-labeled. The Maghgo and GOAT'ECH branding has been completely removed.</p>

      <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm text-center">
        <div className="text-6xl mb-4">✨</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">White-Label is Active!</h2>
        <p className="text-gray-600 max-w-lg mx-auto mb-8">
          Because you are on the Business plan or higher, all Maghgo branding (including the "Powered by GOAT'ECH" footer) has been automatically hidden from your live storefront. Your customers will only see your brand.
        </p>

        {storeSlug && (
          <a 
            href={`/${storeSlug}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block bg-accent text-white px-8 py-3 rounded-full font-bold hover:bg-black transition-colors"
          >
            Preview Your White-Labeled Store
          </a>
        )}
      </div>
    </div>
  );
}
