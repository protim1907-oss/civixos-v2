import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendCampaignEmail } from "@/lib/outreach/email";
import type { OutreachCampaign, OutreachMessage } from "@/lib/outreach/types";

// Daily-drip send cron for outreach campaigns (review-first pipeline).
//
// Sends only APPROVED messages — a human still approves every draft in
// /outreach; this cron just meters approved mail out over the day. It NEVER
// sends a draft. A campaign sends only while its status is 'running', so a
// paused/draft campaign is a hard off switch.
//
// Daily volume: each campaign sets its own daily_cap, which is the authority.
// A hard ceiling (DAILY_HARD_MAX) protects the sending domain's reputation so a
// misconfigured cap can never blast it. The cron runs hourly during business
// hours (see vercel.json) and sends at most RUN_BATCH per run, so the day's
// quota is dripped out rather than sent in one burst. New/cold campaigns should
// set a low daily_cap and raise it over the first couple of weeks by hand.
//
// Auth mirrors /api/zeffy-sync: Vercel Cron sends `Authorization: Bearer
// <CRON_SECRET>`; manual triggers may pass `?token=<CRON_SECRET>`.
//
// Env: CRON_SECRET (required to run), plus the usual SMTP_* / OPENAI_* used
// downstream. maxDuration bumped so a batch of SMTP sends can finish.

export const maxDuration = 60;

const RUN_BATCH = 8; // max sends per cron invocation (drip)
const DAILY_HARD_MAX = 50; // absolute per-campaign/day ceiling (domain safety)

function rampCap(ceiling: number): number {
  return Math.min(DAILY_HARD_MAX, ceiling || DAILY_HARD_MAX);
}

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

async function sentTodayCount(campaignId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { count } = await supabaseAdmin
    .from("outreach_messages")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("status", "sent")
    .gte("sent_at", startOfDay.toISOString());
  return count || 0;
}

async function runCampaign(campaign: OutreachCampaign) {
  const dayCap = rampCap(campaign.daily_cap || DAILY_HARD_MAX);
  const already = await sentTodayCount(campaign.id);
  const remainingToday = Math.max(0, dayCap - already);
  const batch = Math.min(RUN_BATCH, remainingToday);
  if (batch === 0) {
    return { campaign: campaign.name, dayCap, sentToday: already, sent: 0, note: "daily cap reached" };
  }

  const { data: approved } = await supabaseAdmin
    .from("outreach_messages")
    .select("*")
    .eq("campaign_id", campaign.id)
    .eq("status", "approved")
    .order("approved_at", { ascending: true })
    .limit(batch);

  let sent = 0, failed = 0, suppressed = 0;
  for (const msg of (approved || []) as OutreachMessage[]) {
    await supabaseAdmin.from("outreach_messages").update({ status: "sending" }).eq("id", msg.id);
    const result = await sendCampaignEmail({
      campaign,
      to: msg.to_email,
      subject: msg.subject || "",
      bodyText: msg.body || "",
    });
    if (result.ok) {
      await supabaseAdmin
        .from("outreach_messages")
        .update({ status: "sent", provider_id: result.providerId, sent_at: new Date().toISOString(), error: null })
        .eq("id", msg.id);
      await supabaseAdmin.from("outreach_leads").update({ status: "contacted" }).eq("id", msg.lead_id);
      sent++;
    } else if (result.suppressed) {
      await supabaseAdmin
        .from("outreach_messages")
        .update({ status: "skipped", error: result.error })
        .eq("id", msg.id);
      await supabaseAdmin.from("outreach_leads").update({ status: "unsubscribed" }).eq("id", msg.lead_id);
      suppressed++;
    } else {
      await supabaseAdmin
        .from("outreach_messages")
        .update({ status: "failed", error: result.error })
        .eq("id", msg.id);
      failed++;
    }
  }
  return { campaign: campaign.name, dayCap, sentToday: already + sent, sent, failed, suppressed };
}

async function run() {
  // Only 'running' campaigns send. Pausing a campaign stops all sends.
  const { data: campaigns } = await supabaseAdmin
    .from("outreach_campaigns")
    .select("*")
    .eq("status", "running");

  const results = [];
  for (const c of (campaigns || []) as OutreachCampaign[]) {
    results.push(await runCampaign(c));
  }
  return NextResponse.json({ ranAt: new Date().toISOString(), campaigns: results });
}

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "cron-send is not configured (CRON_SECRET missing)." }, { status: 503 });
  }
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return run();
}

// Allow POST too, so schedulers that only issue POST can trigger it.
export const POST = GET;
