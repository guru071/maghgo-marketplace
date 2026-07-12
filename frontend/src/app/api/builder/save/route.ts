import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { store_slug, theme_config } = body;

    if (!store_slug || !theme_config) {
      return NextResponse.json(
        { error: 'Missing store_slug or theme_config' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminSupabaseClient();

    const { error } = await supabaseAdmin
      .from('merchants')
      .update({ theme_config })
      .eq('store_slug', store_slug);

    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json(
        { error: 'Failed to save layout to database' },
        { status: 500 }
      );
    }

    // Trigger ISR revalidation for the public store
    try {
      const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
      await fetch(`${baseUrl}/api/revalidate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-revalidation-secret': process.env.REVALIDATION_SECRET || '',
        },
        body: JSON.stringify({ path: `/${store_slug}` }),
      });
    } catch (revalErr) {
      console.warn('Revalidation failed after save, but data was saved.', revalErr);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Save builder API error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
