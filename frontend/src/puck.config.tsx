import React from "react";
import type { Config } from "@puckeditor/core";
import { DropZone } from "@puckeditor/core";
import { StoreContext } from "@/components/store/StoreContext";

// Header block. Falls back to the merchant's real store name / description when
// the props are still the "My Store" placeholders, so a seller who hasn't (or
// can't, on a plan without the builder) customised the header still shows their
// own shop name rather than "My Store".
const HEADER_TITLE_PLACEHOLDERS = ['My Store', 'Your Store', 'Store', ''];
const HEADER_SUBTITLE_PLACEHOLDERS = ['Welcome to my awesome store', 'Welcome to your store', ''];

const StoreHeaderComponent = ({ title, subtitle, logoUrl, bgImage, bgColor, textColor }: any) => {
  const storeCtx = React.useContext(StoreContext);

  const displayTitle = HEADER_TITLE_PLACEHOLDERS.includes((title || '').trim())
    ? (storeCtx?.storeName || title || 'My Store')
    : title;
  const displaySubtitle = HEADER_SUBTITLE_PLACEHOLDERS.includes((subtitle || '').trim())
    ? (storeCtx?.storeDescription || subtitle || '')
    : subtitle;

  // White over an image (there's a scrim), otherwise the theme's header text colour.
  const headText = bgImage ? '#fff' : (textColor || '#111');

  return (
    <div style={{
      position: 'relative',
      padding: '4rem 2rem',
      textAlign: 'center',
      backgroundColor: bgColor,
      backgroundImage: bgImage ? `url(${bgImage})` : undefined,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      color: bgImage ? '#fff' : textColor,
      borderBottom: '1px solid #eee',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: '100%',
    }}>
      {/* Dark scrim so white hero text stays readable over any photo, bright or dark. */}
      {bgImage && (
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.55))' }} />
      )}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        {logoUrl && <img src={logoUrl} alt={displayTitle} style={{ height: '80px', width: 'auto', marginBottom: '1.5rem', borderRadius: '8px' }} />}
        {/* Explicit colour: a global `h1 { color: var(--text-primary) }` rule
            overrides inherited colour, so without this the header title rendered
            dark navy even on a dark image/background. */}
        <h1 style={{ fontSize: '3rem', fontWeight: 'bold', margin: '0 0 1rem 0', color: headText, textShadow: bgImage ? '0 2px 12px rgba(0,0,0,0.4)' : 'none' }}>{displayTitle}</h1>
        {displaySubtitle && <p style={{ fontSize: '1.2rem', margin: 0, color: headText, opacity: 0.95, textShadow: bgImage ? '0 1px 8px rgba(0,0,0,0.4)' : 'none' }}>{displaySubtitle}</p>}
      </div>
    </div>
  );
};

// Products store currency as a code ("INR"), which rendered as "INR2,499".
// Show the symbol shoppers expect.
const CURRENCY_SYMBOL: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ' };
const currencySymbol = (code?: string) => CURRENCY_SYMBOL[(code || 'INR').toUpperCase()] ?? (code || '₹');

// Pick a readable text colour for a given card background. The title used to be
// hardcoded dark navy, so on a dark-themed card (cardBg #161616) it was
// invisible. Now light cards get dark text and dark cards get light text.
function readableOn(bg: string): { title: string; muted: string; border: string; isDark: boolean } {
  const hex = (bg || '#ffffff').replace('#', '');
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  const r = parseInt(full.slice(0, 2), 16) || 255;
  const g = parseInt(full.slice(2, 4), 16) || 255;
  const b = parseInt(full.slice(4, 6), 16) || 255;
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  const isDark = lum < 0.5;
  return isDark
    ? { title: '#ffffff', muted: 'rgba(255,255,255,0.65)', border: 'rgba(255,255,255,0.12)', isDark }
    : { title: '#111827', muted: '#6B7280', border: '#ECECEC', isDark };
}

