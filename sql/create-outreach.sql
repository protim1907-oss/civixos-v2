-- Civix250 Outreach Agent — schema for AI-run outreach campaigns.
--
-- These tables back the /outreach admin surface: a lead list, campaigns, the
-- per-recipient drafted/sent messages, and a global suppression (opt-out) list.
--
-- Access model: every table has RLS ENABLED with NO policies, so anon/citizen
-- sessions can never read or write outreach data. All access is server-side via
-- the Supabase service-role key (supabaseAdmin), behind admin-guarded API
-- routes. This is deliberate — outreach data (targets, sent mail) must never be
-- exposed to the client the way representatives/districts are.
--
-- Run this in the Supabase Dashboard → SQL Editor.

-- ---------------------------------------------------------------------------
-- Leads: the people/offices we may contact.
-- ---------------------------------------------------------------------------
create table if not exists public.outreach_leads (
  id            uuid primary key default gen_random_uuid(),
  org_name      text,
  contact_name  text,
  title         text,
  -- federal | state | county | city | other
  level         text,
  -- e.g. city_council, mayor, state_senate, us_house, clerk, chamber_of_commerce
  office_type   text,
  email         text,
  phone         text,
  website       text,
  state         text,          -- 2-letter code (TX, CA, ...)
  district      text,          -- e.g. TX-3, NV-01 (nullable)
  source        text,          -- where the lead came from (officials_db, csv, ...)
  status        text not null default 'new',
                -- new | queued | contacted | replied | bounced | unsubscribed | invalid
  tags          text[] default '{}',
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Dedupe on email when we have one (case-insensitive). Leads with no email are
-- allowed (phone/website-only) and are not constrained.
create unique index if not exists outreach_leads_email_key
  on public.outreach_leads (lower(email)) where email is not null;
create index if not exists outreach_leads_state_idx on public.outreach_leads (state);
create index if not exists outreach_leads_status_idx on public.outreach_leads (status);

-- ---------------------------------------------------------------------------
-- Campaigns: a targeted send with an AI prompt + sender identity.
-- ---------------------------------------------------------------------------
create table if not exists public.outreach_campaigns (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  goal            text,               -- plain-English objective for the AI
  -- JSON audience filter, e.g. {"states":["TX","NV"],"office_types":["city_council"]}
  audience_filter jsonb not null default '{}'::jsonb,
  ai_prompt       text,               -- extra drafting guidance / talking points
  from_name       text not null,
  from_email      text not null,
  reply_to        text,
  -- CAN-SPAM requires a physical postal address in every commercial email.
  postal_address  text not null,
  daily_cap       integer not null default 50,
  status          text not null default 'draft',
                  -- draft | ready | running | paused | done
  created_by      uuid,               -- profiles.id of the admin who created it
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists outreach_campaigns_status_idx on public.outreach_campaigns (status);

-- ---------------------------------------------------------------------------
-- Messages: one row per (campaign, lead) — the drafted/sent email.
-- ---------------------------------------------------------------------------
create table if not exists public.outreach_messages (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references public.outreach_campaigns (id) on delete cascade,
  lead_id      uuid not null references public.outreach_leads (id) on delete cascade,
  to_email     text not null,
  subject      text,
  body         text,
  status       text not null default 'drafted',
               -- drafted | approved | sending | sent | failed | bounced | replied | skipped
  provider_id  text,               -- Resend message id
  error        text,
  approved_at  timestamptz,
  sent_at      timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (campaign_id, lead_id)
);
create index if not exists outreach_messages_campaign_idx on public.outreach_messages (campaign_id);
create index if not exists outreach_messages_status_idx on public.outreach_messages (status);

-- ---------------------------------------------------------------------------
-- Suppressions: global opt-out / hard-bounce list. Checked before every send.
-- ---------------------------------------------------------------------------
create table if not exists public.outreach_suppressions (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  reason     text not null default 'unsubscribed',  -- unsubscribed | bounced | complained | manual
  created_at timestamptz not null default now()
);
create unique index if not exists outreach_suppressions_email_key
  on public.outreach_suppressions (lower(email));

-- ---------------------------------------------------------------------------
-- Lock everything down: RLS on, no policies → service-role-only access.
-- ---------------------------------------------------------------------------
alter table public.outreach_leads        enable row level security;
alter table public.outreach_campaigns    enable row level security;
alter table public.outreach_messages     enable row level security;
alter table public.outreach_suppressions enable row level security;

-- keep updated_at fresh
create or replace function public.outreach_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_outreach_leads_touch on public.outreach_leads;
create trigger trg_outreach_leads_touch before update on public.outreach_leads
  for each row execute function public.outreach_touch_updated_at();

drop trigger if exists trg_outreach_campaigns_touch on public.outreach_campaigns;
create trigger trg_outreach_campaigns_touch before update on public.outreach_campaigns
  for each row execute function public.outreach_touch_updated_at();

drop trigger if exists trg_outreach_messages_touch on public.outreach_messages;
create trigger trg_outreach_messages_touch before update on public.outreach_messages
  for each row execute function public.outreach_touch_updated_at();
