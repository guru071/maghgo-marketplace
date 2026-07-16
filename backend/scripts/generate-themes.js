/**
 * Generate the theme catalogue with real, designed palettes.
 *
 * The previous catalogue (database/03_seed_themes.sql) was 100 rows of
 * Math.random() hex: "Luxury" was blue with no gold, "Cyberpunk" was muted
 * mauve with no neon, and every family shared one font and one radius. The
 * names and descriptions described designs that did not exist.
 *
 * Here each family has a hand-picked identity (palette, font, radius) and each
 * variation is a deliberate move within that identity, not a random roll.
 * Every generated palette is checked for WCAG contrast so no theme can ship
 * text that is unreadable against its own background.
 *
 * Usage:
 *   node scripts/generate-themes.js            # print a summary + contrast report
 *   node scripts/generate-themes.js --sql      # write database/03_seed_themes.sql
 *   node scripts/generate-themes.js --apply    # upsert into the live themes table
 */

// ── colour helpers ──────────────────────────────────────────────────────────

const hex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
const toHex = ({ r, g, b }) => `#${hex(r)}${hex(g)}${hex(b)}`;
const toRgb = (h) => ({
  r: parseInt(h.slice(1, 3), 16),
  g: parseInt(h.slice(3, 5), 16),
  b: parseInt(h.slice(5, 7), 16),
});

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(Math.min(k(n) - 3, 9 - k(n)), 1));
  return toHex({ r: f(0) * 255, g: f(8) * 255, b: f(4) * 255 });
}

