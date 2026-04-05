-- Add minimum ticket threshold columns to shows table
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS min_tickets INTEGER;
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS threshold_hours INTEGER DEFAULT 48;

-- Add stripe_session_id to tickets so we can trace back to payment for refunds
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;

-- Allow 'auto_canceled' as a valid show status
-- (The live table already accepts 'on_sale', 'sold_out', 'cancelled' — add 'auto_canceled')
-- Drop the old constraint if it exists, then recreate with the new value
ALTER TABLE public.shows DROP CONSTRAINT IF EXISTS shows_status_check;
ALTER TABLE public.shows ADD CONSTRAINT shows_status_check
  CHECK (status IN ('open', 'on_sale', 'booked', 'sold_out', 'cancelled', 'auto_canceled'));
