'use client';

import React, { useEffect, useState } from 'react';

const apiUrl = () => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('maghgo_merchant_token') : ''}`,
});

export default function ApiPage() {
  const [prefix, setPrefix] = useState<string | null>(null);
  const [fullKey, setFullKey] = useState<string | null>(null); // shown once
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState('');

  const load = async () => {
    try {
      const res = await fetch(`${apiUrl()}/api/dashboard/store`, { headers: authHeaders() });
      if (res.ok) {
        const d = await res.json();
        setPrefix(d.api_key_prefix ?? null);
      }
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const generate = async () => {
    if (prefix && !confirm('This replaces your existing key — any system using the old one will stop working. Continue?')) return;
    setBusy(true);
    try {
      const res = await fetch(`${apiUrl()}/api/dashboard/api-key`, { method: 'POST', headers: authHeaders() });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not generate key');
      setFullKey(d.api_key);
      setPrefix(d.api_key_prefix);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    if (!confirm('Revoke your API key? Any connected system will stop working immediately.')) return;
    setBusy(true);
    try {
      await fetch(`${apiUrl()}/api/dashboard/api-key`, { method: 'DELETE', headers: authHeaders() });
      setPrefix(null);
      setFullKey(null);
    } finally {
      setBusy(false);
    }
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 1500);
  };

  const base = `${apiUrl()}/api/v1`;
  const keyForDocs = fullKey || 'mgk_live_YOUR_KEY';

  const curlList = `curl ${base}/products \\\n  -H "Authorization: Bearer ${keyForDocs}"`;
  const curlCreate = `curl -X POST ${base}/products \\\n  -H "Authorization: Bearer ${keyForDocs}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "title": "Red Cotton T-Shirt",\n    "price": 499,\n    "image_url": "https://yoursite.com/img/red-shirt.jpg",\n    "category": "T-Shirt",\n    "stock": 20,\n    "variants": [{ "name": "Size", "values": ["S","M","L"] }]\n  }'`;

  const endpoints: [string, string, string][] = [
    ['GET', '/api/v1/store', 'Your store details'],
    ['GET', '/api/v1/products', 'List all your products'],
    ['POST', '/api/v1/products', 'Create a product'],
    ['PATCH', '/api/v1/products/:id', 'Update a product (price, stock, availability…)'],
    ['DELETE', '/api/v1/products/:id', 'Delete a product'],
    ['GET', '/api/v1/orders', 'List your orders (read-only)'],
  ];

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">API &amp; Integrations</h1>
        <p className="text-gray-500 mt-1">Connect your own website or system to Maghgo. Push products in and read orders out over HTTP.</p>
      </div>

      {/* Key card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Your API key</h2>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${prefix ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {prefix ? '● Active' : 'None'}
          </span>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : fullKey ? (
          <div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-3">
              <p className="text-sm text-amber-800 font-medium mb-2">⚠️ Copy this now — it&apos;s shown only once.</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white border border-amber-200 rounded px-3 py-2 text-sm font-mono break-all">{fullKey}</code>
                <button onClick={() => copy(fullKey, 'key')} className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-black whitespace-nowrap">
                  {copied === 'key' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <button onClick={revoke} disabled={busy} className="text-sm font-medium text-red-600 hover:text-red-700">Revoke key</button>
          </div>
        ) : prefix ? (
          <div className="flex flex-wrap items-center gap-3">
            <code className="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm font-mono">{prefix}</code>
            <button onClick={generate} disabled={busy} className="text-sm font-medium text-accent hover:underline">Regenerate</button>
            <button onClick={revoke} disabled={busy} className="text-sm font-medium text-red-600 hover:text-red-700">Revoke</button>
          </div>
        ) : (
          <div>
            <p className="text-gray-500 text-sm mb-4">Generate a key to start calling the Maghgo API from your own code.</p>
            <button onClick={generate} disabled={busy} className="bg-accent text-white px-6 py-2.5 rounded-full font-medium hover:bg-black disabled:opacity-50">
              {busy ? 'Generating…' : 'Generate API key'}
            </button>
          </div>
        )}
      </div>

      {/* Docs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Quick start</h2>
          <p className="text-sm text-gray-500 mb-3">
            Base URL <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{base}</code>. Send your key on every request as
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs ml-1">Authorization: Bearer &lt;key&gt;</code> (or the <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">X-API-Key</code> header).
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Endpoints</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {endpoints.map(([m, path, desc]) => (
                  <tr key={path} className="border-b border-gray-100">
                    <td className="py-2 pr-3"><span className={`text-xs font-bold px-2 py-0.5 rounded ${m === 'GET' ? 'bg-blue-100 text-blue-700' : m === 'POST' ? 'bg-green-100 text-green-700' : m === 'PATCH' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{m}</span></td>
                    <td className="py-2 pr-3 font-mono text-xs text-gray-800 whitespace-nowrap">{path}</td>
                    <td className="py-2 text-gray-500">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {[['List your products', curlList], ['Create a product', curlCreate]].map(([label, code]) => (
          <div key={label}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
              <button onClick={() => copy(code, label)} className="text-xs font-medium text-accent hover:underline">
                {copied === label ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto"><code>{code}</code></pre>
          </div>
        ))}

        <p className="text-xs text-gray-400">
          Products you create via the API appear on your storefront and in the bot immediately. Provide <code className="bg-gray-100 px-1 rounded">image_url</code> as a public link to your product photo.
        </p>
      </div>
    </div>
  );
}
