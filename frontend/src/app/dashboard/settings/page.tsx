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
  const [isActive, setIsActive] = useState(true);

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
        setIsActive(data.is_active);
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
    </div>
  );
}
