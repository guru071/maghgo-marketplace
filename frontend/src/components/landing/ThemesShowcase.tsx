import React from 'react';

const REAL_THEMES = [
  { id: '1', name: 'Minimalist Fashion', image: '/themes/theme_minimalist.jpg', plan_required: 'basic' },
  { id: '2', name: 'Cyberpunk Electronics', image: '/themes/theme_cyberpunk.jpg', plan_required: 'premium' },
  { id: '3', name: 'Luxury Jewelry', image: '/themes/theme_luxury.jpg', plan_required: 'agency' },
];

export async function ThemesShowcase() {
  // Double the themes array for an infinite loop effect
  const marqueeThemes = [...REAL_THEMES, ...REAL_THEMES, ...REAL_THEMES];

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
          {marqueeThemes.map((theme, idx) => (
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

              {/* The Actual Real Image Demo */}
              <div className="flex-1 w-full relative">
                <img 
                  src={theme.image} 
                  alt={theme.name} 
                  className="absolute inset-0 w-full h-full object-cover object-top"
                />
                
                {/* Theme Info Overlay (Bottom) */}
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex justify-between items-end">
                  <span className="text-white font-bold text-sm truncate pr-2 shadow-sm">{theme.name}</span>
                  <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase shadow-sm ${
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
          ))}
        </div>
        
        {/* Absolute clone for seamless infinite scrolling */}
        <div className="absolute top-0 animate-marquee2 flex gap-6 whitespace-nowrap py-4 px-3" aria-hidden="true">
          {marqueeThemes.map((theme, idx) => (
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

              <div className="flex-1 w-full relative">
                <img 
                  src={theme.image} 
                  alt={theme.name} 
                  className="absolute inset-0 w-full h-full object-cover object-top"
                />
                
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex justify-between items-end">
                  <span className="text-white font-bold text-sm truncate pr-2 shadow-sm">{theme.name}</span>
                  <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase shadow-sm ${
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
          ))}
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
