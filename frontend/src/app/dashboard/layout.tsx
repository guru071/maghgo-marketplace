'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

const PLAN_TIERS = [
  'inactive', 'basic', 'starter', 'pro', 'advanced', 
  'premium', 'business', 'agency', 'vip', 'enterprise', 'custom'
];

function hasAccess(requiredPlan: string, currentPlan: string) {
  if (currentPlan === 'custom') return true;
  const currentIndex = PLAN_TIERS.indexOf(currentPlan);
  const requiredIndex = PLAN_TIERS.indexOf(requiredPlan);
  return currentIndex >= requiredIndex;
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [merchantPlan, setMerchantPlan] = useState<string>('starter');
  const [isLoading, setIsLoading] = useState(true);
  
  // Upgrade Modal State
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [requiredPlan, setRequiredPlan] = useState('pro');
  const [featureName, setFeatureName] = useState('');
  const [upgradeCost, setUpgradeCost] = useState(249);
  const [isUpgrading, setIsUpgrading] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      let token = searchParams.get('token');
      if (token) {
        localStorage.setItem('maghgo_merchant_token', token);
        window.history.replaceState({}, '', pathname);
      } else {
        token = localStorage.getItem('maghgo_merchant_token');
      }

      if (!token) {
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const res = await fetch(`${apiUrl}/api/dashboard/store`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          setMerchantPlan(data.subscription_plan || 'starter');
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
      } catch (err) {
        setIsAuthorized(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, [searchParams, pathname]);

  const handleFeatureClick = (e: React.MouseEvent, featureTitle: string, planNeeded: string, cost: number, path: string) => {
    e.preventDefault();
    if (hasAccess(planNeeded, merchantPlan)) {
      router.push(path);
    } else {
      setFeatureName(featureTitle);
      setRequiredPlan(planNeeded);
      setUpgradeCost(cost);
      setShowUpgradeModal(true);
    }
  };

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      const token = localStorage.getItem('maghgo_merchant_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/api/dashboard/upgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: upgradeCost })
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      alert('Failed to initiate upgrade.');
      setIsUpgrading(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Loading dashboard...</div>;
  }

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
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row relative">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-2xl font-black tracking-tight text-gray-900">Maghgo</h2>
          <span className="text-xs font-bold bg-accent/10 text-accent px-2 py-1 rounded-full uppercase tracking-wider mt-1 inline-block">
            {merchantPlan} Plan
          </span>
        </div>
        <nav className="mt-4 px-4 space-y-1 flex-1">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-4 px-4">Core</div>
          <Link href="/dashboard" className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${pathname === '/dashboard' ? 'bg-accent text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
            📦 Inventory
          </Link>
          <Link href="/dashboard/settings" className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${pathname === '/dashboard/settings' ? 'bg-accent text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
            ⚙️ Settings
          </Link>
          <Link href="/dashboard/billing" className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${pathname === '/dashboard/billing' ? 'bg-accent text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
            💳 Billing
          </Link>

          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-8 px-4 flex items-center justify-between">
            <span>Growth Features</span>
            <span className="bg-yellow-100 text-yellow-800 text-[10px] px-2 py-0.5 rounded-full">PRO</span>
          </div>
          
          <button onClick={(e) => handleFeatureClick(e, 'Advanced Analytics', 'pro', 249, '/dashboard/analytics')} className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors flex justify-between items-center group">
            <span>📊 Analytics</span>
            {!hasAccess('pro', merchantPlan) && <span className="text-gray-300 group-hover:text-gray-500">🔒</span>}
          </button>
          
          <button onClick={(e) => handleFeatureClick(e, 'Multi-Channel Bots (Instagram & Messenger)', 'pro', 249, '/dashboard/channels')} className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors flex justify-between items-center group">
            <span>💬 Channels</span>
            {!hasAccess('pro', merchantPlan) && <span className="text-gray-300 group-hover:text-gray-500">🔒</span>}
          </button>
          
          <button onClick={(e) => handleFeatureClick(e, 'Custom Domain Integration', 'pro', 249, '/dashboard/domain')} className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors flex justify-between items-center group">
            <span>🌐 Custom Domain</span>
            {!hasAccess('pro', merchantPlan) && <span className="text-gray-300 group-hover:text-gray-500">🔒</span>}
          </button>

          <button onClick={(e) => handleFeatureClick(e, 'Premium Themes & Store Builder', 'starter', 149, '/dashboard/themes')} className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors flex justify-between items-center group">
            <span>🎨 Premium Themes</span>
            {!hasAccess('starter', merchantPlan) && <span className="text-gray-300 group-hover:text-gray-500">🔒</span>}
          </button>

          <button onClick={(e) => handleFeatureClick(e, 'WordPress & WooCommerce Sync', 'advanced', 349, '/dashboard/wordpress')} className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors flex justify-between items-center group">
            <span>🔌 WordPress Sync</span>
            {!hasAccess('advanced', merchantPlan) && <span className="text-gray-300 group-hover:text-gray-500">🔒</span>}
          </button>

          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-8 px-4 flex items-center justify-between">
            <span>Enterprise</span>
            <span className="bg-purple-100 text-purple-800 text-[10px] px-2 py-0.5 rounded-full">BUSINESS</span>
          </div>
          
          <button onClick={(e) => handleFeatureClick(e, 'White-Label Branding', 'business', 749, '/dashboard/whitelabel')} className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors flex justify-between items-center group">
            <span>🖌️ White-Label</span>
            {!hasAccess('business', merchantPlan) && <span className="text-gray-300 group-hover:text-gray-500">🔒</span>}
          </button>

        </nav>
        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={() => {
              localStorage.removeItem('maghgo_merchant_token');
              window.location.href = '/';
            }}
            className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>

      {/* Feature Gate Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl relative overflow-hidden">
            {/* Decorative background */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-accent/20 to-purple-500/20 rounded-t-3xl -z-10" />
            
            <button 
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-white/50 rounded-full p-2"
            >
              ✕
            </button>
            
            <div className="text-center mt-4">
              <div className="text-5xl mb-4">🚀</div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">Unlock {featureName}</h2>
              <p className="text-gray-600 mb-6">
                This feature requires the <strong className="text-gray-900">{requiredPlan.toUpperCase()}</strong> plan. 
                Your current plan is <strong className="text-gray-900">{merchantPlan.toUpperCase()}</strong>.
              </p>
              
              <div className="bg-gray-50 rounded-2xl p-6 mb-6 border border-gray-100">
                <div className="text-sm text-gray-500 mb-1">Upgrade today for just</div>
                <div className="text-3xl font-black text-gray-900">₹{upgradeCost}<span className="text-lg font-medium text-gray-500">/mo</span></div>
                <ul className="mt-4 space-y-2 text-sm text-gray-600 text-left">
                  <li className="flex items-center">✅ Access to {featureName}</li>
                  <li className="flex items-center">✅ Higher product limits</li>
                  <li className="flex items-center">✅ Priority support</li>
                </ul>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={handleUpgrade}
                  disabled={isUpgrading}
                  className="w-full bg-accent text-white px-6 py-3.5 rounded-full font-bold text-lg hover:bg-black transition-colors shadow-lg shadow-accent/30 disabled:opacity-50"
                >
                  {isUpgrading ? 'Generating Secure Link...' : `Upgrade to ${requiredPlan.toUpperCase()}`}
                </button>
                <button 
                  onClick={() => setShowUpgradeModal(false)}
                  className="w-full text-gray-500 hover:text-gray-900 font-medium py-2"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
