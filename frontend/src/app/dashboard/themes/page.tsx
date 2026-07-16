'use client';

import React, { useEffect, useState, useRef } from 'react';

const PREMADE_THEMES = [
  {
    id: 'minimalist',
    name: 'Minimalist White',
    description: 'Clean, spacious, and modern.',
    config: {
      colors: { primary: "#30c67b", secondary: "#7352b0", background: "#ffffff", text: "#111111" },
      fonts: { heading: "Inter, sans-serif", body: "Inter, sans-serif" },
      layout: { borderRadius: "4px", spacing: "1rem" }
    }
  },
  {
    id: 'darkmode',
    name: 'Dark Mode Neon',
    description: 'Sleek dark interface with neon accents.',
    config: {
      colors: { primary: "#aeedeb", secondary: "#9c7ff1", background: "#111111", text: "#ffffff" },
      fonts: { heading: "Inter, sans-serif", body: "Inter, sans-serif" },
      layout: { borderRadius: "4px", spacing: "1rem" }
    }
  },
  {
    id: 'playful',
    name: 'Playful Blue',
    description: 'Fun, vibrant, and energetic.',
    config: {
      colors: { primary: "#0957d5", secondary: "#ddff42", background: "#ffffff", text: "#111111" },
      fonts: { heading: "Inter, sans-serif", body: "Inter, sans-serif" },
      layout: { borderRadius: "24px", spacing: "1rem" }
    }
  },
  {
    id: 'luxury',
    name: 'Luxury Dark',
    description: 'Gold accents and rich dark backgrounds.',
    config: {
      colors: { primary: "#b8115f", secondary: "#300855", background: "#111111", text: "#ffffff" },
      fonts: { heading: "Inter, sans-serif", body: "Inter, sans-serif" },
      layout: { borderRadius: "4px", spacing: "1rem" }
    }
  }
];

export default function ThemesPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [activeTheme, setActiveTheme] = useState('');
  const [storeSlug, setStoreSlug] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const fetchStore = async () => {
      const token = localStorage.getItem('maghgo_merchant_token');
      if (!token) return;
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const res = await fetch(`${apiUrl}/api/dashboard/store`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setStoreSlug(data.store_slug);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchStore();
  }, []);

  const generatePuckTheme = (config: any) => ({
    content: [
      {
        type: "StoreHeader",
        props: {
          title: "My Store",
          subtitle: "Welcome to my awesome store",
          bgColor: config.colors.primary,
          textColor: config.colors.background
        }
      },
      {
        type: "ProductGrid",
        props: {
          columns: 3,
          showPrices: true,
          gap: config.layout.spacing,
          cardBg: config.colors.background
        }
      }
    ],
    root: { props: { title: "Maghgo Store" } }
  });

  const handlePreviewTheme = (themeId: string, config: any) => {
    setActiveTheme(themeId);
    const puckTheme = generatePuckTheme(config);
    if (iframeRef.current && iframeRef.current.contentWindow) {
      // Send the theme configuration to the storefront iframe
      iframeRef.current.contentWindow.postMessage({
        type: 'MAGHGO_PREVIEW_THEME',
        theme: puckTheme
      }, '*');
    }
  };

  const handleApplyTheme = async (themeId: string, config: any) => {
    setIsSaving(true);
    const puckTheme = generatePuckTheme(config);
    
    try {
      const token = localStorage.getItem('maghgo_merchant_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      
      const res = await fetch(`${apiUrl}/api/dashboard/store`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ theme_config: puckTheme })
      });
      
      if (res.ok) {
        alert('Theme applied successfully! Your storefront has been updated instantly.');
      } else {
        alert('Failed to apply theme.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error applying theme.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] flex gap-6 overflow-hidden pr-4 pb-4 -mt-2 -mr-4">
      {/* Sidebar: Theme Selector */}
      <div className="w-1/3 overflow-y-auto space-y-6 pb-20 pr-2 custom-scrollbar">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Premium Themes</h1>
          <p className="text-gray-600">Select a theme to instantly preview it on your store on the right.</p>
        </div>

        <div className="space-y-4">
          {PREMADE_THEMES.map((theme) => (
            <div 
              key={theme.id} 
              onClick={() => handlePreviewTheme(theme.id, theme.config)}
              className={`bg-white rounded-2xl border transition-all cursor-pointer group ${
                activeTheme === theme.id ? 'border-accent ring-2 ring-accent/20' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div 
                className="h-24 p-4 flex flex-col justify-between rounded-t-2xl"
                style={{ backgroundColor: theme.config.colors.background, color: theme.config.colors.text }}
              >
                <div>
                  <h3 className="font-bold text-lg mb-1">{theme.name}</h3>
                </div>
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full shadow-sm border border-black/10" style={{ backgroundColor: theme.config.colors.primary }} />
                  <div className="w-6 h-6 rounded-full shadow-sm border border-black/10" style={{ backgroundColor: theme.config.colors.secondary }} />
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center rounded-b-2xl">
                <span className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  {activeTheme === theme.id ? (
                    <><span className="w-2 h-2 rounded-full bg-green-500"></span> Live on Store</>
                  ) : (
                    'Click card to preview'
                  )}
                </span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApplyTheme(theme.id, theme.config);
                  }}
                  disabled={isSaving && activeTheme === theme.id}
                  className="bg-gray-900 hover:bg-black text-white px-4 py-1.5 rounded-lg font-medium text-sm transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSaving && activeTheme === theme.id ? 'Saving...' : 'Publish'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content: Live Preview Iframe */}
      <div className="w-2/3 bg-gray-200 rounded-3xl overflow-hidden border-4 border-gray-300 relative shadow-inner">
        <div className="absolute top-0 left-0 right-0 h-10 bg-gray-300 flex items-center px-4 gap-2 z-10">
          <div className="w-3 h-3 rounded-full bg-red-400"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
          <div className="w-3 h-3 rounded-full bg-green-400"></div>
          <div className="ml-4 bg-white/50 px-3 py-1 rounded text-xs font-mono text-gray-700">
            {storeSlug ? `maghgo.goatech.tech/${storeSlug}` : 'Loading...'}
          </div>
        </div>
        {storeSlug ? (
          <iframe 
            ref={iframeRef}
            src={`/${storeSlug}`}
            className="w-full h-full pt-10"
            title="Store Preview"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center pt-10">
            <span className="text-gray-500 font-medium">Loading store preview...</span>
          </div>
        )}
      </div>
    </div>
  );
}
