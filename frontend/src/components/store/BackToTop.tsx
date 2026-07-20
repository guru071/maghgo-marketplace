'use client';

import React, { useEffect, useState } from 'react';

/** The floating ↑ button every real shop site has. Appears after one screen. */
export default function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  if (!show) return null;
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      style={{ position: 'fixed', bottom: 96, right: 20, zIndex: 45, width: 44, height: 44, borderRadius: '50%', border: 'none', background: '#111', color: '#fff', fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 6px 20px rgba(0,0,0,0.3)' }}
    >
      ↑
    </button>
  );
}