/** Relative luminance per WCAG 2.1. */
function luminance(h) {
  const { r, g, b } = toRgb(h);
  const c = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** WCAG contrast ratio between two hex colours (1..21). */
function contrast(a, b) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// ── family identities ───────────────────────────────────────────────────────
// hueStart/hueStep walk the accent hue *within* the family's identity, so
// variations stay recognisably part of the same family.

const FAMILIES = [
  {
    name: 'Minimalist', plan: 'basic',
    description: 'Clean, spacious and modern. Lets the product do the talking.',
    background: '#ffffff', text: '#111111',
    heading: "'Inter', sans-serif", body: "'Inter', sans-serif",
    radius: '4px', spacing: '1.25rem',
    hueStart: 210, hueStep: 18, sat: [10, 22], light: [22, 34],
  },
  {
    name: 'Dark Mode', plan: 'basic',
    description: 'Low-glare dark surfaces with a single calm accent.',
    background: '#121212', text: '#ECECEC',
    heading: "'Inter', sans-serif", body: "'Inter', sans-serif",
    radius: '8px', spacing: '1.25rem',
    hueStart: 200, hueStep: 20, sat: [45, 70], light: [55, 68],
  },
  {
    name: 'Corporate', plan: 'basic',
    description: 'Trustworthy navy and blue. Built for B2B and services.',
    background: '#FFFFFF', text: '#0F172A',
    heading: "'Inter', sans-serif", body: "'Inter', sans-serif",
    radius: '6px', spacing: '1.5rem',
    hueStart: 215, hueStep: 6, sat: [55, 80], light: [28, 42],
  },
  {
    name: 'Playful', plan: 'premium',
    description: 'Bright, rounded and friendly. Great for kids and lifestyle.',
    background: '#FFFDF7', text: '#1F2937',
    heading: "'Poppins', 'Inter', sans-serif", body: "'Inter', sans-serif",
    radius: '20px', spacing: '1.5rem',
    hueStart: 340, hueStep: 30, sat: [78, 92], light: [52, 62],
  },
  {
    name: 'Brutalist', plan: 'premium',
    description: 'Stark black and white with one loud, deliberate accent.',
    background: '#FFFFFF', text: '#000000',
    heading: "'Arial Black', 'Helvetica', sans-serif", body: "'Helvetica', Arial, sans-serif",
    radius: '0px', spacing: '1rem',
    hueStart: 0, hueStep: 36, sat: [88, 100], light: [42, 50],
  },
  {
    name: 'Elegant', plan: 'agency',
    description: 'Refined serif type on warm paper. Understated and premium.',
    background: '#FAF8F5', text: '#2C2416',
    heading: "'Georgia', 'Times New Roman', serif", body: "'Georgia', serif",
    radius: '2px', spacing: '2rem',
    hueStart: 30, hueStep: 8, sat: [22, 38], light: [32, 44],
  },
  {
    name: 'Nature', plan: 'agency',
    description: 'Earthy greens and organic tones for wellness and produce.',
    background: '#F7FAF7', text: '#1B2E1B',
    heading: "'Inter', sans-serif", body: "'Inter', sans-serif",
    radius: '12px', spacing: '1.5rem',
    hueStart: 100, hueStep: 10, sat: [30, 55], light: [26, 38],
  },
  {
    name: 'Cyberpunk', plan: 'agency',
    description: 'True neon on near-black. High contrast and futuristic.',
    background: '#0A0A0F', text: '#E8FBFF',
    heading: "'Courier New', monospace", body: "'Courier New', monospace",
    radius: '2px', spacing: '1rem',
    hueStart: 185, hueStep: 22, sat: [95, 100], light: [55, 65],
  },
  {
    name: 'Luxury', plan: 'enterprise',
    description: 'Genuine gold leaf on rich black. Jewellery and couture.',
    background: '#0D0D0D', text: '#F5F0E6',
    heading: "'Georgia', serif", body: "'Georgia', serif",
    radius: '0px', spacing: '2rem',
    hueStart: 46, hueStep: 3, sat: [55, 78], light: [50, 62],
  },
  {
    name: 'Vintage', plan: 'enterprise',
    description: 'Sepia, aged paper and muted ink. Nostalgic and warm.',
    background: '#F4ECD8', text: '#3B2F2F',
    heading: "'Georgia', serif", body: "'Georgia', serif",
    radius: '4px', spacing: '1.5rem',
    hueStart: 22, hueStep: 7, sat: [35, 58], light: [30, 42],
  },
];

const VARIATIONS = 10;
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Nudge a colour's lightness until it clears `min` contrast against `bg`.
 *
 * A designed hue is worthless if the customer cannot read it. Rather than
 * hand-tuning 100 palettes, the constraint is enforced here: on a light
 * background we darken, on a dark background we lighten, one step at a time,
 * keeping the family's hue and saturation intact.
 */
function ensureContrast(hue, sat, light, bg, min) {
  const bgIsLight = luminance(bg) > 0.5;
  for (let n = 0; n < 100; n++) {
    const candidate = hslToHex(hue, sat, light);
    if (contrast(candidate, bg) >= min) return candidate;
    light += bgIsLight ? -1 : 1;
    if (light < 0 || light > 100) break;
  }
  // Fall back to the background's opposite — always legible, never pretty.
  return bgIsLight ? '#000000' : '#ffffff';
}

function buildTheme(fam, i) {
  const t = VARIATIONS === 1 ? 0 : i / (VARIATIONS - 1);
  const hue = (fam.hueStart + fam.hueStep * i) % 360;
  const primary = ensureContrast(
    hue, lerp(fam.sat[0], fam.sat[1], t), lerp(fam.light[0], fam.light[1], t), fam.background, 3.0
  );
  // Secondary sits a step around the wheel: related, never random.
  const secondary = ensureContrast(
    (hue + 150) % 360, lerp(fam.sat[1], fam.sat[0], t), lerp(fam.light[1], fam.light[0], t), fam.background, 3.0
  );

  return {
    name: `${fam.name} Vol. ${i + 1}`,
    description: fam.description,
    plan_required: fam.plan,
    config: {
      colors: { primary, secondary, background: fam.background, text: fam.text },
      fonts: { heading: fam.heading, body: fam.body },
      layout: { borderRadius: fam.radius, spacing: fam.spacing },
    },
  };
}

function buildAll() {
  const out = [];
  for (const fam of FAMILIES) for (let i = 0; i < VARIATIONS; i++) out.push(buildTheme(fam, i));
  return out;
}

// ── report / emit ───────────────────────────────────────────────────────────

function report(themes) {
  let worstText = Infinity, worstPrimary = Infinity, fails = 0;
  for (const t of themes) {
    const { text, background, primary } = t.config.colors;
    const cText = contrast(text, background);
    const cPrim = contrast(primary, background);
    worstText = Math.min(worstText, cText);
    worstPrimary = Math.min(worstPrimary, cPrim);
    if (cText < 4.5 || cPrim < 3) {
      fails++;
      console.log(`  FAIL ${t.name}: text ${cText.toFixed(2)}:1, primary ${cPrim.toFixed(2)}:1`);
    }
  }
  console.log(`themes generated      : ${themes.length}`);
  console.log(`distinct palettes     : ${new Set(themes.map(t => JSON.stringify(t.config.colors))).size}`);
  console.log(`worst text contrast   : ${worstText.toFixed(2)}:1  (WCAG AA body needs 4.5)`);
  console.log(`worst accent contrast : ${worstPrimary.toFixed(2)}:1  (WCAG AA large needs 3.0)`);
  console.log(`contrast failures     : ${fails}`);
  console.log('\nsample (one per family):');
  for (const fam of FAMILIES) {
    const t = themes.find(x => x.name === `${fam.name} Vol. 1`);
    console.log(`  ${t.name.padEnd(20)} bg ${t.config.colors.background}  text ${t.config.colors.text}  primary ${t.config.colors.primary}`);
  }
}

function toSql(themes) {
  const rows = themes.map(t =>
    `  (${q(t.name)}, ${q(t.description)}, ${q(t.plan_required)}, ${q(JSON.stringify(t.config))}::jsonb, true)`
  ).join(',\n');
  return `-- Generated by backend/scripts/generate-themes.js — do not hand-edit.
--
-- Replaces the previous catalogue, which was 100 rows of Math.random() hex:
-- "Luxury" had no gold, "Cyberpunk" had no neon, and every family shared one
-- font and one radius. Each family now has a designed identity and each
-- variation is a deliberate step within it. All palettes pass WCAG AA.

DELETE FROM themes WHERE name LIKE '% Vol. %';

INSERT INTO themes (name, description, plan_required, config, is_active) VALUES
${rows}
ON CONFLICT (name) DO UPDATE
  SET description = EXCLUDED.description,
      plan_required = EXCLUDED.plan_required,
      config = EXCLUDED.config;
`;
}
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

// ── main ────────────────────────────────────────────────────────────────────

(async () => {
  const themes = buildAll();
  report(themes);

  if (process.argv.includes('--sql')) {
    require('fs').writeFileSync(__dirname + '/../../database/03_seed_themes.sql', toSql(themes));
    console.log('\nwrote database/03_seed_themes.sql');
  }

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
