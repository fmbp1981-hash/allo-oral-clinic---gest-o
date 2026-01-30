-- Migration: Extend clinical_records table for full patient medical records (Prontuário)
-- Date: 2026-01-30

-- Add new columns for comprehensive medical records
ALTER TABLE clinical_records
ADD COLUMN IF NOT EXISTS diagnosis TEXT,
ADD COLUMN IF NOT EXISTS treatment TEXT,
ADD COLUMN IF NOT EXISTS medications TEXT,
ADD COLUMN IF NOT EXISTS observations TEXT,
ADD COLUMN IF NOT EXISTS dentist_name TEXT,
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_clinical_records_date ON clinical_records(date DESC);
CREATE INDEX IF NOT EXISTS idx_clinical_records_type ON clinical_records(type);
CREATE INDEX IF NOT EXISTS idx_clinical_records_user_id ON clinical_records(user_id);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_clinical_records_updated_at ON clinical_records;
CREATE TRIGGER update_clinical_records_updated_at BEFORE UPDATE ON clinical_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comment on columns for documentation
COMMENT ON COLUMN clinical_records.diagnosis IS 'Diagnóstico clínico do atendimento';
COMMENT ON COLUMN clinical_records.treatment IS 'Tratamento realizado ou proposto';
COMMENT ON COLUMN clinical_records.medications IS 'Medicamentos prescritos';
COMMENT ON COLUMN clinical_records.observations IS 'Observações adicionais do profissional';
COMMENT ON COLUMN clinical_records.dentist_name IS 'Nome do dentista responsável';
COMMENT ON COLUMN clinical_records.attachments IS 'Anexos em formato JSON (URLs de imagens, documentos, etc)';
COMMENT ON COLUMN clinical_records.user_id IS 'ID do usuário que criou o registro';
