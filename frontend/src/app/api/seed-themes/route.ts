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

const APPLE_CONFIG = {
  content: [
    { type: "StoreHeader", props: { title: "Cupertino Styles", subtitle: "Pro cameras. Pro display. Pro performance.", bgColor: "#fbfbfd", textColor: "#1d1d1f", bgImage: "" } },
    { type: "Spacer", props: { height: "32px" } },
    { type: "Banner", props: { imageUrl: "https://images.unsplash.com/photo-1512054502232-10a0a035d672?w=1200&q=80", text: "New MacBooks Arrived", linkUrl: "#", textColor: "#ffffff", height: "400px" } },
    { type: "Spacer", props: { height: "48px" } },
    { type: "Heading", props: { text: "Which Apple is right for you?", size: "40px", color: "#1d1d1f", align: "center" } },
    { type: "ProductGrid", props: { columns: 3, gap: "32px", cardBg: "#ffffff", showPrices: true } },
  ],
  root: { props: { title: "Apple Minimal Store" } },
  zones: {}
};

const GOOGLE_CONFIG = {
  content: [
    { type: "StoreHeader", props: { title: "Mountain View Tech", subtitle: "Helpful by design.", bgColor: "#ffffff", textColor: "#202124", bgImage: "" } },
    { type: "Spacer", props: { height: "16px" } },
    { type: "Heading", props: { text: "Shop the latest Pixel", size: "36px", color: "#202124", align: "center" } },
    { type: "Text", props: { text: "The only phone engineered by Google.", color: "#5f6368", align: "center" } },
    { type: "Spacer", props: { height: "24px" } },
    { type: "Banner", props: { imageUrl: "https://images.unsplash.com/photo-1546054454-aa26e2b734c7?w=1200&q=80", text: "Pixel 9 Pro", linkUrl: "#", textColor: "#ffffff", height: "350px" } },
    { type: "Spacer", props: { height: "48px" } },
    { type: "ProductGrid", props: { columns: 4, gap: "24px", cardBg: "#f8f9fa", showPrices: true } },
  ],
  root: { props: { title: "Google Material Store" } },
  zones: {}
};

const INSTAGRAM_CONFIG = {
  content: [
    { type: "StoreHeader", props: { title: "@trendingshop", subtitle: "Fashion | Lifestyle | Beauty", bgColor: "#ffffff", textColor: "#262626", bgImage: "" } },
    { type: "Spacer", props: { height: "16px" } },
    { type: "FeatureGrid", props: { features: [
      { title: "10K", description: "Followers", icon: "👥" },
      { title: "500+", description: "Posts", icon: "📸" },
      { title: "Worldwide", description: "Shipping", icon: "🌍" }
    ]}},
    { type: "Divider", props: { color: "#dbdbdb", margin: "16px 0" } },
    { type: "ProductGrid", props: { columns: 3, gap: "2px", cardBg: "#ffffff", showPrices: false } },
  ],
  root: { props: { title: "Instagram Grid Store" } },
  zones: {}
};

const themes = [
  { name: 'Minimalist Fashion', description: 'Clean, elegant, white backgrounds', plan_required: 'basic', config: MINIMALIST_CONFIG },
  { name: 'Cyberpunk Electronics', description: 'Dark mode, neon accents, futuristic', plan_required: 'premium', config: CYBERPUNK_CONFIG },
  { name: 'Luxury Jewelry', description: 'Black and gold, premium imagery', plan_required: 'agency', config: LUXURY_CONFIG },
  { name: 'Apple Aesthetics', description: 'Premium, sleek, and highly minimal. Perfect for tech and high-end goods.', plan_required: 'premium', config: APPLE_CONFIG },
  { name: 'Google Material', description: 'Clean, rounded, and helpful. Familiar interface for users.', plan_required: 'basic', config: GOOGLE_CONFIG },
  { name: 'Instagram Grid', description: 'Visual-first square grid exactly like a social media feed.', plan_required: 'basic', config: INSTAGRAM_CONFIG },
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
