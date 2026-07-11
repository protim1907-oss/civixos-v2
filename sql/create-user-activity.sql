-- Unified per-user activity log powering the "My Activity" section.
-- Every meaningful citizen action (emailing a rep, responding to a survey,
-- creating a post, upvoting an issue, requesting a meeting) writes one row here
-- with a display-ready title/detail/link, so the dashboard reads a single feed.
--
-- Run this in Supabase → SQL Editor.

CREATE TABLE IF NOT EXISTS public.user_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,          -- rep_email | survey_response | post_created | issue_upvote | meeting_request
  title text,                  -- headline: rep name, survey title, post title, issue title
  detail text,                 -- optional secondary line: subject, district, vote choice
  link text,                   -- optional path/URL to the target
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_activity_user_created_idx
  ON public.user_activity (user_id, created_at DESC);

ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

-- Each user can read and write only their own activity.
DROP POLICY IF EXISTS user_activity_select_own ON public.user_activity;
CREATE POLICY user_activity_select_own ON public.user_activity
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_activity_insert_own ON public.user_activity;
CREATE POLICY user_activity_insert_own ON public.user_activity
  FOR INSERT WITH CHECK (auth.uid() = user_id);
