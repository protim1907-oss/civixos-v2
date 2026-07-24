-- Outreach Agent — ONE-SHOT setup (base tables + B2B upgrade).
--
-- This is create-outreach.sql + upgrade-outreach-b2b.sql merged into a single
-- idempotent script, so you only have to paste once. Safe to re-run: every
-- statement uses "if not exists" / "add column if not exists".
--
-- Run this in the Supabase Dashboard → SQL Editor, in the project whose ref
-- matches NEXT_PUBLIC_SUPABASE_URL in .env.local.
--
-- Access model: every table has RLS ENABLED with NO policies, so anon/citizen
-- sessions can never read or write outreach data. All access is server-side via
-- the Supabase service-role key (supabaseAdmin), behind admin-guarded API routes.

-- ===========================================================================
-- 1. BASE TABLES
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Leads: the people/companies we may contact.
-- ---------------------------------------------------------------------------
create table if not exists public.outreach_leads (
  id            uuid primary key default gen_random_uuid(),
  org_name      text,
  contact_name  text,
  title         text,
  -- federal | state | county | city | other  (legacy B2G; nullable for B2B)
  level         text,
  -- e.g. city_council, mayor, chamber_of_commerce  (legacy B2G; nullable)
  office_type   text,
  email         text,
  phone         text,
  website       text,
  state         text,          -- 2-letter US code (legacy B2G; nullable)
  district      text,          -- e.g. TX-3 (legacy B2G; nullable)
  source        text,          -- where the lead came from (csv, officials_db, ...)
  status        text not null default 'new',
                -- new | queued | contacted | replied | bounced | unsubscribed | invalid
  tags          text[] default '{}',
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Dedupe on email when we have one (case-insensitive). Leads with no email are
-- allowed and are not constrained.
create unique index if not exists outreach_leads_email_key
  on public.outreach_leads (lower(email)) where email is not null;
create index if not exists outreach_leads_state_idx  on public.outreach_leads (state);
create index if not exists outreach_leads_status_idx on public.outreach_leads (status);

-- ---------------------------------------------------------------------------
-- Campaigns: a targeted send with an AI prompt + sender identity.
-- ---------------------------------------------------------------------------
create table if not exists public.outreach_campaigns (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  goal            text,               -- plain-English objective for the AI
  -- JSON audience filter, e.g. {"regions":["us","europe","uae"]}
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
  provider_id  text,               -- Resend / SMTP message id
  error        text,
  approved_at  timestamptz,
  sent_at      timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (campaign_id, lead_id)
);
create index if not exists outreach_messages_campaign_idx on public.outreach_messages (campaign_id);
create index if not exists outreach_messages_status_idx   on public.outreach_messages (status);

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

-- ===========================================================================
-- 2. B2B / INTERNATIONAL UPGRADE (adds nullable columns only)
-- ===========================================================================

-- Leads: B2B / international attributes (org_name already holds the company).
alter table public.outreach_leads
  add column if not exists region   text,   -- us | europe | uae  (audience bucket)
  add column if not exists country  text,   -- "United States", "Germany", "UAE"
  add column if not exists industry text;   -- "fintech", "healthtech", ...

create index if not exists outreach_leads_region_idx   on public.outreach_leads (region);
create index if not exists outreach_leads_industry_idx on public.outreach_leads (industry);

-- Campaigns: campaign-driven AI persona + compliance footer (multi-purpose).
alter table public.outreach_campaigns
  add column if not exists sender_org    text,  -- e.g. "BidSpro International"
  add column if not exists offering      text,  -- one-line pitch that drives the AI
  add column if not exists footer_reason text;  -- CAN-SPAM "why you're getting this"

-- ===========================================================================
-- 3. LOCK DOWN + updated_at triggers
-- ===========================================================================

-- RLS on, no policies → service-role-only access.
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
