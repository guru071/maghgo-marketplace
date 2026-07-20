'use client';

import React from 'react';
import { Merchant } from '@/types';
import { groupByCategory } from '@/lib/categorize';

interface StoreFooterProps {
  merchant: Merchant & { store_address?: string | null; store_category?: string | null };
  productTitles: { title: string }[];
  rating?: { average: number; count: number } | null;
  showPoweredBy: boolean;
}

/**
 * Traditional e-commerce footer: about, category links, contact & socials,
 * trust row (payments, rating), legal line. Dark, columns, the whole ritual —
 * this is what makes a storefront read as a "real shop site".
 */
export default function StoreFooter({ merchant, productTitles, rating, showPoweredBy }: StoreFooterProps) {
  const categories = groupByCategory(productTitles).map((g) => g.category).slice(0, 6);
  const wa = merchant.phone_number ? `https://wa.me/${merchant.phone_number.replace(/\D/g, '')}` : null;
  const ig = merchant.instagram_handle ? `https://instagram.com/${merchant.instagram_handle.replace('@', '')}` : null;
  const fb = merchant.facebook_url || null;
  const maps = merchant.store_address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(merchant.store_address)}` : null;

  const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8, minWidth: 180, flex: 1 };
  const h: React.CSSProperties = { fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 4 };
  const link: React.CSSProperties = { color: '#d1d5db', fontSize: '0.9rem', textDecoration: 'none' };

  return (
    <footer style={{ background: '#111318', color: '#d1d5db', marginTop: '3rem' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '2.5rem 1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
          {/* About */}
          <div style={{ ...col, flex: 1.4 }}>
            <p style={{ fontWeight: 900, fontSize: '1.15rem', color: '#fff', margin: 0 }}>{merchant.store_name}</p>
            {merchant.store_category && <p style={{ margin: 0, fontSize: '0.8rem', color: '#9ca3af' }}>🗂 {merchant.store_category}</p>}
            {merchant.store_description && (
              <p style={{ margin: '4px 0 0', fontSize: '0.88rem', lineHeight: 1.6, color: '#9ca3af' }}>{merchant.store_description}</p>
            )}
            {rating && (
              <p style={{ margin: '6px 0 0', fontSize: '0.85rem', color: '#fbbf24', fontWeight: 700 }}>
                ⭐ {rating.average}/5 · {rating.count} rating{rating.count === 1 ? '' : 's'} from real orders
              </p>
            )}
          </div>

          {/* Categories */}
          {categories.length > 1 && (
            <div style={col}>
              <p style={h}>Shop</p>
              {categories.map((c) => (
                <span key={c.key} style={link}>{c.icon} {c.label}</span>
              ))}
            </div>
          )}

          {/* Contact */}
          <div style={col}>
            <p style={h}>Contact</p>
            {merchant.store_address && (
              <a href={maps!} target="_blank" rel="noopener noreferrer" style={link}>📍 {merchant.store_address}</a>
            )}
            {wa && <a href={wa} target="_blank" rel="noopener noreferrer" style={link}>💬 WhatsApp us</a>}
            {merchant.phone_number && <a href={`tel:${merchant.phone_number}`} style={link}>📞 {merchant.phone_number}</a>}
            {ig && <a href={ig} target="_blank" rel="noopener noreferrer" style={link}>📸 @{merchant.instagram_handle!.replace('@', '')}</a>}
            {fb && <a href={fb} target="_blank" rel="noopener noreferrer" style={link}>👥 Facebook</a>}
          </div>

          {/* Trust */}
          <div style={col}>
            <p style={h}>Why shop here</p>
            <span style={link}>🔒 Secure online payments</span>
            <span style={link}>💳 UPI · Cards · Netbanking</span>
            <span style={link}>🔎 Live order tracking</span>
            <span style={link}>💬 Order & pay in chat too</span>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #23262e', marginTop: '2rem', paddingTop: '1rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
          <p style={{ margin: 0, fontSize: '0.78rem', color: '#6b7280' }}>
            © {new Date().getFullYear()} {merchant.store_name}. All prices in INR.
          </p>
          {showPoweredBy && (
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#6b7280' }}>
              Powered by <a href="https://goatech.tech" target="_blank" rel="noopener noreferrer" style={{ color: '#9ca3af', fontWeight: 700, textDecoration: 'none' }}>GOAT&apos;ECH</a>
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}
