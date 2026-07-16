import React from 'react';

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  text: string;
}

export interface ThemeConfig {
  colors: ThemeColors;
  fonts: { heading: string; body: string };
  layout: { borderRadius: string; spacing: string };
}

/**
 * A live miniature of a storefront rendered from a theme's REAL config.
 *
 * This replaces the three stock JPEGs that used to sit under "100+ Stunning
 * Themes". Those images were hand-picked screenshots of themes that were not
 * even in the database, so the showcase advertised designs a merchant could
 * never actually pick. Rendering from the config means what you see here is
 * exactly the palette, font and corner radius the theme will apply — and it
 * stays correct automatically when a theme changes.
 */
export function ThemePreview({ config }: { config: ThemeConfig }) {
  const { colors, fonts, layout } = config;
  const radius = layout?.borderRadius ?? '4px';

  return (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden"
      style={{ backgroundColor: colors.background, fontFamily: fonts?.body }}
      aria-hidden="true"
    >
      {/* Store header — the theme's primary colour */}
      <div
        className="px-3 py-2 flex items-center justify-between shrink-0"
        style={{ backgroundColor: colors.primary }}
      >
        <div
          className="text-[9px] font-bold truncate"
          style={{ color: colors.background, fontFamily: fonts?.heading }}
        >
          YOUR STORE
        </div>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-3 h-[3px] rounded-full" style={{ backgroundColor: colors.background, opacity: 0.6 }} />
          ))}
        </div>
      </div>

      {/* Section heading + accent rule */}
      <div className="px-3 pt-2.5 pb-1.5">
        <div className="text-[8px] font-bold" style={{ color: colors.text, fontFamily: fonts?.heading }}>
          New Arrivals
        </div>
        <div className="mt-1 h-[2px] w-6" style={{ backgroundColor: colors.secondary }} />
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-3 gap-1.5 px-3 pb-2 flex-1">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex flex-col" style={{ borderRadius: radius, overflow: 'hidden' }}>
            <div
              className="flex-1 min-h-[18px]"
              style={{ backgroundColor: colors.text, opacity: 0.1, borderRadius: radius }}
            />
            <div className="mt-1 h-[3px] w-3/4 rounded-full" style={{ backgroundColor: colors.text, opacity: 0.35 }} />
            <div className="mt-[3px] h-[3px] w-1/3 rounded-full" style={{ backgroundColor: colors.primary }} />
          </div>
        ))}
      </div>

      {/* Buy button — shows the real accent/background pairing */}
      <div className="px-3 pb-2.5">
        <div
          className="h-3.5 flex items-center justify-center text-[6px] font-bold"
          style={{ backgroundColor: colors.secondary, color: colors.background, borderRadius: radius }}
        >
          ADD TO CART
        </div>
      </div>
    </div>
  );
}
