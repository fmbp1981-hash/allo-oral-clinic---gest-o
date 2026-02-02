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

-- Trigger para updated_at (comentado para evitar erro se função não existir, descomente se necessário)
-- CREATE TRIGGER update_clinical_records_updated_at BEFORE UPDATE ON clinical_records
--    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

-- ==============================================================================
-- FIM DO SCRIPT
-- Copie e cole todo o conteúdo acima no SQL Editor do seu projeto Supabase correto.
-- ==============================================================================
