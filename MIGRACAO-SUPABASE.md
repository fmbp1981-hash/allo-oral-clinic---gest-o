# 🔄 Guia de Migração - Prisma → Supabase

**Data**: 25/11/2025
**Versão**: 8.0.0
**Status**: 🚧 EM PROGRESSO

---

## 🎯 Objetivo

Migrar do **Prisma ORM** para **Supabase** (PostgreSQL + API REST) para eliminar o limite de 50 registros do Neon Database free tier.

---

## 📋 Pré-requisitos

1. Conta no Supabase (criar em: https://supabase.com/)
2. Projeto criado no Supabase
3. Credenciais do Supabase:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

---

## 🚀 Passo a Passo

### 1. Criar Projeto no Supabase

1. Acesse: https://supabase.com/dashboard
2. Clique em "New Project"
3. Preencha:
   - **Name**: `clinicaflow` (ou seu nome preferido)
   - **Database Password**: Senha forte (guarde bem!)
   - **Region**: `South America (São Paulo)` (ou mais próximo)
4. Aguarde ~2 minutos para o projeto ser criado

### 2. Executar Schema SQL

1. No Supabase Dashboard, vá em **SQL Editor**
2. Clique em "New query"
3. Copie TODO o conteúdo de `backend/supabase/schema.sql`
4. Cole no editor
5. Clique em **RUN** (ou Ctrl+Enter)
6. Aguarde a execução (deve mostrar "Success")

**O que o schema cria:**
- ✅ 6 tabelas (users, patients, opportunities, clinical_records, app_settings, notifications)
- ✅ Índices para performance
- ✅ Triggers para `updated_at` automático
- ✅ Row Level Security (RLS) policies
- ✅ Full-text search no histórico de pacientes

### 3. Obter Credenciais

No Supabase Dashboard:

1. Vá em **Settings** → **API**
2. Copie:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...` (chave longa)

### 4. Configurar Variáveis de Ambiente

Atualize `.env`:

```bash
# Supabase Configuration
SUPABASE_URL="https://xxxxxxxxxxxxx.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Remova ou comente (não precisa mais):
# DATABASE_URL="postgresql://..."
```

### 5. Instalar Dependências

```bash
cd backend

# Remover Prisma
npm uninstall @prisma/client prisma

# Instalar Supabase
npm install @supabase/supabase-js

# Reinstalar todas as dependências
npm install
```

### 6. Remover Arquivos do Prisma

```bash
# Remover diretório do Prisma
rm -rf backend/prisma

# Ou no Windows:
rmdir /s backend\prisma
```

### 7. Testar Conexão

```bash
npm run dev
```

Verifique os logs:
```
[info]: Supabase client initialized successfully
[info]: 🚀 Server running on port 3001
```

---

## 📊 Comparação: Prisma vs Supabase

| Feature | Prisma | Supabase |
|---------|--------|----------|
| **Type** | ORM | REST API + PostgreSQL |
| **Queries** | TypeScript methods | SQL-like API |
| **Migrations** | Prisma Migrate | SQL direto |
| **Real-time** | ❌ Não | ✅ Sim |
| **Auth** | Manual | ✅ Built-in |
| **Storage** | Manual | ✅ Built-in |
| **Limit (Free)** | 50 rows (Neon) | **10GB** (Supabase) |

---

## 🔄 Mudanças no Código

### Antes (Prisma):

```typescript
import prisma from '../lib/prisma';

// Find user
const user = await prisma.user.findUnique({
  where: { email }
});

// Create opportunity
const opportunity = await prisma.opportunity.create({
  data: {
    name,
    phone,
    keywordFound,
    status: 'NEW'
  }
});
```

### Depois (Supabase):

```typescript
import supabase from '../lib/supabase';

// Find user
const { data: user } = await supabase
  .from('users')
  .select('*')
  .eq('email', email)
  .single();

// Create opportunity
const { data: opportunity } = await supabase
  .from('opportunities')
  .insert({
    name,
    phone,
    keyword_found: keywordFound,
    status: 'NEW'
  })
  .select()
  .single();
```

**Principais diferenças:**
- ✅ Nomes de tabelas em **snake_case** (users, not User)
- ✅ Campos em **snake_case** (keyword_found, not keywordFound)
- ✅ `.select()` explícito para retornar dados
- ✅ Resultado em `{ data, error }` (não throw)

---

## 🧪 Testes

### 1. Testar Criação de Usuário

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Teste User",
    "email": "teste@example.com",
    "password": "senha123",
    "clinicName": "Clínica Teste"
  }'
```

### 2. Verificar no Supabase

1. Supabase Dashboard → **Table Editor**
2. Selecione tabela `users`
3. Verifique se o usuário foi criado

### 3. Testar Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@example.com",
    "password": "senha123"
  }'
