-- Migration 013: Tabelas de campanhas e agente IA
-- Data: 2026-03-17

-- ============================================
-- Table: campaigns
-- ============================================
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',
  total_patients INT DEFAULT 0,
  sent_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  message_template TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS campaigns_user_policy ON campaigns;
CREATE POLICY campaigns_user_policy ON campaigns
  USING (user_id = auth.uid()::uuid);

-- ============================================
-- Table: campaign_patients
-- ============================================
CREATE TABLE IF NOT EXISTS campaign_patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  personalized_message TEXT NOT NULL DEFAULT '',
  status VARCHAR(50) DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  whatsapp_message_id VARCHAR(200)
);

CREATE INDEX IF NOT EXISTS idx_campaign_patients_campaign ON campaign_patients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_patients_patient ON campaign_patients(patient_id);
CREATE INDEX IF NOT EXISTS idx_campaign_patients_status ON campaign_patients(status);

ALTER TABLE campaign_patients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS campaign_patients_via_campaign ON campaign_patients;
CREATE POLICY campaign_patients_via_campaign ON campaign_patients
  USING (campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid()::uuid));

-- ============================================
-- Table: agent_conversations
-- ============================================
CREATE TABLE IF NOT EXISTS agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_phone VARCHAR(20) NOT NULL,
  patient_id UUID REFERENCES patients(id),
  campaign_patient_id UUID REFERENCES campaign_patients(id),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, patient_phone)
);

CREATE INDEX IF NOT EXISTS idx_agent_conversations_user ON agent_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_phone ON agent_conversations(patient_phone);

ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS agent_conversations_user_policy ON agent_conversations;
CREATE POLICY agent_conversations_user_policy ON agent_conversations
  USING (user_id = auth.uid()::uuid);

-- ============================================
-- Table: agent_messages
-- ============================================
CREATE TABLE IF NOT EXISTS agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('patient', 'agent', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_messages_conversation ON agent_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_created_at ON agent_messages(created_at);

ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS agent_messages_via_conversation ON agent_messages;
CREATE POLICY agent_messages_via_conversation ON agent_messages
  USING (conversation_id IN (
    SELECT id FROM agent_conversations WHERE user_id = auth.uid()::uuid
  ));

-- ============================================
-- Function: increment_campaign_counts (atomic counter)
-- ============================================
CREATE OR REPLACE FUNCTION increment_campaign_counts(
  p_campaign_id UUID,
  p_sent INT,
  p_failed INT
) RETURNS void AS $$
BEGIN
  UPDATE campaigns
  SET sent_count   = sent_count + p_sent,
      failed_count = failed_count + p_failed
  WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
