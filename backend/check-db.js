// Script para verificar estrutura do banco de dados Supabase
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: Variáveis SUPABASE_URL ou SUPABASE_ANON_KEY não configuradas no .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('🔍 Verificando estrutura do banco de dados...\n');

  try {
    // Testar conexão
    console.log('1. Testando conexão com Supabase...');
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (testError && testError.code === 'PGRST116') {
      console.log('⚠️  Tabela "users" não existe - Migrations não foram aplicadas');
      console.log('\n📋 Você precisa aplicar as migrations manualmente no Supabase:');
      console.log('   1. Acesse: https://supabase.com/dashboard/project/' + supabaseUrl.split('//')[1].split('.')[0]);
      console.log('   2. Vá em SQL Editor');
      console.log('   3. Execute os arquivos em backend/supabase/migrations/');
      process.exit(1);
    }

    if (testError) {
      console.error('❌ Erro ao conectar:', testError.message);
      process.exit(1);
    }

    console.log('✅ Conexão estabelecida com sucesso!\n');

    // Verificar usuários
    console.log('2. Verificando tabela "users"...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name, role')
      .limit(5);

    if (usersError) {
      console.log('⚠️  Erro ao buscar usuários:', usersError.message);
    } else {
      console.log(`✅ Tabela "users" OK (${users.length} usuários encontrados)`);
      if (users.length > 0) {
        console.log('   Exemplo:', users[0].email);
      }
    }

    // Verificar notificações
    console.log('\n3. Verificando tabela "notifications"...');
    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('id, title, type, created_at')
      .limit(5);

    if (notifError) {
      console.log('⚠️  Erro ao buscar notificações:', notifError.message);
    } else {
      console.log(`✅ Tabela "notifications" OK (${notifications.length} notificações encontradas)`);
    }

    // Verificar pacientes
    console.log('\n4. Verificando tabela "patients"...');
    const { data: patients, error: patientsError } = await supabase
      .from('patients')
      .select('id, name')
      .limit(5);

    if (patientsError) {
      console.log('⚠️  Erro ao buscar pacientes:', patientsError.message);
    } else {
      console.log(`✅ Tabela "patients" OK (${patients.length} pacientes encontrados)`);
    }

    // Verificar oportunidades
    console.log('\n5. Verificando tabela "opportunities"...');
    const { data: opportunities, error: oppError } = await supabase
      .from('opportunities')
      .select('id, status')
      .limit(5);

    if (oppError) {
      console.log('⚠️  Erro ao buscar oportunidades:', oppError.message);
    } else {
      console.log(`✅ Tabela "opportunities" OK (${opportunities.length} oportunidades encontradas)`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ VERIFICAÇÃO CONCLUÍDA!');
    console.log('='.repeat(60));

    // Verificar se tem dados de seed
    if (users && users.length === 0) {
      console.log('\n⚠️  ATENÇÃO: Banco vazio!');
      console.log('   Recomendado executar migration: 03_seed_data.sql');
    } else {
      console.log('\n✅ Banco de dados está pronto para uso!');
    }

  } catch (error) {
    console.error('❌ Erro durante verificação:', error.message);
    process.exit(1);
  }
}

checkDatabase();
