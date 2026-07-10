import React from 'react';
import Link from 'next/link';

export function VisualBuilderShowcase() {
  return (
    <section style={{ padding: '6rem 2rem', backgroundColor: '#fff', borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '4rem', alignItems: 'center' }}>
        <div style={{ flex: '1 1 400px' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#1A1A2E' }}>
            Design Without Limits. <br/>
            <span style={{ color: '#E07A5F' }}>Like WordPress & FlutterFlow.</span>
          </h2>
          <p style={{ fontSize: '1.125rem', color: '#6B7280', marginBottom: '2rem', lineHeight: '1.6' }}>
            Don't settle for boring, cookie-cutter templates. Maghgo Enterprise gives you the ultimate power of a <strong>Visual Drag-and-Drop Editor</strong>. Build massive promotional banners, custom product grids, and striking headers without writing a single line of code.
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.125rem', color: '#1A1A2E', fontWeight: 500 }}>
              <span style={{ color: '#25D366' }}>✔</span> Drag and Drop Blocks
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.125rem', color: '#1A1A2E', fontWeight: 500 }}>
              <span style={{ color: '#25D366' }}>✔</span> Real-Time Live Preview
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.125rem', color: '#1A1A2E', fontWeight: 500 }}>
              <span style={{ color: '#25D366' }}>✔</span> Deep Customization
            </li>
          </ul>
          <Link href="/demo/builder" style={{ display: 'inline-block', backgroundColor: '#1A1A2E', color: '#fff', padding: '1rem 2rem', borderRadius: '8px', fontWeight: 'bold', textDecoration: 'none', transition: 'background-color 0.2s' }}>
            Try the Visual Builder
          </Link>
        </div>
        
        <div style={{ flex: '1 1 500px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', border: '1px solid #E5E7EB' }}>
          {/* Mockup of the builder UI */}
          <div style={{ backgroundColor: '#F3F4F6', padding: '1rem', borderBottom: '1px solid #E5E7EB', display: 'flex', gap: '0.5rem' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#FF5F56' }} />
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#FFBD2E' }} />
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#27C93F' }} />
          </div>
          <div style={{ display: 'flex', height: '400px' }}>
            <div style={{ width: '30%', backgroundColor: '#fff', borderRight: '1px solid #E5E7EB', padding: '1rem' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '1rem', fontSize: '0.875rem' }}>Components</div>
              <div style={{ backgroundColor: '#F9FAFB', padding: '0.75rem', borderRadius: '6px', marginBottom: '0.5rem', fontSize: '0.875rem', border: '1px dashed #D1D5DB', cursor: 'grab' }}>Hero Banner</div>
              <div style={{ backgroundColor: '#F9FAFB', padding: '0.75rem', borderRadius: '6px', marginBottom: '0.5rem', fontSize: '0.875rem', border: '1px dashed #D1D5DB', cursor: 'grab' }}>Product Grid</div>
              <div style={{ backgroundColor: '#F9FAFB', padding: '0.75rem', borderRadius: '6px', marginBottom: '0.5rem', fontSize: '0.875rem', border: '1px dashed #D1D5DB', cursor: 'grab' }}>Testimonials</div>
            </div>
            <div style={{ width: '70%', backgroundColor: '#F9FAFB', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ width: '100%', height: '120px', backgroundColor: '#E07A5F', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '1.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                Summer Sale!
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, height: '140px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }} />
                <div style={{ flex: 1, height: '140px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
