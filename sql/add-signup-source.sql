-- Track which ad network a user signed up from (facebook / x), so the admin
-- User Management dashboard can badge each user with their acquisition source.
--
-- Captured client-side from the `?src=` (or `utm_source=`) query param on ad
-- landing links, stored first-touch in localStorage, then written to the
-- profile once the user has a session (see /api/record-signup-source).
-- NULL = unknown / organic (e.g. all users who signed up before this shipped).
--
-- Run once in the Supabase SQL editor. Idempotent.

alter table public.profiles
  add column if not exists signup_source text;
