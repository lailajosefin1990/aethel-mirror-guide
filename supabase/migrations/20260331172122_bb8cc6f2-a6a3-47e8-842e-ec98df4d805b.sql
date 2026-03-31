
-- Create subscription tier enum
CREATE TYPE public.subscription_tier AS ENUM ('free', 'mirror', 'mirror_pro');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  birth_date DATE,
  birth_time TEXT,
  birth_place TEXT,
  subscription_tier subscription_tier NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create readings table
CREATE TABLE public.readings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  domain TEXT NOT NULL,
  question TEXT NOT NULL,
  mode TEXT,
  reading_text TEXT,
  third_way_text TEXT,
  journal_prompt TEXT,
  confidence_level TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create outcomes table
CREATE TABLE public.outcomes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reading_id UUID REFERENCES public.readings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  followed TEXT NOT NULL CHECK (followed IN ('yes', 'no', 'partially')),
  outcome_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outcomes ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Readings policies
CREATE POLICY "Users can view their own readings" ON public.readings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own readings" ON public.readings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Outcomes policies
CREATE POLICY "Users can view their own outcomes" ON public.outcomes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own outcomes" ON public.outcomes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to count readings this month
CREATE OR REPLACE FUNCTION public.get_monthly_reading_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.readings
  WHERE user_id = p_user_id
    AND created_at >= date_trunc('month', now())
    AND created_at < date_trunc('month', now()) + interval '1 month';
$$;
