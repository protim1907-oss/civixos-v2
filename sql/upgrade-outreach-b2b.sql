-- Outreach engine → multi-purpose upgrade (adds B2B / international support).
--
-- The original outreach tables (sql/create-outreach.sql) were shaped for
-- business-to-government civic outreach (US states, districts, office types).
-- This migration makes the SAME engine usable for B2B cold outreach — e.g.
-- BidSpro International pitching MVP-build services to founders in the US,
-- Europe, and the UAE — WITHOUT forking the pipeline.
--
-- It only ADDS nullable columns, so existing Civix250 campaigns keep working.
--
-- Run this in the Supabase Dashboard → SQL Editor AFTER create-outreach.sql.

-- ---------------------------------------------------------------------------
-- Leads: B2B / international attributes.
-- (org_name already holds the company; contact_name / title / email / website
--  are reused as-is. We add region/country/industry for audience targeting.)
-- ---------------------------------------------------------------------------
alter table public.outreach_leads
  add column if not exists region   text,   -- us | europe | uae  (audience bucket)
  add column if not exists country  text,   -- free text: "United States", "Germany", "UAE"
  add column if not exists industry text;   -- free text: "fintech", "healthtech", ...

create index if not exists outreach_leads_region_idx   on public.outreach_leads (region);
create index if not exists outreach_leads_industry_idx on public.outreach_leads (industry);

-- ---------------------------------------------------------------------------
-- Campaigns: make the AI persona + compliance footer campaign-driven instead
-- of hardcoded to one product. This is what lets one engine serve both the
-- Civix250 (government) and BidSpro (B2B) use cases.
-- ---------------------------------------------------------------------------
alter table public.outreach_campaigns
  -- Who the email is from, as an organization ("BidSpro International").
  add column if not exists sender_org   text,
  -- One-line description of what's being offered / pitched. Drives the AI.
  add column if not exists offering     text,
  -- The CAN-SPAM "why are you getting this" line in the footer. If null, a
  -- generic B2B default is used at send time.
  add column if not exists footer_reason text;
