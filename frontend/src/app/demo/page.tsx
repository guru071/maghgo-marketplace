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
    </main>
  );
}
