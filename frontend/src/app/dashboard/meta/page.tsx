'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { whatsappLink, instagramLink, messengerLink } from '@/lib/site-config';

const apiUrl = () => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('maghgo_merchant_token') : ''}`,
});

export default function MetaCatalogPage() {
  const [connectedId, setConnectedId] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [catalogId, setCatalogId] = useState('');
  const [token, setToken] = useState('');

  const load = async () => {
    try {
      const res = await fetch(`${apiUrl()}/api/dashboard/store`, { headers: authHeaders() });
      if (res.ok) {
        const d = await res.json();
        setConnectedId(d.meta_catalog_id ?? null);
        setLastSync(d.meta_catalog_last_sync ?? null);
      }
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const connect = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`${apiUrl()}/api/dashboard/meta-catalog/connect`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ catalog_id: catalogId, access_token: token }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not connect');
      setConnectedId(d.meta_catalog_id);
      setToken('');
      setMsg({ ok: true, text: 'Connected! Now import your products below.' });
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const importNow = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`${apiUrl()}/api/dashboard/meta-catalog/import`, { method: 'POST', headers: authHeaders() });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Import failed');
      setLastSync(new Date().toISOString());
      setMsg({
        ok: true,
        text: `Imported ${d.imported} new product(s). Skipped ${d.skipped} (already added or empty).` +
          (d.limitReached ? ' Some were skipped — you hit your plan\'s product limit.' : ''),
      });
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!confirm('Disconnect your Meta catalog? Products already imported stay in your store.')) return;
    setBusy(true); setMsg(null);
    try {
      await fetch(`${apiUrl()}/api/dashboard/meta-catalog`, { method: 'DELETE', headers: authHeaders() });
      setConnectedId(null); setLastSync(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Meta Catalog</h1>
        <p className="text-gray-500 mt-1">Import products from your Facebook / Instagram Shop catalogue into Maghgo. They&apos;ll show on your storefront and in the chat bot.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Connection</h2>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${connectedId ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {connectedId ? '● Connected' : 'Not connected'}
          </span>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : connectedId ? (
          <div>
            <p className="text-sm text-gray-600 mb-1">Catalog ID: <code className="bg-gray-50 border border-gray-200 rounded px-2 py-0.5 text-xs">{connectedId}</code></p>
            {lastSync && <p className="text-xs text-gray-400 mb-4">Last import: {new Date(lastSync).toLocaleString('en-IN')}</p>}
            <div className="flex flex-wrap gap-3">
              <button onClick={importNow} disabled={busy} className="bg-accent text-white px-6 py-2.5 rounded-full font-medium hover:bg-black disabled:opacity-50">
                {busy ? 'Importing…' : '⬇️ Import products'}
              </button>
              <button onClick={disconnect} disabled={busy} className="text-sm font-medium text-red-600 hover:text-red-700">Disconnect</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Catalog ID</label>
              <input value={catalogId} onChange={(e) => setCatalogId(e.target.value.trim())} placeholder="e.g. 1234567890123456"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 font-mono text-sm focus:ring-accent focus:border-accent" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Meta access token</label>
              <input type="password" value={token} onChange={(e) => setToken(e.target.value.trim())} autoComplete="off" placeholder="Token with access to this catalogue"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 font-mono text-sm focus:ring-accent focus:border-accent" />
              <p className="text-xs text-gray-500 mt-2">🔒 Stored encrypted on the server and never shown again.</p>
            </div>
            <button onClick={connect} disabled={busy || !catalogId || !token} className="bg-accent text-white px-6 py-2.5 rounded-full font-medium hover:bg-black disabled:opacity-50">
              {busy ? 'Connecting…' : 'Connect catalog'}
            </button>
          </div>
        )}

        {msg && <p className={`text-sm mt-4 ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</p>}
      </div>

      {/* Where to find the catalog values */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 text-sm text-blue-900 mb-8">
        <h3 className="font-semibold mb-2">Where do I find the Catalog ID &amp; token?</h3>
        <ol className="list-decimal list-inside space-y-1 text-blue-800">
          <li>Open <strong>Meta Commerce Manager</strong> → your catalogue. The <strong>Catalog ID</strong> is in its settings / URL.</li>
          <li>In <strong>Meta Business Settings → Users → System Users</strong>, generate a token with access to that catalogue (the <code>catalog_management</code> permission).</li>
          <li>Paste both above and connect, then tap <strong>Import products</strong>.</li>
        </ol>
        <p className="mt-3 text-blue-700">This reads <em>your own</em> catalogue with <em>your own</em> token — no Meta app review needed. Re-import any time to pull in new products (existing ones aren&apos;t duplicated).</p>
      </div>

      {/* Full tutorial */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-8">
        <h2 className="text-xl font-bold text-gray-900">📖 How Maghgo works — full guide</h2>

        {/* Two-bot model */}
        <section>
          <h3 className="font-semibold text-gray-900 mb-2">1. The two bots</h3>
          <p className="text-sm text-gray-600 mb-3">Maghgo sits in the middle. There are really two conversations:</p>
          <div className="bg-gray-50 rounded-xl p-4 text-sm font-mono text-gray-700 overflow-x-auto whitespace-pre">
{`  You (shop owner)  ⇄  Maghgo bot     →  add products, prices, themes, orders
  Your customer     ⇄  your shop bot  →  browse your products, buy & pay`}
          </div>
          <p className="text-sm text-gray-500 mt-3">Same bot number — it knows you&apos;re the owner, and treats your customers as shoppers of <em>your</em> store.</p>
        </section>

        {/* Connect channels */}
        <section>
          <h3 className="font-semibold text-gray-900 mb-2">2. Connect your Instagram / Facebook / WhatsApp to Maghgo</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
            <li><strong>WhatsApp</strong> — message the Maghgo bot and send <code className="bg-gray-100 px-1 rounded">REGISTER Your Store Name</code>. That creates your store.</li>
            <li><strong>Add Instagram / Messenger to the same store</strong> — on WhatsApp send <code className="bg-gray-100 px-1 rounded">LINK</code> to get a code, then message the Maghgo bot on that app with <code className="bg-gray-100 px-1 rounded">LINK &lt;code&gt;</code>. Now all channels manage one store.</li>
            <li><strong>Show your socials on your storefront</strong> — send <code className="bg-gray-100 px-1 rounded">SET INSTAGRAM yourhandle</code>, <code className="bg-gray-100 px-1 rounded">SET FACEBOOK your-page-url</code>, or <code className="bg-gray-100 px-1 rounded">SET WHATSAPP number</code>.</li>
          </ol>
          <div className="flex flex-wrap gap-2 mt-4">
            {whatsappLink('LINK') && <a href={whatsappLink('LINK')!} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold px-3 py-2 rounded-full bg-[#25D366] text-white">Open Maghgo on WhatsApp</a>}
            {instagramLink() && <a href={instagramLink()!} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold px-3 py-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white">Open on Instagram</a>}
            {messengerLink() && <a href={messengerLink()!} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold px-3 py-2 rounded-full bg-[#0084FF] text-white">Open on Messenger</a>}
          </div>
        </section>

        {/* Meta import */}
        <section>
          <h3 className="font-semibold text-gray-900 mb-2">3. Bring your Meta Shop products in</h3>
          <p className="text-sm text-gray-600">Connect your catalogue above and tap <strong>Import products</strong>. Your Facebook/Instagram Shop products become Maghgo products, so they instantly show on your storefront <em>and</em> in your shop bot for customers.</p>
        </section>

        {/* Buying & contact */}
        <section>
          <h3 className="font-semibold text-gray-900 mb-2">4. How customers buy &amp; contact you</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
            <li>They open your store link, <strong>tap a product to see its details &amp; specifications</strong>, choose options (size/colour), and add to cart.</li>
            <li>At checkout they can <strong>Pay Online</strong> or reach you on <strong>WhatsApp / Call / Instagram</strong> — those buttons come from the socials you set above.</li>
            <li>In chat, a customer can also send <code className="bg-gray-100 px-1 rounded">SHOP your-store</code> to browse and order right inside the bot.</li>
          </ul>
        </section>

        {/* Razorpay */}
        <section>
          <h3 className="font-semibold text-gray-900 mb-2">5. Where is the Razorpay payment?</h3>
          <p className="text-sm text-gray-600">
            Go to <Link href="/dashboard/settings" className="text-accent font-medium hover:underline">Settings → Accept Online Payments</Link> and connect <strong>your own</strong> Razorpay account.
            Once connected, a <strong>&ldquo;Pay Online Now&rdquo;</strong> button appears at checkout on your storefront and in the bot — and the money goes straight to <em>your</em> bank, not to Maghgo.
          </p>
        </section>
      </div>
    </div>
  );
}
