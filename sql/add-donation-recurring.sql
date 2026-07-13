-- Adds a recurring/one-time "mode" to platform donations.
--
-- Drives the "Mode" column in the admin Platform Donations panel (One-time vs
-- Recurring) and the accurate "Sustaining Member" donor badge. New Givebutter
-- webhook donations set this from the transaction's recurring plan; manual
-- entries set it via the Record Donation form.
--
-- Run this in Supabase → SQL Editor. Existing rows default to one-time (false).

ALTER TABLE public.platform_donations
  ADD COLUMN IF NOT EXISTS recurring boolean NOT NULL DEFAULT false;
