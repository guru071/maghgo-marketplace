/**
 * Template collection v2 — 12 more distinct storefront designs, each aimed at a
 * real shop type (toys, jewellery, organic, sports, books, bakery, gadgets,
 * ethnic wear, kitchen, pets, fitness, gifts). Structure varies: features
 * above/below the grid, 2–4 columns, all card styles, gradients + effects.
 * Upserts by name. Run from backend/: node scripts/seed-templates-v2.cjs
 */
const { supabase } = require('../dist/db/supabase');
const hero = (id) => `https://images.unsplash.com/${id}?w=1600&q=80&auto=format&fit=crop`;

const T = [
  { name: 'Store · Toy Carnival', plan: 'basic', bg: '#FFF8E7', text: '#3A2410', accent: '#E63946', cardBg: '#FFFFFF', style: 'classic', anim: 'zoom', cols: 3, featTop: true, effect: 'orbs',
    tag: 'Where little smiles begin 🎈', hero: 'photo-1566576912321-d58ddd7a6088',
    feats: [['🧸','Safe & tested','Child-safe materials only'],['🎁','Gift wrapping','Free on request'],['🚚','Careful delivery','Packed with love']] },
  { name: 'Store · Gold & Gem', plan: 'starter', bg: '#FFFDF7', text: '#4A2C2A', accent: '#B8860B', cardBg: '#FFFFFF', style: 'frame', anim: 'fade', cols: 3, featTop: false, effect: 'aurora',
    tag: 'Crafted to be treasured', hero: 'photo-1515562141207-7a88fb7ce338',
    feats: [['💎','Certified purity','Hallmarked & guaranteed'],['🔒','Insured delivery','Fully protected in transit'],['♻️','Exchange friendly','Fair old-gold value']] },
  { name: 'Store · Ayur Organic', plan: 'basic', bg: '#F6F8F2', text: '#2C3A28', accent: '#5C8A3C', cardBg: '#FFFFFF', style: 'minimal', anim: 'rise', cols: 4, featTop: true, effect: 'particles',
    tag: 'Pure. Natural. Honest.', hero: 'photo-1466692476868-aef1dfb1e735',
    feats: [['🌿','100% natural','No chemicals, ever'],['🧪','Lab tested','Purity you can trust'],['🌏','Earth friendly','Sustainable sourcing']] },
  { name: 'Store · Sport Rush', plan: 'basic', bg: '#15181C', text: '#F2F5F7', accent: '#9EF01A', cardBg: '#1E2328', style: 'overlay', anim: 'slide', cols: 3, featTop: false, effect: 'orbs',
    tag: 'Gear up. Go hard.', hero: 'photo-1461896836934-ffe607ba8211',
    feats: [['⚡','Pro-grade gear','Trusted by athletes'],['📦','Fast dispatch','Train without waiting'],['💪','Fit guidance','Ask us anything']] },
  { name: 'Store · Book Nook', plan: 'basic', bg: '#FAF6EE', text: '#26364A', accent: '#8A5A2B', cardBg: '#FFFFFF', style: 'split', anim: 'fade', cols: 3, featTop: true, effect: null,
    tag: 'Stories worth shelving', hero: 'photo-1507842217343-583bb7270b66',
    feats: [['📚','Hand-picked reads','Curated, not dumped'],['🔖','Order any title','We source on request'],['☕','Reader-run','By book people, for book people']] },
  { name: 'Store · Café Crumb', plan: 'basic', bg: '#FBF3EC', text: '#41302A', accent: '#B5654A', cardBg: '#FFFFFF', style: 'classic', anim: 'rise', cols: 3, featTop: false, effect: null,
    tag: 'Baked fresh, gone fast', hero: 'photo-1509440159596-0249088772ff',
    feats: [['🥐','Baked today','Nothing overnight'],['🎂','Custom cakes','Order 24h ahead'],['🛵','Hot delivery','Straight from the oven']] },
  { name: 'Store · Gadget Pop', plan: 'basic', bg: '#F7F5FF', text: '#211A3D', accent: '#7C3AED', cardBg: '#FFFFFF', style: 'gradient', anim: 'zoom', cols: 4, featTop: true, effect: null,
    tag: 'Accessories that pop', hero: 'photo-1512499617640-c74ae3a79d37',
    feats: [['✅','Genuine only','No first-copy items'],['🔁','Easy replacement','DOA? We swap it'],['⚡','Latest arrivals','Stock updates weekly']] },
  { name: 'Store · Ethnic Weave', plan: 'starter', bg: 'linear-gradient(165deg,#3D0C2F 0%,#5C1442 55%,#2E0A24 100%)', text: '#FBEAF3', accent: '#F2B24C', cardBg: '#4A1136', style: 'overlay', anim: 'fade', cols: 3, featTop: false, effect: 'aurora',
    tag: 'Woven with tradition', hero: 'photo-1610030469983-98e550d6193c',
    feats: [['🧵','Authentic weaves','Sourced from weavers'],['🌈','True colours','Photos match reality'],['🎁','Occasion ready','Festive packing free']] },
  { name: 'Store · Kitchen Story', plan: 'basic', bg: '#FDFAF5', text: '#37302B', accent: '#C96A3B', cardBg: '#FFFFFF', style: 'split', anim: 'rise', cols: 3, featTop: true, effect: null,
    tag: 'Tools your kitchen deserves', hero: 'photo-1556911220-bff31c812dba',
    feats: [['🍳','Chef approved','Quality that lasts'],['🧽','Easy care','Practical, cleanable picks'],['📦','Safe packing','No chips, no dents']] },
  { name: 'Store · Paw Shop', plan: 'basic', bg: '#F0FAFA', text: '#1F3D3A', accent: '#12A5A0', cardBg: '#FFFFFF', style: 'classic', anim: 'zoom', cols: 3, featTop: true, effect: 'particles',
    tag: 'Everything your best friend loves', hero: 'photo-1548199973-03cce0bbc87b',
    feats: [['🐾','Vet-checked picks','Safe for every breed'],['🦴','Fresh treats','Small batches, often'],['💬','Pet-parent help','Ask us in chat']] },
  { name: 'Store · Iron Fit', plan: 'starter', bg: 'linear-gradient(170deg,#141114 0%,#241418 60%,#0F0C0F 100%)', text: '#F5EFEF', accent: '#E5383B', cardBg: '#1E181B', style: 'overlay', anim: 'slide', cols: 3, featTop: false, effect: 'orbs',
    tag: 'No shortcuts. Just gains.', hero: 'photo-1534438327276-14e5300c3a48',
    feats: [['🏋️','Tested supplements','Authentic, sealed'],['📈','Goal guidance','Tell us your target'],['🚚','Rapid restock','Never miss a scoop']] },
  { name: 'Store · Gift Aura', plan: 'basic', bg: '#FAF7FC', text: '#3B2E45', accent: '#A855F7', cardBg: '#FFFFFF', style: 'glass', anim: 'fade', cols: 3, featTop: true, effect: 'aurora',
    tag: 'Make moments unforgettable', hero: 'photo-1513885535751-8b9238bd345a',
    feats: [['🎀','Beautifully wrapped','Every single order'],['💌','Personal notes','Added free'],['📅','Date delivery','Arrives on THE day']] },
];

