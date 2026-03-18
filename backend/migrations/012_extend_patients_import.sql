-- Migration 012: Extensão da tabela patients para importação
-- Data: 2026-03-17

ALTER TABLE patients ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS dentist_name VARCHAR(150);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS observations TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS imported_at TIMESTAMP WITH TIME ZONE;

-- OBRIGATÓRIO para upsert na importação (onConflict: 'user_id,phone')
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'patients_user_id_phone_unique'
  ) THEN
    ALTER TABLE patients ADD CONSTRAINT patients_user_id_phone_unique UNIQUE (user_id, phone);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_patients_category ON patients(category);
CREATE INDEX IF NOT EXISTS idx_patients_dentist ON patients(dentist_name);
CREATE INDEX IF NOT EXISTS idx_patients_source ON patients(source);
