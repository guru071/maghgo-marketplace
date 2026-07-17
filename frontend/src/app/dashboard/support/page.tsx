'use client';

import React, { useEffect, useState } from 'react';
import { whatsappLink } from '@/lib/site-config';

// Plans that include the faster support tier (kept in step with the plan copy).
const PRIORITY_PLANS = ['pro', 'advanced', 'premium', 'business', 'agency', 'vip', 'enterprise', 'custom'];

const SUPPORT_EMAIL = 'support@goatech.tech';

export default function SupportPage() {
  const [plan, setPlan] = useState<string>('');

  useEffect(() => {
    const token = localStorage.getItem('maghgo_merchant_token');
    if (!token) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    fetch(`${apiUrl}/api/dashboard/store`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setPlan(d.subscription_plan || ''))
      .catch(() => {});
  }, []);

  const isPriority = PRIORITY_PLANS.includes(plan);
  const wa = whatsappLink('SUPPORT: ');

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-black text-gray-900 mb-2">Support</h1>
      <p className="text-gray-600 mb-8">
        {isPriority
          ? 'You\'re on a priority plan — we aim to reply within a few hours on business days.'
          : 'We\'re here to help. Standard replies within 1–2 business days.'}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm text-center">
          <div className="text-5xl mb-4">💬</div>
          <h2 className="text-xl font-bold mb-2">WhatsApp us</h2>
          <p className="text-gray-500 mb-6 text-sm">The fastest way to reach a human.</p>
          {wa ? (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-block bg-[#25D366] text-white px-6 py-3 rounded-full font-bold w-full hover:bg-[#1DA851] transition-colors">
              Open WhatsApp
            </a>
          ) : (
            <p className="text-sm text-gray-400">WhatsApp support isn&apos;t configured yet.</p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm text-center">
          <div className="text-5xl mb-4">✉️</div>
          <h2 className="text-xl font-bold mb-2">Email us</h2>
          <p className="text-gray-500 mb-6 text-sm">Best for detailed questions or screenshots.</p>
          <a href={`mailto:${SUPPORT_EMAIL}?subject=Maghgo Support`} className="inline-block bg-gray-900 text-white px-6 py-3 rounded-full font-bold w-full hover:bg-gray-800 transition-colors">
            {SUPPORT_EMAIL}
          </a>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mt-6">
        <h3 className="font-bold text-gray-900 mb-3">Before you reach out</h3>
        <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
          <li>Add products by sending a photo + caption (e.g. &ldquo;Red Shirt ₹499&rdquo;) to the bot.</li>
          <li>Type <strong>HELP</strong> to the bot for the full command list.</li>
          <li>Your store link is on the <strong>Inventory</strong> page and in <strong>STATUS</strong>.</li>
        </ul>
      </div>
    </div>
  );
}
