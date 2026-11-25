-- Storage for the two new workshop steps: Meme Marketing and Content Ideas.
-- Safe to re-run.
ALTER TABLE public.workshop_sessions ADD COLUMN IF NOT EXISTS meme_data jsonb;
ALTER TABLE public.workshop_sessions ADD COLUMN IF NOT EXISTS content_ideas_data jsonb;
