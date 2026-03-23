-- Add location and availability fields to profiles table
ALTER TABLE profiles 
ADD COLUMN city TEXT,
ADD COLUMN availability_status TEXT CHECK (availability_status IN ('based_here', 'on_tour', 'open_to_travel')) DEFAULT 'based_here',
ADD COLUMN tour_dates TEXT; -- JSON string for tour city/date pairs

-- Create index for availability status queries
CREATE INDEX idx_profiles_availability_status ON profiles(availability_status);
