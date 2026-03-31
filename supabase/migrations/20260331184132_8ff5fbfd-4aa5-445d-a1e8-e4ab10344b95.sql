-- Add referral code to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;

-- Generate referral codes for existing profiles
UPDATE public.profiles SET referral_code = substr(md5(random()::text || id::text), 1, 8) WHERE referral_code IS NULL;

-- Make it NOT NULL with default for future rows
ALTER TABLE public.profiles ALTER COLUMN referral_code SET DEFAULT substr(md5(random()::text || gen_random_uuid()::text), 1, 8);
ALTER TABLE public.profiles ALTER COLUMN referral_code SET NOT NULL;

-- Create referrals table
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL,
  referred_email text,
  referred_user_id uuid,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed_up', 'converted')),
  reward_granted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Referrer can view their own referrals
CREATE POLICY "Users can view own referrals" ON public.referrals
  FOR SELECT TO authenticated
  USING (auth.uid() = referrer_user_id);

-- Service role full access
CREATE POLICY "Service role full on referrals" ON public.referrals
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Allow inserting referrals (for signup flow)
CREATE POLICY "Authenticated users can insert referrals" ON public.referrals
  FOR INSERT TO authenticated
  WITH CHECK (true);