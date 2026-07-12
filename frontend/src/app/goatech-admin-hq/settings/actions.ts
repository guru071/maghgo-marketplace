'use server';

import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

export async function getPlatformSettings() {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from('platform_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error || !data) {
    // Return default if not set up
    return {
      whatsapp_enabled: true,
      instagram_enabled: true,
      messenger_enabled: true,
      sms_enabled: true,
    };
  }

  return data;
}

export async function updatePlatformSettings(settings: any) {
  const supabase = createAdminSupabaseClient();
  
  const { error } = await supabase
    .from('platform_settings')
    .upsert({ id: 1, ...settings });

  if (error) {
    console.error('Failed to update platform settings:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/'); // Revalidate landing page so pricing updates
  revalidatePath('/goatech-admin-hq/settings');
  
  return { success: true };
}
