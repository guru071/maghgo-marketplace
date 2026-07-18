'use client';

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { Product } from '@/types';
import { formatPrice } from '@/lib/utils';
import ProductDetails from './ProductDetails';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, opts?: { variant?: string }) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const [isAdded, setIsAdded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const specs = Array.isArray(product.specifications) ? product.specifications.filter((s) => s?.label && s?.value) : [];
  const variants = Array.isArray(product.variants) ? product.variants.filter((v) => v?.name && v.values?.length) : [];
  const hasVariants = variants.length > 0;
  const hasDetails = specs.length > 0 || Boolean(product.description) || hasVariants;

  const imageUrl = product.processed_image_url || product.original_image_url;
  const showImage = imageUrl && !imgError;

  const isPrebook = product.fulfillment_type === 'prebook';
  const outOfStock = product.stock != null && product.stock <= 0;
  const lowStock = product.stock != null && product.stock > 0 && product.stock <= 5;

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
        <ProductDetails
          product={product}
          onAdd={(pr, opts) => { onAddToCart(pr, opts); flashAdded(); }}
          onClose={() => setShowDetails(false)}
        />
      )}
    </article>
  );
}
