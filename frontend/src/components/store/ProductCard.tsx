'use client';

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { Product } from '@/types';
import { formatPrice } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, opts?: { variant?: string }) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const [isAdded, setIsAdded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [chosen, setChosen] = useState<Record<string, string>>({});

  const specs = Array.isArray(product.specifications) ? product.specifications.filter((s) => s?.label && s?.value) : [];
  const variants = Array.isArray(product.variants) ? product.variants.filter((v) => v?.name && v.values?.length) : [];
  const hasVariants = variants.length > 0;
  const hasDetails = specs.length > 0 || Boolean(product.description) || hasVariants;

  const imageUrl = product.processed_image_url || product.original_image_url;
  const showImage = imageUrl && !imgError;

  const isPrebook = product.fulfillment_type === 'prebook';
  const outOfStock = product.stock != null && product.stock <= 0;
  const lowStock = product.stock != null && product.stock > 0 && product.stock <= 5;

  const allChosen = variants.every((v) => chosen[v.name]);
  const variantString = variants.map((v) => `${v.name}: ${chosen[v.name]}`).join(' · ');

  const flashAdded = () => {
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 800);
  };

  // Add directly when there's nothing to choose; otherwise open the detail sheet
  // so the buyer picks their options (size/colour) first.
  const handleCardAdd = useCallback(() => {
    if (outOfStock) return;
    if (hasVariants) { setShowDetails(true); return; }
    onAddToCart(product);
    flashAdded();
  }, [outOfStock, hasVariants, onAddToCart, product]);

  const handleModalAdd = () => {
    if (outOfStock) return;
    if (hasVariants && !allChosen) return;
    onAddToCart(product, hasVariants ? { variant: variantString } : undefined);
    setShowDetails(false);
    flashAdded();
  };

  const openDetails = () => setShowDetails(true);

  const cleanTitle = product.title.replace(/#[\w]+/g, '').trim();

  return (
    <article className="product-card" style={outOfStock ? { opacity: 0.75 } : undefined}>
      {/* Clicking the image opens details — it never adds to the cart. */}
      <div
        className="product-card__image-wrapper"
        onClick={openDetails}
        style={{ cursor: 'pointer' }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetails(); } }}
        aria-label={`View details for ${cleanTitle}`}
      >
        {outOfStock && (
          <span style={{ position: 'absolute', top: 8, right: 8, zIndex: 2, background: '#4b5563', color: '#fff', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: '6px' }}>
            Out of stock
          </span>
        )}
        {isPrebook && (
          <span style={{ position: 'absolute', top: 8, left: 8, zIndex: 2, background: '#7C3AED', color: '#fff', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: '6px' }}>
            📅 Pre-book
          </span>
        )}
        {showImage ? (
          <Image
            src={imageUrl}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="product-card__image"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="product-card__fallback">
            <svg className="product-card__fallback-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
          </div>
        )}
      </div>

      <div className="product-card__body">
        <h3 className="product-card__title" onClick={openDetails} style={{ cursor: 'pointer' }}>{cleanTitle}</h3>
        {product.description && (
          <p className="product-card__description">{product.description}</p>
        )}
        {isPrebook && (
          <p style={{ fontSize: '0.75rem', color: '#7C3AED', fontWeight: 600, margin: '0 0 4px' }}>
            Reserve now, collect at the shop
          </p>
        )}
        {hasDetails && (
          <button
            type="button"
            onClick={openDetails}
            style={{ alignSelf: 'flex-start', background: 'none', border: 'none', padding: 0, marginBottom: 4, color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
          >
            {hasVariants ? 'Choose options →' : 'View details →'}
          </button>
        )}
        <p className="product-card__price">
          {formatPrice(product.price, product.currency)}
          {lowStock && (
            <span style={{ marginLeft: 8, fontSize: '0.7rem', fontWeight: 700, color: '#d97706' }}>
              Only {product.stock} left
            </span>
          )}
        </p>
        <button
          className={`product-card__add-btn ${isAdded ? 'product-card__add-btn--added' : ''}`}
          onClick={handleCardAdd}
          disabled={outOfStock}
          style={outOfStock ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
          aria-label={outOfStock ? `${product.title} is out of stock` : `Add ${product.title} to cart`}
        >
          {outOfStock ? (
            'Out of Stock'
          ) : isAdded ? (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Added
            </>
          ) : hasVariants ? (
            isPrebook ? 'Pre-book' : 'Choose options'
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {isPrebook ? 'Pre-book' : 'Add to Cart'}
            </>
          )}
        </button>
      </div>

      {showDetails && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${cleanTitle} details`}
          onClick={() => setShowDetails(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#fff', color: '#111', borderRadius: 16, maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
          >
            {showImage && (
              <div style={{ position: 'relative', width: '100%', aspectRatio: '1', background: '#f3f4f6', borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                <button onClick={() => setShowDetails(false)} aria-label="Close" style={{ background: 'none', border: 'none', fontSize: '1.5rem', lineHeight: 1, cursor: 'pointer', color: '#9ca3af' }}>×</button>
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

              {/* Variant pickers (Size, Colour, …) */}
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
                onClick={handleModalAdd}
                disabled={outOfStock || (hasVariants && !allChosen)}
                style={(outOfStock || (hasVariants && !allChosen)) ? { opacity: 0.5, cursor: 'not-allowed', width: '100%' } : { width: '100%' }}
              >
                {outOfStock ? 'Out of Stock' : isPrebook ? 'Pre-book' : 'Add to Cart'}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
