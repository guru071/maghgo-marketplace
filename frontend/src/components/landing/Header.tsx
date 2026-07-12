'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';

export function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('maghgo_merchant_token');
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  return (
    <header className="header">
      <div className="header__container">
        <Link href="/" className="header__brand">
          <div className="header__logo-wrapper">
            <img src="/logo.jpg" alt="Maghgo Logo" className="header__logo" />
          </div>
          <span className="header__name"><span style={{ color: '#0052FF' }}>MAGH</span><span style={{ color: '#FF7A00' }}>GO</span></span>
        </Link>
        <nav className="header__nav">
          <Link href="/#how-it-works" className="header__link">How it Works</Link>
          <Link href="/#pricing" className="header__link">Pricing</Link>
          <Link href="/demo" className="header__link" style={{ color: 'var(--accent)' }}>Live Demo</Link>
        </nav>
        <div className="header__actions flex items-center space-x-4">
          {isLoggedIn ? (
            <Link href="/dashboard" className="bg-accent text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-black transition-colors shadow-sm">Go to Dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-black">Log in</Link>
              <Link href="/register" className="bg-black text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors">Get Started</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
