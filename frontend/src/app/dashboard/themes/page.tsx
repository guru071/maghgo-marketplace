'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

interface Theme {
  id: string;
  name: string;
  description: string;
  plan_required: string;
  config: any;
  premium: boolean;
  locked: boolean;
}

/**
 * Convert a colour-only theme config into a Puck layout. Premium themes already
 * carry a full content[] layout and are applied as-is — running them through
 * this would flatten a designed store into a header + grid.
 */
function toPuck(config: any) {
  if (Array.isArray(config?.content) && config.content.length) return config;
  const c = config?.colors ?? {};
  return {
    content: [
      { type: 'StoreHeader', props: { title: '', subtitle: '', bgColor: c.primary ?? '#ffffff', textColor: c.background ?? '#111111' } },
      { type: 'ProductGrid', props: { columns: 3, showPrices: true, gap: config?.layout?.spacing ?? '24px', cardBg: c.background ?? '#ffffff', accent: c.primary ?? '#FF7518', cardStyle: 'classic', animation: 'rise' } },
    ],
    root: { props: { title: 'Store', background: c.background ?? '#ffffff', text: c.text ?? '#111111' } },
    zones: {},
  };
}

const badge = (t: Theme) => {
  const g = t.config?.content?.find((b: any) => b.type === 'ProductGrid');
  return g ? `${g.props?.cardStyle ?? 'classic'} · ${g.props?.animation ?? 'rise'}` : 'colour theme';
};

export default function ThemesPage() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [plan, setPlan] = useState('');
  const [storeSlug, setStoreSlug] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState<string>('');
  const [onlyPremium, setOnlyPremium] = useState(true);
  const [query, setQuery] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    const token = localStorage.getItem('maghgo_merchant_token');
    if (!token) return setLoading(false);
    const auth = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${apiUrl}/api/dashboard/themes`, { headers: auth }).then((r) => (r.ok ? r.json() : { themes: [] })),
      fetch(`${apiUrl}/api/dashboard/store`, { headers: auth }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([t, s]) => {
        setThemes(t.themes ?? []);
        setPlan(t.plan ?? '');
        if (s) setStoreSlug(s.store_slug || '');
      })
      .finally(() => setLoading(false));
  }, [apiUrl]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return themes.filter((t) => (!onlyPremium || t.premium) && (!q || t.name.toLowerCase().includes(q)));
  }, [themes, onlyPremium, query]);

  const preview = (t: Theme) => {
    setActive(t.id);
    iframeRef.current?.contentWindow?.postMessage({ type: 'MAGHGO_PREVIEW_THEME', theme: toPuck(t.config) }, '*');
  };

  const apply = async (t: Theme) => {
    if (t.locked) return alert(`"${t.name}" needs the ${t.plan_required.toUpperCase()} plan.`);
    setSaving(true);
    try {
      const token = localStorage.getItem('maghgo_merchant_token');
      const res = await fetch(`${apiUrl}/api/dashboard/theme`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ theme_config: toPuck(t.config) }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      alert(`"${t.name}" applied. Your storefront is updated.`);
    } catch (e: any) {
      alert(e.message || 'Could not apply that theme.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-gray-500">Loading themes…</div>;

  const premiumCount = themes.filter((t) => t.premium).length;

  return (
    <div className="h-[calc(100vh-64px)] flex gap-6 overflow-hidden pr-4 pb-4 -mt-2 -mr-4">
      <div className="w-[38%] overflow-y-auto space-y-4 pb-20 pr-2">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-1">Themes</h1>
          <p className="text-gray-600 text-sm">
            {premiumCount} premium designs and {themes.length - premiumCount} colour themes. Tap to preview, then apply.
          </p>
        </div>

        <div className="flex gap-2 items-center sticky top-0 bg-gray-50 py-2 z-10">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search themes…"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <button
            onClick={() => setOnlyPremium((v) => !v)}
            className={`text-xs font-bold px-3 py-2 rounded-lg whitespace-nowrap ${onlyPremium ? 'bg-accent text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            {onlyPremium ? 'Premium only' : 'All themes'}
          </button>
        </div>

        {shown.length === 0 && <p className="text-gray-500 text-sm">No themes match.</p>}

        {shown.map((t) => (
          <div
            key={t.id}
            onClick={() => preview(t)}
            className={`bg-white rounded-xl border p-4 cursor-pointer transition-all ${
              active === t.id ? 'border-accent ring-2 ring-accent/20' : 'border-gray-200 hover:border-gray-300'
            } ${t.locked ? 'opacity-70' : ''}`}
          >
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 text-sm truncate">{t.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{badge(t)}</p>
              </div>
              <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase shrink-0 ${t.locked ? 'bg-gray-200 text-gray-600' : 'bg-emerald-100 text-emerald-700'}`}>
                {t.locked ? `🔒 ${t.plan_required}` : t.plan_required}
              </span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); apply(t); }}
              disabled={saving || t.locked}
              className="mt-3 w-full bg-accent text-white text-xs font-bold py-2 rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {t.locked ? `Needs ${t.plan_required.toUpperCase()}` : saving ? 'Applying…' : 'Apply to my store'}
            </button>
          </div>
        ))}
      </div>

      <div className="flex-1 bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {storeSlug ? (
          <iframe ref={iframeRef} src={`/${storeSlug}`} className="w-full h-full border-0" title="Store preview" />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm">Preview unavailable</div>
        )}
      </div>
    </div>
  );
}
