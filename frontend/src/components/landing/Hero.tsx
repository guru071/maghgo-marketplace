import React from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';

export function Hero() {
  return (
    <section className="hero">
      <div className="hero__background"></div>
      <div className="hero__container">
        <div className="hero__badge">
          <span className="hero__badge-dot"></span>
          Now accepting sellers
        </div>
        <h1 className="hero__title">
          Your <span className="text-whatsapp">WhatsApp</span>.<br />
          Your Web Store.
        </h1>
        <p className="hero__subtitle">
          Turn your WhatsApp into a premium web store. Just send photos of your products. We handle the background removal, formatting, and hosting instantly.
        </p>
        <div className="hero__actions">
          <Link href="/register">
            <Button className="btn--primary btn--large hero__btn">Create Your Store Free</Button>
          </Link>
          <Link href="#how-it-works">
            <Button variant="secondary" className="btn--large hero__btn-secondary">See How It Works</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
