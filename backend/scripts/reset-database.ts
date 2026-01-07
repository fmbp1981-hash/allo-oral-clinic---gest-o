/**
 * Script para resetar completamente o banco de dados
 * Remove todos os dados de teste e cria um novo usuário admin
 * 
 * Uso: npx ts-node scripts/reset-database.ts
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_KEY = SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase credentials in .env');
    console.error('   Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY)');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Configuração do admin padrão
const DEFAULT_ADMIN = {
    name: 'Administrador',
    email: 'fmbp1981@gmail.com',
    password: 'Admin@123', // Senha padrão - ALTERAR após primeiro login
    clinic_name: 'Allo Oral Clinic',
    role: 'admin'
};

async function resetDatabase() {
    console.log('🗑️  RESET DO BANCO DE DADOS');
    console.log('=' .repeat(50));
    console.log('⚠️  ATENÇÃO: Isso irá APAGAR TODOS os dados!\n');

    // 1. Limpar tabelas na ordem correta (respeitando foreign keys)
    const tablesToClear = [
        'notifications',
        'sending_logs', 
        'patients',
        'users'
    ];

    for (const table of tablesToClear) {
        console.log(`   Limpando tabela: ${table}...`);
        const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (error) {
            // Tentar com match vazio para deletar tudo
            const { error: error2 } = await supabase.from(table).delete().gte('created_at', '1900-01-01');
            if (error2) {
                console.log(`   ⚠️  Aviso ao limpar ${table}: ${error2.message}`);
            } else {
                console.log(`   ✅ ${table} limpa`);
            }
        } else {
            console.log(`   ✅ ${table} limpa`);
        }
    }

    // 2. Criar usuário admin
    console.log('\n📝 Criando usuário administrador...');
    
    const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, 10);
    
    const { data: newAdmin, error: insertError } = await supabase
        .from('users')
        .insert({
            name: DEFAULT_ADMIN.name,
            email: DEFAULT_ADMIN.email,
            password: hashedPassword,
            clinic_name: DEFAULT_ADMIN.clinic_name,
            role: DEFAULT_ADMIN.role
        })
        .select()
        .single();

    if (insertError) {
        console.error('❌ Erro ao criar admin:', insertError.message);
        
        // Verificar se já existe
        const { data: existing } = await supabase
            .from('users')
            .select('id, email')
            .eq('email', DEFAULT_ADMIN.email)
            .single();
            
        if (existing) {
            console.log('ℹ️  Usuário admin já existe, atualizando senha...');
            
            await supabase
                .from('users')
                .update({ 
                    password: hashedPassword,
                    refresh_token_hash: null,
                    reset_token_hash: null,
                    reset_token_expires: null
                })
                .eq('id', existing.id);
                
            console.log('✅ Senha do admin atualizada');
        }
    } else {
        console.log('✅ Usuário admin criado com sucesso!');
    }

    // 3. Resumo final
    console.log('\n' + '=' .repeat(50));
    console.log('✅ RESET CONCLUÍDO!\n');
    console.log('📧 Credenciais do Administrador:');
    console.log(`   Email: ${DEFAULT_ADMIN.email}`);
    console.log(`   Senha: ${DEFAULT_ADMIN.password}`);
    console.log('\n⚠️  IMPORTANTE: Altere a senha após o primeiro login!');
    console.log('=' .repeat(50));
}

// Executar
resetDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('❌ Erro fatal:', err);
        process.exit(1);
    });
