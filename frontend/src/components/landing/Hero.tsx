import React from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';

export function Hero() {
  return (
    <section className="hero">
      <div className="hero__container">
        <h1 className="hero__title">
          Your <span className="text-whatsapp">WhatsApp</span>.<br />
          Your Web Store.
        </h1>
        <p className="hero__subtitle">
          Turn your WhatsApp into a premium web store. Just send photos of your products. We handle the background removal, formatting, and hosting instantly.
        </p>
        <div className="hero__actions">
          <Link href="#pricing">
            <Button className="btn--primary btn--large">Start Your Free Trial</Button>
          </Link>
          <Link href="#how-it-works">
            <Button variant="secondary" className="btn--large">See How It Works</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
