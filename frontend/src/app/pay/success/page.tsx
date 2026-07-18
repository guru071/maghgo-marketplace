'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

type State = 'verifying' | 'paid' | 'failed';

function PaySuccessInner() {
  const params = useSearchParams();
  const [state, setState] = useState<State>('verifying');
  const [storeSlug, setStoreSlug] = useState<string | null>(null);

  useEffect(() => {
    const payload = {
      razorpay_payment_id: params.get('razorpay_payment_id'),
      razorpay_payment_link_id: params.get('razorpay_payment_link_id'),
      razorpay_payment_link_reference_id: params.get('razorpay_payment_link_reference_id'),
      razorpay_payment_link_status: params.get('razorpay_payment_link_status'),
      razorpay_signature: params.get('razorpay_signature'),
    };

    if (!payload.razorpay_payment_link_id || !payload.razorpay_signature) {
      setState('failed');
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    fetch(`${apiUrl}/api/store/pay/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (ok && d.ok) {
          setStoreSlug(d.store_slug ?? null);
          setState('paid');
        } else {
          setState('failed');
        }
      })
      .catch(() => setState('failed'));
  }, [params]);

  return (
    <main style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ maxWidth: 460, width: '100%', textAlign: 'center', background: '#fff', border: '1px solid #eee', borderRadius: 20, padding: '2.5rem', boxShadow: '0 10px 40px rgba(0,0,0,0.06)' }}>
        {state === 'verifying' && (
          <>
            <div style={{ fontSize: '2.5rem' }}>⏳</div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0.75rem 0' }}>Confirming your payment…</h1>
            <p style={{ color: '#6b7280' }}>Just a moment while we verify it securely.</p>
          </>
        )}
        {state === 'paid' && (
          <>
            <div style={{ fontSize: '3rem' }}>✅</div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.75rem 0' }}>Payment successful!</h1>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>Your order is confirmed and the shop has been notified. Thank you! 🙏</p>
            {storeSlug && (
              <Link href={`/${storeSlug}`} style={{ display: 'inline-block', background: '#111', color: '#fff', padding: '0.75rem 1.75rem', borderRadius: 999, fontWeight: 600, textDecoration: 'none' }}>
                Back to store
              </Link>
            )}
          </>
        )}
        {state === 'failed' && (
          <>
            <div style={{ fontSize: '3rem' }}>⚠️</div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0.75rem 0' }}>We couldn&apos;t confirm this payment</h1>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              If money was deducted, don&apos;t worry — it will be verified automatically, or you can contact the shop to confirm.
            </p>
            <Link href="/" style={{ display: 'inline-block', background: '#111', color: '#fff', padding: '0.75rem 1.75rem', borderRadius: 999, fontWeight: 600, textDecoration: 'none' }}>
              Go home
            </Link>
          </>
        )}
      </div>
    </main>
  );
}

export default function PaySuccessPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: '80vh' }} />}>
      <PaySuccessInner />
    </Suspense>
  );
}
