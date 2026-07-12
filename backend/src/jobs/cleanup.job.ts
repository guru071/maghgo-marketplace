import cron from 'node-cron';
import { supabase } from '../db/supabase';

/**
 * Cleanup job that runs every day at midnight (00:00).
 * It finds all merchants whose trial/subscription expired more than 10 days ago,
 * and completely deletes them from the database.
 * Because of ON DELETE CASCADE, all their products will also be deleted automatically.
 */
export function startCleanupJob() {
  console.log('🕒 Initializing Data Cleanup Cron Job (Runs daily at midnight)');

  cron.schedule('0 0 * * *', async () => {
    console.log('🧹 Running Daily Data Cleanup Job...');
    
    try {
      // Calculate the date exactly 10 days ago from right now
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      // Query merchants where trial_ends_at is less than 10 days ago AND plan is trial
      const { data, error } = await supabase
        .from('merchants')
        .delete()
        .in('subscription_plan', ['trial', 'inactive'])
        .lt('trial_ends_at', tenDaysAgo.toISOString())
        .select('phone_number, store_name'); // Return deleted rows for logging

      if (error) {
        console.error('❌ Error during cleanup job:', error);
        return;
      }

      if (data && data.length > 0) {
        console.log(`✅ Successfully deleted ${data.length} expired merchants (and their products) after 10 days of no response.`);
        data.forEach((m) => console.log(`   - Deleted: ${m.store_name} (${m.phone_number})`));
      } else {
        console.log('✅ Cleanup finished: No merchants have been expired for 10+ days.');
      }
    } catch (err) {
      console.error('❌ Unexpected error in cleanup job:', err);
    }
  });
}
