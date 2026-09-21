import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendCampaignEmail } from "@/lib/outreach/email";
import {
  FOLLOWUP_INTERVAL_DAYS,
  MAX_FOLLOWUPS,
  followupBody,
  followupSubject,
  followupKey,
} from "@/lib/outreach/followups";
import type { OutreachCampaign, OutreachLead } from "@/lib/outreach/types";

// Follow-up drip cron. Sends sequenced follow-ups to non-responders as threaded
// replies to their original email. It NEVER creates new message rows — each
// lead's thread lives on its initial 'sent' row (unique(campaign_id, lead_id)),
// and follow-ups are counted via followups_sent / last_followup_at.
//
// A follow-up is due for a 'sent' message when:
//   - the campaign is 'running' and has a defined sequence (bump / mvp),
//   - followups_sent < MAX_FOLLOWUPS,
//   - the lead is still contactable (not replied/unsubscribed/bounced/invalid,
//     not a test lead, not on the suppression list),
//   - enough days have passed since the last step (FOLLOWUP_INTERVAL_DAYS).
//
// Volume is metered like cron-send: at most RUN_BATCH per run and FOLLOWUP_
// DAILY_CAP per campaign per day, dripped over the business-hours schedule in
// vercel.json. Auth mirrors cron-send (Bearer CRON_SECRET or ?token=).
//
// NOTE: reply detection is not automated — a lead is treated as a non-responder
// unless its lead.status is set to 'replied' (mark repliers, or add inbound
// processing later) so we stop following up with people who answered.

export const maxDuration = 60;

const RUN_BATCH = 8;
const FOLLOWUP_DAILY_CAP = 25;
const SKIP_LEAD_STATUS = new Set(["replied", "unsubscribed", "bounced", "invalid"]);

function isValidToken(received: string | null, secret: string): boolean {
  if (!received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  if (auth && isValidToken(auth.replace(/^Bearer\s+/i, ""), secret)) return true;
  if (isValidToken(req.nextUrl.searchParams.get("token"), secret)) return true;
  return false;
}

function startOfDayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function followupsSentToday(campaignId: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from("outreach_messages")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .gte("last_followup_at", startOfDayISO());
  return count || 0;
}

type MsgRow = {
  id: string;
  to_email: string;
  subject: string | null;
  provider_id: string | null;
  sent_at: string | null;
  followups_sent: number;
  last_followup_at: string | null;
  lead: Pick<OutreachLead, "status" | "source" | "contact_name" | "org_name"> | null;
};

async function runCampaign(campaign: OutreachCampaign) {
  if (!followupKey(campaign)) return { campaign: campaign.name, note: "no sequence" };

  const already = await followupsSentToday(campaign.id);
  const batch = Math.min(RUN_BATCH, Math.max(0, FOLLOWUP_DAILY_CAP - already));
  if (batch === 0) {
    return { campaign: campaign.name, sentToday: already, sent: 0, note: "daily follow-up cap reached" };
  }

  // Candidate threads: initial sends that still have follow-ups left. Oldest
  // last activity first. Pull a window, then filter for "due" in code.
  const { data: rows } = await supabaseAdmin
    .from("outreach_messages")
    .select(
      "id,to_email,subject,provider_id,sent_at,followups_sent,last_followup_at,lead:outreach_leads(status,source,contact_name,org_name)"
    )
    .eq("campaign_id", campaign.id)
    .eq("status", "sent")
    .lt("followups_sent", MAX_FOLLOWUPS)
    .order("last_followup_at", { ascending: true, nullsFirst: true })
    .order("sent_at", { ascending: true })
    .limit(300);

  const now = Date.now();
  const due: MsgRow[] = [];
  for (const m of (rows || []) as unknown as MsgRow[]) {
    const lead = m.lead;
    if (!lead) continue;
    if (SKIP_LEAD_STATUS.has(lead.status)) continue;
    if (lead.source === "test") continue;
    const anchor = m.last_followup_at || m.sent_at;
    if (!anchor) continue;
    const waitDays = FOLLOWUP_INTERVAL_DAYS[m.followups_sent];
    if (waitDays === undefined) continue;
    if (now - new Date(anchor).getTime() < waitDays * 86_400_000) continue;
    due.push(m);
    if (due.length >= batch) break;
  }

  let sent = 0, failed = 0, suppressed = 0, skipped = 0;
  for (const m of due) {
    const step = m.followups_sent + 1;
    const body = followupBody(campaign, m.lead as OutreachLead, step);
    if (!body) { skipped++; continue; }
    const result = await sendCampaignEmail({
      campaign,
      to: m.to_email,
      subject: followupSubject(m.subject),
      bodyText: body,
      inReplyTo: m.provider_id,
    });
    if (result.ok) {
      await supabaseAdmin
        .from("outreach_messages")
        .update({ followups_sent: step, last_followup_at: new Date().toISOString() })
        .eq("id", m.id);
      sent++;
    } else if (result.suppressed) {
      suppressed++;
    } else {
      failed++;
    }
  }
  return { campaign: campaign.name, sentToday: already + sent, sent, failed, suppressed, skipped };
}

async function run() {
  const { data: campaigns } = await supabaseAdmin
    .from("outreach_campaigns")
    .select("*")
    .eq("status", "running");

  const results = [];
  for (const c of (campaigns || []) as OutreachCampaign[]) {
    results.push(await runCampaign(c));
  }
  return NextResponse.json({ ranAt: new Date().toISOString(), followups: results });
}

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "cron-followups is not configured (CRON_SECRET missing)." }, { status: 503 });
  }
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return run();
}

export const POST = GET;
