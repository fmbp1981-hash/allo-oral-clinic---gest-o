-- Migration 019: Cria tabela message_logs para registro de disparos WhatsApp
-- Todas as mensagens enviadas via /api/whatsapp/send-bulk e campanhas são registradas aqui
-- Data: 2026-04-06

CREATE TABLE IF NOT EXISTS message_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_id    UUID REFERENCES patients(id) ON DELETE SET NULL,
  campaign_id   UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  template_id   TEXT,
  phone         TEXT NOT NULL,
  message       TEXT NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error         TEXT,
  provider      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_message_logs_user_id    ON message_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_patient_id ON message_logs (patient_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_campaign_id ON message_logs (campaign_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_created_at ON message_logs (created_at DESC);

-- RLS: cada usuário vê apenas seus próprios registros
ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY message_logs_user_policy ON message_logs
  USING (user_id = auth.uid());

COMMENT ON TABLE  message_logs IS 'Registro de todas as mensagens WhatsApp disparadas pelo sistema';
COMMENT ON COLUMN message_logs.status   IS 'sent = enviado com sucesso | failed = falha no envio';
COMMENT ON COLUMN message_logs.template_id IS 'ID do template usado (UUID de message_templates ou ID de template padrão como "reactivation")';
COMMENT ON COLUMN message_logs.provider IS 'Provedor usado: evolution | zapi | business_cloud | webhook | web';
