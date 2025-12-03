-- Migration: Fix Schema para compatibilidade com Seed Data
-- Description: Adiciona colunas faltantes necessárias para o sistema
-- Date: 2025-12-03

-- =====================================================
-- 1. Adicionar coluna 'role' na tabela 'users'
-- =====================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Adicionar constraint para valores válidos
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'dentist', 'receptionist', 'user'));

COMMENT ON COLUMN users.role IS 'Papel do usuário: admin, dentist, receptionist, user';

-- =====================================================
-- 2. Renomear/Adicionar coluna 'password_hash' na tabela 'users'
-- =====================================================
-- Se a coluna 'password' existe, vamos adicionar 'password_hash' como alias
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Copiar dados de 'password' para 'password_hash' se existirem
UPDATE users SET password_hash = password WHERE password_hash IS NULL AND password IS NOT NULL;

-- Para compatibilidade, vamos manter ambas as colunas sincronizadas com trigger
CREATE OR REPLACE FUNCTION sync_password_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Se password_hash foi atualizado, copiar para password
    IF NEW.password_hash IS NOT NULL AND NEW.password_hash <> OLD.password_hash THEN
        NEW.password = NEW.password_hash;
    END IF;
    -- Se password foi atualizado, copiar para password_hash
    IF NEW.password IS NOT NULL AND NEW.password <> OLD.password THEN
        NEW.password_hash = NEW.password;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_password_trigger ON users;
CREATE TRIGGER sync_password_trigger
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION sync_password_fields();

-- =====================================================
-- 3. Modificar coluna 'history' na tabela 'patients' para suportar ARRAY
-- =====================================================
-- Primeiro, adicionar nova coluna para array
ALTER TABLE patients ADD COLUMN IF NOT EXISTS history_array TEXT[];

-- Migrar dados existentes de TEXT para ARRAY (se houver dados)
UPDATE patients
SET history_array = string_to_array(history, ',')
WHERE history IS NOT NULL AND history_array IS NULL;

-- Para compatibilidade reversa, manter ambas sincronizadas
CREATE OR REPLACE FUNCTION sync_history_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Se history_array foi atualizado, converter para TEXT
    IF NEW.history_array IS NOT NULL THEN
        NEW.history = array_to_string(NEW.history_array, ', ');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_history_trigger ON patients;
CREATE TRIGGER sync_history_trigger
    BEFORE INSERT OR UPDATE ON patients
    FOR EACH ROW
    EXECUTE FUNCTION sync_history_fields();

-- =====================================================
-- 4. Adicionar coluna 'clinical_records' na tabela 'patients'
-- =====================================================
ALTER TABLE patients ADD COLUMN IF NOT EXISTS clinical_records TEXT;

COMMENT ON COLUMN patients.clinical_records IS 'Registros clínicos do paciente em texto livre';

-- =====================================================
-- 5. Adicionar coluna 'user_id' na tabela 'opportunities'
-- =====================================================
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_opportunities_user_id ON opportunities(user_id);

COMMENT ON COLUMN opportunities.user_id IS 'ID do usuário responsável pela oportunidade';

-- =====================================================
-- 6. Criar índices para performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_patients_history_array ON patients USING GIN(history_array);

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================

-- Verificar estrutura final
DO $$
BEGIN
    RAISE NOTICE '✅ Migration 00_fix_schema.sql aplicada com sucesso!';
    RAISE NOTICE 'Colunas adicionadas:';
    RAISE NOTICE '  - users.role';
    RAISE NOTICE '  - users.password_hash';
    RAISE NOTICE '  - patients.history_array';
    RAISE NOTICE '  - patients.clinical_records';
    RAISE NOTICE '  - opportunities.user_id';
END $$;
