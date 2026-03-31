
CREATE TABLE public.transit_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  traffic_light text NOT NULL CHECK (traffic_light IN ('green', 'amber', 'red')),
  transit_headline text NOT NULL,
  transit_detail text NOT NULL,
  moon_phase text NOT NULL,
  linked_domain text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  UNIQUE (user_id, date)
);

ALTER TABLE public.transit_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transits" ON public.transit_cache
  FOR SELECT TO public USING (auth.uid() = user_id);

CREATE POLICY "Service role full on transit_cache" ON public.transit_cache
  FOR ALL TO service_role USING (true) WITH CHECK (true);
