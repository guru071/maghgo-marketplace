import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

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

    // Since this is just a quick API for the builder (and we don't have proper auth yet),
    // we use the anon key if we can't get a service role key. 
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

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
          'x-revalidate-secret': process.env.REVALIDATION_SECRET || '',
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
