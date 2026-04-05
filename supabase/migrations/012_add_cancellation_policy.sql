-- Add cancellation policy column to shows table
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS cancellation_policy TEXT DEFAULT '72_hours';

-- Add status column to tickets for tracking refunds
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
