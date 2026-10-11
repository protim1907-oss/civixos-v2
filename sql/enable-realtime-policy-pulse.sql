-- Enable Supabase Realtime for the `policy_pulse_surveys` table.
--
-- Realtime (postgres_changes) only emits events for tables that belong to the
-- `supabase_realtime` publication. Without this, the sidebar's in-app
-- new-survey toast + badge only update on page load / navigation, not live.
-- Adding the table lets a freshly published survey pop a toast immediately for
-- citizens in that district.
--
-- REPLICA IDENTITY FULL makes the full row (district, title, is_published,
-- created_at) available to Realtime so the client can decide whether the change
-- is relevant to the current user's district.
--
-- Run this once in the Supabase SQL Editor. Idempotent.

alter table public.policy_pulse_surveys replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'policy_pulse_surveys'
  ) then
    alter publication supabase_realtime add table public.policy_pulse_surveys;
  end if;
end
$$;
