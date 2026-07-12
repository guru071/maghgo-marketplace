'use client';

import React from 'react';

export default function DomainPage() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-black text-gray-900 mb-2">Custom Domain</h1>
      <p className="text-gray-600 mb-8">Link your own custom domain (e.g., yourstore.com) to your Maghgo storefront.</p>

      <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
        <h2 className="text-xl font-bold mb-4">Connect Domain</h2>
        
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-6">
          <label className="block text-sm font-bold text-gray-700 mb-2">Enter your domain</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="www.mystore.com" 
              className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-accent focus:border-accent"
            />
            <button className="bg-accent text-white px-6 py-3 rounded-lg font-bold hover:bg-black transition-colors">
              Add Domain
            </button>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="font-bold text-gray-900 mb-4">DNS Configuration Instructions</h3>
          <p className="text-gray-600 text-sm mb-4">
            Once you add your domain, you will need to configure your DNS records in your domain registrar (GoDaddy, Namecheap, etc.) to point to our servers.
          </p>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm space-y-2">
            <div>Type: A</div>
            <div>Name: @</div>
            <div>Value: 76.76.21.21</div>
          </div>
        </div>
      </div>
    </div>
  );
}