/**
 * Animation + card-style CSS, injected once.
 *
 * A theme is meant to change how the store *feels*, not just its hex codes.
 * These classes give each theme a real entrance animation and hover behaviour,
 * picked per-theme via the ProductGrid's `animation` / `cardStyle` props.
 */
const MAGHGO_THEME_CSS = `
@keyframes mg-rise { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:none } }
@keyframes mg-fade { from { opacity:0 } to { opacity:1 } }
@keyframes mg-zoom { from { opacity:0; transform:scale(.92) } to { opacity:1; transform:none } }
@keyframes mg-slide { from { opacity:0; transform:translateX(-22px) } to { opacity:1; transform:none } }
@keyframes mg-shine { 0% { background-position:-160% 0 } 100% { background-position:260% 0 } }
.mg-card { animation-duration:.55s; animation-fill-mode:both; animation-timing-function:cubic-bezier(.22,1,.36,1); }
.mg-anim-rise .mg-card { animation-name: mg-rise }
.mg-anim-fade .mg-card { animation-name: mg-fade }
.mg-anim-zoom .mg-card { animation-name: mg-zoom }
.mg-anim-slide .mg-card { animation-name: mg-slide }
.mg-anim-none .mg-card { animation: none }
/* glossy sweep that runs across the image on hover (glass / luxury themes) */
.mg-shine { position:relative; overflow:hidden }
.mg-shine::after { content:''; position:absolute; inset:0; background:linear-gradient(115deg, transparent 30%, rgba(255,255,255,.35) 48%, transparent 66%); background-size:250% 100%; background-position:-160% 0; pointer-events:none }
.mg-shine:hover::after { animation: mg-shine 1.1s ease }
.mg-card__img { transition: transform .5s cubic-bezier(.22,1,.36,1) }
.mg-card:hover .mg-card__img { transform: scale(1.07) }
.mg-hover-lift { transition: transform .25s ease, box-shadow .25s ease }
.mg-hover-lift:hover { transform: translateY(-6px); box-shadow: 0 14px 30px rgba(0,0,0,.16) }
.mg-hover-tilt { transition: transform .25s ease }
.mg-hover-tilt:hover { transform: perspective(700px) rotateX(4deg) translateY(-4px) }
.mg-hover-press { transition: transform .12s ease, box-shadow .12s ease }
.mg-hover-press:hover { transform: translate(-3px,-3px) }
.mg-reveal { opacity:0; transform:translateY(8px); transition: opacity .3s ease, transform .3s ease }
.mg-card:hover .mg-reveal { opacity:1; transform:none }
@media (prefers-reduced-motion: reduce) {
  .mg-card, .mg-card__img, .mg-hover-lift, .mg-hover-tilt, .mg-hover-press, .mg-reveal { animation:none !important; transition:none !important; transform:none !important; opacity:1 !important }
}
`;

function ThemeStyles() {
  return <style dangerouslySetInnerHTML={{ __html: MAGHGO_THEME_CSS }} />;
}

/**
 * Product card with genuinely different designs per theme — not one card in
 * different colours. `cardStyle` changes the structure and the hover feel:
 *   classic  — image over details (marketplace)
 *   overlay  — details float on the image behind a scrim (lookbook)
 *   minimal  — no chrome, gallery-like, actions appear on hover
 *   frame    — hard offset border, no radius (brutalist/editorial)
 *   split    — image beside details (catalogue row)
 */
