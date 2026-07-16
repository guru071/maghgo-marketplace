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
        {/* `text-accent` rather than the old `text-whatsapp`: that class was
            never defined anywhere, so the highlighted word rendered unstyled.
            The highlight is no longer WhatsApp-specific either — the bot runs on
            WhatsApp, Instagram, Messenger and SMS, and the store is fully
            manageable from the web. */}
        <h1 className="hero__title">
          Your <span className="text-accent">Chats</span>.<br />
          Your Web Store.
        </h1>
        <p className="hero__subtitle">
          Turn WhatsApp, Instagram or Messenger into a premium web store. Just send a photo
          of your product — we handle the background removal, formatting and hosting
          instantly. Prefer a browser? Manage everything from your dashboard.
        </p>
        <div className="hero__actions">
          <Link href="/register">
            <Button className="btn--primary btn--large hero__btn">Create Your Store</Button>
          </Link>
          <Link href="#how-it-works">
            <Button variant="secondary" className="btn--large hero__btn-secondary">See How It Works</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
