import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/outreach/admin-guard";

// GET: list campaigns, each with per-status message counts.
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { data: campaigns, error } = await supabaseAdmin
    .from("outreach_campaigns")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: messages } = await supabaseAdmin
    .from("outreach_messages")
    .select("campaign_id, status");

  const counts: Record<string, Record<string, number>> = {};
  for (const m of messages || []) {
    counts[m.campaign_id] ??= {};
    counts[m.campaign_id][m.status] = (counts[m.campaign_id][m.status] || 0) + 1;
  }

  return NextResponse.json({
    campaigns: (campaigns || []).map((c) => ({ ...c, counts: counts[c.id] || {} })),
  });
}

// POST: create a campaign.
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await request.json().catch(() => ({}));
  const {
    name,
    goal,
    audience_filter,
    ai_prompt,
    from_name,
    from_email,
    reply_to,
    postal_address,
    daily_cap,
  } = body ?? {};

  if (!name?.trim() || !from_name?.trim() || !from_email?.trim() || !postal_address?.trim()) {
    return NextResponse.json(
      { error: "name, from_name, from_email, and postal_address are required." },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("outreach_campaigns")
    .insert({
      name: name.trim(),
      goal: goal?.trim() || null,
      audience_filter: audience_filter || {},
      ai_prompt: ai_prompt?.trim() || null,
      from_name: from_name.trim(),
      from_email: from_email.trim(),
      reply_to: reply_to?.trim() || null,
      postal_address: postal_address.trim(),
      daily_cap: Number.isFinite(daily_cap) ? Math.max(1, Math.floor(daily_cap)) : 50,
      status: "draft",
      created_by: guard.userId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaign: data });
}
