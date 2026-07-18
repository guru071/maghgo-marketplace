'use client';

import React, { useEffect, useState } from 'react';
import { Merchant } from '@/types';

export default function DashboardSettings() {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [storeName, setStoreName] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Payments (own Razorpay)
  const [rzpConnected, setRzpConnected] = useState(false);
  const [rzpKeyId, setRzpKeyId] = useState('');
  const [rzpKeySecret, setRzpKeySecret] = useState('');
  const [rzpSaving, setRzpSaving] = useState(false);
  const [rzpMsg, setRzpMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const apiBase = () => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const savePaymentKeys = async (disconnect = false) => {
    setRzpSaving(true);
    setRzpMsg(null);
    const token = localStorage.getItem('maghgo_merchant_token');
    try {
      const res = await fetch(`${apiBase()}/api/dashboard/payment-keys`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(disconnect ? {} : { razorpay_key_id: rzpKeyId, razorpay_key_secret: rzpKeySecret }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save');
      setRzpConnected(!!data.razorpay_connected);
      setRzpKeyId(''); setRzpKeySecret('');
      setRzpMsg({ ok: true, text: disconnect ? 'Razorpay disconnected.' : 'Razorpay connected — you can now accept online payments.' });
    } catch (e: any) {
      setRzpMsg({ ok: false, text: e.message });
    } finally {
      setRzpSaving(false);
    }
  };

  const fetchStore = async () => {
    const token = localStorage.getItem('maghgo_merchant_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    try {
      const res = await fetch(`${apiUrl}/api/dashboard/store`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMerchant(data);
        setStoreName(data.store_name || '');
        setStoreDescription(data.store_description || '');
        setStoreAddress(data.store_address || '');
        setIsActive(data.is_active);
        setRzpConnected(!!data.razorpay_connected);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStore();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const token = localStorage.getItem('maghgo_merchant_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    try {
      // Address saves through its own endpoint (graceful if migration 15 not run).
      fetch(`${apiUrl}/api/dashboard/address`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('maghgo_merchant_token')}` },
        body: JSON.stringify({ store_address: storeAddress }),
      }).catch(() => {});

      const res = await fetch(`${apiUrl}/api/dashboard/store`, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          store_name: storeName,
          store_description: storeDescription,
          is_active: isActive
        })
      });
      
      if (res.ok) {
        alert('Settings saved successfully!');
        fetchStore();
      } else {
        alert('Failed to save settings');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="text-gray-500">Loading settings...</div>;
  if (!merchant) return <div className="text-red-500">Failed to load.</div>;

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Store Settings</h1>
        <p className="text-gray-500 mt-1">Manage your storefront appearance and status.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <form onSubmit={handleSave} className="space-y-6">
          
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Store Name</label>
            <input 
              type="text" 
              value={storeName} 
              onChange={e => setStoreName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-accent focus:border-accent"
              required
            />
            <p className="text-xs text-gray-500 mt-2">This is the title displayed at the top of your web store.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Store Description</label>
            <textarea 
              value={storeDescription} 
              onChange={e => setStoreDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-accent focus:border-accent h-32"
              placeholder="E.g. We sell the best quality shoes in Mumbai. Free shipping on all orders!"
            />
            <p className="text-xs text-gray-500 mt-2">A short bio to tell customers about your business.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Store Address <span className="font-normal text-gray-400">(optional)</span></label>
            <textarea
              value={storeAddress}
              onChange={e => setStoreAddress(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-accent focus:border-accent h-24"
              placeholder="E.g. 12 MG Road, Villupuram, Tamil Nadu 605602"
            />
            <p className="text-xs text-gray-500 mt-2">Shown on your storefront with a &ldquo;Get directions&rdquo; button. Leave blank to hide.</p>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
                className="w-5 h-5 text-accent rounded border-gray-300 focus:ring-accent"
              />
              <div>
                <span className="block text-sm font-semibold text-gray-900">Store Online Status</span>
                <span className="block text-xs text-gray-500">Uncheck to pause your store. Customers will see a "Paused" screen.</span>
              </div>
            </label>
          </div>

          <div className="pt-6">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-accent text-white px-8 py-3 rounded-full font-medium hover:bg-black disabled:opacity-50 transition-colors"
            >
              {isSaving ? 'Saving Changes...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* Online payments — the shop's own Razorpay */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mt-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-gray-900">Accept Online Payments</h2>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${rzpConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {rzpConnected ? '● Connected' : 'Not connected'}
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Connect <strong>your own</strong> Razorpay account so customers can pay for orders online — the money goes straight to
          your bank, not to Maghgo. Find your keys in the Razorpay Dashboard under <em>Settings → API Keys</em>.
        </p>

        {rzpConnected ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-gray-700">Your Razorpay account is connected and live for order payments.</span>
            <button
              onClick={() => savePaymentKeys(true)}
              disabled={rzpSaving}
              className="text-sm font-medium text-red-600 hover:text-red-700 border border-red-200 rounded-full px-4 py-2 disabled:opacity-50"
            >
              {rzpSaving ? 'Working…' : 'Disconnect'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Key ID</label>
              <input
                type="text"
                value={rzpKeyId}
                onChange={(e) => setRzpKeyId(e.target.value.trim())}
                placeholder="rzp_live_XXXXXXXXXXXXXX"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 font-mono text-sm focus:ring-accent focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Key Secret</label>
              <input
                type="password"
                value={rzpKeySecret}
                onChange={(e) => setRzpKeySecret(e.target.value.trim())}
                placeholder="Your Razorpay Key Secret"
                autoComplete="off"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 font-mono text-sm focus:ring-accent focus:border-accent"
              />
              <p className="text-xs text-gray-500 mt-2">🔒 Stored securely on the server and never shown again after saving.</p>
            </div>
            <button
              onClick={() => savePaymentKeys(false)}
              disabled={rzpSaving || !rzpKeyId || !rzpKeySecret}
              className="bg-accent text-white px-8 py-3 rounded-full font-medium hover:bg-black disabled:opacity-50 transition-colors"
            >
              {rzpSaving ? 'Connecting…' : 'Connect Razorpay'}
            </button>
          </div>
        )}

        {rzpMsg && (
          <p className={`text-sm mt-4 ${rzpMsg.ok ? 'text-green-600' : 'text-red-600'}`}>{rzpMsg.text}</p>
        )}
      </div>
    </div>
  );
}
