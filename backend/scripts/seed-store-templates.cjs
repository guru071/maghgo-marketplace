/**
 * "Store ·" template collection — everyday e-commerce styles, distinct from the
 * dark Luxe line: practical, light, shop-first layouts. Five are 'basic' so
 * every plan gets real templates; three are 'starter'. Upserts by name.
 * Run from backend/:  node scripts/seed-store-templates.cjs
 */
const { supabase } = require('../dist/db/supabase');

const hero = (id) => `https://images.unsplash.com/${id}?w=1600&q=80&auto=format&fit=crop`;

const T = [
  { name: 'Store · Bazaar Classic', plan: 'basic', bg: '#FBF7F0', text: '#2B2118', accent: '#C4622D', cardBg: '#FFFFFF', style: 'classic', anim: 'rise', cols: 3,
    tag: 'Everything you love, under one roof', hero: 'photo-1555529669-e69e7aa0ba9a', featTop: true, effect: null,
    feats: [['🚚','Same-day dispatch','Orders before 4pm ship today'],['🤝','Trusted local shop','Serving our community'],['💬','Order in chat','WhatsApp us anytime']] },
  { name: 'Store · Fresh Market', plan: 'basic', bg: '#F4FBF4', text: '#173B1E', accent: '#2E9E44', cardBg: '#FFFFFF', style: 'minimal', anim: 'fade', cols: 4,
    tag: 'Farm-fresh, every single day', hero: 'photo-1542838132-92c53300491e', featTop: false, effect: null,
    feats: [['🥬','Fresh daily','Stocked every morning'],['⚖️','Fair prices','No hidden margins'],['🛵','Quick delivery','Right to your door']] },
  { name: 'Store · Tech Hub', plan: 'basic', bg: '#F5F8FD', text: '#101828', accent: '#2563EB', cardBg: '#FFFFFF', style: 'split', anim: 'slide', cols: 3,
    tag: 'Genuine gadgets. Real warranty.', hero: 'photo-1498049794561-7780e7231661', featTop: true, effect: null,
    feats: [['✅','100% genuine','Sealed & warrantied'],['💳','Pay online','UPI, cards, netbanking'],['🔧','After-sales help','We stand by what we sell']] },
  { name: 'Store · Street Bold', plan: 'basic', bg: '#111111', text: '#FAFAFA', accent: '#FFD400', cardBg: '#1B1B1B', style: 'overlay', anim: 'zoom', cols: 3,
    tag: 'Loud looks. Limited drops.', hero: 'photo-1523398002811-999ca8dec234', featTop: false, effect: 'orbs',
    feats: [['🔥','Fresh drops','New stock every week'],['📦','Fast shipping','Across India'],['⭐','Rated by buyers','Real reviews only']] },
  { name: 'Store · Soft Boutique', plan: 'basic', bg: '#FDF6F7', text: '#3D2C33', accent: '#D96C8B', cardBg: '#FFFFFF', style: 'frame', anim: 'rise', cols: 3,
    tag: 'Handpicked, with love', hero: 'photo-1441984904996-e0b6ba687e04', featTop: true, effect: null,
    feats: [['🎀','Curated pieces','Chosen one by one'],['🎁','Gift-ready packing','On request'],['💬','Personal service','Talk to us in chat']] },
  { name: 'Store · Royal Bazaar', plan: 'starter', bg: '#221233', text: '#F5EDFB', accent: '#E8B54D', cardBg: '#2E1A45', style: 'gradient', anim: 'rise', cols: 3,
    tag: 'A richer way to shop', hero: 'photo-1604719312566-8912e9227c6a', featTop: false, effect: 'aurora',
    feats: [['👑','Premium picks','Only the best makes it in'],['🔒','Secure checkout','Pay online safely'],['🚚','Careful delivery','Packed like it matters']] },
  { name: 'Store · Coastal', plan: 'starter', bg: 'linear-gradient(180deg,#EAF6FB 0%,#F8F4EC 100%)', text: '#123A4C', accent: '#0E7FA5', cardBg: '#FFFFFF', style: 'glass', anim: 'fade', cols: 3,
    tag: 'Easy days, easy shopping', hero: 'photo-1507525428034-b723cf961d3e', featTop: true, effect: 'particles',
    feats: [['🌊','Relaxed returns','Talk to us, we sort it'],['📦','Tracked orders','Live status link'],['💳','Pay your way','Online or on delivery']] },
  { name: 'Store · Night Market', plan: 'starter', bg: 'linear-gradient(165deg,#0B0F1A 0%,#141B2E 60%,#090D16 100%)', text: '#E8EDF8', accent: '#22D3EE', cardBg: '#161E32', style: 'glass', anim: 'zoom', cols: 3,
    tag: 'Open late. Always.', hero: 'photo-1514306191717-452ec28c7814', featTop: false, effect: 'orbs',
    feats: [['🌙','Late-night orders','Bot never sleeps'],['⚡','Instant checkout','Pay in two taps'],['🔎','Track anytime','Live order updates']] },
];

function cfg(t) {
  const featGrid = { type: 'FeatureGrid', props: { features: t.feats.map(([icon, title, description]) => ({ icon, title, description })) } };
  const grid = { type: 'ProductGrid', props: { gap: '20px', accent: t.accent, cardBg: t.cardBg, columns: t.cols, animation: t.anim, cardStyle: t.style, showPrices: true } };
  const head = { type: 'StoreHeader', props: { title: '', subtitle: t.tag, bgColor: t.bg.startsWith('linear') ? t.text === '#123A4C' ? '#EAF6FB' : '#0B0F1A' : t.bg, bgImage: hero(t.hero), textColor: t.text } };
  const heading = { type: 'Heading', props: { size: '32px', text: 'Our Products', align: 'center', color: t.text } };
  const divider = { type: 'Divider', props: { color: t.accent, margin: '12px auto 30px' } };
  const sp = (h) => ({ type: 'Spacer', props: { height: h } });

  const content = t.featTop
    ? [head, sp('34px'), featGrid, sp('34px'), heading, divider, grid, sp('40px')]
    : [head, sp('40px'), heading, divider, grid, sp('44px'), featGrid, sp('30px')];

  return {
    root: { props: { title: t.name, background: t.bg, text: t.text, ...(t.effect ? { bgEffect: t.effect } : {}) } },
    zones: {},
    content,
  };
}

(async () => {
  let inserted = 0, updated = 0;
  for (const t of T) {
    const config = cfg(t);
    const { data: found } = await supabase.from('themes').select('id').eq('name', t.name).maybeSingle();
    if (found) {
      const { error } = await supabase.from('themes').update({ config, plan_required: t.plan, is_active: true, description: t.tag }).eq('id', found.id);
      if (error) console.error('update failed:', t.name, error.message); else updated++;
    } else {
      const { error } = await supabase.from('themes').insert({ name: t.name, description: t.tag, plan_required: t.plan, config, is_active: true });
      if (error) console.error('insert failed:', t.name, error.message); else inserted++;
    }
  }
  const { data: all } = await supabase.from('themes').select('id').eq('is_active', true);
  console.log(`✅ Store templates: +${inserted} inserted, ${updated} updated. Active themes now: ${all?.length}`);
  process.exit(0);
})();
