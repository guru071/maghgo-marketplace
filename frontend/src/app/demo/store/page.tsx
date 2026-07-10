import React, { Suspense } from 'react';
import { DemoStorefront } from '@/components/demo-store/DemoStorefront';

export default function DemoStorePage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading Demo Store...</div>}>
      <DemoStorefront />
    </Suspense>
  );
}
