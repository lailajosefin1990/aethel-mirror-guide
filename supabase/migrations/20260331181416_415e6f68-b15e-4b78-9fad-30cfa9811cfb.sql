
CREATE TABLE public.user_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('theme', 'pattern', 'recurring_fear', 'recurring_domain', 'gate', 'placement')),
  memory_value TEXT NOT NULL,
  frequency INTEGER NOT NULL DEFAULT 1,
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, memory_type, memory_value)
);

ALTER TABLE public.user_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own memories" ON public.user_memory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role full access on user_memory" ON public.user_memory FOR ALL TO service_role USING (true) WITH CHECK (true);
