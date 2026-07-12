'use client';

import React, { useEffect, useState } from 'react';

export default function APIAccessPage() {
  const [merchantId, setMerchantId] = useState<string>('');

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
          setMerchantId(data.id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchStore();
  }, []);

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-black text-gray-900 mb-2">Developer API</h1>
      <p className="text-gray-600 mb-8">Access your raw store data programmatically via the Maghgo REST API.</p>

      <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
        <h2 className="text-xl font-bold mb-6">Your API Keys</h2>
        
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-8">
          <label className="block text-sm font-bold text-gray-700 mb-2">Merchant ID (Public Key)</label>
          <input 
            type="text" 
            readOnly 
            value={merchantId || 'Loading...'} 
            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-600 font-mono focus:outline-none"
          />
        </div>

        <h2 className="text-xl font-bold mb-4">API Documentation</h2>
        
        <div className="space-y-6">
          <div className="border border-gray-100 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 font-mono text-sm flex gap-3 items-center">
              <span className="bg-green-100 text-green-700 font-bold px-2 py-1 rounded">GET</span>
              <span className="text-gray-700">/api/v1/products?merchant_id={'{YOUR_MERCHANT_ID}'}</span>
            </div>
            <div className="p-4 bg-white">
              <p className="text-gray-600 text-sm mb-4">Fetches all products currently active in your store.</p>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
{`curl -X GET "https://maghgo.goatech.tech/api/v1/products?merchant_id=${merchantId || 'YOUR_ID'}"`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
