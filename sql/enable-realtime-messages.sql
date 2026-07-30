-- Enable Supabase Realtime for the chat `messages` table.
--
-- Realtime (postgres_changes) only emits events for tables that belong to the
-- `supabase_realtime` publication. Chat messages were never added, so the
-- in-app notification toast + unread badge (and live incoming messages in the
-- chat room) never received live INSERT events — they only appeared on reload.
--
-- REPLICA IDENTITY FULL makes the full row available to Realtime so that the
-- recipient RLS policy ("messages: recipients can read", which filters on
-- receiver_name) can be evaluated against each change and delivered only to
-- the intended recipient.
--
-- Run this once in the Supabase SQL Editor. Idempotent.

alter table public.messages replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end
$$;
