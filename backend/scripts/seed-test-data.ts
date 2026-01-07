import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import bcrypt from 'bcryptjs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_ANON_KEY) são obrigatórios no backend/.env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('🌱 Iniciando seed de dados de teste (via Supabase)...');

    const adminEmail = (process.env.ADMIN_EMAIL || '').trim();
    const adminPassword = (process.env.ADMIN_PASSWORD || '').trim();

    // 1) (Opcional) garantir admin
    if (adminEmail && adminPassword) {
        const { data: existingAdmin } = await supabase
            .from('users')
            .select('id, name, role')
            .eq('email', adminEmail)
            .single();

        if (!existingAdmin) {
            console.log('⚠️ Admin não encontrado. Criando...');
            const hashedPassword = await bcrypt.hash(adminPassword, 10);
            const userId = uuidv4();

            const { error: createError } = await supabase
                .from('users')
                .insert({
                    id: userId,
                    name: 'Admin User',
                    email: adminEmail,
                    password: hashedPassword,
                    role: 'admin',
                    clinic_name: 'Allo Oral Clinic',
                });

            if (createError) {
                console.error('❌ Erro ao criar admin:', createError);
                return;
            }

            console.log(`✅ Admin criado: ${adminEmail}`);
        } else if (existingAdmin.role !== 'admin') {
            await supabase.from('users').update({ role: 'admin' }).eq('id', existingAdmin.id);
            console.log('🔄 Role atualizado para admin');
        } else {
            console.log('✅ Admin já existe');
        }
    } else {
        console.log('ℹ️ Admin não configurado (defina ADMIN_EMAIL e ADMIN_PASSWORD se quiser criar/garantir admin).');
    }

    // 2) Criar Paciente de Teste
    const patientId = uuidv4();
    const { data: patient, error: patientError } = await supabase
        .from('patients')
        .insert({
            id: patientId,
            name: 'João da Silva (Teste)',
            phone: '5511999999999',
            email: 'joao.teste@exemplo.com',
            history: 'Paciente de teste criado via seed',
        })
        .select()
        .single();

    if (patientError || !patient) {
        console.error('❌ Erro ao criar paciente:', patientError);
        return;
    }

    console.log(`✅ Paciente criado: ${patient.name}`);

    // 3) Criar Oportunidade de Teste
    const { error: oppError } = await supabase
        .from('opportunities')
        .insert({
            id: uuidv4(),
            patient_id: patientId,
            name: patient.name,
            phone: patient.phone,
            status: 'NEW',
            keyword_found: 'implante dentário',
            notes: 'Oportunidade de teste criada via seed',
        });

    if (oppError) {
        console.error('❌ Erro ao criar oportunidade:', oppError);
        return;
    }

    console.log('✅ Oportunidade criada (Status: NEW)');
    console.log('🚀 Seed concluído com sucesso!');


main().catch((err) => {
    console.error('❌ Erro fatal:', err);
    process.exit(1);
});
                        .select()
