-- Add password reset fields to users table
-- Run this SQL in Supabase SQL Editor

ALTER TABLE users
ADD COLUMN IF NOT EXISTS reset_token_hash TEXT,
ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ;

-- Create index on reset_token_expires for cleanup queries
CREATE INDEX IF NOT EXISTS idx_users_reset_token_expires
ON users(reset_token_expires)
WHERE reset_token_expires IS NOT NULL;

-- Add comment
COMMENT ON COLUMN users.reset_token_hash IS 'Hashed token for password reset (SHA-256)';
COMMENT ON COLUMN users.reset_token_expires IS 'Expiration time for password reset token';
