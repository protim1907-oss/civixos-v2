import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/outreach/admin-guard";
import { draftEmail } from "@/lib/outreach/draft";
import { isSuppressed } from "@/lib/outreach/email";
import type { AudienceFilter, OutreachCampaign, OutreachLead } from "@/lib/outreach/types";

// POST { campaignId, limit? }: draft personalized emails for audience-matched
// leads that don't yet have a message in this campaign. Bounded per call to
// keep latency and cost in check — call repeatedly to work through a large list.
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { campaignId, limit } = (await request.json().catch(() => ({}))) as {
    campaignId?: string;
    limit?: number;
  };
  if (!campaignId) return NextResponse.json({ error: "campaignId is required." }, { status: 400 });

  const batch = Math.min(Math.max(1, Number(limit) || 8), 25);

  const { data: campaign } = await supabaseAdmin
    .from("outreach_campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();
  if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });

  const filter: AudienceFilter = (campaign as OutreachCampaign).audience_filter || {};

  // Audience: email-having leads in a contactable status, matching the filter.
  let query = supabaseAdmin
    .from("outreach_leads")
    .select("*")
    .not("email", "is", null)
    .in("status", ["new", "queued"]);
  if (filter.states?.length) query = query.in("state", filter.states);
  if (filter.office_types?.length) query = query.in("office_type", filter.office_types);
  if (filter.levels?.length) query = query.in("level", filter.levels);

  const { data: leads } = await query.limit(500);

  // Exclude leads that already have a message in this campaign.
  const { data: existing } = await supabaseAdmin
    .from("outreach_messages")
    .select("lead_id")
    .eq("campaign_id", campaignId);
  const done = new Set((existing || []).map((m) => m.lead_id));

  const todo = (leads || []).filter((l) => !done.has(l.id)).slice(0, batch);

  let drafted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const lead of todo as OutreachLead[]) {
    if (!lead.email) continue;
    if (await isSuppressed(lead.email)) {
      skipped++;
      continue;
    }
    try {
      const { subject, body } = await draftEmail(campaign as OutreachCampaign, lead);
      const { error } = await supabaseAdmin.from("outreach_messages").insert({
        campaign_id: campaignId,
        lead_id: lead.id,
        to_email: lead.email,
        subject,
        body,
        status: "drafted",
      });
      if (error) errors.push(`${lead.email}: ${error.message}`);
      else drafted++;
    } catch (err) {
      errors.push(`${lead.email}: ${err instanceof Error ? err.message : "draft failed"}`);
    }
  }

  const remaining = (leads || []).filter((l) => !done.has(l.id)).length - drafted - skipped;

  return NextResponse.json({ drafted, skipped, remaining: Math.max(0, remaining), errors });
}
