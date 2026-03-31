ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS birth_lat double precision,
ADD COLUMN IF NOT EXISTS birth_lng double precision,
ADD COLUMN IF NOT EXISTS birth_timezone text DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS birth_place_name text;