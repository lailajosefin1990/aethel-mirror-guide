
-- Add new columns to outcomes table
ALTER TABLE public.outcomes ADD COLUMN IF NOT EXISTS transit_context jsonb;
ALTER TABLE public.outcomes ADD COLUMN IF NOT EXISTS memory_context jsonb;
ALTER TABLE public.outcomes ADD COLUMN IF NOT EXISTS confidence_level text;
ALTER TABLE public.outcomes ADD COLUMN IF NOT EXISTS third_way_text text;
ALTER TABLE public.outcomes ADD COLUMN IF NOT EXISTS domain text;
ALTER TABLE public.outcomes ADD COLUMN IF NOT EXISTS mode text;
ALTER TABLE public.outcomes ADD COLUMN IF NOT EXISTS time_to_outcome integer;
ALTER TABLE public.outcomes ADD COLUMN IF NOT EXISTS outcome_sentiment text;
ALTER TABLE public.outcomes ADD COLUMN IF NOT EXISTS quality_score integer;

-- Create training_ready_outcomes view
CREATE OR REPLACE VIEW public.training_ready_outcomes AS
SELECT
  o.id as outcome_id,
  o.reading_id,
  o.domain,
  p.birth_date,
  p.birth_place,
  o.transit_context,
  o.memory_context,
  LEFT(r.question, 100) as question_summary,
  o.mode,
  o.third_way_text,
  o.confidence_level,
  o.followed,
  o.outcome_sentiment,
  o.time_to_outcome
FROM public.outcomes o
JOIN public.readings r ON r.id = o.reading_id
JOIN public.profiles p ON p.user_id = o.user_id
WHERE o.followed IS NOT NULL
  AND o.outcome_text IS NOT NULL
  AND length(o.outcome_text) > 15
  AND o.consent_to_share = true
  AND o.outcome_sentiment IS NOT NULL;

-- Create high_quality_readings view
CREATE OR REPLACE VIEW public.high_quality_readings AS
SELECT
  o.id as outcome_id,
  o.reading_id,
  o.domain,
  o.quality_score,
  o.followed,
  o.outcome_sentiment,
  o.time_to_outcome,
  o.created_at
FROM public.outcomes o
WHERE o.quality_score >= 70;

-- Add consent_dismissed to profiles for permanent dismiss
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS consent_prompt_dismissed boolean NOT NULL DEFAULT false;
