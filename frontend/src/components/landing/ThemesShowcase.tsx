import React from 'react';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// Fallback themes if DB fetch fails or hasn't been seeded yet
const FALLBACK_THEMES = [
  { id: '1', name: 'Cyber Neon', plan_required: 'premium', config: { colors: { primary: '#00F0FF', secondary: '#FF003C', background: '#0a0a0a' } } },
  { id: '2', name: 'Minimal Frost', plan_required: 'basic', config: { colors: { primary: '#000000', secondary: '#E2E8F0', background: '#F8FAFC' } } },
  { id: '3', name: 'Luxury Gold', plan_required: 'enterprise', config: { colors: { primary: '#D4AF37', secondary: '#000000', background: '#111111' } } },
  { id: '4', name: 'Ocean Breeze', plan_required: 'basic', config: { colors: { primary: '#0EA5E9', secondary: '#38BDF8', background: '#F0F9FF' } } },
  { id: '5', name: 'Sunset Vibes', plan_required: 'agency', config: { colors: { primary: '#F97316', secondary: '#EC4899', background: '#FFF1F2' } } },
  { id: '6', name: 'Emerald City', plan_required: 'premium', config: { colors: { primary: '#10B981', secondary: '#047857', background: '#ECFDF5' } } },
  { id: '7', name: 'Royal Purple', plan_required: 'agency', config: { colors: { primary: '#8B5CF6', secondary: '#6D28D9', background: '#F5F3FF' } } },
  { id: '8', name: 'Midnight Blue', plan_required: 'premium', config: { colors: { primary: '#1D4ED8', secondary: '#1E3A8A', background: '#0F172A' } } },
];

