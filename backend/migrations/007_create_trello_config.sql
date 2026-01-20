-- Migration: Create Trello configuration table
-- This table stores Trello API credentials and sync settings per tenant

CREATE TABLE IF NOT EXISTS trello_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- API Credentials (encrypted at rest by Supabase)
    api_key TEXT NOT NULL,
    token TEXT NOT NULL,
    
    -- Board Configuration
    board_id TEXT,
    board_name TEXT,
    
    -- Sync Settings
    sync_enabled BOOLEAN DEFAULT FALSE,
    
    -- List Mapping (JSON object mapping status to list IDs)
    -- Example: {"NEW": "listId1", "SENT": "listId2", ...}
    list_mapping JSONB,
    
    -- Webhook
    webhook_id TEXT,
    webhook_callback_url TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one config per tenant
    UNIQUE(tenant_id)
);

-- Add index for tenant lookup
CREATE INDEX IF NOT EXISTS idx_trello_config_tenant ON trello_config(tenant_id);

-- Add RLS policies
ALTER TABLE trello_config ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their tenant's config
CREATE POLICY "Users can view their tenant's trello config"
    ON trello_config
    FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Users can update their tenant's trello config"
    ON trello_config
    FOR UPDATE
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Users can insert their tenant's trello config"
    ON trello_config
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Add trello_card_id column to opportunities table for sync tracking
ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS trello_card_id TEXT;

-- Add index for Trello card lookup
CREATE INDEX IF NOT EXISTS idx_opportunities_trello_card ON opportunities(trello_card_id) 
WHERE trello_card_id IS NOT NULL;

-- Comment for documentation
COMMENT ON TABLE trello_config IS 'Stores Trello integration configuration per tenant';
COMMENT ON COLUMN trello_config.list_mapping IS 'JSON mapping of opportunity statuses to Trello list IDs: {"NEW": "id", "SENT": "id", ...}';
COMMENT ON COLUMN opportunities.trello_card_id IS 'Trello card ID for bidirectional sync';
