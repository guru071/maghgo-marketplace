import fs from 'fs';
import crypto from 'crypto';

const styles = [
  { name: 'Minimalist', desc: 'Clean, spacious, and modern.' },
  { name: 'Dark Mode', desc: 'Sleek dark interface with neon accents.' },
  { name: 'Corporate', desc: 'Professional and trustworthy aesthetic.' },
  { name: 'Playful', desc: 'Fun, vibrant, and energetic.' },
  { name: 'Brutalist', desc: 'Bold typography and raw design.' },
  { name: 'Elegant', desc: 'Sophisticated typography and muted colors.' },
  { name: 'Nature', desc: 'Earthy tones and organic shapes.' },
  { name: 'Cyberpunk', desc: 'High-contrast, futuristic neon.' },
  { name: 'Luxury', desc: 'Gold accents and rich dark backgrounds.' },
  { name: 'Vintage', desc: 'Nostalgic colors and retro typography.' }
];

const plans = ['basic', 'premium', 'agency', 'enterprise'];

// Helper to generate a random hex color
function randomColor() {
  return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
}

const themes = [];
let idCounter = 1;

for (const style of styles) {
  for (let i = 1; i <= 10; i++) {
    const config = {
      colors: {
        primary: randomColor(),
        secondary: randomColor(),
        background: style.name === 'Dark Mode' || style.name === 'Cyberpunk' || style.name === 'Luxury' ? '#111111' : '#ffffff',
        text: style.name === 'Dark Mode' || style.name === 'Cyberpunk' || style.name === 'Luxury' ? '#ffffff' : '#111111',
      },
      fonts: {
        heading: style.name === 'Brutalist' ? 'Impact, sans-serif' : 'Inter, sans-serif',
        body: 'Inter, sans-serif'
      },
      layout: {
        borderRadius: style.name === 'Playful' ? '24px' : '4px',
        spacing: '1rem'
      }
    };

    // Determine plan based on ID (Basic gets 25, Premium gets 25, Agency gets 25, Enterprise gets 25)
    let plan = 'basic';
    if (idCounter > 25 && idCounter <= 50) plan = 'premium';
    if (idCounter > 50 && idCounter <= 75) plan = 'agency';
    if (idCounter > 75) plan = 'enterprise';

    themes.push({
      id: crypto.randomUUID(),
      name: `${style.name} Vol. ${i}`,
      description: `${style.desc} Variation ${i}`,
      plan_required: plan,
      config: JSON.stringify(config)
    });

    idCounter++;
  }
}

let sql = `-- Auto-generated exactly 100 themes\n\nINSERT INTO themes (id, name, description, plan_required, config) VALUES\n`;

const values = themes.map(t => 
  `('${t.id}', '${t.name}', '${t.description}', '${t.plan_required}', '${t.config}'::jsonb)`
);

sql += values.join(',\n') + ';\n';

fs.writeFileSync('database/03_seed_themes.sql', sql);
console.log('Successfully generated database/03_seed_themes.sql with exactly 100 themes!');
