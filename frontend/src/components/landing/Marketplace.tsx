import React from 'react';
import Link from 'next/link';

interface DirProduct {
  title: string;
  price: number;
  processed_image_url: string | null;
  original_image_url: string | null;
}
interface DirShop {
  store_name: string;
  store_slug: string;
  store_logo_url: string | null;
  store_description: string | null;
  products: DirProduct[];
}

const inr = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;

/**
 * Live directory of real stores on Maghgo, shown on the landing page. Each card
 * previews a shop and a few of its products and links to the storefront. Purely
 * presentational — the parent page fetches and filters the data server-side.
 */
export function Marketplace({ shops }: { shops: DirShop[] }) {
  if (!shops || shops.length === 0) return null;

  return (
    <section id="shops" className="marketplace" style={{ padding: '5rem 0' }}>
      <div className="container">
        <h2 className="pricing__title">Live stores on Maghgo</h2>
        <p className="pricing__subtitle">Real shops, built from a chat. Tap any store to browse and order.</p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.5rem',
            marginTop: '2.5rem',
          }}
        >
          {shops.map((shop) => {
            const products = (shop.products || []).slice(0, 4);
            return (
              <Link
                key={shop.store_slug}
                href={`/${shop.store_slug}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  background: '#fff',
                  border: '1px solid #ececec',
                  borderRadius: 16,
                  overflow: 'hidden',
                  textDecoration: 'none',
                  color: 'inherit',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                {/* Product thumbnails */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, background: '#f3f4f6', aspectRatio: '2 / 1' }}>
                  {products.slice(0, 4).map((p, i) => {
                    const img = p.processed_image_url || p.original_image_url;
                    return (
                      <div key={i} style={{ position: 'relative', background: '#f3f4f6', overflow: 'hidden' }}>
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={img} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%' }} />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Shop info */}
                <div style={{ padding: '1rem 1.25rem 1.25rem', display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {shop.store_logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={shop.store_logo_url} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>
                        {shop.store_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <strong style={{ fontSize: '1.02rem', lineHeight: 1.2 }}>{shop.store_name}</strong>
                  </div>
                  {shop.store_description && (
                    <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {shop.store_description}
                    </p>
                  )}
                  <div style={{ marginTop: 'auto', paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                      {products.length ? `From ${inr(Math.min(...products.map((p) => p.price)))}` : 'New store'}
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent)' }}>Visit →</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
