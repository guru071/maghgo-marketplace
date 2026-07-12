'use server';

import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

export async function getPlans() {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .order('monthly_price', { ascending: true });

  if (error) {
    console.error('Failed to get plans:', error);
    return [];
  }
  return data;
}

export async function updatePlanPrice(id: number, monthly_price: number, yearly_price: number, product_limit: number) {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from('plans')
    .update({ monthly_price, yearly_price, product_limit })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/'); // Revalidate landing page
  revalidatePath('/goatech-admin-hq/plans');
  return { success: true };
}
