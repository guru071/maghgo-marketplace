import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';

const MINIMALIST_CONFIG = {
  content: [
    { type: "StoreHeader", props: { title: "Minimalist", subtitle: "Clean & Elegant", bgColor: "#ffffff", textColor: "#111827", bgImage: "" } },
    { type: "Spacer", props: { height: "32px" } },
    { type: "Heading", props: { text: "New Arrivals", size: "32px", color: "#111827", align: "center" } },
    { type: "ProductGrid", props: { columns: 3, gap: "24px", cardBg: "#ffffff", showPrices: true } },
    { type: "Divider", props: { color: "#f3f4f6", margin: "48px 0" } },
    { type: "FeatureGrid", props: { features: [
      { title: "Free Shipping", description: "On orders over ₹999", icon: "🚚" },
      { title: "Minimal Design", description: "Less is more", icon: "✨" }
    ]}}
  ],
  root: { props: { title: "Minimalist Store" } },
  zones: {}
};

const CYBERPUNK_CONFIG = {
  content: [
    { type: "StoreHeader", props: { title: "NEON ARCADE", subtitle: "Upgrade Your Reality", bgColor: "#0a0a0a", textColor: "#00F0FF", bgImage: "" } },
    { type: "Banner", props: { imageUrl: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=1200&q=80", text: "SYSTEM OVERRIDE: 50% OFF", linkUrl: "#", textColor: "#FF003C", height: "300px" } },
    { type: "Spacer", props: { height: "32px" } },
    { type: "Heading", props: { text: "/// HARDWARE UPGRADES", size: "28px", color: "#00F0FF", align: "left" } },
    { type: "ProductGrid", props: { columns: 4, gap: "16px", cardBg: "#111111", showPrices: true } },
  ],
  root: { props: { title: "Cyberpunk Store" } },
  zones: {}
};

const LUXURY_CONFIG = {
  content: [
    { type: "StoreHeader", props: { title: "MAISON AURÉLIA", subtitle: "Timeless Elegance", bgColor: "#111111", textColor: "#D4AF37", bgImage: "https://images.unsplash.com/photo-1599643478524-fb66f70d00f8?w=1200&q=80" } },
    { type: "Spacer", props: { height: "48px" } },
    { type: "Heading", props: { text: "The Diamond Collection", size: "36px", color: "#111111", align: "center" } },
    { type: "Divider", props: { color: "#D4AF37", margin: "24px 0" } },
    { type: "ProductGrid", props: { columns: 3, gap: "32px", cardBg: "#ffffff", showPrices: true } },
  ],
  root: { props: { title: "Luxury Store" } },
  zones: {}
};

const themes = [
  { name: 'Minimalist Fashion', description: 'Clean, elegant, white backgrounds', plan_required: 'basic', config: MINIMALIST_CONFIG },
  { name: 'Cyberpunk Electronics', description: 'Dark mode, neon accents, futuristic', plan_required: 'premium', config: CYBERPUNK_CONFIG },
  { name: 'Luxury Jewelry', description: 'Black and gold, premium imagery', plan_required: 'agency', config: LUXURY_CONFIG },
];

export async function GET() {
  const supabaseAdmin = createAdminSupabaseClient();
  const results = [];

  try {
    for (const theme of themes) {
      const { data: existing } = await supabaseAdmin.from('themes').select('id').eq('name', theme.name).single();
      if (existing) {
        await supabaseAdmin.from('themes').update({ config: theme.config }).eq('id', existing.id);
        results.push(`Updated theme: ${theme.name}`);
      } else {
        await supabaseAdmin.from('themes').insert(theme as any);
        results.push(`Inserted theme: ${theme.name}`);
      }
    }
    
    // Also apply Cyberpunk to demo-123 for immediate verification
    const { error: applyErr } = await supabaseAdmin
      .from('merchants')
      .update({ theme_config: CYBERPUNK_CONFIG as any })
      .eq('store_slug', 'demo');
      
    if (applyErr) {
      results.push(`Failed to apply demo theme: ${applyErr.message}`);
    } else {
      results.push("Successfully applied Cyberpunk theme to the /demo store!");
    }
    
    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
