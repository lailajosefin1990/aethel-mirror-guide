DROP POLICY IF EXISTS "Authenticated users can insert referrals" ON public.referrals;
CREATE POLICY "Users can insert own referrals" ON public.referrals
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = referrer_user_id);