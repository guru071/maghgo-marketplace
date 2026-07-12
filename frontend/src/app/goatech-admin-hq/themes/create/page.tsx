"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';

export default function CreateThemePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    plan_required: 'basic',
    primaryColor: '#0052FF',
    secondaryColor: '#FF7A00',
    backgroundColor: '#FFFFFF'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const config = {
        colors: {
          primary: formData.primaryColor,
          secondary: formData.secondaryColor,
          background: formData.backgroundColor
        }
      };

      const res = await fetch('/api/goatech-admin-hq/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          plan_required: formData.plan_required,
          config
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create theme');
      }

      router.push('/goatech-admin-hq/themes');
      router.refresh(); // Refresh server component data
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/goatech-admin-hq/themes" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Themes
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create New Theme</h1>
        <p className="text-gray-600 mt-1">Design a new theme and set its plan restrictions.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Theme Name</label>
              <input 
                required
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="e.g. Midnight Cyber"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Required Plan</label>
              <select 
                value={formData.plan_required}
                onChange={e => setFormData({...formData, plan_required: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="basic">Basic (Lowest Tier)</option>
                <option value="premium">Premium</option>
                <option value="agency">Agency</option>
                <option value="enterprise">Enterprise (Highest Tier)</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea 
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="A brief description of this theme's style..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <hr className="border-gray-100" />
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Visual Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Primary Color</label>
                <div className="flex gap-3">
                  <input 
                    type="color" 
                    value={formData.primaryColor}
                    onChange={e => setFormData({...formData, primaryColor: e.target.value})}
                    className="w-10 h-10 rounded border border-gray-200 cursor-pointer"
                  />
                  <input 
                    type="text" 
                    value={formData.primaryColor}
                    onChange={e => setFormData({...formData, primaryColor: e.target.value})}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1 outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Secondary Color</label>
                <div className="flex gap-3">
                  <input 
                    type="color" 
                    value={formData.secondaryColor}
                    onChange={e => setFormData({...formData, secondaryColor: e.target.value})}
                    className="w-10 h-10 rounded border border-gray-200 cursor-pointer"
                  />
                  <input 
                    type="text" 
                    value={formData.secondaryColor}
                    onChange={e => setFormData({...formData, secondaryColor: e.target.value})}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1 outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Background Color</label>
                <div className="flex gap-3">
                  <input 
                    type="color" 
                    value={formData.backgroundColor}
                    onChange={e => setFormData({...formData, backgroundColor: e.target.value})}
                    className="w-10 h-10 rounded border border-gray-200 cursor-pointer"
                  />
                  <input 
                    type="text" 
                    value={formData.backgroundColor}
                    onChange={e => setFormData({...formData, backgroundColor: e.target.value})}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <Link 
            href="/goatech-admin-hq/themes" 
            className="px-4 py-2 font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button 
            type="submit" 
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : (
              <>
                <Save className="w-4 h-4" />
                Save Theme
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
