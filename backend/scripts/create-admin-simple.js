// Simple script to create admin user
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('SUPABASE_URL:', SUPABASE_URL);
console.log('SUPABASE_KEY exists:', !!SUPABASE_KEY);

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    try {
        // Check existing users
        console.log('\n1. Checking existing users...');
        const { data: users, error: fetchError } = await supabase
            .from('users')
            .select('id, email, name, role');

        if (fetchError) {
            console.error('Error fetching users:', fetchError);
            return;
        }

        console.log('Existing users:', users);

        // Check if admin exists
        const adminExists = users?.find(u => u.email === 'fmbp1981@gmail.com');

        if (adminExists) {
            console.log('\n2. Admin already exists, updating password...');
            const hashedPassword = await bcrypt.hash('Admin@123', 10);
            
            const { data, error } = await supabase
                .from('users')
                .update({ 
                    password: hashedPassword,
                    role: 'admin'
                })
                .eq('email', 'fmbp1981@gmail.com')
                .select();

            if (error) {
                console.error('Error updating admin:', error);
            } else {
                console.log('Admin updated successfully:', data);
            }
        } else {
            console.log('\n2. Creating new admin user...');
            const hashedPassword = await bcrypt.hash('Admin@123', 10);
            
            const { data, error } = await supabase
                .from('users')
                .insert({
                    name: 'Administrador',
                    email: 'fmbp1981@gmail.com',
                    password: hashedPassword,
                    clinic_name: 'Allo Oral Clinic',
                    avatar_url: 'https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff',
                    role: 'admin'
                })
                .select();

            if (error) {
                console.error('Error creating admin:', error);
            } else {
                console.log('Admin created successfully:', data);
            }
        }

        // Verify final state
        console.log('\n3. Final user list:');
        const { data: finalUsers } = await supabase
            .from('users')
            .select('id, email, name, role');
        console.log(finalUsers);

    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

main();
