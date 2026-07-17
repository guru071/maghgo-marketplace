/**
 * Generate rich, layout-based premium themes — not colour swaps.
 *
 * The 100 "Vol." themes are {colors, fonts, layout} only: same single header +
 * grid, different hex. These are full Puck layouts (content[] of real blocks —
 * hero, banner, feature grid, testimonials, dividers) so each theme is a
 * genuinely different-looking storefront, then dressed in a designed palette
 * with its own fonts and imagery.
 *
 * Stored in the Puck `content[]` shape the storefront already understands
 * (store-client.tsx: `if (dbTheme.content) return dbTheme`).
 *
 * Product cards, prices and add-to-cart come from live data at render time via
 * ProductGrid — the layout only decides how the store is composed.
 *
 * Usage:
 *   node scripts/generate-rich-themes.js           # summary + contrast report
 *   node scripts/generate-rich-themes.js --apply   # upsert into the themes table
 */

// ── contrast helpers (a header is worthless if its text is unreadable) ────────
const toRgb = (h) => ({ r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) });
function luminance(h) {
  const { r, g, b } = toRgb(h);
  return [r, g, b].map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); })
    .reduce((a, c, i) => a + c * [0.2126, 0.7152, 0.0722][i], 0);
}
const contrast = (a, b) => { const la = luminance(a), lb = luminance(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };

// ── premium palettes (each a real identity: colour + type + imagery) ──────────
// `dark` = light text belongs on the header/banner; `light` = dark text.
// cardStyle + animation are part of the palette's identity: a brutalist theme
// gets hard framed cards that press on hover, a lookbook gets image-overlay
// cards that rise in, a gallery gets chrome-less minimal cards that fade.
const PALETTES = [
  { key: 'Noir Gold',   plan: 'business',   bg: '#0D0D0D', surface: '#161616', text: '#F5F0E6', accent: '#C6A03A', heading: "'Playfair Display', Georgia, serif", body: "'Georgia', serif", radius: '0px', dark: true,  hero: 'photo-1515886657613-9f3515b0c78f', cardStyle: 'overlay', animation: 'rise' },
  { key: 'Ivory Atelier', plan: 'agency',   bg: '#FAF8F4', surface: '#FFFFFF', text: '#2C2416', accent: '#B08D57', heading: "'Playfair Display', Georgia, serif", body: "'Georgia', serif", radius: '2px', dark: false, hero: 'photo-1483985988355-763728e1935b', cardStyle: 'minimal', animation: 'fade' },
  { key: 'Neon Arcade', plan: 'agency',     bg: '#0A0A0F', surface: '#12121A', text: '#E8FBFF', accent: '#12E6E6', heading: "'Courier New', monospace",           body: "'Courier New', monospace", radius: '2px', dark: true, hero: 'photo-1550745165-9bc0b252726f', cardStyle: 'frame', animation: 'zoom' },
  { key: 'Rose Couture', plan: 'business',  bg: '#FFF5F7', surface: '#FFFFFF', text: '#3A1220', accent: '#C2185B', heading: "'Playfair Display', serif",          body: "'Inter', sans-serif", radius: '16px', dark: false, hero: 'photo-1490481651871-ab68de25d43d', cardStyle: 'overlay', animation: 'zoom' },
  { key: 'Emerald Estate', plan: 'agency',  bg: '#0B1F17', surface: '#12241B', text: '#EAF5EF', accent: '#3FB984', heading: "'Playfair Display', serif",          body: "'Inter', sans-serif", radius: '8px', dark: true, hero: 'photo-1441984904996-e0b6ba687e04', cardStyle: 'classic', animation: 'rise' },
  { key: 'Sapphire Suite', plan: 'business', bg: '#0A1428', surface: '#111E3A', text: '#EAF0FF', accent: '#4C82F7', heading: "'Inter', sans-serif",              body: "'Inter', sans-serif", radius: '10px', dark: true, hero: 'photo-1523275335684-37898b6baf30', cardStyle: 'split', animation: 'slide' },
  { key: 'Sunset Bazaar', plan: 'starter',  bg: '#FFF8F0', surface: '#FFFFFF', text: '#3B2410', accent: '#E8590C', heading: "'Poppins', sans-serif",             body: "'Inter', sans-serif", radius: '20px', dark: false, hero: 'photo-1441986300917-64674bd600d8', cardStyle: 'classic', animation: 'zoom' },
  { key: 'Mono Brutal', plan: 'pro',        bg: '#FFFFFF', surface: '#F4F4F4', text: '#000000', accent: '#FF3B30', heading: "'Arial Black', Helvetica, sans-serif", body: "'Helvetica', sans-serif", radius: '0px', dark: false, hero: 'photo-1441984904996-e0b6ba687e04', cardStyle: 'frame', animation: 'slide' },
  { key: 'Vintage Press', plan: 'business', bg: '#F4ECD8', surface: '#FBF6E9', text: '#3B2F2F', accent: '#8C4A2F', heading: "'Georgia', serif",                  body: "'Georgia', serif", radius: '4px', dark: false, hero: 'photo-1472851294608-062f824d29cc', cardStyle: 'split', animation: 'fade' },
  { key: 'Slate Minimal', plan: 'starter',  bg: '#FFFFFF', surface: '#F8FAFC', text: '#0F172A', accent: '#334155', heading: "'Inter', sans-serif",               body: "'Inter', sans-serif", radius: '6px', dark: false, hero: 'photo-1441984904996-e0b6ba687e04', cardStyle: 'minimal', animation: 'rise' },
];

const img = (id, w = 1400) => `https://images.unsplash.com/${id}?w=${w}&q=80&auto=format&fit=crop`;

// ── layout archetypes — each a genuinely different store composition ──────────
// A function of the palette so colours/fonts/imagery flow through every block.
const ARCHETYPES = {
  Boutique: (p) => [
    header(p, { big: true, image: true }),
    spacer('40px'),
    heading(p, 'New Arrivals', '34px', 'center'),
    divider(p, '12px auto 32px', '60px'),
    grid(p, 3),
    spacer('48px'),
    testimonials(p),
  ],
  Editorial: (p) => [
    header(p, { big: false }),
    banner(p, 'The Season Edit'),
    spacer('32px'),
    heading(p, 'Curated for you', '30px', 'left'),
    text(p, 'A considered selection, refreshed every week.', 'left'),
    grid(p, 4),
    divider(p, '48px 0'),
    features(p),
  ],
  Lookbook: (p) => [
    header(p, { big: true, image: true }),
    spacer('24px'),
    banner(p, 'Lookbook — Vol. 01'),
    spacer('40px'),
    heading(p, 'The Collection', '36px', 'center'),
    grid(p, 2),
    spacer('56px'),
    testimonials(p),
  ],
  Grand: (p) => [
    header(p, { big: true, image: true }),
    spacer('48px'),
    heading(p, 'Signature Pieces', '38px', 'center'),
    text(p, 'Crafted to be kept.', 'center'),
    divider(p, '24px auto 40px', '80px'),
    grid(p, 3),
    divider(p, '56px 0'),
    features(p),
    spacer('32px'),
    testimonials(p),
  ],
  GridFocus: (p) => [
    header(p, { big: false }),
    spacer('24px'),
    heading(p, 'Shop Everything', '28px', 'left'),
    grid(p, 4),
    divider(p, '40px 0'),
    features(p),
  ],
  Minimal: (p) => [
    header(p, { big: true }),
    spacer('56px'),
    grid(p, 3),
    spacer('56px'),
    features(p),
  ],
};

// ── block builders ────────────────────────────────────────────────────────────
function header(p, { big, image } = {}) {
  return { type: 'StoreHeader', props: {
    title: '', subtitle: '', // empty -> falls back to the real shop name/description at render
    bgColor: p.dark ? p.bg : p.surface,
    textColor: p.dark ? p.text : p.text,
    bgImage: image ? img(p.hero) : '',
  } };
}
function banner(p, text) {
  return { type: 'Banner', props: {
    imageUrl: img(p.hero, 1600),
    text, linkUrl: '#',
    textColor: '#ffffff',
    height: '320px',
  } };
}
const heading = (p, text, size, align) => ({ type: 'Heading', props: { text, size, color: p.text, align } });
const text = (p, t, align) => ({ type: 'Text', props: { text: t, color: p.dark ? p.text : '#555', align } });
const spacer = (height) => ({ type: 'Spacer', props: { height } });
const divider = (p, margin, _w) => ({ type: 'Divider', props: { color: p.accent, margin } });

// The grid carries the theme's card design, entrance animation and accent — so
// a theme changes how the store is built and how it moves, not just its colours.
const grid = (p, columns) => ({
  type: 'ProductGrid',
  props: {
    columns,
    gap: columns >= 4 ? '16px' : '24px',
    cardBg: p.surface,
    accent: p.accent,
    cardStyle: p.cardStyle || 'classic',
    animation: p.animation || 'rise',
    showPrices: true,
  },
});
function features(p) {
  return { type: 'FeatureGrid', props: { features: [
    { title: 'Fast Delivery', description: 'Ships within 24 hours', icon: '🚚' },
    { title: 'Secure Checkout', description: 'Order safely over chat', icon: '🔒' },
    { title: 'Quality First', description: 'Handpicked, every time', icon: '✨' },
  ] } };
}
function testimonials(p) {
  return { type: 'Testimonials', props: { testimonials: [
    { name: 'Ananya R.', review: 'Beautiful pieces and quick delivery. Exactly as pictured.', rating: 5 },
    { name: 'Karan M.', review: 'Ordering over WhatsApp was effortless. Will buy again.', rating: 5 },
  ] } };
}

// ── assemble ──────────────────────────────────────────────────────────────────
function buildThemes() {
  const themes = [];
  for (const p of PALETTES) {
    for (const [archName, build] of Object.entries(ARCHETYPES)) {
      themes.push({
        name: `${p.key} · ${archName}`,
        description: `${archName} layout · ${p.cardStyle} cards · ${p.animation} animation — the ${p.key} palette with its own type and imagery.`,
        plan_required: p.plan,
        // root carries the page canvas, so a dark palette darkens the whole page
        // rather than painting light text onto the default light background.
        config: { content: build(p), root: { props: { title: p.key, background: p.bg, text: p.text } }, zones: {} },
      });
    }
  }
  return themes;
}

function report(themes) {
  let fails = 0, worst = Infinity;
  for (const t of themes) {
    const hdr = t.config.content.find((b) => b.type === 'StoreHeader');
    const bg = hdr.props.bgImage ? '#000000' : hdr.props.bgColor; // image headers use white text over a dark overlay
    const c = contrast(hdr.props.textColor, bg);
    worst = Math.min(worst, c);
    if (c < 4.5 && !hdr.props.bgImage) { fails++; console.log(`  LOW CONTRAST ${t.name}: ${c.toFixed(2)}:1`); }
  }
  console.log(`themes generated : ${themes.length}`);
  console.log(`palettes         : ${PALETTES.length}   archetypes: ${Object.keys(ARCHETYPES).length}`);
  console.log(`worst header contrast (solid bg) : ${worst.toFixed(2)}:1`);
  console.log(`contrast failures: ${fails}`);
  console.log('\nsample layouts (block sequence):');
  for (const arch of Object.keys(ARCHETYPES)) {
    const t = themes.find((x) => x.name.endsWith(arch));
    console.log(`  ${arch.padEnd(10)} ${t.config.content.map((b) => b.type).join(' → ')}`);
  }
}

(async () => {
  const themes = buildThemes();
  report(themes);

  if (process.argv.includes('--apply')) {
    require('dotenv').config();
    const { createClient } = require('@supabase/supabase-js');
    const ws = require('ws');
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }, realtime: { transport: ws },
    });
    let ok = 0, err = 0;
    for (const t of themes) {
      const { data: existing } = await sb.from('themes').select('id').eq('name', t.name).maybeSingle();
      const { error } = existing
        ? await sb.from('themes').update(t).eq('id', existing.id)
        : await sb.from('themes').insert(t);
      error ? (err++, console.log('  ERR', t.name, error.message)) : ok++;
    }
    console.log(`\napplied to live DB: ${ok} ok, ${err} errors`);
  }
})();
