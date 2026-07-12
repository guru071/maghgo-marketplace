'use client';

import React from 'react';

export default function StorefrontsPage() {
  return (
    <div className="max-w-6xl">
      <h1 className="text-3xl font-black text-gray-900 mb-2">Multiple Storefronts</h1>
      <p className="text-gray-600 mb-8">Manage multiple unique storefronts and inventories from a single Maghgo dashboard.</p>

      <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold mb-1">Your Stores</h2>
          <p className="text-gray-500 text-sm">You are currently using 1 of your unlimited storefronts.</p>
        </div>
        <button className="bg-accent text-white px-6 py-3 rounded-full font-bold hover:bg-black transition-colors shadow-sm">
          + Create New Store
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border-2 border-accent p-6 shadow-sm relative">
          <div className="absolute top-4 right-4 bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold uppercase">Active</div>
          <h3 className="font-bold text-gray-900 text-xl mb-2">Primary Store</h3>
          <p className="text-gray-500 text-sm mb-4">Your main retail storefront connected to WhatsApp.</p>
          <div className="text-sm font-mono bg-gray-50 p-2 rounded text-gray-700 mb-4">maghgo.goatech.tech/primary</div>
          <button className="text-accent font-bold text-sm">Manage Store →</button>
        </div>
      </div>
    </div>
  );
}
