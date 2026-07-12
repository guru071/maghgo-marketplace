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

  const imageUrl = product.processed_image_url || product.original_image_url;
  const showImage = imageUrl && !imgError;

  const handleAdd = useCallback(() => {
    onAddToCart(product);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 800);
  }, [onAddToCart, product]);

  return (
    <article className="product-card">
      <div className="product-card__image-wrapper">
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
        <p className="product-card__price">
          {formatPrice(product.price, product.currency)}
        </p>
        <button
          className={`product-card__add-btn ${isAdded ? 'product-card__add-btn--added' : ''}`}
          onClick={handleAdd}
          aria-label={`Add ${product.title} to cart`}
        >
          {isAdded ? (
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
              Add to Cart
            </>
          )}
        </button>
      </div>
    </article>
  );
}
