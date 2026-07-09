import React from 'react';

export default function EmptyStore() {
  return (
    <div className="empty-store">
      <svg
        className="empty-store__icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
      <h2 className="empty-store__title">No products yet</h2>
      <p className="empty-store__text">
        This store is setting up. Check back soon for amazing products!
      </p>
    </div>
  );
}
