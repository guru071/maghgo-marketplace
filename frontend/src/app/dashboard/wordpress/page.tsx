'use client';

import React, { useEffect, useState } from 'react';

export default function WordPressSyncPage() {
  const [merchantId, setMerchantId] = useState<string>('');
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

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
          const baseWebhookUrl = process.env.NEXT_PUBLIC_API_URL?.replace('http://', 'https://') || 'https://maghgo.goatech.tech';
          setWebhookUrl(`${baseWebhookUrl}/webhook/woocommerce?merchant_id=${data.id}`);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchStore();
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-black text-gray-900 mb-2">WordPress & WooCommerce Sync</h1>
      <p className="text-gray-600 mb-8">Automatically sync your products from WooCommerce directly to your Maghgo store in real-time.</p>

      <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
        <h2 className="text-xl font-bold mb-4">How to setup your sync:</h2>
        
        <ol className="list-decimal list-inside space-y-4 text-gray-700 mb-8">
          <li>Log into your WordPress Admin Dashboard.</li>
          <li>Navigate to <strong>WooCommerce</strong> &gt; <strong>Settings</strong> &gt; <strong>Advanced</strong> &gt; <strong>Webhooks</strong>.</li>
          <li>Click on <strong>Add webhook</strong>.</li>
          <li>Set the Name to "Maghgo Sync" and Status to "Active".</li>
          <li>Set the Topic to <strong>Product created</strong>.</li>
          <li>Copy your unique Webhook URL below and paste it into the <strong>Delivery URL</strong> field in WooCommerce.</li>
          <li>Save the webhook. You're done! Any new products will instantly appear in Maghgo.</li>
        </ol>

        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
          <label className="block text-sm font-bold text-gray-700 mb-2">Your Unique Webhook Delivery URL</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              readOnly 
              value={webhookUrl || 'Loading...'} 
              className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-600 font-mono focus:outline-none"
            />
            <button 
              onClick={handleCopy}
              className="bg-accent text-white px-6 py-3 rounded-lg font-bold hover:bg-black transition-colors min-w-[120px]"
            >
              {copied ? 'Copied!' : 'Copy URL'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
