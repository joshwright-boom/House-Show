-- Create booking_requests table
CREATE TABLE booking_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  musician_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  proposed_date DATE NOT NULL,
  venue_address TEXT NOT NULL,
  ticket_price DECIMAL(10,2) NOT NULL,
  host_split INTEGER NOT NULL CHECK (host_split >= 0 AND host_split <= 100),
  musician_split INTEGER NOT NULL CHECK (musician_split >= 0 AND musician_split <= 100),
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'countered')),
  counter_offer_date DATE,
  counter_offer_venue_address TEXT,
  counter_offer_ticket_price DECIMAL(10,2),
  counter_offer_host_split INTEGER,
  counter_offer_musician_split INTEGER,
  counter_offer_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_booking_requests_host_id ON booking_requests(host_id);
CREATE INDEX idx_booking_requests_musician_id ON booking_requests(musician_id);
CREATE INDEX idx_booking_requests_status ON booking_requests(status);
CREATE INDEX idx_booking_requests_created_at ON booking_requests(created_at);

-- Enable Row Level Security
ALTER TABLE booking_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Hosts can see their own booking requests
CREATE POLICY "Hosts can view their booking requests" ON booking_requests
  FOR SELECT USING (auth.uid() = host_id);

-- Musicians can see booking requests sent to them
CREATE POLICY "Musicians can view booking requests sent to them" ON booking_requests
  FOR SELECT USING (auth.uid() = musician_id);

-- Hosts can create booking requests
CREATE POLICY "Hosts can create booking requests" ON booking_requests
  FOR INSERT WITH CHECK (auth.uid() = host_id);

-- Hosts can update their booking requests
CREATE POLICY "Hosts can update their booking requests" ON booking_requests
  FOR UPDATE USING (auth.uid() = host_id);

-- Musicians can update booking requests sent to them (accept/decline/counter)
CREATE POLICY "Musicians can update booking requests sent to them" ON booking_requests
  FOR UPDATE USING (auth.uid() = musician_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_booking_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER booking_requests_updated_at
  BEFORE UPDATE ON booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_booking_requests_updated_at();
