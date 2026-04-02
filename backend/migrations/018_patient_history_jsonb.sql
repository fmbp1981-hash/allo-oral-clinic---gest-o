-- Migration 018: Converte patients.history de TEXT para JSONB estruturado
-- Estrutura de cada entrada: { category, dentist_name, observations }
-- Data: 2026-06-10

-- Converte a coluna history de TEXT para JSONB
-- Dados de texto antigos são descartados (campo nunca foi populado via UI/import)
ALTER TABLE patients
  ALTER COLUMN history TYPE JSONB
  USING '[]'::jsonb;

ALTER TABLE patients
  ALTER COLUMN history SET DEFAULT '[]'::jsonb;

ALTER TABLE patients
  ALTER COLUMN history SET NOT NULL;

-- Remove o índice GIN antigo (era sobre tsvector, inválido para JSONB)
DROP INDEX IF EXISTS patients_history_gin_idx;

-- Adiciona índice GIN adequado para JSONB
CREATE INDEX IF NOT EXISTS idx_patients_history_jsonb ON patients USING gin(history);

COMMENT ON COLUMN patients.history IS 'Histórico de procedimentos importados: [{category, dentist_name, observations}]';
