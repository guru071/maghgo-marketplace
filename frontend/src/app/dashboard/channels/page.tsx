'use client';

import React from 'react';

export default function ChannelsPage() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-black text-gray-900 mb-2">Multi-Channel Bots</h1>
      <p className="text-gray-600 mb-8">Connect your Maghgo store to additional social platforms.</p>

      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center text-2xl font-bold">W</div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">WhatsApp Bot</h3>
              <p className="text-gray-500 text-sm">Actively managing your orders.</p>
            </div>
          </div>
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">Connected</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex items-center justify-between opacity-75">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-pink-100 text-pink-600 rounded-xl flex items-center justify-center text-2xl font-bold">I</div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Instagram DM Bot</h3>
              <p className="text-gray-500 text-sm">Sell directly in Instagram DMs.</p>
            </div>
          </div>
          <button onClick={() => alert('This channel integration is currently in Beta. Please contact support to request early access.')} className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-2 rounded-lg font-bold text-sm transition-colors">
            Connect
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex items-center justify-between opacity-75">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-2xl font-bold">M</div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Facebook Messenger</h3>
              <p className="text-gray-500 text-sm">Automate your Facebook page.</p>
            </div>
          </div>
          <button onClick={() => alert('This channel integration is currently in Beta. Please contact support to request early access.')} className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-2 rounded-lg font-bold text-sm transition-colors">
            Connect
          </button>
        </div>
      </div>
    </div>
  );
}
