-- Migration: Add missing fields to user_settings table
-- This adds the provider selection and message templates fields

-- ============================================
-- Add provider column if not exists
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'user_settings' AND column_name = 'provider') THEN
        ALTER TABLE user_settings ADD COLUMN provider VARCHAR(50) DEFAULT 'evolution';
    END IF;
END $$;

-- ============================================
-- Add Z-API fields
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'user_settings' AND column_name = 'zapi_url') THEN
        ALTER TABLE user_settings ADD COLUMN zapi_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'user_settings' AND column_name = 'zapi_instance_id') THEN
        ALTER TABLE user_settings ADD COLUMN zapi_instance_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'user_settings' AND column_name = 'zapi_token') THEN
        ALTER TABLE user_settings ADD COLUMN zapi_token TEXT;
    END IF;
END $$;

-- ============================================
-- Add Business Cloud fields
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'user_settings' AND column_name = 'business_phone_number_id') THEN
        ALTER TABLE user_settings ADD COLUMN business_phone_number_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'user_settings' AND column_name = 'business_access_token') THEN
        ALTER TABLE user_settings ADD COLUMN business_access_token TEXT;
    END IF;
END $$;

-- ============================================
-- Add Message Template fields
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'user_settings' AND column_name = 'reactivation_message') THEN
        ALTER TABLE user_settings ADD COLUMN reactivation_message TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'user_settings' AND column_name = 'appointment_confirmation') THEN
        ALTER TABLE user_settings ADD COLUMN appointment_confirmation TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'user_settings' AND column_name = 'appointment_reminder') THEN
        ALTER TABLE user_settings ADD COLUMN appointment_reminder TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'user_settings' AND column_name = 'welcome_message') THEN
        ALTER TABLE user_settings ADD COLUMN welcome_message TEXT;
    END IF;
END $$;

-- ============================================
-- Create message_templates table if not exists
-- ============================================
CREATE TABLE IF NOT EXISTS message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,

    -- Template Info
    name VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,

    -- Template Type (optional, for categorization)
    type VARCHAR(50), -- reactivation, confirmation, reminder, welcome, custom

    -- Active status
    is_active BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for user lookup
CREATE INDEX IF NOT EXISTS idx_message_templates_user_id ON message_templates(user_id);

-- Enable RLS on message_templates if not already enabled
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

-- Add comments
COMMENT ON COLUMN user_settings.provider IS 'WhatsApp provider: evolution, zapi, or business_cloud';
COMMENT ON COLUMN user_settings.reactivation_message IS 'Default message template for patient reactivation';
COMMENT ON COLUMN user_settings.appointment_confirmation IS 'Default message template for appointment confirmation';
COMMENT ON COLUMN user_settings.appointment_reminder IS 'Default message template for appointment reminders';
COMMENT ON COLUMN user_settings.welcome_message IS 'Default message template for welcoming new patients';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
-- Migration completed successfully!
-- Added missing fields to user_settings table.
-- Created message_templates table.
