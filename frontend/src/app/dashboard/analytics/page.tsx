'use client';

import React from 'react';

export default function AnalyticsPage() {
  return (
    <div className="max-w-6xl">
      <h1 className="text-3xl font-black text-gray-900 mb-2">Advanced Analytics</h1>
      <p className="text-gray-600 mb-8">Track your store's performance and customer behavior in real-time.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Total Revenue</div>
          <div className="text-4xl font-black text-gray-900">₹45,231</div>
          <div className="text-sm text-green-500 font-bold mt-2">↑ 12% from last month</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Total Orders</div>
          <div className="text-4xl font-black text-gray-900">128</div>
          <div className="text-sm text-green-500 font-bold mt-2">↑ 8% from last month</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Store Visitors</div>
          <div className="text-4xl font-black text-gray-900">1,492</div>
          <div className="text-sm text-gray-500 font-bold mt-2">- Same as last month</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm h-96 flex items-center justify-center flex-col text-center">
        <div className="text-6xl mb-4">📈</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Sales Over Time</h3>
        <p className="text-gray-500">Your detailed chart data is actively being aggregated. Check back tomorrow for full historical graphs.</p>
      </div>
    </div>
  );
}
