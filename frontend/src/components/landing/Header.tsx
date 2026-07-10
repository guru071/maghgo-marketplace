import React from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';

export function Header() {
  return (
    <header className="header">
      <div className="header__container">
        <Link href="/" className="header__brand">
          <div className="header__logo-wrapper">
            <img src="/logo.jpg" alt="Maghgo Logo" className="header__logo" />
          </div>
          <span className="header__name">Maghgo</span>
        </Link>
        <nav className="header__nav">
          <Link href="/#how-it-works" className="header__link">How it Works</Link>
          <Link href="/#pricing" className="header__link">Pricing</Link>
          <Link href="/demo" className="header__link" style={{ color: 'var(--accent)' }}>Live Demo</Link>
        </nav>
        <div className="header__actions">
          <a href="https://wa.me/919876543210?text=REGISTER%20" target="_blank" rel="noopener noreferrer">
            <Button className="btn--primary">Get Started</Button>
          </a>
        </div>
      </div>
    </header>
  );
}
