
CREATE TABLE public.email_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email_type TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.email_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_email_log_user_type ON public.email_log (user_id, email_type);
