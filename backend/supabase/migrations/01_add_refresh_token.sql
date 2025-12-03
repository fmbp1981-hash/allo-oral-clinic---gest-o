-- Add refresh_token_hash to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token_hash TEXT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_refresh_token_hash ON users(refresh_token_hash);
