'use client';

import React from 'react';

export default function SupportPage() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-black text-gray-900 mb-2">24/7 Priority Support</h1>
      <p className="text-gray-600 mb-8">Get immediate assistance from the Maghgo dedicated support team.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm text-center">
          <div className="text-5xl mb-4">💬</div>
          <h2 className="text-xl font-bold mb-2">Live Chat</h2>
          <p className="text-gray-500 mb-6 text-sm">Chat instantly with our technical support team available 24/7.</p>
          <button className="bg-black text-white px-6 py-3 rounded-full font-bold w-full hover:bg-gray-800 transition-colors">
            Start a Chat
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm text-center">
          <div className="text-5xl mb-4">📞</div>
          <h2 className="text-xl font-bold mb-2">Phone Support</h2>
          <p className="text-gray-500 mb-6 text-sm">Schedule a call with your dedicated account manager.</p>
          <button className="bg-accent text-white px-6 py-3 rounded-full font-bold w-full hover:bg-black transition-colors">
            Request Call
          </button>
        </div>
      </div>
    </div>
  );
}
