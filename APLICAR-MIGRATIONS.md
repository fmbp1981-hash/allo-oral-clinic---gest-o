# 🗄️ Guia: Como Aplicar as Migrations no Supabase

Este guia explica como aplicar as migrations do banco de dados no Supabase.

## 📋 Ordem de Execução

Execute as migrations **NESTA ORDEM**:

1. `00_fix_schema.sql` - Adiciona colunas faltantes
2. `01_add_refresh_token.sql` - Adiciona refresh token aos usuários
3. `02_add_user_id_to_notifications.sql` - Adiciona user_id às notificações
4. `03_seed_data.sql` - Insere dados de teste (opcional, mas recomendado)

---

## 🚀 Passo a Passo

### 1. Acesse o Supabase Dashboard

Abra seu navegador e acesse:
```
https://supabase.com/dashboard/project/filghodpkdzphihberuc
```

**Ou** acesse: https://supabase.com/dashboard e selecione seu projeto **ClinicaFlow**

---

### 2. Abra o SQL Editor

Na barra lateral esquerda, clique em:
```
🔧 SQL Editor
```

---

### 3. Execute as Migrations

Para cada migration, siga estes passos:

#### **Migration 1: 00_fix_schema.sql**

1. Clique em **"New Query"**
2. Abra o arquivo: `backend/supabase/migrations/00_fix_schema.sql`
3. **Copie TODO o conteúdo** do arquivo
4. **Cole** no SQL Editor do Supabase
5. Clique em **"Run"** (ou pressione Ctrl+Enter)
6. Aguarde até ver: ✅ **Success. No rows returned**
7. Verifique no console se aparece:
   ```
   ✅ Migration 00_fix_schema.sql aplicada com sucesso!
   Colunas adicionadas:
     - users.role
     - users.password_hash
     - patients.history_array
     - patients.clinical_records
     - opportunities.user_id
   ```

---

#### **Migration 2: 01_add_refresh_token.sql**

1. Clique em **"New Query"** novamente
2. Abra o arquivo: `backend/supabase/migrations/01_add_refresh_token.sql`
3. **Copie TODO o conteúdo** do arquivo
4. **Cole** no SQL Editor do Supabase
5. Clique em **"Run"**
6. Aguarde até ver: ✅ **Success. No rows returned**

---

#### **Migration 3: 02_add_user_id_to_notifications.sql**

1. Clique em **"New Query"**
2. Abra o arquivo: `backend/supabase/migrations/02_add_user_id_to_notifications.sql`
3. **Copie TODO o conteúdo** do arquivo
4. **Cole** no SQL Editor do Supabase
5. Clique em **"Run"**
6. Aguarde até ver: ✅ **Success. No rows returned**

---

#### **Migration 4: 03_seed_data.sql** (Dados de Teste - Recomendado)

1. Clique em **"New Query"**
2. Abra o arquivo: `backend/supabase/migrations/03_seed_data.sql`
3. **Copie TODO o conteúdo** do arquivo
4. **Cole** no SQL Editor do Supabase
5. Clique em **"Run"**
6. Aguarde até ver: ✅ **Success. No rows returned**
7. Verifique no console se aparece:
   ```
   =================================
   SEED DATA INSERIDO COM SUCESSO!
   =================================
   Pacientes: 48
   Oportunidades: 3
   Notificações: 5
   Usuários: 3
   =================================
   ```

---

## ✅ Verificação

Após executar todas as migrations, verifique se tudo está correto:

### 1. Verificar Tabelas

Na barra lateral, clique em:
```
📊 Table Editor
```

Você deve ver as seguintes tabelas:
- ✅ `users`
- ✅ `patients`
- ✅ `opportunities`
- ✅ `clinical_records`
- ✅ `notifications`
- ✅ `app_settings`

---

### 2. Verificar Dados (se executou 03_seed_data.sql)

Clique em cada tabela e verifique:

**users** (3 registros):
- admin@exemplo.com (admin)
- dentista@exemplo.com (dentist)
- recepcao@exemplo.com (receptionist)

**patients** (~48 registros):
- Carlos Alberto Mendes
- Fernanda Costa Lima
- etc.

**opportunities** (3 registros):
- Status: NEW, SENT, RESPONDED

**notifications** (5 registros):
- "Bem-vindo ao ClinicaFlow!"
- etc.

---

## 🔐 Credenciais de Teste

Não mantenha credenciais fixas em documentação.

- Para iniciar do zero, use o script de reset do banco no backend.
- Depois, no login, use **"Esqueceu?"** para definir a senha via e-mail.

---

## ❌ Troubleshooting

### Erro: "column already exists"
✅ **Normal!** A migration usa `IF NOT EXISTS`, então é seguro executar novamente.

### Erro: "table does not exist"
❌ Você precisa executar o `schema.sql` primeiro. Vá em:
1. SQL Editor → New Query
2. Copie todo conteúdo de `backend/supabase/schema.sql`
3. Cole e execute
4. Depois execute as migrations na ordem

### Erro: "violates foreign key constraint"
❌ Execute as migrations **na ordem correta**: 00 → 01 → 02 → 03

### Banco ficou com dados errados
🔄 Para limpar e começar de novo:
```sql
-- CUIDADO: Isso deleta TUDO!
DROP TABLE IF EXISTS clinical_records CASCADE;
DROP TABLE IF EXISTS opportunities CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS app_settings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Depois execute schema.sql e as migrations novamente
```

---

## 🎯 Próximo Passo

Após aplicar as migrations, você está pronto para:

1. ✅ Iniciar os servidores
2. ✅ Testar o sistema localmente

Execute:
```bash
START.bat
```

Ou manualmente:
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
npm run dev
```

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs do SQL Editor no Supabase
2. Consulte: `INICIO-RAPIDO.md`
3. Revise: `RESUMO-SESSAO.md`

---

✅ **Migrations aplicadas com sucesso? Parabéns!**
🚀 **Próximo passo**: Execute `START.bat` para iniciar o sistema!
