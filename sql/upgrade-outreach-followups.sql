-- Follow-up sequence automation for the outreach engine.
--
-- Because outreach_messages has unique(campaign_id, lead_id) (one row per lead
-- per campaign), follow-ups are NOT stored as new rows. Instead each lead's
-- thread lives on its initial 'sent' row, and follow-ups are counted here and
-- sent as threaded replies off the original provider_id (Message-ID).
--
-- Apply in Supabase → SQL Editor. Idempotent.

alter table public.outreach_messages
  add column if not exists followups_sent  int not null default 0,
  add column if not exists last_followup_at timestamptz;

-- Helps the follow-up cron find due threads quickly.
create index if not exists outreach_messages_followup_idx
  on public.outreach_messages (campaign_id, status, followups_sent);
