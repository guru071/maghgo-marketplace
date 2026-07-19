import React from 'react';
import Link from 'next/link';

export const revalidate = 30; // live-ish tracking without hammering the API

const STEPS = ['sent', 'confirmed', 'processing', 'delivered'] as const;
const STEP_LABEL: Record<string, string> = {
  sent: 'Order placed', confirmed: 'Confirmed', processing: 'Being prepared', delivered: 'Delivered',
};

/**
 * Public order tracking — the link customers get in their order messages.
 * The order UUID is the access token; the API returns no phone or address.
 */
export default async function TrackOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  let order: any = null;
  try {
    const res = await fetch(`${apiUrl}/api/store/orders/${encodeURIComponent(id)}/track`, { next: { revalidate: 30 } });
    if (res.ok) order = await res.json();
  } catch { /* render not-found below */ }

  if (!order) {
    return (
      <main style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem' }}>🔎</div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Order not found</h1>
          <p style={{ color: '#6b7280' }}>Check the link from your chat and try again.</p>
        </div>
      </main>
    );
  }

  const cancelled = order.status === 'cancelled';
  const activeIdx = cancelled ? -1 : Math.max(0, STEPS.indexOf(order.status));
  const symbol = order.currency === 'INR' ? '₹' : `${order.currency} `;

  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: 520, margin: '0 auto', background: '#fff', border: '1px solid #eee', borderRadius: 20, padding: '1.75rem', boxShadow: '0 10px 40px rgba(0,0,0,0.05)' }}>
        <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order · {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        <h1 style={{ margin: '4px 0 2px', fontSize: '1.4rem', fontWeight: 800 }}>{order.store_name ?? 'Your order'}</h1>
        <p style={{ margin: '0 0 1.25rem', fontWeight: 700, color: '#111' }}>
          {symbol}{Number(order.total).toLocaleString('en-IN')}
          {order.payment_status === 'paid'
            ? <span style={{ marginLeft: 8, fontSize: '0.7rem', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '3px 8px', borderRadius: 999 }}>💰 PAID</span>
            : <span style={{ marginLeft: 8, fontSize: '0.7rem', fontWeight: 700, color: '#b45309', background: '#fffbeb', padding: '3px 8px', borderRadius: 999 }}>PAYMENT PENDING</span>}
        </p>

        {cancelled ? (
          <div style={{ background: '#fef2f2', color: '#b91c1c', fontWeight: 600, padding: '0.8rem 1rem', borderRadius: 12, marginBottom: '1.25rem' }}>
            ❌ This order was cancelled. Contact the shop if you have questions.
          </div>
        ) : (
          <div style={{ margin: '0 0 1.5rem' }}>
            {STEPS.map((step, i) => {
              const done = i <= activeIdx;
              const current = i === activeIdx;
              return (
                <div key={step} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, background: done ? '#059669' : '#e5e7eb', color: done ? '#fff' : '#9ca3af' }}>
                      {done ? '✓' : i + 1}
                    </div>
                    {i < STEPS.length - 1 && <div style={{ width: 2, height: 26, background: i < activeIdx ? '#059669' : '#e5e7eb' }} />}
                  </div>
                  <p style={{ margin: '3px 0 0', fontWeight: current ? 800 : 500, color: done ? '#111' : '#9ca3af' }}>{STEP_LABEL[step]}</p>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '1rem' }}>
          {order.items.map((li: any, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              {li.image_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={li.image_url} alt={li.title} style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', border: '1px solid #eee' }} />
                : <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📦</div>}
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{li.quantity} × {li.title}</p>
                {li.variant && <p style={{ margin: 0, fontSize: '0.75rem', color: '#6366f1' }}>{li.variant}</p>}
              </div>
            </div>
          ))}
        </div>

        {order.store_slug && (
          <Link href={`/${order.store_slug}`} style={{ display: 'block', textAlign: 'center', marginTop: '1rem', background: '#111', color: '#fff', padding: '0.75rem', borderRadius: 999, fontWeight: 600, textDecoration: 'none' }}>
            🛍️ Shop again at {order.store_name}
          </Link>
        )}
      </div>
    </main>
  );
}
