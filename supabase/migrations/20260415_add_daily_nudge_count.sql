-- Add daily nudge count to profiles (0-6, default 1)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_nudge_count integer DEFAULT 1 CHECK (daily_nudge_count >= 0 AND daily_nudge_count <= 6);
