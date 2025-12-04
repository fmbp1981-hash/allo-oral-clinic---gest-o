-- Add user_id to tables for multi-tenancy isolation
-- Run this SQL in Supabase SQL Editor

-- 1. Add user_id to patients table
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE;

-- 2. Add user_id to opportunities table
ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE;

-- 3. Add user_id to clinical_records table
ALTER TABLE clinical_records
ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE;

-- 4. Add user_id to settings table (if exists)
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE;

-- 5. Add user_id to notifications table
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_user_id ON opportunities(user_id);
CREATE INDEX IF NOT EXISTS idx_clinical_records_user_id ON clinical_records(user_id);
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- 7. Enable Row Level Security (RLS) on all tables
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies - users can only see their own data
CREATE POLICY "Users can only see their own patients"
    ON patients FOR ALL
    USING (user_id = auth.uid());

CREATE POLICY "Users can only see their own opportunities"
    ON opportunities FOR ALL
    USING (user_id = auth.uid());

CREATE POLICY "Users can only see their own clinical records"
    ON clinical_records FOR ALL
    USING (user_id = auth.uid());

CREATE POLICY "Users can only see their own settings"
    ON settings FOR ALL
    USING (user_id = auth.uid());

CREATE POLICY "Users can only see their own notifications"
    ON notifications FOR ALL
    USING (user_id = auth.uid());

-- Comments
COMMENT ON COLUMN patients.user_id IS 'Reference to user/clinic that owns this patient';
COMMENT ON COLUMN opportunities.user_id IS 'Reference to user/clinic that owns this opportunity';
COMMENT ON COLUMN clinical_records.user_id IS 'Reference to user/clinic that owns this record';
COMMENT ON COLUMN settings.user_id IS 'Reference to user/clinic that owns these settings';
COMMENT ON COLUMN notifications.user_id IS 'Reference to user that should see this notification';
