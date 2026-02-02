-- ==============================================================================
-- SCRIPT CONSOLIDADO PARA APLICAÇÃO MANUAL
-- PROJETO ALVO: Allo Oral Clinic (ID: filghodpkdzphihberuc)
-- DATA: 2026-02-02
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PARTE 1: Prontuário Eletrônico (Migration 010)
-- ------------------------------------------------------------------------------

-- Adicionar colunas para registro clínico completo
ALTER TABLE clinical_records
ADD COLUMN IF NOT EXISTS diagnosis TEXT,
ADD COLUMN IF NOT EXISTS treatment TEXT,
ADD COLUMN IF NOT EXISTS medications TEXT,
ADD COLUMN IF NOT EXISTS observations TEXT,
ADD COLUMN IF NOT EXISTS dentist_name TEXT,
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_clinical_records_date ON clinical_records(date DESC);
CREATE INDEX IF NOT EXISTS idx_clinical_records_type ON clinical_records(type);
CREATE INDEX IF NOT EXISTS idx_clinical_records_user_id ON clinical_records(user_id);

-- Comentários
COMMENT ON COLUMN clinical_records.diagnosis IS 'Diagnóstico clínico do atendimento';
COMMENT ON COLUMN clinical_records.treatment IS 'Tratamento realizado ou proposto';
COMMENT ON COLUMN clinical_records.medications IS 'Medicamentos prescritos';
COMMENT ON COLUMN clinical_records.attachments IS 'Anexos em formato JSON (URLs de imagens, documentos, etc)';

-- ------------------------------------------------------------------------------
-- PARTE 2: Aprovação de Usuários (Migration 011)
-- ------------------------------------------------------------------------------

-- Adicionar campo approved
ALTER TABLE users
ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT FALSE;

-- Importante: Aprovar administradores existentes automaticamente para não bloqueá-los
UPDATE users SET approved = TRUE WHERE role = 'admin';

-- Índice
CREATE INDEX IF NOT EXISTS idx_users_approved ON users(approved);

-- Comentário
COMMENT ON COLUMN users.approved IS 'Indicates if the user has been approved by an admin to access the system';


-- ------------------------------------------------------------------------------
-- PARTE 3: Configurações do Sistema (Corrigido)
-- ------------------------------------------------------------------------------

-- 1. Cria a tabela básica (Recria para garantir tipo correto do ID)
DROP TABLE IF EXISTS app_settings;
CREATE TABLE app_settings (
  id INT PRIMARY KEY DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Adiciona as colunas individualmente para garantir que existam
-- Isso evita o erro "column does not exist" se a tabela já existia
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS default_role TEXT DEFAULT 'user';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS message_template TEXT;

-- 3. Configura permissões (RLS)
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Política de Leitura Pública
DROP POLICY IF EXISTS "Public Read Settings" ON app_settings;
CREATE POLICY "Public Read Settings" ON app_settings FOR SELECT USING (true);

-- Política de Atualização (Admin/Service Role)
DROP POLICY IF EXISTS "Admin Update Settings" ON app_settings;
CREATE POLICY "Admin Update Settings" ON app_settings FOR UPDATE USING (
  auth.role() = 'service_role' OR 
  auth.jwt() ->> 'role' = 'admin'
);

-- Política de Inserção (Admin/Service Role)
DROP POLICY IF EXISTS "Admin Insert Settings" ON app_settings;
CREATE POLICY "Admin Insert Settings" ON app_settings FOR INSERT WITH CHECK (
  auth.role() = 'service_role' OR 
  auth.jwt() ->> 'role' = 'admin'
);

-- 4. Insere registro padrão
INSERT INTO app_settings (id, default_role, message_template) 
VALUES (
  1, 
  'user', 
  'Olá {name}, somos da Allo Oral Clinic. Verificamos seu histórico sobre "{keyword}" e gostaríamos de saber como está a saúde do seu sorriso. Podemos agendar uma avaliação?'
) 
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- FIM DO SCRIPT
-- Copie e cole todo o conteúdo acima no SQL Editor do seu projeto Supabase correto.
-- ==============================================================================
