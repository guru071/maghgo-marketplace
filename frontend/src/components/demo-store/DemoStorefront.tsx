"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { DemoStoreHeader } from './DemoStoreHeader';
import { DemoStoreFeatures } from './DemoStoreFeatures';
import { DemoAnalytics } from './DemoAnalytics';

type Plan = 'basic' | 'premium' | 'enterprise';

export function DemoStorefront() {
  const searchParams = useSearchParams();
  const [activePlan, setActivePlan] = useState<Plan>('basic');

  useEffect(() => {
    const planParam = searchParams.get('plan');
    if (planParam === 'basic' || planParam === 'premium' || planParam === 'enterprise') {
      setActivePlan(planParam);
    }
  }, [searchParams]);

  return (
    <div className={`demo-store-env demo-store-env--${activePlan}`}>
      {/* Dynamic Header based on Plan */}
      <DemoStoreHeader plan={activePlan} />
      
      <main className="demo-store-main" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* The Feature Switcher to let user play with it instantly */}
        <DemoStoreFeatures activePlan={activePlan} onChangePlan={setActivePlan} />
        
        <div style={{ marginTop: '3rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
            Store Content
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
            {/* Dummy Products */}
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1rem', background: '#fff' }}>
                <div style={{ width: '100%', aspectRatio: '1', background: '#f5f5f5', borderRadius: '4px', marginBottom: '1rem' }}></div>
                <div style={{ height: '20px', width: '80%', background: '#eee', marginBottom: '0.5rem' }}></div>
                <div style={{ height: '20px', width: '40%', background: '#eee' }}></div>
              </div>
            ))}
          </div>
        </div>

        {/* Analytics Dashboard Preview (Premium & Enterprise Only) */}
        {(activePlan === 'premium' || activePlan === 'enterprise') && (
          <div style={{ marginTop: '4rem' }}>
            <DemoAnalytics plan={activePlan} />
          </div>
        )}

      </main>
    </div>
  );
}
