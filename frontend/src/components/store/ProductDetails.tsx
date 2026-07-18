'use client';

import React, { useState } from 'react';
import { Product } from '@/types';
import { formatPrice } from '@/lib/utils';

interface ProductDetailsProps {
  product: Product;
  onAdd: (product: Product, opts?: { variant?: string }) => void;
  onClose: () => void;
}

/**
 * The product details / specifications sheet — shown when a shopper taps a
 * product on the storefront (in both the default grid and themed stores). Lets
 * them read the description + specs and pick any options (Size/Colour) before
 * adding to the cart.
 */
export default function ProductDetails({ product, onAdd, onClose }: ProductDetailsProps) {
  const [chosen, setChosen] = useState<Record<string, string>>({});

  const specs = Array.isArray(product.specifications) ? product.specifications.filter((s) => s?.label && s?.value) : [];
  const variants = Array.isArray(product.variants) ? product.variants.filter((v) => v?.name && v.values?.length) : [];
  const hasVariants = variants.length > 0;
  const allChosen = variants.every((v) => chosen[v.name]);
  const variantString = variants.map((v) => `${v.name}: ${chosen[v.name]}`).join(' · ');

  const imageUrl = product.processed_image_url || product.original_image_url;
  const isPrebook = product.fulfillment_type === 'prebook';
  const outOfStock = product.stock != null && product.stock <= 0;
  const cleanTitle = product.title.replace(/#[\w]+/g, '').trim();

  const add = () => {
    if (outOfStock || (hasVariants && !allChosen)) return;
    onAdd(product, hasVariants ? { variant: variantString } : undefined);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${cleanTitle} details`}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', color: '#111', borderRadius: 16, maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
      >
        {imageUrl && (
          <div style={{ position: 'relative', width: '100%', aspectRatio: '1', background: '#f3f4f6', borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={cleanTitle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}
        <div style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              {product.category && (
                <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6b7280' }}>{product.category}</span>
              )}
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '2px 0' }}>{cleanTitle}</h3>
            </div>
            <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', fontSize: '1.5rem', lineHeight: 1, cursor: 'pointer', color: '#9ca3af' }}>×</button>
          </div>
          <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent)', margin: '0.25rem 0 0.75rem' }}>
            {formatPrice(product.price, product.currency)}
          </p>

          {isPrebook && (
            <div style={{ background: '#f5f3ff', color: '#6d28d9', fontSize: '0.85rem', fontWeight: 600, padding: '0.6rem 0.85rem', borderRadius: 10, marginBottom: '1rem' }}>
              📅 Pre-book item — reserve now and collect it at the shop.
            </div>
          )}

          {product.description && (
            <p style={{ color: '#374151', lineHeight: 1.6, marginBottom: '1.25rem' }}>{product.description}</p>
          )}

          {variants.map((v) => (
            <div key={v.name} style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 6 }}>
                {v.name}{chosen[v.name] ? <span style={{ color: '#6b7280', fontWeight: 500 }}>: {chosen[v.name]}</span> : ''}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {v.values.map((val) => {
                  const active = chosen[v.name] === val;
                  return (
                    <button
                      key={val}
                      onClick={() => setChosen((c) => ({ ...c, [v.name]: val }))}
                      style={{
                        padding: '0.45rem 0.9rem', borderRadius: 999, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                        border: active ? '2px solid var(--accent)' : '1px solid #d1d5db',
                        background: active ? 'var(--accent)' : '#fff',
                        color: active ? '#fff' : '#374151',
                      }}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {specs.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', margin: '0.5rem 0 1.5rem' }}>
              <tbody>
                {specs.map((s, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '0.55rem 0', color: '#6b7280', fontSize: '0.85rem', width: '40%' }}>{s.label}</td>
                    <td style={{ padding: '0.55rem 0', color: '#111', fontSize: '0.9rem', fontWeight: 600 }}>{s.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {hasVariants && !allChosen && (
            <p style={{ fontSize: '0.8rem', color: '#d97706', marginBottom: 8 }}>Please choose {variants.filter((v) => !chosen[v.name]).map((v) => v.name).join(' & ')}.</p>
          )}

          <button
            className="product-card__add-btn"
            onClick={add}
            disabled={outOfStock || (hasVariants && !allChosen)}
            style={(outOfStock || (hasVariants && !allChosen)) ? { opacity: 0.5, cursor: 'not-allowed', width: '100%' } : { width: '100%' }}
          >
            {outOfStock ? 'Out of Stock' : isPrebook ? 'Pre-book' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}
