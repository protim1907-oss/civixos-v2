-- Guard column for the survey email notifier. When a survey's residents have
-- been emailed, /api/notify-survey stamps this timestamp so republishing or
-- editing the survey never sends the blast again.
-- Run once in the Supabase Dashboard → SQL Editor.

ALTER TABLE public.policy_pulse_surveys
  ADD COLUMN IF NOT EXISTS notified_at timestamptz;
