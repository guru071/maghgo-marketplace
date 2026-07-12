'use server';

import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

export async function getOffers() {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get offers:', error);
    return [];
  }
  return data;
}

export async function createOrUpdateOffer(offer: any) {
  const supabase = createAdminSupabaseClient();
  let query;
  
  if (offer.id) {
    query = supabase.from('offers').update(offer).eq('id', offer.id);
  } else {
    query = supabase.from('offers').insert([offer]);
  }

  const { error } = await query;
  if (error) return { success: false, error: error.message };

  revalidatePath('/');
  revalidatePath('/goatech-admin-hq/offers');
  return { success: true };
}

export async function toggleOffer(id: number, is_active: boolean) {
  const supabase = createAdminSupabaseClient();
  // Deactivate all others if this one is being activated
  if (is_active) {
    await supabase.from('offers').update({ is_active: false }).neq('id', id);
  }
  
  const { error } = await supabase
    .from('offers')
    .update({ is_active })
    .eq('id', id);

  if (error) return { success: false, error: error.message };

  revalidatePath('/');
  revalidatePath('/goatech-admin-hq/offers');
  return { success: true };
}
