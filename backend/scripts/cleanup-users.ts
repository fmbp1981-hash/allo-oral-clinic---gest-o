import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the backend .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_KEY = SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase credentials in .env');
    process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

const ADMIN_EMAIL = 'fmbp1981@gmail.com';

async function cleanupUsers() {
    console.log('🧹 Starting user cleanup and reassignment...');

    // 1. Get all users
    const { data: users, error: fetchError } = await supabase
        .from('users')
        .select('id, email');

    if (fetchError) {
        console.error('❌ Error fetching users:', fetchError);
        return;
    }

    if (!users || users.length === 0) {
        console.log('ℹ️ No users found.');
        return;
    }

    // 2. Identify admin and users to delete
    const adminUser = users.find(u => u.email === ADMIN_EMAIL);
    const usersToDelete = users.filter(u => u.email !== ADMIN_EMAIL);

    if (!adminUser) {
        console.error(`❌ Admin user ${ADMIN_EMAIL} NOT found! Cannot reassign data.`);
        return;
    }

    console.log(`✅ Admin user found: ${adminUser.email} (${adminUser.id})`);

    if (usersToDelete.length === 0) {
        console.log('✅ No other users to delete.');
        return;
    }

    console.log(`⚠️ Processing ${usersToDelete.length} users to delete...`);

    for (const user of usersToDelete) {
        console.log(`\n   Processing ${user.email} (${user.id})...`);

        // 3. Reassign Patients
        const { data: patients, error: patientError } = await supabase
            .from('patients')
            .update({ user_id: adminUser.id })
            .eq('user_id', user.id)
            .select('id');

        if (patientError) {
            console.error(`   ❌ Error reassigning patients for ${user.email}:`, patientError);
            continue; // Skip deletion if reassignment fails
        } else {
            console.log(`   ✅ Reassigned ${patients?.length || 0} patients to admin.`);
        }

        // 4. Reassign Opportunities
        const { data: opportunities, error: oppError } = await supabase
            .from('opportunities')
            .update({ user_id: adminUser.id })
            .eq('user_id', user.id)
            .select('id');

        if (oppError) {
            console.error(`   ❌ Error reassigning opportunities for ${user.email}:`, oppError);
            // We continue here because patients were already moved, but it's risky. 
            // Ideally we'd use a transaction but Supabase JS client doesn't support it easily without RPC.
            // We'll proceed with deletion but log the error.
        } else {
            console.log(`   ✅ Reassigned ${opportunities?.length || 0} opportunities to admin.`);
        }

        // 5. Delete User
        const { error: deleteError } = await supabase
            .from('users')
            .delete()
            .eq('id', user.id);

        if (deleteError) {
            console.error(`   ❌ Error deleting user ${user.email}:`, deleteError);
        } else {
            console.log(`   ✅ Deleted user ${user.email}`);
        }
    }

    console.log('\n🏁 Cleanup and reassignment finished!');
}

cleanupUsers().catch(console.error);
