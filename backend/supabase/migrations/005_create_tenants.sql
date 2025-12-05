-- Migration: Unified Multi-Tenancy & User Audit
-- Description: Adds tenant_id (Team) AND user_id (Audit), backfills existing data, and enables Tenant RLS.

-- ============================================
-- STEP 1: Setup Tenants Table & Default Tenant
-- ============================================

CREATE TABLE IF NOT EXISTS tenants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on tenants
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Create a Default Tenant for existing data migration
DO $$ 
DECLARE 
    default_tenant_id UUID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM tenants LIMIT 1) THEN
        INSERT INTO tenants (name) VALUES ('Minha Clínica Principal');
    END IF;
END $$;

-- ============================================
-- STEP 2: Add Columns (Safe Mode)
-- ============================================

-- Function to safely add columns if they don't exist
DO $$ 
BEGIN
    -- users
    ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
    
    -- patients
    ALTER TABLE patients ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
    ALTER TABLE patients ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id); -- Audit

    -- opportunities
    ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
    ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id); -- Audit

    -- clinical_records
    ALTER TABLE clinical_records ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
    ALTER TABLE clinical_records ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id); -- Audit

    -- notifications
    ALTER TABLE notifications ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
    ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
    
    -- app_settings
    ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
END $$;

-- ============================================
-- STEP 3: MIGRATION (Backfill Data)
-- ============================================

DO $$ 
DECLARE 
    main_tenant_id UUID;
    first_user_id UUID;
BEGIN
    SELECT id INTO main_tenant_id FROM tenants LIMIT 1;
    SELECT id INTO first_user_id FROM users ORDER BY created_at ASC LIMIT 1;

    -- 1. Migrate Users: Assign existing users to the Main Tenant
    UPDATE users SET tenant_id = main_tenant_id WHERE tenant_id IS NULL;

    -- 2. Migrate Patients: Assign to Main Tenant & First User if null
    UPDATE patients SET tenant_id = main_tenant_id WHERE tenant_id IS NULL;
    UPDATE patients SET user_id = first_user_id WHERE user_id IS NULL AND first_user_id IS NOT NULL;

    -- 3. Migrate Opportunities
    UPDATE opportunities SET tenant_id = main_tenant_id WHERE tenant_id IS NULL;
    UPDATE opportunities SET user_id = first_user_id WHERE user_id IS NULL AND first_user_id IS NOT NULL;

    -- 4. Migrate Records
    UPDATE clinical_records SET tenant_id = main_tenant_id WHERE tenant_id IS NULL;
    UPDATE clinical_records SET user_id = first_user_id WHERE user_id IS NULL AND first_user_id IS NOT NULL;

    -- 5. Migrate Notifications
    UPDATE notifications SET tenant_id = main_tenant_id WHERE tenant_id IS NULL;
    UPDATE notifications SET user_id = first_user_id WHERE user_id IS NULL AND first_user_id IS NOT NULL;
    
    -- 6. Migrate Settings
    UPDATE app_settings SET tenant_id = main_tenant_id WHERE tenant_id IS NULL;
END $$;

-- ============================================
-- STEP 4: RLS Policies (The Team Rules)
-- ============================================

-- Drop old "Private" policies if they exist (Clean slate)
DROP POLICY IF EXISTS "Users can only see their own patients" ON patients;
DROP POLICY IF EXISTS "Users can only see their own opportunities" ON opportunities;
DROP POLICY IF EXISTS "Users can only see their own clinical records" ON clinical_records;
DROP POLICY IF EXISTS "Users can only see their own notifications" ON notifications;

-- Enable RLS everywhere
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_records ENABLE ROW LEVEL SECURITY;

-- NEW POLICIES: "See everything in my Tenant"

-- Tenants
DROP POLICY IF EXISTS "Users can view their own tenant" ON tenants;
CREATE POLICY "Users can view their own tenant" ON tenants FOR SELECT USING (id IN (SELECT tenant_id FROM users WHERE users.id = auth.uid()::uuid));

-- Users
DROP POLICY IF EXISTS "Users can view users in the same tenant" ON users;
CREATE POLICY "Users can view users in the same tenant" ON users FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM users WHERE users.id = auth.uid()::uuid));

-- Patients
DROP POLICY IF EXISTS "Users can view patients in their tenant" ON patients;
CREATE POLICY "Users can view patients in their tenant" ON patients FOR ALL USING (tenant_id IN (SELECT tenant_id FROM users WHERE users.id = auth.uid()::uuid));

-- Opportunities
DROP POLICY IF EXISTS "Users can view opportunities in their tenant" ON opportunities;
CREATE POLICY "Users can view opportunities in their tenant" ON opportunities FOR ALL USING (tenant_id IN (SELECT tenant_id FROM users WHERE users.id = auth.uid()::uuid));

-- Notifications
DROP POLICY IF EXISTS "Users can view notifications in their tenant" ON notifications;
CREATE POLICY "Users can view notifications in their tenant" ON notifications FOR ALL USING (tenant_id IN (SELECT tenant_id FROM users WHERE users.id = auth.uid()::uuid));

-- App Settings
DROP POLICY IF EXISTS "Users can view app settings in their tenant" ON app_settings;
CREATE POLICY "Users can view app settings in their tenant" ON app_settings FOR ALL USING (tenant_id IN (SELECT tenant_id FROM users WHERE users.id = auth.uid()::uuid));

-- Clinical Records
DROP POLICY IF EXISTS "Users can view clinical records in their tenant" ON clinical_records;
CREATE POLICY "Users can view clinical records in their tenant" ON clinical_records FOR ALL USING (tenant_id IN (SELECT tenant_id FROM users WHERE users.id = auth.uid()::uuid));

-- ============================================
-- STEP 5: Automation (Auto-assign Tenant)
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
    default_tenant_id UUID;
BEGIN
    -- Check if a tenant already exists, if not create a default one
    SELECT id INTO default_tenant_id FROM tenants LIMIT 1;
    
    IF default_tenant_id IS NULL THEN
        INSERT INTO tenants (name) VALUES ('Default Clinic') RETURNING id INTO default_tenant_id;
    END IF;

    -- Update the user with the tenant_id
    UPDATE public.users 
    SET tenant_id = default_tenant_id 
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_created ON public.users;
CREATE TRIGGER on_user_created
    AFTER INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_patients_tenant_id ON patients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_tenant_id ON opportunities(tenant_id);
