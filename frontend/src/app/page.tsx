import { Header } from '@/components/landing/Header';
import { Hero } from '@/components/landing/Hero';
import { WorkingModelDemo } from '@/components/landing/WorkingModelDemo';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { ThemesShowcase } from '@/components/landing/ThemesShowcase';
import { Pricing } from '@/components/landing/Pricing';

import { createServerSupabaseClient } from '@/lib/supabase-server';

export const revalidate = 60; // Ensure fresh settings are fetched

export default async function LandingPage() {
  // Never let a missing env var or a transient query crash the build. If Supabase
  // is unreachable at prerender time, the page still renders (with no offer and
  // an empty pricing grid) rather than failing the whole deploy.
  let settings: any = null;
  let plans: any[] = [];
  let activeOffer: any = null;
  try {
    const supabase = createServerSupabaseClient();
    const [s, p, o] = await Promise.all([
      supabase.from('platform_settings').select('*').eq('id', 1).single(),
      supabase.from('plans').select('*').order('monthly_price', { ascending: true }),
      supabase.from('offers').select('*').eq('is_active', true).single(),
    ]);
    settings = s.data;
    plans = p.data ?? [];
    activeOffer = o.data;
  } catch (err) {
    console.error('Landing page data fetch failed (rendering with defaults):', err);
  }

  const enabledPlatforms = settings || {
    whatsapp_enabled: true,
    instagram_enabled: true,
    messenger_enabled: true,
    sms_enabled: true,
  };

  // Show every plan in the catalogue, cheapest first.
  const publicPlans = (plans ?? []).slice().sort(
    (a: any, b: any) => (a.monthly_price ?? 0) - (b.monthly_price ?? 0)
  );

  return (
    <main className="landing-page">
      {activeOffer && (
        <div className="bg-indigo-600 text-white p-3 text-center w-full z-50 sticky top-0 shadow-md flex items-center justify-center gap-4">
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
      <ThemesShowcase />
      <Pricing enabledPlatforms={enabledPlatforms} plans={publicPlans} />
      
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
