/**
 * Luxe collection seeder + de-duplication.
 *
 * The generated catalogue had 16 palettes × 6 layout archetypes = 96 themes
 * that looked like "the same colours multiple times". This script:
 *   1. keeps only the two most distinct archetypes per palette (Boutique +
 *      Minimal) and deactivates the other four — applied stores are unaffected
 *      because applying copies the config onto the merchant;
 *   2. inserts 14 hand-designed LUXE themes, each with its own palette, hero
 *      photo, typography scale, card style and animation — no two share colours.
 *
 * Run from backend/:  node scripts/seed-luxury-themes.cjs
 * Safe to re-run: upserts by name, deactivation is idempotent.
 */
const { supabase } = require('../dist/db/supabase');

// ─── The Luxe collection ─────────────────────────────────────────────────────
// bg/text = page canvas · accent = CTAs/dividers · cardBg = product cards
// hero = default header image (owner can replace it with their own).
const LUXE = [
  { name: 'Luxe · Royal Gold',     plan: 'starter', bg: '#0B0B0D', text: '#F6EFD9', accent: '#D4AF37', cardBg: '#15151A', style: 'overlay',  anim: 'rise',  tagline: 'Timeless pieces, royally made', hero: 'photo-1601121141461-9d6647bca1ed' },
  { name: 'Luxe · Champagne Navy', plan: 'starter', bg: '#0E1A2B', text: '#F3E9DC', accent: '#E8C77F', cardBg: '#152238', style: 'frame',    anim: 'fade',  tagline: 'Quiet luxury, loud quality',   hero: 'photo-1519974719765-e6559eac2575' },
  { name: 'Luxe · Velvet Burgundy',plan: 'starter', bg: '#1C0A10', text: '#F5E3E0', accent: '#C96F63', cardBg: '#2A1218', style: 'glass',    anim: 'zoom',  tagline: 'Rich tones. Richer craft.',    hero: 'photo-1490481651871-ab68de25d43d' },
  { name: 'Luxe · Emerald Marble', plan: 'starter', bg: '#0A1712', text: '#EAF5EE', accent: '#3EB489', cardBg: '#11221A', style: 'gradient', anim: 'rise',  tagline: 'Naturally exceptional',        hero: 'photo-1441986300917-64674bd600d8' },
  { name: 'Luxe · Ivory Silk',     plan: 'starter', bg: '#FAF6EF', text: '#221F1A', accent: '#B08D57', cardBg: '#FFFFFF', style: 'minimal',  anim: 'fade',  tagline: 'Softly spoken elegance',        hero: 'photo-1469334031218-e382a71b716b' },
  { name: 'Luxe · Onyx Rose',      plan: 'starter', bg: '#111014', text: '#F7E9EC', accent: '#E3A6B2', cardBg: '#1B191F', style: 'overlay',  anim: 'slide', tagline: 'Dark mode for your wardrobe',   hero: 'photo-1483985988355-763728e1935b' },
  { name: 'Luxe · Sapphire Night', plan: 'starter', bg: '#0A0F24', text: '#E8ECFB', accent: '#5B8DEF', cardBg: '#121A38', style: 'glass',    anim: 'zoom',  tagline: 'Shop after midnight',           hero: 'photo-1519681393784-d120267933ba' },
  { name: 'Luxe · Pearl Atelier',  plan: 'starter', bg: '#F7F7F5', text: '#1D1D1F', accent: '#8A7968', cardBg: '#FFFFFF', style: 'frame',    anim: 'rise',  tagline: 'The atelier, online',           hero: 'photo-1445205170230-053b83016050' },
  { name: 'Luxe · Mocha Estate',   plan: 'pro',     bg: '#191210', text: '#F1E7DD', accent: '#C08552', cardBg: '#241A16', style: 'split',    anim: 'fade',  tagline: 'Warm. Grounded. Premium.',      hero: 'photo-1524758631624-e2822e304c36' },
  { name: 'Luxe · Jade Dynasty',   plan: 'pro',     bg: '#07120E', text: '#E9F6EF', accent: '#6FCF97', cardBg: '#0E1D16', style: 'overlay',  anim: 'slide', tagline: 'Heritage, handled with care',   hero: 'photo-1464965911861-746a04b4bca6' },
  { name: 'Luxe · Amethyst Salon', plan: 'pro',     bg: '#150D22', text: '#F0E9FA', accent: '#B487E8', cardBg: '#1F1533', style: 'gradient', anim: 'zoom',  tagline: 'For the tastefully bold',       hero: 'photo-1487222477894-8943e31ef7b2' },
  { name: 'Luxe · Scarlet Maison', plan: 'pro',     bg: '#180708', text: '#FBEAE8', accent: '#E4572E', cardBg: '#260E10', style: 'classic',  anim: 'rise',  tagline: 'Statement pieces only',         hero: 'photo-1509631179647-0177331693ae' },
  { name: 'Luxe · Arctic Platinum',plan: 'pro',     bg: '#F2F5F7', text: '#16181D', accent: '#5E7CE2', cardBg: '#FFFFFF', style: 'glass',    anim: 'fade',  tagline: 'Cool, calm, collected',         hero: 'photo-1479064555552-3ef4979f8908' },
  { name: 'Luxe · Desert Bronze',  plan: 'pro',     bg: '#171008', text: '#F6EEDF', accent: '#CD9B4A', cardBg: '#221A10', style: 'split',    anim: 'slide', tagline: 'Sunbaked, hand-finished',       hero: 'photo-1523381210434-271e8be1f52b' },
];

