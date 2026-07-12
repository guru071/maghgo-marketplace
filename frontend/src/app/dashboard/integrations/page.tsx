'use client';

import React from 'react';

export default function IntegrationsPage() {
  return (
    <div className="max-w-6xl">
      <h1 className="text-3xl font-black text-gray-900 mb-2">Custom Integrations</h1>
      <p className="text-gray-600 mb-8">Connect Maghgo with your existing tools, ERPs, and third-party services.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-4xl mb-4">💳</div>
          <h3 className="font-bold text-gray-900 text-lg mb-2">Stripe Connection</h3>
          <p className="text-gray-500 text-sm mb-4">Process international payments directly through Stripe.</p>
          <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-bold text-sm transition-colors">
            Configure
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-4xl mb-4">📦</div>
          <h3 className="font-bold text-gray-900 text-lg mb-2">Shiprocket</h3>
          <p className="text-gray-500 text-sm mb-4">Automate your shipping and fulfillment across India.</p>
          <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-bold text-sm transition-colors">
            Configure
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-4xl mb-4">🧾</div>
          <h3 className="font-bold text-gray-900 text-lg mb-2">Tally ERP</h3>
          <p className="text-gray-500 text-sm mb-4">Sync your orders directly to Tally for accounting.</p>
          <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-bold text-sm transition-colors">
            Configure
          </button>
        </div>
      </div>
    </div>
  );
}
