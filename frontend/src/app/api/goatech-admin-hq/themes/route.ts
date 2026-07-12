import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate payload
    if (!body.name || !body.plan_required) {
      return NextResponse.json({ error: 'Name and Plan Required are mandatory.' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    
    // Insert into themes
    const { data, error } = await supabase
      .from('themes')
      .insert([
        {
          name: body.name,
          description: body.description || '',
          plan_required: body.plan_required,
          config: body.config || {}
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error('Error creating theme:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
