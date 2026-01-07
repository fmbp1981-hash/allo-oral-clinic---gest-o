import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the backend .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase credentials in .env');
    process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkPatients() {
    console.log('🔍 Checking patient associations...');

    // 1. Get all patients with their user_id
    const { data: patients, error: fetchError } = await supabase
        .from('patients')
        .select('id, name, user_id, created_at');

    if (fetchError) {
        console.error('❌ Error fetching patients:', fetchError);
        return;
    }

    if (!patients || patients.length === 0) {
        console.log('ℹ️ No patients found in the database.');
        return;
    }

    console.log(`Found ${patients.length} patients.`);

    // 2. Get all users to map IDs to emails
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, email');

    if (userError) {
        console.error('❌ Error fetching users:', userError);
        return;
    }

    const userMap = new Map(users?.map(u => [u.id, u.email]));

    // 3. Analyze associations
    let unassociatedCount = 0;
    const associations: Record<string, number> = {};

    console.log('\n--- Patient List Sample (First 10) ---');
    patients.slice(0, 10).forEach(p => {
        const userEmail = userMap.get(p.user_id) || 'UNKNOWN/DELETED USER';
        console.log(`- Patient: ${p.name} | User ID: ${p.user_id} | User Email: ${userEmail}`);

        if (!p.user_id) unassociatedCount++;
        const key = userEmail;
        associations[key] = (associations[key] || 0) + 1;
    });

    console.log('\n--- Summary ---');
    console.log(`Total Patients: ${patients.length}`);
    console.log(`Unassociated Patients (NULL user_id): ${unassociatedCount}`);
    console.log('Patients per User:');
    Object.entries(associations).forEach(([email, count]) => {
        console.log(`   - ${email}: ${count}`);
    });

    // Check specifically for the admin user
    const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@example.com').trim();
    const adminUser = users?.find(u => u.email === ADMIN_EMAIL);
    if (adminUser) {
        const adminCount = patients.filter(p => p.user_id === adminUser.id).length;
        console.log(`\n✅ Admin User (${ADMIN_EMAIL}) has ${adminCount} patients associated.`);
    } else {
        console.log(`\n⚠️ Admin User (${ADMIN_EMAIL}) NOT found in users table.`);
    }
}

checkPatients().catch(console.error);
