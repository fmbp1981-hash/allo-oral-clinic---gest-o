-- Migration 015: Add tenant_id to campaigns/campaign_patients + handoff_requests table
-- Date: 2026-03-19

-- ============================================
-- Add tenant_id to campaigns (multi-tenancy consistency)
-- ============================================
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Backfill tenant_id from users table
UPDATE campaigns c
SET tenant_id = u.tenant_id
FROM users u
WHERE c.user_id = u.id
  AND c.tenant_id IS NULL;

-- Update RLS to use tenant_id
DROP POLICY IF EXISTS campaigns_user_policy ON campaigns;
CREATE POLICY campaigns_user_policy ON campaigns
  USING (user_id = auth.uid()::uuid);

-- ============================================
-- Add tenant_id to campaign_patients (via campaign join)
-- ============================================
-- campaign_patients inherits isolation from campaigns via FK
-- No direct tenant_id needed — RLS policy already filters through campaigns

-- ============================================
-- Table: handoff_requests (agent → human escalation)
-- ============================================
CREATE TABLE IF NOT EXISTS handoff_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  ai_summary TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- pending | accepted | expired | cancelled
  accepted_by UUID REFERENCES users(id),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expired_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_handoff_requests_conversation ON handoff_requests(conversation_id);
CREATE INDEX IF NOT EXISTS idx_handoff_requests_status ON handoff_requests(status);
CREATE INDEX IF NOT EXISTS idx_handoff_requests_user ON handoff_requests(user_id);

ALTER TABLE handoff_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS handoff_requests_user_policy ON handoff_requests;
CREATE POLICY handoff_requests_user_policy ON handoff_requests
  USING (user_id = auth.uid()::uuid);

-- ============================================
-- Add status 'escalated' support to agent_conversations
-- ============================================
-- The status column is VARCHAR(50), so 'escalated' is already valid
-- Just add an index for filtering
CREATE INDEX IF NOT EXISTS idx_agent_conversations_status ON agent_conversations(status);
