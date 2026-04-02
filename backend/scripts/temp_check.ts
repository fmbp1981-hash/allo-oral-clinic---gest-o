
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkUsers() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing configuration');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  console.log(`Connecting to ${SUPABASE_URL}...`);

  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, role, password')
    .limit(10);

  if (error) {
    console.error('Error fetching users:', error);
  } else {
    console.log('Users found:', JSON.stringify(data, null, 2));
  }
}

checkUsers().catch(console.error);
