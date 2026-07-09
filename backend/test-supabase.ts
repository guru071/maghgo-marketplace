import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  console.log('Testing Supabase connection...');
  const supabase = createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    { auth: { persistSession: false }, realtime: { transport: require('ws') as any } }
  );
  
  const { data, error } = await supabase.from('merchants').select('*').limit(1);
  if (error) {
    if (error.code === '42P01') {
      console.error('\n❌ Error: Tables do not exist! You forgot to run migration.sql in Supabase SQL Editor.');
    } else {
      console.error('\n❌ Supabase Error:', error.message);
    }
  } else {
    console.log('\n✅ Supabase is fully working! The tables exist.');
  }
}
test();
