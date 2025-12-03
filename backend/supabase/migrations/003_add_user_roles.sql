-- Migration: Add role field to users table
-- Date: 2025-12-03
-- Description: Adds role field to support admin/user distinction

-- Add role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Create index for role queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Set fmbp1981@gmail.com as admin
UPDATE users 
SET role = 'admin' 
WHERE email = 'fmbp1981@gmail.com';

-- Add comment for documentation
COMMENT ON COLUMN users.role IS 'User role: admin or user';
