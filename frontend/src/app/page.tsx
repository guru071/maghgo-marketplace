import { Header } from '@/components/landing/Header';
import { Hero } from '@/components/landing/Hero';
import { WorkingModelDemo } from '@/components/landing/WorkingModelDemo';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { ThemesShowcase } from '@/components/landing/ThemesShowcase';
import { Pricing } from '@/components/landing/Pricing';
import { Marketplace } from '@/components/landing/Marketplace';

import { createServerSupabaseClient } from '@/lib/supabase-server';

// The home page highlights a focused set of plans rather than the full ladder —
// too many tiers cause choice paralysis. The rest stay available for upgrades in
// the dashboard. Order here is the display order; 'pro' is the featured default.
const FEATURED_PLAN_SLUGS = ['basic', 'pro', 'business', 'custom'];

export const revalidate = 60; // Ensure fresh settings are fetched

export default async function LandingPage() {
  // Never let a missing env var or a transient query crash the build. If Supabase
  // is unreachable at prerender time, the page still renders (with no offer and
  // an empty pricing grid) rather than failing the whole deploy.
  let settings: any = null;
  let plans: any[] = [];
  let activeOffer: any = null;
  let shops: any[] = [];
  try {
    const supabase = createServerSupabaseClient();
    const [s, p, o, m] = await Promise.all([
      supabase.from('platform_settings').select('*').eq('id', 1).single(),
      supabase.from('plans').select('*').order('monthly_price', { ascending: true }),
      supabase.from('offers').select('*').eq('is_active', true).single(),
      // Live stores: active, subscribed, and with their products embedded.
      supabase
        .from('merchants')
        .select('store_name, store_slug, store_logo_url, store_description, products(title, price, processed_image_url, original_image_url, is_available)')
        .eq('is_active', true)
        .gt('subscription_ends_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(12),
    ]);
    settings = s.data;
    plans = p.data ?? [];
    activeOffer = o.data;
    shops = m.data ?? [];
  } catch (err) {
    console.error('Landing page data fetch failed (rendering with defaults):', err);
  }

  // Only show stores that actually have something to sell, and keep just their
  // available products (newest shops first, capped at 8 cards).
  const liveShops = (shops ?? [])
    .map((shop: any) => ({
      ...shop,
      products: (shop.products ?? []).filter((p: any) => p.is_available !== false),
    }))
    .filter((shop: any) => shop.products.length > 0)
    .slice(0, 8);

  const enabledPlatforms = settings || {
    whatsapp_enabled: true,
    instagram_enabled: true,
    messenger_enabled: true,
    sms_enabled: true,
  };

  // Curate to a focused set (Pro featured). Fall back to the full list, cheapest
  // first, if none of the featured slugs are present (e.g. a customised catalogue).
  const curated = (plans ?? [])
    .filter((p: any) => FEATURED_PLAN_SLUGS.includes(p.slug))
    .sort((a: any, b: any) => FEATURED_PLAN_SLUGS.indexOf(a.slug) - FEATURED_PLAN_SLUGS.indexOf(b.slug));

  const publicPlans = (curated.length > 0 ? curated : (plans ?? []).slice().sort(
    (a: any, b: any) => (a.monthly_price ?? 0) - (b.monthly_price ?? 0)
  )).map((p: any) => ({
    ...p,
    featured: p.slug === 'pro' || p.is_popular === true,
    colorTheme: p.slug === 'pro' ? '#2563eb' : '#e5e7eb',
  }));

  return (
    <main className={`landing-page${activeOffer ? ' landing-page--offer' : ''}`}>
      {activeOffer && (
        <div className="bg-indigo-600 text-white text-center w-full shadow-md flex items-center justify-center gap-4 flex-wrap" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 120, padding: '0.7rem 1rem', minHeight: 52 }}>
          <div>
            <span className="font-bold mr-2 text-lg">{activeOffer.title}</span>
            <span className="text-indigo-100">{activeOffer.subtitle}</span>
          </div>
          {activeOffer.poster_url && (
            <a href="#pricing" className="bg-white text-indigo-600 px-4 py-1 rounded-full text-sm font-bold hover:bg-indigo-50 transition-colors">
              Claim Offer
            </a>
          )}
        </div>
      )}
      <Header />
      <Hero />
      <WorkingModelDemo />
      <HowItWorks />
      <Marketplace shops={liveShops} />
      <ThemesShowcase />
      <Pricing enabledPlatforms={enabledPlatforms} plans={publicPlans} discountPercent={Number(activeOffer?.discount_percent) || 0} />
      
      <footer className="footer">
        <div className="footer__container">
          <div className="footer__logo-wrapper">
            <img src="/logo.jpg" alt="Maghgo Logo" className="footer__logo" />
          </div>
          <p className="footer__text">
            Created by <a href="https://goatech.tech" target="_blank" rel="noopener noreferrer" className="footer__link">GOAT'ECH</a>
          </p>
          <p className="footer__subtext">
            Empowering sellers with AI-driven WhatsApp commerce.
          </p>
        </div>
      </footer>
    </main>
  );
}
