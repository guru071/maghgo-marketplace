require('dotenv').config();
const { supabase: db } = require('./dist/db/supabase');
(async () => {
  for (const [t, c] of [['merchants','definitely_not_a_real_column'], ['offers','discount_percent'], ['offers','also_fake_xyz']]) {
    const { error } = await db.from(t).select(c).limit(1);
    console.log(`${t}.${c} → ${error ? 'ERROR: ' + error.message.slice(0,60) : 'EXISTS'}`);
  }
  const { data } = await db.from('offers').select('*').limit(2);
  console.log('offers rows:', JSON.stringify(data));
})();
