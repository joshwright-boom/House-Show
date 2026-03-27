CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  musician_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (fan_id, musician_id)
);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Fans can view own follows" ON follows;
CREATE POLICY "Fans can view own follows" ON follows
  FOR SELECT USING (auth.uid() = fan_id);

DROP POLICY IF EXISTS "Fans can follow musicians" ON follows;
CREATE POLICY "Fans can follow musicians" ON follows
  FOR INSERT WITH CHECK (auth.uid() = fan_id);

DROP POLICY IF EXISTS "Fans can unfollow musicians" ON follows;
CREATE POLICY "Fans can unfollow musicians" ON follows
  FOR DELETE USING (auth.uid() = fan_id);

CREATE INDEX IF NOT EXISTS idx_follows_fan_id ON follows(fan_id);
CREATE INDEX IF NOT EXISTS idx_follows_musician_id ON follows(musician_id);
