-- Migration: Create Tenants and Enable Multi-Tenancy
-- Description: Implement Multi-Tenancy via RLS
-- Date: 2025-12-05

-- 1. Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add tenant_id to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- 3. Add tenant_id to other tables
ALTER TABLE patients ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE clinical_records ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- 4. Enable RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_records ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- Tenants: Users can view their own tenant
CREATE POLICY "Users can view their own tenant" ON tenants
    FOR SELECT
    USING (id IN (SELECT tenant_id FROM users WHERE users.id = auth.uid()::uuid));

-- Users: Users can view users in the same tenant
CREATE POLICY "Users can view users in the same tenant" ON users
    FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM users WHERE users.id = auth.uid()::uuid));

-- Patients: Users can view patients in their tenant
CREATE POLICY "Users can view patients in their tenant" ON patients
    FOR ALL
    USING (tenant_id IN (SELECT tenant_id FROM users WHERE users.id = auth.uid()::uuid));

-- Opportunities: Users can view opportunities in their tenant
CREATE POLICY "Users can view opportunities in their tenant" ON opportunities
    FOR ALL
    USING (tenant_id IN (SELECT tenant_id FROM users WHERE users.id = auth.uid()::uuid));

-- Notifications: Users can view notifications in their tenant
CREATE POLICY "Users can view notifications in their tenant" ON notifications
    FOR ALL
    USING (tenant_id IN (SELECT tenant_id FROM users WHERE users.id = auth.uid()::uuid));

-- App Settings: Users can view app settings in their tenant
CREATE POLICY "Users can view app settings in their tenant" ON app_settings
    FOR ALL
    USING (tenant_id IN (SELECT tenant_id FROM users WHERE users.id = auth.uid()::uuid));

-- Clinical Records: Users can view clinical records in their tenant
CREATE POLICY "Users can view clinical records in their tenant" ON clinical_records
    FOR ALL
    USING (tenant_id IN (SELECT tenant_id FROM users WHERE users.id = auth.uid()::uuid));

-- 6. Function to handle new user registration (assign default tenant if none exists, or create one)
-- NOTE: In a real scenario, you might want to create a tenant per user or assign to an existing one via invite.
-- For this MVP, we will create a 'Default Tenant' if one doesn't exist and assign the user to it,
-- OR if the user provides a tenant_id, we use that.

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

-- Trigger to call the function after a user is created (assuming users are created in public.users)
-- IMPORTANT: This assumes the application creates the user in public.users. 
-- If using Supabase Auth (auth.users), you need a trigger on auth.users to copy to public.users or similar.
-- Based on the file structures, it seems we are using a custom 'users' table in public.

CREATE OR REPLACE TRIGGER on_user_created
    AFTER INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Indexing
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_patients_tenant_id ON patients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_tenant_id ON opportunities(tenant_id);
