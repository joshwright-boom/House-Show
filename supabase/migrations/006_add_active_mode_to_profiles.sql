-- Add active_mode column to profiles table
-- This allows users to switch between musician and host modes
ALTER TABLE profiles 
ADD COLUMN active_mode TEXT DEFAULT 'musician' NOT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN profiles.active_mode IS 'The currently active mode for the user: "musician" or "host"';

-- Create an index for faster lookups
CREATE INDEX idx_profiles_active_mode ON profiles(active_mode);
