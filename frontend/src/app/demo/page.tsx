import React from 'react';
import { InteractiveDemo } from '@/components/demo/InteractiveDemo';
import { Header } from '@/components/landing/Header';

export default function DemoPage() {
  return (
    <main className="landing-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <section className="hero" style={{ padding: '4rem 0 2rem' }}>
        <div className="hero__background"></div>
        <div className="hero__container">
          <h1 className="hero__title">
            Interactive <span className="text-accent">Live Demo</span>
          </h1>
          <p className="hero__subtitle" style={{ maxWidth: '600px' }}>
            Upload a photo below to see how Maghgo's AI instantly turns a messy background into a professional, ready-to-sell web store. 
            <strong> (We won't save this to the database!)</strong>
          </p>
        </div>
      </section>
      
      <InteractiveDemo />
      
      {/* Added Visual Builder Promo */}
      <section style={{ padding: '6rem 2rem', backgroundColor: '#fff', textAlign: 'center', borderTop: '1px solid #E5E7EB' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#1A1A2E' }}>Want more customization?</h2>
        <p style={{ fontSize: '1.125rem', color: '#6B7280', marginBottom: '2.5rem', maxWidth: '600px', margin: '0 auto 2.5rem', lineHeight: '1.6' }}>
          Experience our new Drag-and-Drop Visual Store Builder. Completely customize the look and feel of your store, just like WordPress or FlutterFlow.
        </p>
        <a href="/demo/builder" style={{ display: 'inline-block', backgroundColor: '#E07A5F', color: '#fff', padding: '1rem 2.5rem', borderRadius: '8px', fontWeight: 'bold', textDecoration: 'none', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 10px 15px -3px rgba(224, 122, 95, 0.3)' }}>
          Launch Visual Builder Demo
        </a>
      </section>
    </main>
  );
}
