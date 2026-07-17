'use client';

import React, { useEffect, useState } from 'react';

export default function DomainPage() {
  const [domain, setDomain] = useState('');
  const [saved, setSaved] = useState<string | null>(null);
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    const token = localStorage.getItem('maghgo_merchant_token');
    if (!token) return setLoading(false);
    fetch(`${apiUrl}/api/dashboard/store`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setSlug(d.store_slug || '');
        setSaved(d.custom_domain || null);
        setDomain(d.custom_domain || '');
      })
      .finally(() => setLoading(false));
  }, [apiUrl]);

  const save = async (value: string) => {
    setBusy(true);
    setMsg(null);
    try {
      const token = localStorage.getItem('maghgo_merchant_token');
      const res = await fetch(`${apiUrl}/api/dashboard/domain`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ custom_domain: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save');
      setSaved(data.custom_domain);
      setDomain(data.custom_domain || '');
      setMsg({ kind: 'ok', text: data.custom_domain ? 'Domain saved. Now add the DNS records below.' : 'Custom domain removed.' });
    } catch (e: any) {
      setMsg({ kind: 'err', text: e.message });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="text-gray-500">Loading…</div>;

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-black text-gray-900 mb-2">Custom Domain</h1>
      <p className="text-gray-600 mb-8">
        Serve your store from your own domain instead of{' '}
        <span className="font-mono text-sm">maghgo.goatech.tech/{slug || 'your-store'}</span>.
      </p>

      <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm mb-6">
        <label className="block text-sm font-bold text-gray-700 mb-2">Your domain</label>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="mystore.com"
            className="flex-1 min-w-[220px] bg-white border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
          />
          <button
            onClick={() => save(domain)}
            disabled={busy || !domain.trim()}
            className="bg-accent text-white px-6 py-3 rounded-lg font-bold hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {busy ? 'Saving…' : saved ? 'Update' : 'Add Domain'}
          </button>
          {saved && (
            <button
              onClick={() => save('')}
              disabled={busy}
              className="px-4 py-3 rounded-lg font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              Remove
            </button>
          )}
        </div>

        {msg && (
          <p className={`mt-3 text-sm ${msg.kind === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>{msg.text}</p>
        )}

        {saved && (
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold text-xs uppercase">Claimed</span>
            <span className="font-mono text-gray-700">{saved}</span>
          </div>
        )}
      </div>

      {saved && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          <h2 className="text-xl font-bold mb-2">Finish setup</h2>
          <p className="text-gray-600 text-sm mb-6">
            Two steps remain, and both happen outside Maghgo — we can&apos;t do them for you.
          </p>

          <ol className="space-y-6">
            <li>
              <h3 className="font-bold text-gray-900 mb-2">1. Add these records at your registrar</h3>
              <p className="text-sm text-gray-500 mb-3">GoDaddy, Namecheap, Cloudflare — wherever you bought {saved}.</p>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs sm:text-sm overflow-x-auto">
                <div className="mb-3">
                  <div className="text-gray-400"># apex domain ({saved})</div>
                  <div>Type: A &nbsp;&nbsp; Name: @ &nbsp;&nbsp; Value: 76.76.21.21</div>
                </div>
                <div>
                  <div className="text-gray-400"># www subdomain</div>
                  <div>Type: CNAME &nbsp;&nbsp; Name: www &nbsp;&nbsp; Value: cname.vercel-dns.com</div>
                </div>
              </div>
            </li>
            <li>
              <h3 className="font-bold text-gray-900 mb-2">2. Add the domain in your hosting project</h3>
              <p className="text-sm text-gray-600">
                In Vercel → your project → <strong>Settings → Domains</strong> → add <span className="font-mono">{saved}</span>.
                SSL is issued automatically once DNS propagates (usually minutes, up to 48h).
              </p>
            </li>
          </ol>

          <p className="text-xs text-gray-400 mt-6">
            Until both steps are done, your store stays reachable at maghgo.goatech.tech/{slug}.
          </p>
        </div>
      )}
    </div>
  );
}
