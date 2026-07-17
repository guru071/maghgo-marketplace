import React from 'react';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ThemePreview, type ThemeConfig } from './ThemePreview';

interface ThemeRow {
  id: string;
  name: string;
  plan_required: string;
  config: ThemeConfig;
}

const PLAN_BADGE: Record<string, string> = {
  basic: 'bg-emerald-500 text-white',
  starter: 'bg-emerald-500 text-white',
  premium: 'bg-orange-500 text-white',
  agency: 'bg-purple-500 text-white',
  enterprise: 'bg-cyan-500 text-white',
};

function ThemeCard({ theme }: { theme: ThemeRow }) {
  return (
    <div className="w-[320px] h-[220px] rounded-t-xl rounded-b-md flex-shrink-0 flex flex-col overflow-hidden relative shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-gray-200 bg-white">
      {/* Browser chrome */}
      <div className="h-6 bg-gray-100 border-b border-gray-200 flex items-center px-2 gap-1.5 shrink-0 z-20">
        <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        <div className="mx-auto bg-white border border-gray-200 rounded-md h-3 w-1/2 flex items-center justify-center">
          <div className="w-1/2 h-1 bg-gray-200 rounded-full" />
        </div>
      </div>

      {/* Live render of the theme's real config — not a screenshot */}
      <div className="flex-1 w-full relative">
        <ThemePreview config={theme.config} />

        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex justify-between items-end z-10">
          <span className="text-white font-bold text-sm truncate pr-2">{theme.name}</span>
          <span
            className={`text-[10px] px-2 py-1 rounded font-bold uppercase shrink-0 ${
              PLAN_BADGE[theme.plan_required] ?? 'bg-gray-500 text-white'
            }`}
          >
            {theme.plan_required}
          </span>
        </div>
      </div>
    </div>
  );
}

export async function ThemesShowcase() {
  const supabase = createServerSupabaseClient();

  // Show the real catalogue. The previous version hardcoded three stock JPEGs
  // of themes that were not even in the database, under a headline claiming
  // "100+". Both the count and the previews now come from real rows.
  const { data, error } = await supabase
    .from('themes')
    .select('id, name, plan_required, config')
    .eq('is_active', true)
    .order('name');

  const all = (data ?? []) as ThemeRow[];

  // Nothing to show (query failed, or the catalogue was never seeded) — drop the
  // section rather than advertise a theme count we cannot back up.
  if (error || all.length === 0) return null;

  // One theme per family so the band shows real breadth, not many near-identical
  // variations. Rich layout themes are named "Palette · Archetype"; simple ones
  // "Family Vol. N". Group by the leading identity in both. Rich themes are
  // shown first — they're the premium, layout-driven designs worth leading with.
  const familyKey = (name: string) => name.split(' · ')[0].replace(/ Vol\. \d+$/, '');
  const isRich = (t: ThemeRow) => Array.isArray((t.config as any)?.content);

  const seen = new Set<string>();
  const showcase = [...all.filter(isRich), ...all.filter((t) => !isRich(t))].filter((t) => {
    const family = familyKey(t.name);
    if (seen.has(family)) return false;
    seen.add(family);
    return true;
  });

  const marquee = [...showcase, ...showcase];

  return (
    <section className="py-24 bg-gray-50 overflow-hidden">
      <div className="container mx-auto px-4 mb-12 text-center">
        <h2 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
          {all.length} Stunning Themes
        </h2>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Stand out with a beautifully designed web store. Choose a theme that matches your brand and your plan.
        </p>
      </div>

      <div className="relative flex overflow-x-hidden group">
        <div className="animate-marquee flex gap-6 whitespace-nowrap py-4 px-3">
          {marquee.map((theme, idx) => (
            <ThemeCard key={`a-${theme.id}-${idx}`} theme={theme} />
          ))}
        </div>
        <div className="absolute top-0 animate-marquee2 flex gap-6 whitespace-nowrap py-4 px-3" aria-hidden="true">
          {marquee.map((theme, idx) => (
            <ThemeCard key={`b-${theme.id}-${idx}`} theme={theme} />
          ))}
        </div>
      </div>

      <div className="mt-12 flex justify-center">
        <a
          href="#pricing"
          className="inline-flex items-center justify-center px-8 py-3.5 border border-transparent text-base font-bold rounded-xl text-white bg-gray-900 hover:bg-gray-800 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
        >
          View More Themes
          <svg className="ml-2 -mr-1 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </a>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes marquee { 0% { transform: translateX(0%); } 100% { transform: translateX(-100%); } }
        @keyframes marquee2 { 0% { transform: translateX(100%); } 100% { transform: translateX(0%); } }
        .animate-marquee { animation: marquee 40s linear infinite; }
        .animate-marquee2 { animation: marquee2 40s linear infinite; }
        .group:hover .animate-marquee, .group:hover .animate-marquee2 { animation-play-state: paused; }
      `,
        }}
      />
    </section>
  );
}
