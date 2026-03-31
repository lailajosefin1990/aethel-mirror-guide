
-- Add practitioner to subscription_tier enum
ALTER TYPE public.subscription_tier ADD VALUE IF NOT EXISTS 'practitioner';

-- Practitioners table
CREATE TABLE public.practitioners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  bio TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'practitioner',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.practitioners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own practitioner" ON public.practitioners FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own practitioner" ON public.practitioners FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own practitioner" ON public.practitioners FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role full on practitioners" ON public.practitioners FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Practitioner clients
CREATE TABLE public.practitioner_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_email TEXT,
  birth_date DATE,
  birth_time TEXT,
  birth_place TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.practitioner_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Practitioners can view own clients" ON public.practitioner_clients FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.practitioners WHERE id = practitioner_id AND user_id = auth.uid())
);
CREATE POLICY "Practitioners can insert own clients" ON public.practitioner_clients FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.practitioners WHERE id = practitioner_id AND user_id = auth.uid())
);
CREATE POLICY "Practitioners can update own clients" ON public.practitioner_clients FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.practitioners WHERE id = practitioner_id AND user_id = auth.uid())
);
CREATE POLICY "Practitioners can delete own clients" ON public.practitioner_clients FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.practitioners WHERE id = practitioner_id AND user_id = auth.uid())
);

-- Practitioner readings
CREATE TABLE public.practitioner_readings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.practitioner_clients(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  question TEXT NOT NULL,
  reading_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.practitioner_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Practitioners can view own readings" ON public.practitioner_readings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.practitioners WHERE id = practitioner_id AND user_id = auth.uid())
);
CREATE POLICY "Practitioners can insert own readings" ON public.practitioner_readings FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.practitioners WHERE id = practitioner_id AND user_id = auth.uid())
);
