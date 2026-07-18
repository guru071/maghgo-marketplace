'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

const apiUrl = () => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function StoreQRPage() {
  const [storeUrl, setStoreUrl] = useState<string | null>(null);
  const [storeName, setStoreName] = useState('');
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('maghgo_merchant_token');
        const res = await fetch(`${apiUrl()}/api/dashboard/store`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const m = await res.json();
          setStoreName(m.store_name || 'your store');
          // Prefer a connected custom domain; otherwise the store lives at
          // /<slug> on this same host.
          const url = m.custom_domain
            ? `https://${m.custom_domain}`
            : `${window.location.origin}/${m.store_slug}`;
          setStoreUrl(url);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!storeUrl) return;
    QRCode.toDataURL(storeUrl, { width: 1024, margin: 2, errorCorrectionLevel: 'H', color: { dark: '#111111', light: '#ffffff' } })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [storeUrl]);

  const download = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${storeName.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'store'}-qr.png`;
    a.click();
  };

  const printQR = () => {
    if (!dataUrl) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html><head><title>${storeName} — Store QR</title>
      <style>body{font-family:system-ui,sans-serif;text-align:center;padding:40px}
      img{width:320px;height:320px}h1{font-size:22px;margin:8px 0}p{color:#555}</style></head>
      <body onload="window.print()">
        <h1>${storeName}</h1>
        <p>Scan to shop online</p>
        <img src="${dataUrl}" alt="Store QR code" />
        <p style="margin-top:16px;font-size:13px">${storeUrl}</p>
      </body></html>`);
    w.document.close();
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Store QR Code</h1>
        <p className="text-gray-500 mt-1">Print it for your shop counter, packaging or posters. Customers scan it to open your web store instantly.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md">
        {loading ? (
          <div className="text-gray-500 text-center py-12">Loading…</div>
        ) : !storeUrl ? (
          <div className="text-red-500 text-center py-12">Couldn&apos;t load your store. Your session may have expired.</div>
        ) : (
          <div className="text-center">
            <div className="inline-block bg-white p-4 rounded-xl border border-gray-200">
              {dataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={dataUrl} alt={`QR code for ${storeName}`} width={256} height={256} className="w-64 h-64" />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center text-gray-400">Generating…</div>
              )}
            </div>
            <p className="mt-4 font-semibold text-gray-900">{storeName}</p>
            <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-accent break-all hover:underline">{storeUrl}</a>

            <div className="mt-6 flex gap-3 justify-center">
              <button onClick={download} disabled={!dataUrl}
                className="bg-accent text-white px-6 py-2.5 rounded-full font-medium hover:bg-black transition-colors disabled:opacity-50">
                Download PNG
              </button>
              <button onClick={printQR} disabled={!dataUrl}
                className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-full font-medium hover:bg-gray-50 transition-colors disabled:opacity-50">
                Print
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
