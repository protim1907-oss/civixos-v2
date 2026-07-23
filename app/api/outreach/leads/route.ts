import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/outreach/admin-guard";

// GET: list leads (optionally filtered) plus aggregate counts for the UI.
export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const officeType = url.searchParams.get("office_type");
  const status = url.searchParams.get("status");
  const limit = Math.min(Number(url.searchParams.get("limit")) || 200, 1000);

  let query = supabaseAdmin
    .from("outreach_leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (state) query = query.eq("state", state);
  if (officeType) query = query.eq("office_type", officeType);
  if (status) query = query.eq("status", status);

  const { data: leads, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Distinct states / office types + total for filter chips.
  const { data: all } = await supabaseAdmin
    .from("outreach_leads")
    .select("state, office_type");

  const states = new Set<string>();
  const officeTypes = new Set<string>();
  for (const l of all || []) {
    if (l.state) states.add(l.state);
    if (l.office_type) officeTypes.add(l.office_type);
  }

  return NextResponse.json({
    leads: leads || [],
    total: (all || []).length,
    states: [...states].sort(),
    officeTypes: [...officeTypes].sort(),
  });
}
