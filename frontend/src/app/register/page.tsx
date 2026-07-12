'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function RegisterPage() {
  const [storeName, setStoreName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '919876543210';
  const igHandle = process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE || 'maghgo_bot';
  const fbPage = process.env.NEXT_PUBLIC_MESSENGER_PAGE || 'maghgo';

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone, store_name: storeName, password })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('maghgo_merchant_token', data.token);
        window.location.href = '/dashboard';
      } else {
        setError(data.error || 'Failed to register');
      }
    } catch (err) {
      setError('A network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-black tracking-tighter text-gray-900 inline-block">Maghgo</Link>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">Create your store</h2>
          <p className="text-gray-500 mt-2">Start selling online in less than 30 seconds</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 text-center">Fastest Setup</h3>
          
          <div className="space-y-3 mb-8">
            <a href={`https://wa.me/${whatsappNumber}?text=REGISTER`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-full bg-[#25D366] text-white py-3 rounded-full font-medium hover:bg-[#1DA851] transition-colors">
              Continue with WhatsApp
            </a>
            <a href={`https://ig.me/m/${igHandle}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-full bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F56040] text-white py-3 rounded-full font-medium hover:opacity-90 transition-opacity">
              Continue with Instagram
            </a>
            <a href={`https://m.me/${fbPage}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-full bg-[#0084FF] text-white py-3 rounded-full font-medium hover:bg-[#0073E6] transition-colors">
              Continue with Messenger
            </a>
          </div>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or register via website</span>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
              <input 
                type="text" 
                value={storeName} 
                onChange={e => setStoreName(e.target.value)}
                placeholder="e.g. Nike Mumbai"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-accent focus:border-accent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input 
                type="tel" 
                value={phone} 
                onChange={e => setPhone(e.target.value)}
                placeholder="+919876543210"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-accent focus:border-accent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Create Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-accent focus:border-accent"
                required
                minLength={6}
              />
            </div>
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-black text-white py-3 rounded-full font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors mt-2"
            >
              {isLoading ? 'Creating Store...' : 'Create Store Account'}
            </button>
          </form>
        </div>
        
        <p className="text-center text-sm text-gray-600">
          Already have an account? <Link href="/login" className="text-accent font-medium hover:underline">Log in here</Link>
        </p>
      </div>
    </div>
  );
}
