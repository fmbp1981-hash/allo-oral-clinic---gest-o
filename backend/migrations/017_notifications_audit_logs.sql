-- Migration 017: Add user_id to notifications + audit_logs table
-- Date: 2026-03-30
-- Purpose: Enable per-user notifications with RLS, and create audit log table

-- ============================================
-- ALTER: notifications (add user_id for RLS)
-- ============================================
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, read) WHERE read = FALSE;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notifications_user_policy ON notifications;
CREATE POLICY notifications_user_policy ON notifications
  USING (user_id = auth.uid()::uuid);

-- ============================================
-- Table: audit_logs (trilha de auditoria do sistema)
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user
  ON audit_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON audit_logs(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON audit_logs(action, created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_logs_user_policy ON audit_logs;
CREATE POLICY audit_logs_user_policy ON audit_logs
  USING (user_id = auth.uid()::uuid);