function ProductCardMini({ title, priceLabel, imageUrl, cardBg, accent, onClick, disabled, isPrebook, cardStyle = 'classic', index = 0 }: any) {
  const c = readableOn(cardBg);
  const delay = { animationDelay: `${Math.min(index, 12) * 55}ms` };
  const img = imageUrl ? `url(${imageUrl}) center/cover` : (c.isDark ? '#242424' : '#f3f4f6');
  const cta = isPrebook ? 'Pre-book' : 'Add to Cart';
  const ctaBg = isPrebook ? '#7C3AED' : accent;

  const Badge = () =>
    isPrebook ? (
      <span style={{ position: 'absolute', top: 8, left: 8, zIndex: 3, background: '#7C3AED', color: '#fff', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', padding: '3px 7px', borderRadius: '5px' }}>
        Pre-book
      </span>
    ) : null;

  const clickable = { cursor: disabled ? 'default' : 'pointer' } as const;
  const onCardClick = disabled ? undefined : onClick;

  if (cardStyle === 'glass') {
    // Glassmorphism: a translucent, blurred panel with a glossy hover sweep.
    return (
      <div className="mg-card mg-hover-lift" style={{ ...delay, ...clickable, position: 'relative', borderRadius: '14px', overflow: 'hidden', background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.22)', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column' }} onClick={onCardClick}>
        <Badge />
        <div className="mg-shine" style={{ overflow: 'hidden' }}>
          <div className="mg-card__img" style={{ width: '100%', aspectRatio: '1', background: img }} />
        </div>
        <div style={{ padding: '11px 13px 13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <h3 style={{ margin: 0, fontSize: '.9rem', fontWeight: 600, color: c.title, textShadow: c.isDark ? '0 1px 4px rgba(0,0,0,.4)' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</h3>
          {priceLabel && <span style={{ fontWeight: 800, color: accent, fontSize: '1rem' }}>{priceLabel}</span>}
          <button disabled={disabled} style={{ marginTop: 2, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(6px)', color: c.title, border: '1px solid rgba(255,255,255,0.35)', padding: '8px', borderRadius: '8px', fontWeight: 700, fontSize: '.8rem', width: '100%', cursor: disabled ? 'not-allowed' : 'pointer' }}>{cta}</button>
        </div>
      </div>
    );
  }

  if (cardStyle === 'gradient') {
    // Colour flows from the palette's accent into its secondary across the card.
    const grad = `linear-gradient(150deg, ${accent} 0%, ${cardBg} 78%)`;
    return (
      <div className="mg-card mg-hover-lift" style={{ ...delay, ...clickable, position: 'relative', borderRadius: '14px', overflow: 'hidden', background: grad, border: `1px solid ${c.border}`, display: 'flex', flexDirection: 'column', boxShadow: '0 6px 20px rgba(0,0,0,0.12)' }} onClick={onCardClick}>
        <Badge />
        <div className="mg-shine" style={{ overflow: 'hidden', margin: '10px 10px 0', borderRadius: '10px' }}>
          <div className="mg-card__img" style={{ width: '100%', aspectRatio: '1', background: img }} />
        </div>
        <div style={{ padding: '10px 13px 13px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <h3 style={{ margin: 0, fontSize: '.9rem', fontWeight: 700, color: '#fff', textShadow: '0 1px 6px rgba(0,0,0,.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</h3>
          {priceLabel && <span style={{ fontWeight: 800, color: '#fff', fontSize: '1rem' }}>{priceLabel}</span>}
          <button disabled={disabled} style={{ marginTop: 2, background: '#fff', color: accent, border: 'none', padding: '8px', borderRadius: '8px', fontWeight: 800, fontSize: '.8rem', width: '100%', cursor: disabled ? 'not-allowed' : 'pointer' }}>{cta}</button>
        </div>
      </div>
    );
  }

  if (cardStyle === 'overlay') {
    return (
      <div className="mg-card mg-hover-lift" style={{ ...delay, ...clickable, position: 'relative', borderRadius: '12px', overflow: 'hidden', aspectRatio: '3 / 4' }} onClick={onCardClick}>
        <Badge />
        <div className="mg-card__img" style={{ position: 'absolute', inset: 0, background: img }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,.82) 100%)' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '12px', color: '#fff' }}>
          <h3 style={{ margin: 0, fontSize: '.92rem', fontWeight: 700, textShadow: '0 1px 6px rgba(0,0,0,.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</h3>
          {priceLabel && <span style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>{priceLabel}</span>}
          <div className="mg-reveal" style={{ marginTop: 8 }}>
            <button disabled={disabled} style={{ background: ctaBg, color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 700, fontSize: '.78rem', width: '100%', cursor: disabled ? 'not-allowed' : 'pointer' }}>{cta}</button>
          </div>
        </div>
      </div>
    );
  }

  if (cardStyle === 'minimal') {
    return (
      <div className="mg-card" style={{ ...delay, ...clickable, position: 'relative' }} onClick={onCardClick}>
        <Badge />
        <div style={{ overflow: 'hidden', borderRadius: '4px' }}>
          <div className="mg-card__img" style={{ width: '100%', aspectRatio: '1', background: img }} />
        </div>
        <div style={{ paddingTop: 10 }}>
          <h3 style={{ margin: 0, fontSize: '.82rem', fontWeight: 500, color: c.title, letterSpacing: '.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</h3>
          {priceLabel && <span style={{ fontSize: '.86rem', color: c.muted }}>{priceLabel}</span>}
          <div className="mg-reveal" style={{ marginTop: 6 }}>
            <button disabled={disabled} style={{ background: 'transparent', color: accent, border: `1px solid ${accent}`, padding: '6px', borderRadius: '4px', fontWeight: 700, fontSize: '.72rem', width: '100%', cursor: disabled ? 'not-allowed' : 'pointer' }}>{cta}</button>
          </div>
        </div>
      </div>
    );
  }

  if (cardStyle === 'frame') {
    return (
      <div className="mg-card mg-hover-press" style={{ ...delay, ...clickable, position: 'relative', background: cardBg, border: `2px solid ${c.title}`, boxShadow: `5px 5px 0 ${accent}`, display: 'flex', flexDirection: 'column' }} onClick={onCardClick}>
        <Badge />
        <div style={{ overflow: 'hidden' }}>
          <div className="mg-card__img" style={{ width: '100%', aspectRatio: '1', background: img }} />
        </div>
        <div style={{ padding: '10px', borderTop: `2px solid ${c.title}` }}>
          <h3 style={{ margin: 0, fontSize: '.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.02em', color: c.title, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</h3>
          {priceLabel && <span style={{ fontWeight: 800, color: accent, fontSize: '.95rem' }}>{priceLabel}</span>}
          <button disabled={disabled} style={{ marginTop: 8, background: c.title, color: cardBg, border: 'none', padding: '8px', fontWeight: 800, fontSize: '.74rem', textTransform: 'uppercase', width: '100%', cursor: disabled ? 'not-allowed' : 'pointer' }}>{cta}</button>
        </div>
      </div>
    );
  }

  if (cardStyle === 'split') {
    return (
      <div className="mg-card mg-hover-lift" style={{ ...delay, ...clickable, position: 'relative', background: cardBg, border: `1px solid ${c.border}`, borderRadius: '10px', overflow: 'hidden', display: 'flex', gap: 0 }} onClick={onCardClick}>
        <Badge />
        <div style={{ width: '42%', flexShrink: 0, overflow: 'hidden' }}>
          <div className="mg-card__img" style={{ width: '100%', height: '100%', minHeight: 120, background: img }} />
        </div>
        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: '.88rem', fontWeight: 600, color: c.title, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</h3>
          {priceLabel && <span style={{ fontWeight: 700, color: accent, fontSize: '.98rem' }}>{priceLabel}</span>}
          <button disabled={disabled} style={{ background: ctaBg, color: '#fff', border: 'none', padding: '7px', borderRadius: '6px', fontWeight: 700, fontSize: '.75rem', cursor: disabled ? 'not-allowed' : 'pointer' }}>{cta}</button>
        </div>
      </div>
    );
  }

  // classic
  return (
    <div className="mg-card mg-hover-lift" style={{ ...delay, ...clickable, position: 'relative', backgroundColor: cardBg, border: `1px solid ${c.border}`, borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={onCardClick}>
      <Badge />
      <div style={{ overflow: 'hidden' }}>
        <div className="mg-card__img" style={{ width: '100%', aspectRatio: '4 / 5', background: img }} />
      </div>
      <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: c.title, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</h3>
        {priceLabel && <span style={{ fontWeight: 700, color: accent, fontSize: '1rem' }}>{priceLabel}</span>}
        <button disabled={disabled} style={{ marginTop: '2px', backgroundColor: ctaBg, color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.82rem', width: '100%' }}>{cta}</button>
      </div>
    </div>
  );
}

const ProductGridComponent = ({ columns, showPrices, cardBg, gap, cardStyle, animation, accent: accentProp }: any) => {
  const storeCtx = React.useContext(StoreContext);
  const hasLiveProducts = storeCtx && storeCtx.products.length > 0;
  // Accent comes from the theme so the CTA matches the palette rather than
  // every theme sharing one orange.
  const accent = accentProp || '#FF7518';
  const bg = cardBg || '#ffffff';
  const style = cardStyle || 'classic';
  const anim = animation || 'rise';

  // A 'split' card is horizontal, so it needs a wider track than a portrait one.
  const minTrack = style === 'split' ? '280px' : style === 'minimal' ? '150px' : '170px';

  return (
    <div className={`mg-anim-${anim}`} style={{ padding: '1.5rem 0', width: '100%' }}>
      <ThemeStyles />
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${minTrack}, 1fr))`, gap: gap || '16px' }}>
        {hasLiveProducts
          ? storeCtx.products.map((p: any, i: number) => (
              <ProductCardMini
                key={p.id}
                index={i}
                cardStyle={style}
                title={p.title}
                priceLabel={showPrices ? `${currencySymbol(p.currency)}${Number(p.price).toLocaleString('en-IN')}` : ''}
                imageUrl={p.processed_image_url || p.original_image_url}
                cardBg={bg}
                accent={accent}
                isPrebook={p.fulfillment_type === 'prebook'}
                onClick={() => storeCtx.onAddToCart(p)}
              />
            ))
          : [1, 2, 3, 4, 5].map((i) => (
              <ProductCardMini key={i} index={i} cardStyle={style} title={`Sample Product ${i}`} priceLabel={showPrices ? '₹999' : ''} imageUrl="" cardBg={bg} accent={accent} disabled />
            ))}
      </div>
      {!hasLiveProducts && (
        <p style={{ textAlign: 'center', color: '#9CA3AF', margin: '1.5rem 0 0', fontStyle: 'italic', fontSize: '0.85rem' }}>
          Your live products will automatically fill this grid.
        </p>
      )}
    </div>
  );
};

export type Props = {
  // Layouts
  Section: { bgColor: string; bgImage?: string; paddingTop: string; paddingBottom: string; alignItems: "flex-start" | "center" | "flex-end" | "stretch" };
  Columns: { distribution: "1fr 1fr" | "1fr 1fr 1fr" | "1fr 1fr 1fr 1fr" | "1fr 2fr" | "2fr 1fr"; gap: string };
  
  // Content
  Heading: { text: string; size: string; color: string; align: "left" | "center" | "right" };
  Text: { text: string; color: string; align: "left" | "center" | "right" };
  Button: { text: string; url: string; variant: "primary" | "secondary" | "outline"; align: "left" | "center" | "right" };
  Image: { url: string; alt: string; objectFit: "cover" | "contain"; height: string; borderRadius: string };
  Spacer: { height: string };
  Divider: { color: string; margin: string };
  
  // Advanced
  FeatureGrid: { features: { title: string; description: string; icon: string }[] };
  Testimonials: { testimonials: { name: string; review: string; rating: number }[] };
  
  // E-commerce
  StoreHeader: { title: string; subtitle: string; logoUrl?: string; bgImage?: string; bgColor: string; textColor: string };
  ProductGrid: {
    columns: number; showPrices: boolean; cardBg: string; gap: string;
    accent: string;
    cardStyle: "classic" | "overlay" | "minimal" | "frame" | "split" | "glass" | "gradient";
    animation: "rise" | "fade" | "zoom" | "slide" | "none";
  };
  Banner: { imageUrl: string; text: string; linkUrl: string; textColor: string; height: string };
};

export const config: Config<Props> = {
  components: {
    // ---------------------------------------------------------
    // LAYOUT BLOCKS
    // ---------------------------------------------------------
    Section: {
      fields: {
        bgColor: { type: "text" },
        bgImage: { type: "text" },
        paddingTop: { type: "text" },
        paddingBottom: { type: "text" },
        alignItems: {
          type: "radio",
          options: [
            { label: "Top", value: "flex-start" },
            { label: "Center", value: "center" },
            { label: "Bottom", value: "flex-end" },
            { label: "Stretch", value: "stretch" },
          ],
        },
      },
      defaultProps: {
        bgColor: "transparent",
        paddingTop: "64px",
        paddingBottom: "64px",
        alignItems: "center",
      },
      render: ({ bgColor, bgImage, paddingTop, paddingBottom, alignItems }) => {
        return (
          <div style={{
            backgroundColor: bgColor,
            backgroundImage: bgImage ? `url(${bgImage})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            paddingTop,
            paddingBottom,
            width: "100%",
          }}>
            <div style={{
              maxWidth: "1200px",
              margin: "0 auto",
              display: "flex",
              flexDirection: "column",
              alignItems,
              width: "100%",
              padding: "0 24px"
            }}>
              <DropZone zone="content" />
            </div>
          </div>
        );
      },
    },
    Columns: {
      fields: {
        distribution: {
          type: "select",
          options: [
            { label: "2 Columns (Equal)", value: "1fr 1fr" },
            { label: "3 Columns (Equal)", value: "1fr 1fr 1fr" },
            { label: "4 Columns (Equal)", value: "1fr 1fr 1fr 1fr" },
            { label: "Left Heavy (2:1)", value: "2fr 1fr" },
            { label: "Right Heavy (1:2)", value: "1fr 2fr" },
          ]
        },
        gap: { type: "text" },
      },
      defaultProps: {
        distribution: "1fr 1fr",
        gap: "24px",
      },
      render: ({ distribution, gap }) => {
        const cols = distribution.split(" ").length;
        return (
          <div style={{
            display: "grid",
            gridTemplateColumns: distribution,
            gap: gap,
            width: "100%",
          }}>
            {Array.from({ length: cols }).map((_, i) => (
              <div key={i} style={{ width: "100%" }}>
                <DropZone zone={`col-${i}`} />
              </div>
            ))}
          </div>
        );
      },
    },
    
    // ---------------------------------------------------------
    // CONTENT BLOCKS
    // ---------------------------------------------------------
    Heading: {
      fields: {
        text: { type: "text" },
        size: { type: "text" },
        color: { type: "text" },
        align: {
          type: "radio",
          options: [{ label: "Left", value: "left" }, { label: "Center", value: "center" }, { label: "Right", value: "right" }]
        }
      },
      defaultProps: {
        text: "Heading Title",
        size: "32px",
        color: "#1A1A2E",
        align: "left",
      },
      render: ({ text, size, color, align }) => (
        <h2 style={{ margin: "0 0 16px 0", fontSize: size, color, textAlign: align, fontWeight: "bold" }}>
          {text}
        </h2>
      ),
    },
    Text: {
      fields: {
        text: { type: "textarea" },
        color: { type: "text" },
        align: {
          type: "radio",
          options: [{ label: "Left", value: "left" }, { label: "Center", value: "center" }, { label: "Right", value: "right" }]
        }
      },
      defaultProps: {
        text: "Enter your text here...",
        color: "#4B5563",
        align: "left",
      },
      render: ({ text, color, align }) => (
        <p style={{ margin: "0 0 16px 0", fontSize: "16px", lineHeight: "1.6", color, textAlign: align, whiteSpace: "pre-wrap" }}>
          {text}
        </p>
      ),
    },
    Button: {
      fields: {
        text: { type: "text" },
        url: { type: "text" },
        variant: {
          type: "radio",
          options: [
            { label: "Primary", value: "primary" },
            { label: "Secondary", value: "secondary" },
            { label: "Outline", value: "outline" }
          ]
        },
        align: {
          type: "radio",
          options: [{ label: "Left", value: "left" }, { label: "Center", value: "center" }, { label: "Right", value: "right" }]
        }
      },
      defaultProps: {
        text: "Click Me",
        url: "#",
        variant: "primary",
        align: "left",
      },
      render: ({ text, url, variant, align }) => {
        let bg = "#E07A5F";
        let color = "#FFF";
        let border = "none";
        
        if (variant === "secondary") {
          bg = "#1A1A2E";
        } else if (variant === "outline") {
          bg = "transparent";
          color = "#1A1A2E";
          border = "2px solid #1A1A2E";
        }
        
        return (
          <div style={{ textAlign: align, marginBottom: "16px" }}>
            <a href={url} style={{
              display: "inline-block",
              padding: "12px 24px",
              backgroundColor: bg,
              color,
              border,
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: "bold",
              transition: "opacity 0.2s"
            }}>
              {text}
            </a>
          </div>
        );
      }
    },
    Image: {
      fields: {
        url: { type: "text" },
        alt: { type: "text" },
        height: { type: "text" },
        borderRadius: { type: "text" },
        objectFit: {
          type: "radio",
          options: [{ label: "Cover", value: "cover" }, { label: "Contain", value: "contain" }]
        }
      },
      defaultProps: {
        url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80",
        alt: "Image",
        height: "auto",
        borderRadius: "8px",
        objectFit: "cover"
      },
      render: ({ url, alt, height, borderRadius, objectFit }) => (
        <div style={{ marginBottom: "16px", width: "100%" }}>
          <img src={url} alt={alt} style={{ width: "100%", height, borderRadius, objectFit, display: "block" }} />
        </div>
      )
    },
    Spacer: {
      fields: {
        height: { type: "text" }
      },
      defaultProps: { height: "32px" },
      render: ({ height }) => <div style={{ height, width: "100%" }} />
    },
    Divider: {
      fields: {
        color: { type: "text" },
        margin: { type: "text" }
      },
      defaultProps: { color: "#E5E7EB", margin: "32px 0" },
      render: ({ color, margin }) => <hr style={{ border: "none", borderTop: `1px solid ${color}`, margin, width: "100%" }} />
    },

    // ---------------------------------------------------------
    // ADVANCED SECTIONS
    // ---------------------------------------------------------
    FeatureGrid: {
      fields: {
        features: {
          type: "array",
          arrayFields: {
            title: { type: "text" },
            description: { type: "text" },
            icon: { type: "text" },
          },
          getItemSummary: (item) => item.title || "Feature",
        }
      },
      defaultProps: {
        features: [
          { title: "Free Shipping", description: "On orders over ₹500", icon: "🚚" },
          { title: "24/7 Support", description: "Contact us anytime", icon: "💬" },
          { title: "Secure Payments", description: "100% safe transactions", icon: "🔒" },
        ]
      },
      render: ({ features }) => (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "24px", width: "100%", padding: "24px 0" }}>
          {features.map((f, i) => (
            <div key={i} style={{ textAlign: "center", padding: "24px", backgroundColor: "#f9fafb", borderRadius: "12px" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>{f.icon}</div>
              <h3 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "8px", color: "#1A1A2E" }}>{f.title}</h3>
              <p style={{ color: "#6B7280", margin: 0 }}>{f.description}</p>
            </div>
          ))}
        </div>
      )
    },
    Testimonials: {
      fields: {
        testimonials: {
          type: "array",
          arrayFields: {
            name: { type: "text" },
            review: { type: "textarea" },
            rating: { type: "number" },
          },
          getItemSummary: (item) => item.name || "Review",
        }
      },
      defaultProps: {
        testimonials: [
          { name: "Rahul S.", review: "Amazing quality products. Very fast delivery through WhatsApp!", rating: 5 },
          { name: "Priya M.", review: "Love the collection. Customer service is top notch.", rating: 5 },
        ]
      },
      render: ({ testimonials }) => (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px", width: "100%", padding: "24px 0" }}>
          {testimonials.map((t, i) => (
            <div key={i} style={{ padding: "24px", backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #E5E7EB", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" }}>
              <div style={{ color: "#FBBF24", marginBottom: "12px", fontSize: "20px" }}>
                {"★".repeat(Math.min(5, Math.max(1, t.rating)))}{"☆".repeat(5 - Math.min(5, Math.max(1, t.rating)))}
              </div>
              <p style={{ color: "#374151", fontSize: "16px", fontStyle: "italic", marginBottom: "16px" }}>"{t.review}"</p>
              <p style={{ fontWeight: "bold", color: "#111827", margin: 0 }}>- {t.name}</p>
            </div>
          ))}
        </div>
      )
    },

    // ---------------------------------------------------------
    // E-COMMERCE BLOCKS
    // ---------------------------------------------------------
    StoreHeader: {
      fields: {
        title: { type: "text" },
        subtitle: { type: "text" },
        logoUrl: { type: "text" },
        bgImage: { type: "text" },
        bgColor: { type: "text" },
        textColor: { type: "text" },
      },
      defaultProps: {
        title: "My Store",
        subtitle: "Welcome to my awesome store",
        bgColor: "#ffffff",
        textColor: "#1A1A2E",
      },
      render: (props) => <StoreHeaderComponent {...props} />,
    },
    ProductGrid: {
      fields: {
        columns: {
          type: "radio",
          options: [
            { label: "2", value: 2 },
            { label: "3", value: 3 },
            { label: "4", value: 4 },
          ],
        },
        gap: { type: "text" },
        cardBg: { type: "text" },
        accent: { type: "text" },
        cardStyle: {
          type: "select",
          options: [
            { label: "Classic", value: "classic" },
            { label: "Overlay", value: "overlay" },
            { label: "Minimal", value: "minimal" },
            { label: "Frame", value: "frame" },
            { label: "Split", value: "split" },
            { label: "Glass", value: "glass" },
            { label: "Gradient", value: "gradient" },
          ],
        },
        animation: {
          type: "select",
          options: [
            { label: "Rise", value: "rise" },
            { label: "Fade", value: "fade" },
            { label: "Zoom", value: "zoom" },
            { label: "Slide", value: "slide" },
            { label: "None", value: "none" },
          ],
        },
        showPrices: { type: "radio", options: [{ label: "Yes", value: true }, { label: "No", value: false }] },
      },
      defaultProps: {
        columns: 3,
        gap: "24px",
        cardBg: "#ffffff",
        accent: "#FF7518",
        cardStyle: "classic",
        animation: "rise",
        showPrices: true,
      },
      render: (props) => <ProductGridComponent {...props} />,
    },
    Banner: {
      fields: {
        imageUrl: { type: "text" },
        text: { type: "text" },
        linkUrl: { type: "text" },
        textColor: { type: "text" },
        height: { type: "text" },
      },
      defaultProps: {
        imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80",
        text: "Summer Sale! 50% Off Everything",
        linkUrl: "#",
        textColor: "#ffffff",
        height: "400px",
      },
      render: ({ imageUrl, text, linkUrl, textColor, height }) => (
        <a href={linkUrl} style={{ display: 'block', textDecoration: 'none', width: "100%" }}>
          <div style={{
            position: 'relative',
            width: '100%',
            height: height,
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: "12px",
            overflow: "hidden"
          }}>
            <div style={{
              position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)'
            }} />
            <h2 style={{
              position: 'relative',
              color: textColor,
              fontSize: '3rem',
              fontWeight: 'bold',
              textAlign: 'center',
              textShadow: '0 4px 6px rgba(0,0,0,0.5)',
              margin: 0,
              padding: '0 2rem'
            }}>
              {text}
            </h2>
          </div>
        </a>
      ),
    }
  },
};
