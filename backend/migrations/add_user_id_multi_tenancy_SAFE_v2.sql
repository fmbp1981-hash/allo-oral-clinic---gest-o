-- SAFE Migration v2: Add user_id to tables with existing data
-- This version handles existing data correctly and skips the settings table
-- Run this SQL in Supabase SQL Editor

-- ============================================
-- STEP 1: Add columns WITHOUT NOT NULL first
-- ============================================

-- 1. Add user_id to patients table (nullable first)
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- 2. Add user_id to opportunities table (nullable first)
ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- 3. Add user_id to clinical_records table (nullable first)
ALTER TABLE clinical_records
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- 4. Add user_id to notifications table (nullable first)
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- ============================================
-- STEP 2: Fill existing records with user_id
-- ============================================

-- Update existing patients with the first user in the system
UPDATE patients
SET user_id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
WHERE user_id IS NULL;

-- Update existing opportunities with the first user
UPDATE opportunities
SET user_id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
WHERE user_id IS NULL;

-- Update existing clinical_records with the first user
UPDATE clinical_records
SET user_id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
WHERE user_id IS NULL;

-- Update existing notifications with the first user
UPDATE notifications
SET user_id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
WHERE user_id IS NULL;

-- ============================================
-- STEP 3: Make columns NOT NULL
-- ============================================

ALTER TABLE patients ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE opportunities ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE clinical_records ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE notifications ALTER COLUMN user_id SET NOT NULL;

-- ============================================
-- STEP 4: Create indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_user_id ON opportunities(user_id);
CREATE INDEX IF NOT EXISTS idx_clinical_records_user_id ON clinical_records(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- ============================================
-- STEP 5: Enable Row Level Security (RLS)
-- ============================================

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 6: Create RLS policies
-- ============================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can only see their own patients" ON patients;
DROP POLICY IF EXISTS "Users can only see their own opportunities" ON opportunities;
DROP POLICY IF EXISTS "Users can only see their own clinical records" ON clinical_records;
DROP POLICY IF EXISTS "Users can only see their own notifications" ON notifications;

-- Create new policies
CREATE POLICY "Users can only see their own patients"
    ON patients FOR ALL
    USING (user_id = auth.uid());

CREATE POLICY "Users can only see their own opportunities"
    ON opportunities FOR ALL
    USING (user_id = auth.uid());

CREATE POLICY "Users can only see their own clinical records"
    ON clinical_records FOR ALL
    USING (user_id = auth.uid());

CREATE POLICY "Users can only see their own notifications"
    ON notifications FOR ALL
    USING (user_id = auth.uid());

-- ============================================
-- STEP 7: Add comments
-- ============================================

COMMENT ON COLUMN patients.user_id IS 'Reference to user/clinic that owns this patient';
COMMENT ON COLUMN opportunities.user_id IS 'Reference to user/clinic that owns this opportunity';
COMMENT ON COLUMN clinical_records.user_id IS 'Reference to user/clinic that owns this record';
COMMENT ON COLUMN notifications.user_id IS 'Reference to user that should see this notification';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
-- Migration completed successfully!
-- All existing data has been assigned to the first user.
-- New records will require user_id to be specified.
-- Note: The settings table was skipped as it does not exist in your database.
