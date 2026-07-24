'use client';

import React from 'react';

export type BgEffect = 'orbs' | 'aurora' | 'particles';

interface AnimatedBgProps {
  effect: BgEffect;
  accent?: string;
}

/**
 * A decorative animated layer that sits BEHIND the storefront content when a
 * theme asks for it (root.props.bgEffect). Pure CSS animations — no JS ticking,
 * no external assets — and pointer-events: none so it can never block a tap.
 *
 *  orbs      — large blurred colour blobs drifting slowly (luxury feel)
 *  aurora    — a soft moving gradient glow, like northern lights
 *  particles — tiny dots floating upward (calm, starry)
 */
export default function AnimatedBg({ effect, accent = '#FF7518' }: AnimatedBgProps) {
  const layer: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
  };

  // Deterministic particle field (no Math.random → no hydration mismatch).
  const particles = [
    { left: '6%', size: 5, dur: 16, delay: 0 }, { left: '14%', size: 3, dur: 22, delay: 4 },
    { left: '23%', size: 6, dur: 19, delay: 8 }, { left: '31%', size: 4, dur: 25, delay: 2 },
    { left: '42%', size: 3, dur: 18, delay: 10 }, { left: '50%', size: 5, dur: 21, delay: 6 },
    { left: '58%', size: 4, dur: 17, delay: 12 }, { left: '66%', size: 6, dur: 24, delay: 1 },
    { left: '74%', size: 3, dur: 20, delay: 9 }, { left: '82%', size: 5, dur: 23, delay: 5 },
    { left: '90%', size: 4, dur: 18, delay: 13 }, { left: '96%', size: 3, dur: 26, delay: 3 },
  ];

  return (
    <div style={layer} aria-hidden="true">
      {/* dangerouslySetInnerHTML, not a template-literal child: React does not
          reliably emit <style>{`…`}</style> content here, so the @keyframes
          never reached the page and every effect rendered motionless. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes mgOrbFloat {
          0%   { transform: translate(0, 0) scale(1); }
          50%  { transform: translate(60px, -40px) scale(1.15); }
          100% { transform: translate(-40px, 30px) scale(0.95); }
        }
        @keyframes mgAurora {
          0%   { transform: translate(-12%, -8%) rotate(0deg); }
          50%  { transform: translate(10%, 6%) rotate(180deg); }
          100% { transform: translate(-12%, -8%) rotate(360deg); }
        }
        @keyframes mgParticleRise {
          0%   { transform: translateY(105vh); opacity: 0; }
          10%  { opacity: 0.5; }
          90%  { opacity: 0.5; }
          100% { transform: translateY(-8vh); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .mg-bgfx { animation: none !important; }
        }
      `,
        }}
      />

      {effect === 'orbs' && (
        <>
          <div className="mg-bgfx" style={{ position: 'absolute', top: '8%', left: '5%', width: 420, height: 420, borderRadius: '50%', background: accent, opacity: 0.22, filter: 'blur(90px)', animation: 'mgOrbFloat 22s ease-in-out infinite alternate' }} />
          <div className="mg-bgfx" style={{ position: 'absolute', bottom: '10%', right: '4%', width: 360, height: 360, borderRadius: '50%', background: accent, opacity: 0.16, filter: 'blur(100px)', animation: 'mgOrbFloat 28s ease-in-out infinite alternate-reverse' }} />
          <div className="mg-bgfx" style={{ position: 'absolute', top: '55%', left: '45%', width: 260, height: 260, borderRadius: '50%', background: '#ffffff', opacity: 0.07, filter: 'blur(80px)', animation: 'mgOrbFloat 34s ease-in-out infinite alternate' }} />
        </>
      )}

      {effect === 'aurora' && (
        <div
          className="mg-bgfx"
          style={{
            position: 'absolute',
            inset: '-40%',
            background: `conic-gradient(from 90deg at 50% 50%, transparent 0deg, ${accent} 70deg, transparent 140deg, ${accent} 240deg, transparent 320deg)`,
            opacity: 0.14,
            filter: 'blur(110px)',
            animation: 'mgAurora 46s linear infinite',
          }}
        />
      )}

      {effect === 'particles' &&
        particles.map((p, i) => (
          <span
            key={i}
            className="mg-bgfx"
            style={{
              position: 'absolute',
              left: p.left,
              bottom: '-10vh',
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              background: accent,
              opacity: 0,
              animation: `mgParticleRise ${p.dur}s linear ${p.delay}s infinite`,
            }}
          />
        ))}
    </div>
  );
}
