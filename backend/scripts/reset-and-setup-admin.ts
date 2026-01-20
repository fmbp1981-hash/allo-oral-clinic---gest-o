import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
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

// Initialize Supabase client with service role for full access
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Fixed admin credentials
const ADMIN_EMAIL = 'fmbp1981@gmail.com';
const ADMIN_PASSWORD = 'Admin@123';
const ADMIN_NAME = 'Administrador';
const CLINIC_NAME = 'Allo Oral Clinic';

async function resetAndSetupAdmin() {
    console.log('🔧 Starting user reset and admin setup...\n');

    try {
        // 1. Get all existing users
        const { data: users, error: fetchError } = await supabase
            .from('users')
            .select('id, email, name');

        if (fetchError) {
            console.error('❌ Error fetching users:', fetchError);
            return;
        }

        console.log(`📊 Found ${users?.length || 0} existing users`);

        // 2. Check if admin already exists
        const existingAdmin = users?.find(u => u.email === ADMIN_EMAIL);

        // 3. Identify users to delete (everyone except admin if exists)
        const usersToDelete = users?.filter(u => u.email !== ADMIN_EMAIL) || [];

        // 4. If we have an admin, reassign all data to admin first
        let adminId: string | null = existingAdmin?.id || null;

        if (usersToDelete.length > 0) {
            console.log(`\n⚠️  ${usersToDelete.length} users will be processed for deletion`);

            // If admin doesn't exist yet, create it first so we can reassign data
            if (!adminId) {
                console.log('\n📝 Creating admin user first to reassign data...');
                const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
                
                const { data: newAdmin, error: createError } = await supabase
                    .from('users')
                    .insert({
                        name: ADMIN_NAME,
                        email: ADMIN_EMAIL,
                        password: hashedPassword,
                        clinic_name: CLINIC_NAME,
                        avatar_url: 'https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff',
                        role: 'admin',
                    })
                    .select('id')
                    .single();

                if (createError) {
                    console.error('❌ Error creating admin:', createError);
                    return;
                }
                adminId = newAdmin.id;
                console.log(`✅ Admin created with ID: ${adminId}`);
            }

            // Reassign and delete each non-admin user
            for (const user of usersToDelete) {
                console.log(`\n   Processing user: ${user.email} (${user.id})`);

                // Reassign patients
                const { data: patients, error: patientError } = await supabase
                    .from('patients')
                    .update({ user_id: adminId })
                    .eq('user_id', user.id)
                    .select('id');

                if (patientError) {
                    console.error(`   ❌ Error reassigning patients:`, patientError.message);
                } else {
                    console.log(`   ✅ Reassigned ${patients?.length || 0} patients to admin`);
                }

                // Reassign opportunities
                const { data: opportunities, error: oppError } = await supabase
                    .from('opportunities')
                    .update({ user_id: adminId })
                    .eq('user_id', user.id)
                    .select('id');

                if (oppError) {
                    console.error(`   ❌ Error reassigning opportunities:`, oppError.message);
                } else {
                    console.log(`   ✅ Reassigned ${opportunities?.length || 0} opportunities to admin`);
                }

                // Reassign notifications
                const { error: notifError } = await supabase
                    .from('notifications')
                    .update({ user_id: adminId })
                    .eq('user_id', user.id);

                if (notifError) {
                    console.error(`   ❌ Error reassigning notifications:`, notifError.message);
                } else {
                    console.log(`   ✅ Reassigned notifications to admin`);
                }

                // Delete the user
                const { error: deleteError } = await supabase
                    .from('users')
                    .delete()
                    .eq('id', user.id);

                if (deleteError) {
                    console.error(`   ❌ Error deleting user:`, deleteError.message);
                } else {
                    console.log(`   🗑️  Deleted user: ${user.email}`);
                }
            }
        }

        // 5. Create or update admin with correct password
        console.log('\n🔐 Setting up admin credentials...');
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

        if (existingAdmin) {
            // Update existing admin with new password and ensure role is admin
            const { error: updateError } = await supabase
                .from('users')
                .update({
                    password: hashedPassword,
                    role: 'admin',
                    name: ADMIN_NAME,
                    clinic_name: CLINIC_NAME,
                    refresh_token_hash: null, // Clear any existing tokens
                })
                .eq('id', existingAdmin.id);

            if (updateError) {
                console.error('❌ Error updating admin:', updateError);
                return;
            }
            console.log('✅ Admin password and role updated');
        } else if (!adminId) {
            // Admin wasn't created during reassignment, create now
            const { error: createError } = await supabase
                .from('users')
                .insert({
                    name: ADMIN_NAME,
                    email: ADMIN_EMAIL,
                    password: hashedPassword,
                    clinic_name: CLINIC_NAME,
                    avatar_url: 'https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff',
                    role: 'admin',
                });

            if (createError) {
                console.error('❌ Error creating admin:', createError);
                return;
            }
            console.log('✅ Admin user created');
        }

        // 6. Verify final state
        const { data: finalUsers, error: finalError } = await supabase
            .from('users')
            .select('id, email, name, role');

        if (finalError) {
            console.error('❌ Error verifying final state:', finalError);
        } else {
            console.log('\n📊 Final user state:');
            finalUsers?.forEach(u => {
                console.log(`   - ${u.email} (${u.name}) - Role: ${u.role || 'user'}`);
            });
        }

        console.log('\n🏁 Reset and setup completed successfully!');
        console.log('\n📋 Admin Credentials:');
        console.log(`   Email: ${ADMIN_EMAIL}`);
        console.log(`   Password: ${ADMIN_PASSWORD}`);
        console.log('   Role: admin');

    } catch (error) {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    }
}

resetAndSetupAdmin().catch(console.error);
