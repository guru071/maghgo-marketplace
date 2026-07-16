import React from 'react';

export function DemoAnalytics({ plan }: { plan: 'premium' | 'enterprise' }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #eee',
      borderRadius: '12px',
      padding: '2rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
          Seller Analytics Dashboard
          <span style={{ marginLeft: '0.75rem', background: '#f1f5f9', color: '#64748b', padding: '3px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', verticalAlign: 'middle', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Sample data
          </span>
        </h2>
        {plan === 'enterprise' && (
          <span style={{ background: '#111', color: '#fff', padding: '4px 12px', borderRadius: '12px', fontSize: '12px' }}>
            White-Label Active
          </span>
        )}
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ padding: '1.5rem', background: '#f8f9fa', borderRadius: '8px' }}>
          <div style={{ color: '#666', fontSize: '0.875rem' }}>Total Sales</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent)' }}>₹45,290</div>
        </div>
        <div style={{ padding: '1.5rem', background: '#f8f9fa', borderRadius: '8px' }}>
          <div style={{ color: '#666', fontSize: '0.875rem' }}>Store Views</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>1,204</div>
        </div>
        <div style={{ padding: '1.5rem', background: '#f8f9fa', borderRadius: '8px' }}>
          <div style={{ color: '#666', fontSize: '0.875rem' }}>Conversion Rate</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>3.4%</div>
        </div>
      </div>
      
      {/* Fake Chart */}
      <div style={{ height: '200px', width: '100%', background: 'linear-gradient(180deg, rgba(255,117,24,0.1) 0%, rgba(255,255,255,0) 100%)', borderBottom: '2px solid var(--accent)', position: 'relative' }}>
        <svg viewBox="0 0 100 20" preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
          <polyline points="0,20 10,15 20,18 30,12 40,16 50,8 60,10 70,5 80,7 90,2 100,4" fill="none" stroke="var(--accent)" strokeWidth="0.5" />
        </svg>
      </div>
    </div>
  );
}
