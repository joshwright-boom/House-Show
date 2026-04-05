-- Change guaranteed_minimum from INTEGER to NUMERIC(10,2) to accept decimal values
ALTER TABLE public.booking_requests ALTER COLUMN guaranteed_minimum TYPE NUMERIC(10,2);