function cfg(t) {
  const featGrid = { type: 'FeatureGrid', props: { features: t.feats.map(([icon, title, description]) => ({ icon, title, description })) } };
  const grid = { type: 'ProductGrid', props: { gap: '20px', accent: t.accent, cardBg: t.cardBg, columns: t.cols, animation: t.anim, cardStyle: t.style, showPrices: true } };
  const headerBg = t.bg.startsWith('linear') ? (t.text.startsWith('#F') ? '#241418' : '#FFFFFF') : t.bg;
  const head = { type: 'StoreHeader', props: { title: '', subtitle: t.tag, bgColor: headerBg, bgImage: hero(t.hero), textColor: t.text } };
  const heading = { type: 'Heading', props: { size: '32px', text: 'Our Products', align: 'center', color: t.text } };
  const divider = { type: 'Divider', props: { color: t.accent, margin: '12px auto 30px' } };
  const sp = (h) => ({ type: 'Spacer', props: { height: h } });
  const content = t.featTop
    ? [head, sp('34px'), featGrid, sp('34px'), heading, divider, grid, sp('40px')]
    : [head, sp('40px'), heading, divider, grid, sp('44px'), featGrid, sp('30px')];
  return { root: { props: { title: t.name, background: t.bg, text: t.text, ...(t.effect ? { bgEffect: t.effect } : {}) } }, zones: {}, content };
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
  console.log(`✅ Templates v2: +${inserted}, ~${updated}. Active themes now: ${all?.length}`);
  process.exit(0);
})();
