-- ============================================
-- Trello Integration Tables
-- ============================================
-- This migration creates tables for Trello integration with bidirectional sync

-- Table to store Trello configuration per user
CREATE TABLE IF NOT EXISTS trello_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    api_key TEXT NOT NULL,
    token TEXT NOT NULL,
    board_id TEXT,
    board_name TEXT,
    sync_enabled BOOLEAN DEFAULT false,
    list_mapping JSONB DEFAULT '{}'::jsonb,
    webhook_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Table to store Trello card <-> Opportunity mappings
CREATE TABLE IF NOT EXISTS trello_card_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    opportunity_id UUID NOT NULL,
    trello_card_id TEXT NOT NULL,
    trello_board_id TEXT NOT NULL,
    trello_list_id TEXT,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_direction TEXT DEFAULT 'bidirectional', -- 'to_trello', 'from_trello', 'bidirectional'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(opportunity_id),
    UNIQUE(trello_card_id)
);

-- Table to store sync history/logs
CREATE TABLE IF NOT EXISTS trello_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- 'create_card', 'update_card', 'move_card', 'create_opportunity', 'update_opportunity'
    direction TEXT NOT NULL, -- 'to_trello', 'from_trello'
    opportunity_id UUID,
    trello_card_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'success', -- 'success', 'error'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_trello_config_user_id ON trello_config(user_id);
CREATE INDEX IF NOT EXISTS idx_trello_card_mappings_user_id ON trello_card_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_trello_card_mappings_opportunity_id ON trello_card_mappings(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_trello_card_mappings_trello_card_id ON trello_card_mappings(trello_card_id);
CREATE INDEX IF NOT EXISTS idx_trello_sync_logs_user_id ON trello_sync_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_trello_sync_logs_created_at ON trello_sync_logs(created_at DESC);

-- Enable RLS
ALTER TABLE trello_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE trello_card_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE trello_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trello_config
CREATE POLICY "Users can view their own trello config" ON trello_config
    FOR SELECT USING (auth.uid()::text = user_id::text OR user_id::text = current_setting('app.current_user_id', true));

CREATE POLICY "Users can insert their own trello config" ON trello_config
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text OR user_id::text = current_setting('app.current_user_id', true));

CREATE POLICY "Users can update their own trello config" ON trello_config
    FOR UPDATE USING (auth.uid()::text = user_id::text OR user_id::text = current_setting('app.current_user_id', true));

CREATE POLICY "Users can delete their own trello config" ON trello_config
    FOR DELETE USING (auth.uid()::text = user_id::text OR user_id::text = current_setting('app.current_user_id', true));

-- RLS Policies for trello_card_mappings
CREATE POLICY "Users can view their own card mappings" ON trello_card_mappings
    FOR SELECT USING (auth.uid()::text = user_id::text OR user_id::text = current_setting('app.current_user_id', true));

CREATE POLICY "Users can insert their own card mappings" ON trello_card_mappings
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text OR user_id::text = current_setting('app.current_user_id', true));

CREATE POLICY "Users can update their own card mappings" ON trello_card_mappings
    FOR UPDATE USING (auth.uid()::text = user_id::text OR user_id::text = current_setting('app.current_user_id', true));

CREATE POLICY "Users can delete their own card mappings" ON trello_card_mappings
    FOR DELETE USING (auth.uid()::text = user_id::text OR user_id::text = current_setting('app.current_user_id', true));

-- RLS Policies for trello_sync_logs
CREATE POLICY "Users can view their own sync logs" ON trello_sync_logs
    FOR SELECT USING (auth.uid()::text = user_id::text OR user_id::text = current_setting('app.current_user_id', true));

CREATE POLICY "Users can insert their own sync logs" ON trello_sync_logs
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text OR user_id::text = current_setting('app.current_user_id', true));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_trello_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trello_config_updated_at ON trello_config;
CREATE TRIGGER trello_config_updated_at
    BEFORE UPDATE ON trello_config
    FOR EACH ROW
    EXECUTE FUNCTION update_trello_updated_at();

DROP TRIGGER IF EXISTS trello_card_mappings_updated_at ON trello_card_mappings;
CREATE TRIGGER trello_card_mappings_updated_at
    BEFORE UPDATE ON trello_card_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_trello_updated_at();

-- ============================================
-- HOW TO APPLY THIS MIGRATION:
-- ============================================
-- 1. Go to Supabase Dashboard > SQL Editor
-- 2. Paste this entire SQL script
-- 3. Click "Run"
-- ============================================
