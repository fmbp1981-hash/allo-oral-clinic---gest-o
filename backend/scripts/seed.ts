import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing Supabase credentials in .env');
    process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function seed() {
    console.log('🌱 Starting seeding...');

    // 1. Create Admin User
    const adminEmail = 'admin@allooralclinic.com';
    const { data: existingAdmin } = await supabase
        .from('users')
        .select('id')
        .eq('email', adminEmail)
        .single();

    if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const { error } = await supabase.from('users').insert({
            name: 'Administrador',
            email: adminEmail,
            password: hashedPassword,
            clinic_name: 'Allo Oral Clinic',
            avatar_url: 'https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff',
        });

        if (error) {
            console.error('❌ Error creating admin:', error);
        } else {
            console.log('✅ Admin user created');
        }
    } else {
        console.log('ℹ️ Admin user already exists');
    }

    // 2. Create Sample Patients
    const patients = [
        {
            name: 'Maria Silva',
            phone: '11999999999',
            email: 'maria@email.com',
            history: 'Paciente com histórico de sensibilidade dental. Realizou limpeza há 6 meses.',
        },
        {
            name: 'João Santos',
            phone: '11988888888',
            email: 'joao@email.com',
            history: 'Interesse em clareamento dental. Sem histórico de cáries.',
        },
        {
            name: 'Ana Oliveira',
            phone: '11977777777',
            email: 'ana@email.com',
            history: 'Dor no dente 36. Possível necessidade de canal.',
        },
    ];

    for (const p of patients) {
        const { data: existing } = await supabase
            .from('patients')
            .select('id')
            .eq('phone', p.phone)
            .single();

        if (!existing) {
            const { error } = await supabase.from('patients').insert(p);
            if (error) console.error(`❌ Error creating patient ${p.name}:`, error);
            else console.log(`✅ Patient ${p.name} created`);
        }
    }

    // 3. Create App Settings
    const { data: settings } = await supabase.from('app_settings').select('id').single();
    if (!settings) {
        const { error } = await supabase.from('app_settings').insert({
            webhook_url: 'https://n8n.webhook.url/test',
            message_template: 'Olá {name}, aqui é da Allo Oral Clinic. Vimos seu interesse em {keyword}. Podemos agendar?',
        });
        if (error) console.error('❌ Error creating settings:', error);
        else console.log('✅ App settings created');
    }

    console.log('🏁 Seeding finished!');
}

seed().catch((e) => {
    console.error(e);
    process.exit(1);
});
