'use client';

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { Product } from '@/types';
import { formatPrice } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const [isAdded, setIsAdded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const specs = Array.isArray(product.specifications) ? product.specifications.filter((s) => s?.label && s?.value) : [];
  const hasDetails = specs.length > 0 || Boolean(product.description);

  const imageUrl = product.processed_image_url || product.original_image_url;
  const showImage = imageUrl && !imgError;

  const handleAdd = useCallback(() => {
    onAddToCart(product);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 800);
  }, [onAddToCart, product]);

  const isPrebook = product.fulfillment_type === 'prebook';
  const outOfStock = product.stock != null && product.stock <= 0;
  const lowStock = product.stock != null && product.stock > 0 && product.stock <= 5;

  return (
    <article className="product-card" style={outOfStock ? { opacity: 0.75 } : undefined}>
      <div className="product-card__image-wrapper">
        {outOfStock && (
          <span style={{ position: 'absolute', top: 8, right: 8, zIndex: 2, background: '#4b5563', color: '#fff', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: '6px' }}>
            Out of stock
          </span>
        )}
        {isPrebook && (
          <span style={{ position: 'absolute', top: 8, left: 8, zIndex: 2, background: '#7C3AED', color: '#fff', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: '6px' }}>
            Pre-book
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
            <svg
              className="product-card__fallback-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
          </div>
        )}
      </div>

      <div className="product-card__body">
        <h3 className="product-card__title">{product.title.replace(/#[\w]+/g, '').trim()}</h3>
        {product.description && (
          <p className="product-card__description">{product.description}</p>
        )}
        {hasDetails && (
          <button
            type="button"
            onClick={() => setShowDetails(true)}
            style={{ alignSelf: 'flex-start', background: 'none', border: 'none', padding: 0, marginBottom: 4, color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
          >
            View details →
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
          onClick={handleAdd}
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
          aria-label={`${product.title} details`}
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
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '2px 0' }}>{product.title.replace(/#[\w]+/g, '').trim()}</h3>
                </div>
                <button onClick={() => setShowDetails(false)} aria-label="Close" style={{ background: 'none', border: 'none', fontSize: '1.5rem', lineHeight: 1, cursor: 'pointer', color: '#9ca3af' }}>×</button>
              </div>
              <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent)', margin: '0.25rem 0 1rem' }}>
                {formatPrice(product.price, product.currency)}
              </p>
              {product.description && (
                <p style={{ color: '#374151', lineHeight: 1.6, marginBottom: specs.length ? '1.25rem' : '1.5rem' }}>{product.description}</p>
              )}
              {specs.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem' }}>
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
              <button
                className="product-card__add-btn"
                onClick={() => { if (!outOfStock) { handleAdd(); setShowDetails(false); } }}
                disabled={outOfStock}
                style={outOfStock ? { opacity: 0.5, cursor: 'not-allowed', width: '100%' } : { width: '100%' }}
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
