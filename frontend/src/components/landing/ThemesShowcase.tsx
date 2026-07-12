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
                className="w-[320px] h-[220px] rounded-2xl flex-shrink-0 flex flex-col justify-between overflow-hidden relative shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
                style={gradientStyle}
              >
                {/* Overlay for depth */}
                <div className="absolute inset-0 bg-black/10 mix-blend-overlay"></div>
                
                {/* Mock UI inside the theme card */}
                <div className="absolute top-4 left-4 right-4 h-32 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex flex-col gap-2 p-3">
                  <div className="w-full h-4 rounded-full bg-white/40"></div>
                  <div className="w-3/4 h-4 rounded-full bg-white/30"></div>
                  <div className="flex gap-2 mt-auto">
                    <div className="w-10 h-10 rounded-lg bg-white/50"></div>
                    <div className="w-10 h-10 rounded-lg bg-white/50"></div>
                    <div className="w-10 h-10 rounded-lg bg-white/50"></div>
                  </div>
                </div>

                <div className="relative z-10 p-5 mt-auto bg-gradient-to-t from-black/80 to-transparent">
                  <h3 className="text-xl font-bold text-white mb-2 truncate">{theme.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wider font-semibold text-white/90">
                      Requires Plan:
                    </span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold shadow-sm backdrop-blur-md ${
                      theme.plan_required === 'basic' ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30' :
                      theme.plan_required === 'premium' ? 'bg-orange-500/20 text-orange-200 border border-orange-500/30' :
                      theme.plan_required === 'agency' ? 'bg-purple-500/20 text-purple-200 border border-purple-500/30' :
                      'bg-cyan-500/20 text-cyan-200 border border-cyan-500/30'
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
            
            const gradientStyle = {
              background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`
            };

            return (
              <div 
                key={`clone-${theme.id}-${idx}`} 
                className="w-[320px] h-[220px] rounded-2xl flex-shrink-0 flex flex-col justify-between overflow-hidden relative shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
                style={gradientStyle}
              >
                <div className="absolute inset-0 bg-black/10 mix-blend-overlay"></div>
                <div className="absolute top-4 left-4 right-4 h-32 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex flex-col gap-2 p-3">
                  <div className="w-full h-4 rounded-full bg-white/40"></div>
                  <div className="w-3/4 h-4 rounded-full bg-white/30"></div>
                  <div className="flex gap-2 mt-auto">
                    <div className="w-10 h-10 rounded-lg bg-white/50"></div>
                    <div className="w-10 h-10 rounded-lg bg-white/50"></div>
                    <div className="w-10 h-10 rounded-lg bg-white/50"></div>
                  </div>
                </div>
                <div className="relative z-10 p-5 mt-auto bg-gradient-to-t from-black/80 to-transparent">
                  <h3 className="text-xl font-bold text-white mb-2 truncate">{theme.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wider font-semibold text-white/90">
                      Requires Plan:
                    </span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold shadow-sm backdrop-blur-md ${
                      theme.plan_required === 'basic' ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30' :
                      theme.plan_required === 'premium' ? 'bg-orange-500/20 text-orange-200 border border-orange-500/30' :
                      theme.plan_required === 'agency' ? 'bg-purple-500/20 text-purple-200 border border-purple-500/30' :
                      'bg-cyan-500/20 text-cyan-200 border border-cyan-500/30'
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
