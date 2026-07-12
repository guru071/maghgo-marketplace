import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';

export async function POST(req: Request) {
  try {
    const { store_slug, theme_id } = await req.json();
    if (!store_slug || !theme_id) {
      return NextResponse.json({ error: 'Missing store_slug or theme_id' }, { status: 400 });
    }

    const supabaseAdmin = createAdminSupabaseClient();

    // Fetch the theme config
    const { data: theme, error: themeError } = await supabaseAdmin
      .from('themes')
      .select('config')
      .eq('id', theme_id)
      .single();

    if (themeError || !theme) {
      return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
    }

    // Apply the config to the merchant
    const { error: updateError } = await supabaseAdmin
      .from('merchants')
      .update({ theme_config: theme.config })
      .eq('store_slug', store_slug);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Theme applied successfully!' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
