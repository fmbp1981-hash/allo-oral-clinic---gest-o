# 🗄️ Database Schema - ClinicaFlow

**Versão**: 4.1.0  
**Banco de Dados**: PostgreSQL (via Supabase)  
**Última Atualização**: 05/01/2026

---

## 📋 Índice

1. [Diagrama ER](#diagrama-er)
2. [Tabelas](#tabelas)
3. [Relacionamentos](#relacionamentos)
4. [Índices](#índices)
5. [Enums e Tipos](#enums-e-tipos)
6. [RLS (Row Level Security)](#rls-row-level-security)
7. [Migrations](#migrations)

---

## Diagrama ER

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           DIAGRAMA ENTIDADE-RELACIONAMENTO                      │
└─────────────────────────────────────────────────────────────────────────────────┘

                                    ┌──────────────────┐
                                    │      users       │
                                    ├──────────────────┤
                                    │ id (PK)          │
                                    │ name             │
                                    │ email (UNIQUE)   │
                                    │ password         │
                                    │ clinic_name      │
                                    │ avatar_url       │
                                    │ role             │
                                    │ tenant_id        │
                                    │ refresh_token_   │
                                    │   hash           │
                                    │ reset_token_hash │
                                    │ reset_token_     │
                                    │   expires        │
                                    │ created_at       │
                                    │ updated_at       │
                                    └────────┬─────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
                    ▼                        ▼                        ▼
        ┌───────────────────┐    ┌───────────────────┐    ┌───────────────────┐
        │     patients      │    │   notifications   │    │   app_settings    │
        ├───────────────────┤    ├───────────────────┤    ├───────────────────┤
        │ id (PK)           │    │ id (PK)           │    │ id (PK)           │
        │ name              │    │ user_id (FK)      │    │ user_id (FK)      │
        │ phone             │    │ tenant_id         │    │ tenant_id         │
        │ email             │    │ title             │    │ webhook_url       │
        │ history           │    │ message           │    │ messaging_        │
        │ last_visit        │    │ type              │    │   webhook_url     │
        │ user_id (FK)      │    │ read              │    │ api_key           │
        │ tenant_id         │    │ created_at        │    │ message_template  │
        │ created_at        │    └───────────────────┘    │ created_at        │
        │ updated_at        │                             │ updated_at        │
        └────────┬──────────┘                             └───────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
┌───────────────────┐    ┌───────────────────┐
│ clinical_records  │    │  opportunities    │
├───────────────────┤    ├───────────────────┤
│ id (PK)           │    │ id (PK)           │
│ patient_id (FK)   │    │ patient_id (FK)   │
│ opportunity_id    │    │ name              │
│ user_id (FK)      │    │ phone             │
│ tenant_id         │    │ keyword_found     │
│ date              │    │ status            │
│ description       │    │ last_contact      │
│ type              │    │ scheduled_date    │
│ created_at        │    │ notes             │
│ updated_at        │    │ user_id (FK)      │
└───────────────────┘    │ tenant_id         │
                         │ created_at        │
                         │ updated_at        │
                         └───────────────────┘
```

### Diagrama de Relacionamentos

```
users (1) ─────────────< (N) patients
users (1) ─────────────< (N) opportunities
users (1) ─────────────< (N) notifications
users (1) ─────────────< (N) clinical_records
users (1) ─────────────< (N) app_settings

patients (1) ──────────< (N) opportunities
patients (1) ──────────< (N) clinical_records
```

---

## Tabelas

### users

Armazena informações dos usuários do sistema.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | UUID | NOT NULL | `uuid_generate_v4()` | Identificador único (PK) |
| `name` | VARCHAR(255) | NOT NULL | - | Nome completo |
| `email` | VARCHAR(255) | NOT NULL | - | Email (UNIQUE) |
| `password` | VARCHAR(255) | NOT NULL | - | Hash bcrypt da senha |
| `clinic_name` | VARCHAR(255) | NULL | - | Nome da clínica |
| `avatar_url` | TEXT | NULL | - | URL do avatar |
| `role` | VARCHAR(50) | NOT NULL | `'user'` | Papel: 'admin' ou 'user' |
| `tenant_id` | UUID | NOT NULL | `uuid_generate_v4()` | ID do tenant (multi-tenancy) |
| `refresh_token_hash` | VARCHAR(255) | NULL | - | Hash SHA-256 do refresh token |
| `reset_token_hash` | VARCHAR(255) | NULL | - | Hash do token de reset de senha |
| `reset_token_expires` | TIMESTAMPTZ | NULL | - | Expiração do token de reset |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | Data de criação |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | Data de atualização |

**SQL:**
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    clinic_name VARCHAR(255),
    avatar_url TEXT,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    tenant_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    refresh_token_hash VARCHAR(255),
    reset_token_hash VARCHAR(255),
    reset_token_expires TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX users_email_idx ON users(email);
CREATE INDEX users_tenant_id_idx ON users(tenant_id);
```

---

### patients

Armazena informações dos pacientes da clínica.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | UUID | NOT NULL | `uuid_generate_v4()` | Identificador único (PK) |
| `name` | VARCHAR(255) | NOT NULL | - | Nome do paciente |
| `phone` | VARCHAR(50) | NOT NULL | - | Telefone |
| `email` | VARCHAR(255) | NULL | - | Email |
| `history` | TEXT | NULL | - | Histórico clínico (texto livre) |
| `last_visit` | DATE | NULL | - | Data da última visita |
| `user_id` | UUID | NOT NULL | - | FK para users |
| `tenant_id` | UUID | NOT NULL | - | ID do tenant |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | Data de criação |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | Data de atualização |

**SQL:**
```sql
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    history TEXT,
    last_visit DATE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX patients_tenant_id_idx ON patients(tenant_id);
CREATE INDEX patients_user_id_idx ON patients(user_id);
CREATE INDEX patients_name_idx ON patients(name);
CREATE INDEX patients_phone_idx ON patients(phone);
CREATE INDEX patients_history_gin_idx ON patients USING gin(to_tsvector('portuguese', history));
```

---

### opportunities

Armazena oportunidades do pipeline Kanban (busca ativa).

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | UUID | NOT NULL | `uuid_generate_v4()` | Identificador único (PK) |
| `patient_id` | UUID | NULL | - | FK para patients (opcional) |
| `name` | VARCHAR(255) | NOT NULL | - | Nome do paciente |
| `phone` | VARCHAR(50) | NOT NULL | - | Telefone |
| `keyword_found` | VARCHAR(255) | NULL | - | Keyword que gerou a oportunidade |
| `status` | VARCHAR(50) | NOT NULL | `'NEW'` | Status no pipeline |
| `last_contact` | TIMESTAMPTZ | NULL | - | Data do último contato |
| `scheduled_date` | TIMESTAMPTZ | NULL | - | Data da consulta agendada |
| `notes` | TEXT | NULL | - | Notas/observações |
| `user_id` | UUID | NOT NULL | - | FK para users |
| `tenant_id` | UUID | NOT NULL | - | ID do tenant |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | Data de criação |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | Data de atualização |

**Status válidos:**
- `NEW` - Identificado (novo lead)
- `SENT` - Contatado (mensagem enviada)
- `RESPONDED` - Respondeu (paciente respondeu)
- `SCHEDULED` - Agendado (consulta marcada)
- `ARCHIVED` - Arquivado (finalizado ou descartado)

**SQL:**
```sql
CREATE TABLE opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    keyword_found VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'NEW',
    last_contact TIMESTAMPTZ,
    scheduled_date TIMESTAMPTZ,
    notes TEXT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX opportunities_tenant_id_idx ON opportunities(tenant_id);
CREATE INDEX opportunities_user_id_idx ON opportunities(user_id);
CREATE INDEX opportunities_status_idx ON opportunities(status);
CREATE INDEX opportunities_patient_id_idx ON opportunities(patient_id);
CREATE INDEX opportunities_created_at_idx ON opportunities(created_at DESC);
```

---

### clinical_records

Armazena registros clínicos detalhados dos pacientes.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | UUID | NOT NULL | `uuid_generate_v4()` | Identificador único (PK) |
| `patient_id` | UUID | NOT NULL | - | FK para patients |
| `opportunity_id` | UUID | NULL | - | FK para opportunities (opcional) |
| `user_id` | UUID | NOT NULL | - | FK para users |
| `tenant_id` | UUID | NOT NULL | - | ID do tenant |
| `date` | DATE | NOT NULL | - | Data do registro |
| `description` | TEXT | NOT NULL | - | Descrição do procedimento/consulta |
| `type` | VARCHAR(100) | NULL | - | Tipo: 'consulta', 'procedimento', 'retorno' |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | Data de criação |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | Data de atualização |

**SQL:**
```sql
CREATE TABLE clinical_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX clinical_records_patient_id_idx ON clinical_records(patient_id);
CREATE INDEX clinical_records_tenant_id_idx ON clinical_records(tenant_id);
CREATE INDEX clinical_records_date_idx ON clinical_records(date DESC);
```

---

### notifications

Armazena notificações do sistema para os usuários.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | UUID | NOT NULL | `uuid_generate_v4()` | Identificador único (PK) |
| `user_id` | UUID | NOT NULL | - | FK para users |
| `tenant_id` | UUID | NOT NULL | - | ID do tenant |
| `title` | VARCHAR(255) | NOT NULL | - | Título da notificação |
| `message` | TEXT | NOT NULL | - | Conteúdo da mensagem |
| `type` | VARCHAR(50) | NOT NULL | `'info'` | Tipo: 'success', 'info', 'warning', 'error' |
| `read` | BOOLEAN | NOT NULL | `false` | Se foi lida |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | Data de criação |

**SQL:**
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info',
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX notifications_user_id_idx ON notifications(user_id);
CREATE INDEX notifications_tenant_id_idx ON notifications(tenant_id);
CREATE INDEX notifications_read_idx ON notifications(read) WHERE read = false;
CREATE INDEX notifications_created_at_idx ON notifications(created_at DESC);
```

---

### app_settings

Armazena configurações do sistema por tenant.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | UUID | NOT NULL | `uuid_generate_v4()` | Identificador único (PK) |
| `user_id` | UUID | NOT NULL | - | FK para users |
| `tenant_id` | UUID | NOT NULL | - | ID do tenant |
| `webhook_url` | TEXT | NULL | - | URL do webhook principal (n8n) |
| `messaging_webhook_url` | TEXT | NULL | - | URL do webhook de mensagens |
| `api_key` | VARCHAR(255) | NULL | - | API key para integrações |
| `message_template` | TEXT | NULL | - | Template padrão de mensagem |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | Data de criação |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | Data de atualização |

**SQL:**
```sql
CREATE TABLE app_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    webhook_url TEXT,
    messaging_webhook_url TEXT,
    api_key VARCHAR(255),
    message_template TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX app_settings_tenant_id_idx ON app_settings(tenant_id);
```

---

## Relacionamentos

### Cardinalidades

| Relacionamento | Tipo | Descrição |
|----------------|------|-----------|
| users → patients | 1:N | Um usuário tem muitos pacientes |
| users → opportunities | 1:N | Um usuário tem muitas oportunidades |
| users → notifications | 1:N | Um usuário tem muitas notificações |
| users → clinical_records | 1:N | Um usuário tem muitos registros clínicos |
| users → app_settings | 1:1 | Um usuário tem uma configuração |
| patients → opportunities | 1:N | Um paciente pode ter muitas oportunidades |
| patients → clinical_records | 1:N | Um paciente tem muitos registros clínicos |

### Foreign Keys

```sql
-- patients
ALTER TABLE patients ADD CONSTRAINT fk_patients_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- opportunities
ALTER TABLE opportunities ADD CONSTRAINT fk_opportunities_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE opportunities ADD CONSTRAINT fk_opportunities_patient 
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL;

-- clinical_records
ALTER TABLE clinical_records ADD CONSTRAINT fk_clinical_records_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE clinical_records ADD CONSTRAINT fk_clinical_records_patient 
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;
ALTER TABLE clinical_records ADD CONSTRAINT fk_clinical_records_opportunity 
    FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE SET NULL;

-- notifications
ALTER TABLE notifications ADD CONSTRAINT fk_notifications_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- app_settings
ALTER TABLE app_settings ADD CONSTRAINT fk_app_settings_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
```

---

## Índices

### Índices de Performance

| Tabela | Índice | Tipo | Colunas | Justificativa |
|--------|--------|------|---------|---------------|
| users | users_email_idx | UNIQUE B-TREE | email | Login por email |
| users | users_tenant_id_idx | B-TREE | tenant_id | Multi-tenancy filter |
| patients | patients_tenant_id_idx | B-TREE | tenant_id | Multi-tenancy filter |
| patients | patients_history_gin_idx | GIN | history (tsvector) | Full-text search |
| opportunities | opportunities_status_idx | B-TREE | status | Filter por status Kanban |
| opportunities | opportunities_created_at_idx | B-TREE DESC | created_at | Ordenação recentes primeiro |
| notifications | notifications_read_idx | PARTIAL B-TREE | read | Apenas não lidas |

---

## Enums e Tipos

### opportunity_status

```sql
-- Definição conceitual (implementado como VARCHAR com validação)
CREATE TYPE opportunity_status AS ENUM (
    'NEW',        -- Identificado
    'SENT',       -- Contatado
    'RESPONDED',  -- Respondeu
    'SCHEDULED',  -- Agendado
    'ARCHIVED'    -- Arquivado
);
```

### notification_type

```sql
CREATE TYPE notification_type AS ENUM (
    'success',
    'info',
    'warning',
    'error'
);
```

### user_role

```sql
CREATE TYPE user_role AS ENUM (
    'admin',
    'user'
);
```

---

## RLS (Row Level Security)

O Supabase permite RLS para isolar dados por tenant. Políticas recomendadas:

### Habilitar RLS

```sql
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
```

### Políticas de Acesso

```sql
-- Patients: usuário só vê seus próprios pacientes
CREATE POLICY patients_tenant_isolation ON patients
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Opportunities: isolamento por tenant
CREATE POLICY opportunities_tenant_isolation ON opportunities
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Notifications: usuário só vê suas notificações
CREATE POLICY notifications_user_isolation ON notifications
    USING (user_id = current_setting('app.user_id')::uuid);
```

> **Nota**: As políticas RLS estão preparadas mas não ativadas em produção. O isolamento é feito via queries filtradas por `tenant_id` nos controllers.

---

## Migrations

### Estrutura

```
backend/migrations/
├── 001_initial_schema.sql
├── 002_add_password_reset_fields.sql
├── 003_add_user_id_multi_tenancy.sql
└── README_MULTI_TENANCY.md
```

### Migration: add_password_reset_fields.sql

```sql
-- Adiciona campos para reset de senha
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ;
```

### Migration: add_user_id_multi_tenancy.sql

```sql
-- Adiciona suporte a multi-tenancy
ALTER TABLE patients ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS tenant_id UUID;

ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS tenant_id UUID;

ALTER TABLE clinical_records ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE clinical_records ADD COLUMN IF NOT EXISTS tenant_id UUID;

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS tenant_id UUID;

ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_patients_tenant ON patients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_tenant ON opportunities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clinical_records_tenant ON clinical_records(tenant_id);
```

---

## Queries Comuns

### Buscar pacientes com histórico (Full-text search)

```sql
SELECT * FROM patients
WHERE tenant_id = $1
  AND to_tsvector('portuguese', history) @@ plainto_tsquery('portuguese', $2)
ORDER BY created_at DESC
LIMIT 50;
```

### Dashboard: Contagem por status

```sql
SELECT status, COUNT(*) as count
FROM opportunities
WHERE tenant_id = $1
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY status;
```

### Notificações não lidas

```sql
SELECT * FROM notifications
WHERE user_id = $1
  AND read = false
ORDER BY created_at DESC;
```

---

## Backup e Restore

### Backup via Supabase

O Supabase realiza backups automáticos diários. Para backup manual:

```bash
# Via pg_dump
pg_dump -h db.xxxx.supabase.co -U postgres -d postgres > backup.sql
```

### Restore

```bash
psql -h db.xxxx.supabase.co -U postgres -d postgres < backup.sql
```

---

## Referências

- [Supabase Database Documentation](https://supabase.com/docs/guides/database)
- [PostgreSQL Row Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [PostgreSQL Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)
