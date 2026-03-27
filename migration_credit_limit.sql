-- Alter default credit limit to 0
ALTER TABLE public.profiles ALTER COLUMN credit_limit SET DEFAULT 0;

-- Update existing profiles that have the old default of 500,000 to 0
-- This ensures that only users who were manually analyzed and given 500k keep it (unlikely for all)
-- But wait, if they all have 500k by default, we should probably reset them all to 0 to be safe
-- and let admins re-evaluate.
UPDATE public.profiles SET credit_limit = 0 WHERE credit_limit = 500000;
