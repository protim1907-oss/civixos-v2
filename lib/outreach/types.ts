// Shared types for the outreach agent. Kept in one place so API routes and the
// /outreach UI agree on shapes.

export type LeadStatus =
  | "new"
  | "queued"
  | "contacted"
  | "replied"
  | "bounced"
  | "unsubscribed"
  | "invalid";

export type OutreachLead = {
  id: string;
  org_name: string | null;
  contact_name: string | null;
  title: string | null;
  level: string | null;
  office_type: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  state: string | null;
  district: string | null;
  // B2B / international attributes (see sql/upgrade-outreach-b2b.sql).
  region: string | null; // us | europe | uae
  country: string | null;
  industry: string | null;
  source: string | null;
  status: LeadStatus;
  tags: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CampaignStatus = "draft" | "ready" | "running" | "paused" | "done";

export type AudienceFilter = {
  states?: string[];
  office_types?: string[];
  levels?: string[];
  // B2B targeting
  regions?: string[]; // us | europe | uae
  countries?: string[];
  industries?: string[];
  // Tag-scoped targeting — lets separate campaigns share the leads pool without
  // colliding (e.g. a "bump" campaign that only drafts leads tagged "bump").
  tags?: string[];
};

export type OutreachCampaign = {
  id: string;
  name: string;
  goal: string | null;
  audience_filter: AudienceFilter;
  ai_prompt: string | null;
  // Persona + offering that drive the AI draft (multi-purpose engine).
  sender_org: string | null;
  offering: string | null;
  // Overrides the default CAN-SPAM "why you're getting this" footer line.
  footer_reason: string | null;
  from_name: string;
  from_email: string;
  reply_to: string | null;
  postal_address: string;
  daily_cap: number;
  status: CampaignStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type MessageStatus =
  | "drafted"
  | "approved"
  | "sending"
  | "sent"
  | "failed"
  | "bounced"
  | "replied"
  | "skipped";

export type OutreachMessage = {
  id: string;
  campaign_id: string;
  lead_id: string;
  to_email: string;
  subject: string | null;
  body: string | null;
  status: MessageStatus;
  provider_id: string | null;
  error: string | null;
  approved_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};
