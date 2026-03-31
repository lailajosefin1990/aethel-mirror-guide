ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS consent_accepted boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS consent_date timestamptz;