import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import bcrypt from 'bcryptjs';

// Carregar variáveis de ambiente do arquivo .env correto
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórios no .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('🌱 Iniciando seed de dados de teste (via Supabase)...');

    const adminEmail = 'fmbp1981@gmail.com';

    // 1. Buscar usuário admin
    let { data: admin, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', adminEmail)
        .single();

    // Se não existir, criar
    if (!admin) {
        console.log('⚠️ Usuário admin não encontrado. Criando...');

        const hashedPassword = await bcrypt.hash('130587', 10);
        const userId = uuidv4();

        const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
                id: userId,
                name: 'Admin User',
                email: adminEmail,
                password: hashedPassword,
                role: 'admin',
                clinic_name: 'Allo Oral Clinic'
            })
            .select()
            .single();

        if (createError) {
            console.error('❌ Erro ao criar admin:', createError);
            return;
        }

        admin = newUser;
        console.log(`✅ Admin criado com sucesso: ${admin.email}`);
    } else {
        console.log(`✅ Admin já existe: ${admin.name} (${admin.id})`);

        // Garantir que é admin
        if (admin.role !== 'admin') {
            import { createClient } from '@supabase/supabase-js';
            import dotenv from 'dotenv';
            import { v4 as uuidv4 } from 'uuid';
            import path from 'path';
            import bcrypt from 'bcryptjs';

            // Carregar variáveis de ambiente do arquivo .env correto
            dotenv.config({ path: path.resolve(__dirname, '../.env') });

            const supabaseUrl = process.env.SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_ANON_KEY;

            if (!supabaseUrl || !supabaseKey) {
                console.error('❌ SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórios no .env');
                process.exit(1);
            }

            const supabase = createClient(supabaseUrl, supabaseKey);

            async function main() {
                console.log('🌱 Iniciando seed de dados de teste (via Supabase)...');

                const adminEmail = 'fmbp1981@gmail.com';

                // 1. Buscar usuário admin
                let { data: admin, error: userError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('email', adminEmail)
                    .single();

                // Se não existir, criar
                if (!admin) {
                    console.log('⚠️ Usuário admin não encontrado. Criando...');

                    const hashedPassword = await bcrypt.hash('130587', 10);
                    const userId = uuidv4();

                    const { data: newUser, error: createError } = await supabase
                        .from('users')
                        .insert({
                            id: userId,
                            name: 'Admin User',
                            email: adminEmail,
                            password: hashedPassword,
                            role: 'admin',
                            clinic_name: 'Allo Oral Clinic'
                        })
                        .select()
                        .single();

                    if (createError) {
                        console.error('❌ Erro ao criar admin:', createError);
                        return;
                    }

                    admin = newUser;
                    console.log(`✅ Admin criado com sucesso: ${admin.email}`);
                } else {
                    console.log(`✅ Admin já existe: ${admin.name} (${admin.id})`);

                    // Garantir que é admin
                    if (admin.role !== 'admin') {
                        await supabase.from('users').update({ role: 'admin' }).eq('id', admin.id);
                        console.log('🔄 Role atualizado para admin');
                    }
                }

                // 2. Criar Paciente de Teste
                const patientId = uuidv4();
                const { data: patient, error: patientError } = await supabase
                    .from('patients')
                    .insert({
                        id: patientId,
                        name: 'João da Silva (Teste)',
                        phone: '5511999999999',
                        email: 'joao.teste@exemplo.com',
                        history: 'Paciente de teste criado via seed',
                        // cpf e user_id removidos pois não existem no schema
                    })
                    .select()
                    .single();

                if (patientError) {
                    console.error('❌ Erro ao criar paciente:', patientError);
                    return;
                }

                console.log(`✅ Paciente criado: ${patient.name}`);

                // 3. Criar Oportunidade no Pipeline (Status: NEW)
                const { error: oppError } = await supabase
                    .from('opportunities')
                    .insert({
                        id: uuidv4(),
                        patient_id: patientId,
                        name: patient.name, // Campo obrigatório no schema
                        phone: patient.phone, // Campo obrigatório no schema
                        status: 'NEW',
                        keyword_found: 'implante dentário',
                        notes: 'Interessado em implante, viu anúncio no Google. Valor estimado: 2500.00',
                        // priority, source, user_id, value, description removidos pois não existem no schema
                    });

                if (oppError) {
                    console.error('❌ Erro ao criar oportunidade:', oppError);
                    return;
                }

                console.log('✅ Oportunidade criada no Pipeline (Coluna: Novos)');
                console.log('🚀 Seed concluído com sucesso!');
            }

            main();