const heroUrl = (id) => `https://images.unsplash.com/${id}?w=1600&q=80&auto=format&fit=crop`;

function luxeConfig(t) {
  const dark = t.bg.startsWith('#0') || t.bg.startsWith('#1') || t.bg.startsWith('#2');
  return {
    root: { props: { title: t.name, background: t.bg, text: t.text } },
    zones: {},
    content: [
      { type: 'StoreHeader', props: { title: '', subtitle: t.tagline, bgColor: t.bg, bgImage: heroUrl(t.hero), textColor: t.text } },
      { type: 'Spacer', props: { height: '44px' } },
      { type: 'Heading', props: { size: '36px', text: 'The Collection', align: 'center', color: t.text } },
      { type: 'Divider', props: { color: t.accent, margin: '14px auto 36px' } },
      { type: 'ProductGrid', props: { gap: '26px', accent: t.accent, cardBg: t.cardBg, columns: 3, animation: t.anim, cardStyle: t.style, showPrices: true } },
      { type: 'Spacer', props: { height: '52px' } },
      { type: 'FeatureGrid', props: { features: [
        { icon: '🚚', title: 'Fast Delivery', description: 'Ships within 24 hours' },
        { icon: '🔒', title: 'Secure Checkout', description: 'Pay online or over chat' },
        { icon: '💎', title: 'Curated Quality', description: 'Handpicked, every time' },
      ] } },
      { type: 'Spacer', props: { height: '30px' } },
      { type: 'Text', props: { text: t.tagline, color: dark ? t.text : '#555', align: 'center' } },
    ],
  };
}

(async () => {
  // 1) Deactivate the repetitive archetypes (keep Boutique + Minimal per palette).
  const KEEP = ['· Boutique', '· Minimal'];
  const { data: existing, error: exErr } = await supabase.from('themes').select('id, name, is_active');
  if (exErr) { console.error('read failed:', exErr.message); process.exit(1); }

  const dupes = existing.filter((t) =>
    t.name.includes(' · ') && !t.name.startsWith('Luxe ·') && !KEEP.some((k) => t.name.endsWith(k.replace('· ', '· ')))
  ).filter((t) => !KEEP.some((k) => t.name.includes(k)));

  let deactivated = 0;
  for (const t of dupes) {
    if (!t.is_active) continue;
    const { error } = await supabase.from('themes').update({ is_active: false }).eq('id', t.id);
    if (!error) deactivated++;
  }

  // 2) Upsert the Luxe collection.
  let inserted = 0, updated = 0;
  for (const t of LUXE) {
    const config = luxeConfig(t);
    const { data: found } = await supabase.from('themes').select('id').eq('name', t.name).maybeSingle();
    if (found) {
      const { error } = await supabase.from('themes').update({ config, plan_required: t.plan, is_active: true, description: t.tagline }).eq('id', found.id);
      if (error) console.error('update failed:', t.name, error.message); else updated++;
    } else {
      const { error } = await supabase.from('themes').insert({ name: t.name, description: t.tagline, plan_required: t.plan, config, is_active: true });
      if (error) console.error('insert failed:', t.name, error.message); else inserted++;
    }
  }

  const { data: after } = await supabase.from('themes').select('id').eq('is_active', true);
  console.log(`✅ Luxe seeding done. Deactivated ${deactivated} duplicate archetypes; inserted ${inserted} + updated ${updated} Luxe themes.`);
  console.log(`Active themes now: ${after?.length}`);
  process.exit(0);
})();
