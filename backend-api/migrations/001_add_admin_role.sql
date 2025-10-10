-- Migration: Add admin role to users table
-- This adds an is_admin column to support admin panel access control

-- Add is_admin column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create an index for faster admin queries
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin) WHERE is_admin = TRUE;

-- Optional: Set a specific user as admin (update with your email)
-- UPDATE users SET is_admin = TRUE WHERE email = 'admin@repazoo.com';

-- Add comment for documentation
COMMENT ON COLUMN users.is_admin IS 'Whether the user has admin panel access';
