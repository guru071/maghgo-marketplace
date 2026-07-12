'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';

import { Suspense } from 'react';

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      localStorage.setItem('maghgo_merchant_token', urlToken);
      // Clean up URL without triggering navigation
      window.history.replaceState({}, '', pathname);
      setIsAuthorized(true);
    } else {
      const storedToken = localStorage.getItem('maghgo_merchant_token');
      if (storedToken) {
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
      }
    }
  }, [searchParams, pathname]);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-sm max-w-md w-full border border-gray-100">
          <div className="text-5xl mb-4">🔐</div>
          <h1 className="text-2xl font-bold mb-4 text-gray-900">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            To access your Maghgo dashboard, please type <strong>LOGIN</strong> in your WhatsApp chat with the Maghgo bot.
          </p>
          <a href="https://wa.me/919876543210" target="_blank" rel="noopener noreferrer" className="inline-block bg-accent text-white px-6 py-3 rounded-full font-medium hover:bg-black transition-colors w-full">
            Open WhatsApp Bot
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex-shrink-0">
        <div className="p-6">
          <h2 className="text-2xl font-black tracking-tight text-gray-900">Maghgo</h2>
          <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-full uppercase tracking-wider mt-1 inline-block">Merchant</span>
        </div>
        <nav className="mt-2 px-4 space-y-1">
          <Link href="/dashboard" className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${pathname === '/dashboard' ? 'bg-accent text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
            Inventory
          </Link>
          <Link href="/dashboard/settings" className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${pathname === '/dashboard/settings' ? 'bg-accent text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
            Settings
          </Link>
          <Link href="/dashboard/billing" className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${pathname === '/dashboard/billing' ? 'bg-accent text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
            Billing
          </Link>
          <button 
            onClick={() => {
              localStorage.removeItem('maghgo_merchant_token');
              window.location.href = '/';
            }}
            className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors mt-8"
          >
            Log Out
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading dashboard...</div>}>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </Suspense>
  );
}
