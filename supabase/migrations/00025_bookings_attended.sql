-- Track explicit attendance: true = present, false = absent, null = not yet marked
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS attended boolean;
