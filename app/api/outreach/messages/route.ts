import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/outreach/admin-guard";

// GET: the drafted/sent messages for one campaign, with lead context for review.
export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const url = new URL(request.url);
  const campaignId = url.searchParams.get("campaign_id");
  if (!campaignId) {
    return NextResponse.json({ error: "campaign_id is required." }, { status: 400 });
  }

  const { data: messages, error } = await supabaseAdmin
    .from("outreach_messages")
    .select("*, lead:outreach_leads(org_name, contact_name, title, state, district)")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: messages || [] });
}

// PATCH: approve or edit a single drafted message before sending.
export async function PATCH(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await request.json().catch(() => ({}));
  const { id, action, subject, body: newBody } = body ?? {};
  if (!id) return NextResponse.json({ error: "Message id is required." }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (action === "approve") {
    update.status = "approved";
    update.approved_at = new Date().toISOString();
  } else if (action === "skip") {
    update.status = "skipped";
  }
  if (typeof subject === "string") update.subject = subject;
  if (typeof newBody === "string") update.body = newBody;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("outreach_messages")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: data });
}
