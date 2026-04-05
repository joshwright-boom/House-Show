-- Add minimum ticket threshold and cancellation policy to booking_requests
ALTER TABLE public.booking_requests ADD COLUMN IF NOT EXISTS min_tickets INTEGER;
ALTER TABLE public.booking_requests ADD COLUMN IF NOT EXISTS cancellation_policy TEXT DEFAULT '72_hours';
