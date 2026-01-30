-- Migration: Add approved field for user approval workflow
-- Date: 2026-01-30

-- Add approved column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT FALSE;

-- Automatically approve existing admin users
UPDATE users SET approved = TRUE WHERE role = 'admin';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_approved ON users(approved);

-- Comment for documentation
COMMENT ON COLUMN users.approved IS 'Indicates if the user has been approved by an admin to access the system';