```

---

## ⚠️ Problemas Comuns

### "Supabase client not initialized"

**Causa**: Variáveis de ambiente não configuradas

**Solução**:
1. Verifique `.env`:
   ```bash
   SUPABASE_URL="https://..."
   SUPABASE_ANON_KEY="eyJh..."
   ```
2. Reinicie o servidor: `npm run dev`

### "new row violates row-level security policy"

**Causa**: RLS policies muito restritivas

**Solução Temporária** (desenvolvimento):
```sql
-- No SQL Editor do Supabase
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities DISABLE ROW LEVEL SECURITY;
```

**Solução Produção**: Ajustar policies no schema.sql

### "relation does not exist"

**Causa**: Schema SQL não foi executado

**Solução**:
1. Vá no SQL Editor
2. Execute `backend/supabase/schema.sql` completo
3. Verifique se todas as tabelas foram criadas

---

## 📈 Benefícios da Migração

### Performance:
- ✅ Queries diretas ao PostgreSQL
- ✅ Índices otimizados
- ✅ Full-text search nativo

### Escalabilidade:
- ✅ 10GB free (vs 50 registros)
- ✅ Até 500GB no plano pago
- ✅ Real-time subscriptions

### Features Extras:
- ✅ Supabase Auth (opcional)
- ✅ Supabase Storage (upload de arquivos)
- ✅ Edge Functions (serverless)
- ✅ Dashboard completo

---

## 🔒 Segurança

### RLS (Row Level Security)

O schema inclui políticas básicas. **IMPORTANTE**: Ajuste para produção!

**Política Atual** (desenvolvimento):
```sql
-- Permite todos os usuários autenticados
CREATE POLICY "Allow all authenticated users" ON patients
    FOR ALL
    USING (auth.role() = 'authenticated');
```

**Recomendado** (produção):
```sql
-- Cada clínica vê apenas seus dados
CREATE POLICY "Clinics see own data" ON patients
    FOR ALL
    USING (clinic_id = auth.uid());
```

### API Keys

- **anon key**: Use no frontend (limitado por RLS)
- **service_role key**: Use APENAS no backend (bypassa RLS)

⚠️ **NUNCA** exponha `service_role key` no frontend!

---

## 📚 Recursos

### Documentação:
- Supabase Docs: https://supabase.com/docs
- JavaScript Client: https://supabase.com/docs/reference/javascript
- Row Level Security: https://supabase.com/docs/guides/auth/row-level-security

### Ferramentas:
- Supabase Dashboard: https://supabase.com/dashboard
- Supabase CLI: https://supabase.com/docs/guides/cli

### Suporte:
- Discord: https://discord.supabase.com
- GitHub Discussions: https://github.com/supabase/supabase/discussions

---

## ✅ Checklist de Migração

- [ ] Conta Supabase criada
- [ ] Projeto criado
- [ ] Schema SQL executado
- [ ] Credenciais copiadas
- [ ] .env atualizado
- [ ] Dependências instaladas
- [ ] Prisma removido
- [ ] Servidor iniciado com sucesso
- [ ] Teste de criação de usuário
- [ ] Teste de login
- [ ] Verificação no Dashboard
- [ ] Todos os controllers atualizados
- [ ] Testes passando
- [ ] Deploy em produção

---

## 🎊 Status Atual

- ✅ Schema SQL criado
- ✅ Cliente Supabase configurado
- ✅ package.json atualizado
- 🚧 Controllers em migração
- ⏳ Testes pendentes
- ⏳ Documentação completa pendente

---

**Próximo Passo**: Execute o schema SQL no Supabase Dashboard e configure as variáveis de ambiente!

**Desenvolvido por**: IntelliX.AI
**Data**: 25/11/2025
