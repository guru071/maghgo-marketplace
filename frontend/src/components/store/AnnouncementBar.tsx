'use client';

import React from 'react';

/**
 * The classic Indian e-commerce offer ticker — a thin scrolling strip above
 * the navbar ("Free delivery over ₹499 ✨ …"). Set by the owner with the
 * ANNOUNCE command (or the dashboard). Content is repeated so the marquee
 * loops seamlessly; honours reduced-motion.
 */
export default function AnnouncementBar({ text }: { text: string }) {
  const chunk = `${text}   ✦   `;
  return (
    <div style={{ background: 'var(--accent, #FF7518)', color: '#fff', overflow: 'hidden', whiteSpace: 'nowrap', fontSize: '0.82rem', fontWeight: 700, padding: '0.35rem 0' }} aria-label={text}>
      <style>{`
        @keyframes mgTicker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @media (prefers-reduced-motion: reduce) { .mg-ticker { animation: none !important; } }
      `}</style>
      <div className="mg-ticker" style={{ display: 'inline-block', animation: 'mgTicker 18s linear infinite' }}>
        <span>{chunk.repeat(6)}</span>
        <span>{chunk.repeat(6)}</span>
      </div>
    </div>
  );
}