export async function ThemesShowcase() {
  let themes = FALLBACK_THEMES;

  try {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from('themes')
      .select('*')
      .limit(16) // Just show a nice sample on the homepage
      .order('created_at', { ascending: false });
      
    if (data && data.length > 0) {
      themes = data;
    }
  } catch (err) {
    // Graceful fallback if env vars are missing or table doesn't exist
    console.error("Could not fetch themes for showcase, using fallbacks.");
  }

  // Double the themes array for an infinite loop effect
  const marqueeThemes = [...themes, ...themes];

  return (
    <section className="py-24 bg-gray-50 overflow-hidden">
      <div className="container mx-auto px-4 mb-12 text-center">
        <h2 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">100+ Stunning Themes</h2>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Stand out with a beautifully designed web store. Choose a theme that matches your brand and your plan.
        </p>
      </div>

      <div className="relative flex overflow-x-hidden group">
        <div className="animate-marquee flex gap-6 whitespace-nowrap py-4 px-3">
          {marqueeThemes.map((theme, idx) => {
            const config = theme.config || {};
            const primary = config.colors?.primary || '#000';
            const secondary = config.colors?.secondary || '#666';
            const bg = config.colors?.background || '#fff';
            
            // Generate a dynamic gradient based on the theme colors
            const gradientStyle = {
              background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`
            };

            return (
              <div 
                key={`${theme.id}-${idx}`} 
                className="w-[320px] h-[220px] rounded-t-xl rounded-b-md flex-shrink-0 flex flex-col overflow-hidden relative shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-gray-200 bg-white"
              >
                {/* Browser Chrome (Top Bar) */}
                <div className="h-6 bg-gray-100 border-b border-gray-200 flex items-center px-2 gap-1.5 shrink-0 z-20">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                  <div className="mx-auto bg-white border border-gray-200 rounded-md h-3 w-1/2 flex items-center justify-center">
                    <div className="w-1/2 h-1 bg-gray-200 rounded-full"></div>
                  </div>
                </div>

                {/* Mini Store Layout */}
                <div className="flex-1 w-full relative flex flex-col overflow-hidden" style={{ backgroundColor: bg }}>
                  
                  {/* Store Header */}
                  <div className="w-full h-8 flex items-center justify-between px-3 shrink-0" style={{ backgroundColor: primary }}>
                    <div className="w-12 h-2.5 rounded bg-white/80"></div>
                    <div className="flex gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-white/30"></div>
                      <div className="w-4 h-4 rounded-full bg-white/30"></div>
                    </div>
                  </div>

                  {/* Store Hero Banner */}
                  <div className="w-full h-16 flex items-center justify-center shrink-0" style={{ backgroundColor: secondary }}>
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-20 h-2.5 rounded-full bg-white/90"></div>
                      <div className="w-12 h-1.5 rounded-full bg-white/60"></div>
                    </div>
                  </div>

                  {/* Product Grid */}
                  <div className="flex-1 p-2 grid grid-cols-2 gap-2 overflow-hidden">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="rounded bg-white border border-black/5 shadow-sm flex flex-col h-16 overflow-hidden">
                        <div className="flex-1 bg-gray-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5.5 8.5 2.5 3H8l2.5-3.5 1.5 2z"/></svg>
                        </div>
                        <div className="h-6 p-1 flex flex-col justify-between">
                          <div className="w-3/4 h-1 rounded-full bg-gray-700"></div>
                          <div className="w-1/2 h-1 rounded-full" style={{ backgroundColor: primary }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Theme Info Overlay (Bottom) */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-end">
                    <span className="text-white font-bold text-sm truncate pr-2">{theme.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                      theme.plan_required === 'basic' ? 'bg-emerald-500 text-white' :
                      theme.plan_required === 'premium' ? 'bg-orange-500 text-white' :
                      theme.plan_required === 'agency' ? 'bg-purple-500 text-white' :
                      'bg-cyan-500 text-white'
                    }`}>
                      {theme.plan_required}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Absolute clone for seamless infinite scrolling */}
        <div className="absolute top-0 animate-marquee2 flex gap-6 whitespace-nowrap py-4 px-3" aria-hidden="true">
          {marqueeThemes.map((theme, idx) => {
            const config = theme.config || {};
            const primary = config.colors?.primary || '#000';
            const secondary = config.colors?.secondary || '#666';
            const bg = config.colors?.background || '#fff';

            return (
              <div 
                key={`clone-${theme.id}-${idx}`} 
                className="w-[320px] h-[220px] rounded-t-xl rounded-b-md flex-shrink-0 flex flex-col overflow-hidden relative shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-gray-200 bg-white"
              >
                <div className="h-6 bg-gray-100 border-b border-gray-200 flex items-center px-2 gap-1.5 shrink-0 z-20">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                  <div className="mx-auto bg-white border border-gray-200 rounded-md h-3 w-1/2 flex items-center justify-center">
                    <div className="w-1/2 h-1 bg-gray-200 rounded-full"></div>
                  </div>
                </div>

                <div className="flex-1 w-full relative flex flex-col overflow-hidden" style={{ backgroundColor: bg }}>
                  <div className="w-full h-8 flex items-center justify-between px-3 shrink-0" style={{ backgroundColor: primary }}>
                    <div className="w-12 h-2.5 rounded bg-white/80"></div>
                    <div className="flex gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-white/30"></div>
                      <div className="w-4 h-4 rounded-full bg-white/30"></div>
                    </div>
                  </div>

                  <div className="w-full h-16 flex items-center justify-center shrink-0" style={{ backgroundColor: secondary }}>
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-20 h-2.5 rounded-full bg-white/90"></div>
                      <div className="w-12 h-1.5 rounded-full bg-white/60"></div>
                    </div>
                  </div>

                  <div className="flex-1 p-2 grid grid-cols-2 gap-2 overflow-hidden">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="rounded bg-white border border-black/5 shadow-sm flex flex-col h-16 overflow-hidden">
                        <div className="flex-1 bg-gray-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5.5 8.5 2.5 3H8l2.5-3.5 1.5 2z"/></svg>
                        </div>
                        <div className="h-6 p-1 flex flex-col justify-between">
                          <div className="w-3/4 h-1 rounded-full bg-gray-700"></div>
                          <div className="w-1/2 h-1 rounded-full" style={{ backgroundColor: primary }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-end">
                    <span className="text-white font-bold text-sm truncate pr-2">{theme.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                      theme.plan_required === 'basic' ? 'bg-emerald-500 text-white' :
                      theme.plan_required === 'premium' ? 'bg-orange-500 text-white' :
                      theme.plan_required === 'agency' ? 'bg-purple-500 text-white' :
                      'bg-cyan-500 text-white'
                    }`}>
                      {theme.plan_required}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* View More Themes Button */}
      <div className="mt-12 flex justify-center">
        <a href="#pricing" className="inline-flex items-center justify-center px-8 py-3.5 border border-transparent text-base font-bold rounded-xl text-white bg-gray-900 hover:bg-gray-800 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
          View More Themes
          <svg className="ml-2 -mr-1 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </a>
      </div>
      
      {/* Required CSS for marquee animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-100%); }
        }
        @keyframes marquee2 {
          0% { transform: translateX(100%); }
          100% { transform: translateX(0%); }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
        .animate-marquee2 {
          animation: marquee2 40s linear infinite;
        }
        .group:hover .animate-marquee,
        .group:hover .animate-marquee2 {
          animation-play-state: paused;
        }
      `}} />
    </section>
  );
}
