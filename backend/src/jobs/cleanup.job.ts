import cron from 'node-cron';
import { supabase } from '../db/supabase';
import { deleteMerchantImageFolder } from '../services/storage.service';

/**
 * Cleanup job that runs every day at midnight (00:00).
 * It finds all merchants whose subscription expired more than 10 days ago,
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

      // Query merchants where subscription_ends_at is less than 10 days ago AND plan is inactive
      const { data, error } = await supabase
        .from('merchants')
        .delete()
        .in('subscription_plan', ['inactive'])
        .lt('subscription_ends_at', tenDaysAgo.toISOString())
        .select('id, phone_number, store_name'); // Return deleted rows for logging + storage cleanup

      if (error) {
        console.error('❌ Error during cleanup job:', error);
        return;
      }

      if (data && data.length > 0) {
        // DB cascade removed the product ROWS, but the image FILES in storage
        // (product images + the shop logo + the QR) are not touched by a row
        // delete — they'd orphan in the bucket forever. Clear each merchant's
        // whole image folder. Best-effort: a storage failure must not fail the
        // run or re-delete anything.
        for (const m of data) {
          await deleteMerchantImageFolder(m.id).catch((e: any) =>
            console.warn(`⚠️ Could not clear images for ${m.store_name}:`, e?.message || e));
        }
        console.log(`✅ Successfully deleted ${data.length} expired merchants (rows, products & images) after 10 days of no response.`);
        data.forEach((m) => console.log(`   - Deleted: ${m.store_name} (${m.phone_number})`));
      } else {
        console.log('✅ Cleanup finished: No merchants have been expired for 10+ days.');
      }
    } catch (err) {
      console.error('❌ Unexpected error in cleanup job:', err);
    }
  });
}
