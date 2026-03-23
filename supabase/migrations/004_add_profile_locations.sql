-- Add location fields to profiles table
ALTER TABLE profiles 
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8),
ADD COLUMN location_address TEXT;

-- Update RLS policies to allow reading profiles for location-based searches
CREATE POLICY "Users can view musician profiles for location search" ON profiles
  FOR SELECT USING (user_type = 'musician');

-- Create index for location queries
CREATE INDEX idx_profiles_user_type ON profiles(user_type);
CREATE INDEX idx_profiles_location ON profiles(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
