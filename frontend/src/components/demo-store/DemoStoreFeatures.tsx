import React from 'react';

type Plan = 'basic' | 'premium' | 'enterprise';

interface Props {
  activePlan: Plan;
  onChangePlan: (plan: Plan) => void;
}

export function DemoStoreFeatures({ activePlan, onChangePlan }: Props) {
  return (
    <div style={{
      background: 'rgba(255,117,24,0.05)',
      border: '1px solid rgba(255,117,24,0.2)',
      borderRadius: '12px',
      padding: '1.5rem',
      marginBottom: '2rem'
    }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--accent)' }}>
        👀 Interactive Demo Mode
      </h3>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
        Click the plans below to instantly see how this store upgrades based on the subscription tier!
      </p>
      
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button 
          onClick={() => onChangePlan('basic')}
          style={{
            padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 'bold',
            background: activePlan === 'basic' ? 'var(--text-primary)' : '#fff',
            color: activePlan === 'basic' ? '#fff' : 'var(--text-primary)',
            border: '1px solid var(--border)', cursor: 'pointer'
          }}
        >
          Basic (₹99)
        </button>
        <button 
          onClick={() => onChangePlan('premium')}
          style={{
            padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 'bold',
            background: activePlan === 'premium' ? 'var(--accent)' : '#fff',
            color: activePlan === 'premium' ? '#fff' : 'var(--accent)',
            border: '1px solid var(--accent)', cursor: 'pointer',
            boxShadow: activePlan === 'premium' ? '0 4px 12px rgba(255,117,24,0.25)' : 'none'
          }}
        >
          Pro (₹249) - All Channels
        </button>
        <button 
          onClick={() => onChangePlan('enterprise')}
          style={{
            padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 'bold',
            background: activePlan === 'enterprise' ? '#111' : '#fff',
            color: activePlan === 'enterprise' ? '#fff' : '#111',
            border: '1px solid #111', cursor: 'pointer'
          }}
        >
          Business (₹749) - White-Label
        </button>
      </div>
    </div>
  );
}
