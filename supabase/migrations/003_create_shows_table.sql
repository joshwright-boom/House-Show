-- Create shows table
CREATE TABLE IF NOT EXISTS shows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  show_name TEXT NOT NULL,
  venue_name TEXT NOT NULL,
  venue_address TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  ticket_price DECIMAL(10,2) NOT NULL,
  max_capacity INTEGER NOT NULL,
  show_description TEXT NOT NULL,
  genre_preference TEXT NOT NULL,
  host_id UUID REFERENCES auth.users(id) NOT NULL,
  artist_user_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL CHECK (status IN ('open', 'booked', 'cancelled')) DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE shows ENABLE ROW LEVEL SECURITY;

-- Create policies for shows table
CREATE POLICY "Users can view own shows" ON shows
  FOR SELECT USING (auth.uid() = host_id OR auth.uid() = artist_user_id);

CREATE POLICY "Users can insert own shows" ON shows
  FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update own shows" ON shows
  FOR UPDATE USING (auth.uid() = host_id);

CREATE POLICY "Artists can update shows they're booked for" ON shows
  FOR UPDATE USING (auth.uid() = artist_user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_shows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_shows_updated_at
  BEFORE UPDATE ON shows
  FOR EACH ROW
  EXECUTE FUNCTION update_shows_updated_at();

-- Create index for better performance
CREATE INDEX idx_shows_host_id ON shows(host_id);
CREATE INDEX idx_shows_artist_user_id ON shows(artist_user_id);
CREATE INDEX idx_shows_status ON shows(status);
CREATE INDEX idx_shows_date ON shows(date);
