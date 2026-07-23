import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/outreach/admin-guard";
import { sendCampaignEmail } from "@/lib/outreach/email";
import type { OutreachCampaign, OutreachMessage } from "@/lib/outreach/types";

// POST { campaignId }: send APPROVED messages for a campaign, throttled to the
// campaign's daily_cap, skipping/suppressing as needed. Human approval is
// required first (status must be 'approved') — this route never sends a draft
// that a human hasn't signed off on.
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { campaignId } = (await request.json().catch(() => ({}))) as { campaignId?: string };
  if (!campaignId) return NextResponse.json({ error: "campaignId is required." }, { status: 400 });

  const { data: campaign } = await supabaseAdmin
    .from("outreach_campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();
  if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });

  const cap = (campaign as OutreachCampaign).daily_cap || 50;

  // How many already went out today? Enforce the daily cap across calls.
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { count: sentToday } = await supabaseAdmin
    .from("outreach_messages")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("status", "sent")
    .gte("sent_at", startOfDay.toISOString());

  const remainingCap = Math.max(0, cap - (sentToday || 0));
  if (remainingCap === 0) {
    return NextResponse.json({ sent: 0, message: `Daily cap of ${cap} already reached.` });
  }

  const { data: approved } = await supabaseAdmin
    .from("outreach_messages")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("status", "approved")
    .order("approved_at", { ascending: true })
    .limit(remainingCap);

  await supabaseAdmin
    .from("outreach_campaigns")
    .update({ status: "running" })
    .eq("id", campaignId);

  let sent = 0;
  let failed = 0;
  let suppressed = 0;

  for (const msg of (approved || []) as OutreachMessage[]) {
    await supabaseAdmin.from("outreach_messages").update({ status: "sending" }).eq("id", msg.id);

    const result = await sendCampaignEmail({
      campaign: campaign as OutreachCampaign,
      to: msg.to_email,
      subject: msg.subject || "",
      bodyText: msg.body || "",
    });

    if (result.ok) {
      await supabaseAdmin
        .from("outreach_messages")
        .update({ status: "sent", provider_id: result.providerId, sent_at: new Date().toISOString(), error: null })
        .eq("id", msg.id);
      await supabaseAdmin
        .from("outreach_leads")
        .update({ status: "contacted" })
        .eq("id", msg.lead_id);
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

  return NextResponse.json({ sent, failed, suppressed, dailyCapRemaining: remainingCap - sent });
}
