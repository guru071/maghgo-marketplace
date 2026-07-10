import React from 'react';

export function DemoStoreHeader({ plan }: { plan: 'basic' | 'premium' | 'enterprise' }) {
  return (
    <header style={{
      padding: '1rem 2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid #eee',
      background: plan === 'enterprise' ? '#111' : '#fff',
      color: plan === 'enterprise' ? '#fff' : '#000',
      transition: 'all 0.3s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          width: '40px', height: '40px', 
          background: plan === 'enterprise' ? '#fff' : '#eee',
          borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {plan === 'enterprise' ? '🏆' : '🛍️'}
        </div>
        <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
          {plan === 'enterprise' ? 'Custom Brand Store' : 'My Store'}
        </span>
      </div>
      
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        <span style={{ fontSize: '0.875rem' }}>Home</span>
        <span style={{ fontSize: '0.875rem' }}>Products</span>
        
        {/* Custom Domain Badge */}
        {plan !== 'basic' ? (
          <span style={{ 
            background: 'var(--success)', color: 'white', padding: '0.25rem 0.5rem', 
            borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' 
          }}>
            ✅ yourbrand.com
          </span>
        ) : (
          <span style={{ 
            background: '#eee', color: '#666', padding: '0.25rem 0.5rem', 
            borderRadius: '4px', fontSize: '0.75rem' 
          }}>
            🔗 maghgo.goatech.tech/store
          </span>
        )}
      </div>
    </header>
  );
}
