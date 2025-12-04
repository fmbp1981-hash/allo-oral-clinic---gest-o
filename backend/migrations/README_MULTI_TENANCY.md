# Guia de Implementação Multi-Tenancy

## 📋 Vis

ão Geral

Este guia explica como implementar o isolamento de dados por usuário/clínica (multi-tenancy) no sistema.

## ⚠️ IMPORTANTE - ANTES DE EXECUTAR

Esta migration adiciona o campo `user_id` obrigatório em todas as tabelas principais. **Se você já tem dados no banco**, siga os passos na ordem correta.

## 🔧 Passo 1: Executar a Migration no Supabase

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Copie todo o conteúdo do arquivo `add_user_id_multi_tenancy.sql`
4. **IMPORTANTE**: Se você já tem dados, modifique a migration primeiro:
   - Remova `NOT NULL` das linhas `ADD COLUMN`
   - Exemplo: `ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;`
   - Depois, execute atualizações para preencher os `user_id` existentes
5. Execute o SQL
6. Verifique se não houve erros

## 🔄 Passo 2: Migrar Dados Existentes (SE NECESSÁRIO)

Se você já tem dados no banco antes da migration, execute este SQL adicional:

```sql
-- Atualizar pacientes existentes com o primeiro user_id disponível
-- AJUSTE ESTE SCRIPT conforme necessário para seus dados
UPDATE patients
SET user_id = (SELECT id FROM users LIMIT 1)
WHERE user_id IS NULL;

UPDATE opportunities
SET user_id = (SELECT id FROM users LIMIT 1)
WHERE user_id IS NULL;

UPDATE clinical_records
SET user_id = (SELECT id FROM users LIMIT 1)
WHERE user_id IS NULL;

-- Depois, torne os campos obrigatórios
ALTER TABLE patients ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE opportunities ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE clinical_records ALTER COLUMN user_id SET NOT NULL;
```

## ✅ Passo 3: Verificar a Migration

Execute no SQL Editor:

```sql
-- Verificar se as colunas foram criadas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name IN ('patients', 'opportunities', 'clinical_records')
AND column_name = 'user_id';

-- Verificar RLS (Row Level Security)
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('patients', 'opportunities', 'clinical_records');
```

## 🎯 O Que a Migration Faz

1. **Adiciona `user_id`** em todas as tabelas principais
2. **Cria índices** para melhor performance
3. **Ativa Row Level Security (RLS)** - garante isolamento automático no nível do banco
4. **Cria políticas RLS** - usuários só veem seus próprios dados

## 🔒 Segurança

Com RLS ativado, mesmo que o código do backend tenha um bug, o Supabase garante que:
- Usuário A nunca verá dados do Usuário B
- Cada clínica tem seus dados completamente isolados
- Tentativas de acesso não autorizado retornam vazio

## 📝 Próximos Passos

Depois de executar a migration no Supabase:
1. O backend já foi atualizado para incluir `user_id` automaticamente
2. Todas as queries agora filtram por usuário logado
3. Teste criando 2 usuários diferentes e verificando o isolamento
