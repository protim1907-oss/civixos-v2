import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/outreach/admin-guard";

// Pull a plain email address out of a stored contact string (a bare address,
// or a "mailto:foo@bar.com?subject=..." href).
function extractEmail(...candidates: (string | null | undefined)[]): string | null {
  for (const c of candidates) {
    if (!c) continue;
    const mailto = c.match(/mailto:([^?"'\s]+)/i);
    if (mailto?.[1]) return mailto[1].toLowerCase();
    const bare = c.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
    if (bare?.[0] && /@/.test(c)) return bare[0].toLowerCase();
  }
  return null;
}

const STATE_TO_CODE: Record<string, string> = {
  texas: "TX",
  california: "CA",
  illinois: "IL",
  maryland: "MD",
  colorado: "CO",
  nevada: "NV",
};
function stateCode(state: string | null): string | null {
  if (!state) return null;
  return STATE_TO_CODE[state.trim().toLowerCase()] || state.trim().toUpperCase();
}

// Import government officials from the existing reps tables into outreach_leads,
// deduped on email. Officials with no discoverable email are skipped (reported).
export async function POST() {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const leads = new Map<string, Record<string, unknown>>();
  let skippedNoEmail = 0;

  // 1. representatives (US senators, state execs + legislators)
  const { data: reps } = await supabaseAdmin
    .from("representatives")
    .select("full_name, name, office_title, office, state, district, district_id, email, email_href, linkedin_url, level")
    .eq("is_active", true);

  for (const r of reps || []) {
    const email = extractEmail(r.email, r.email_href, r.linkedin_url);
    if (!email) {
      skippedNoEmail++;
      continue;
    }
    const level = String(r.level || "").toLowerCase().includes("state") ? "state" : "federal";
    leads.set(email, {
      org_name: r.office_title || r.office || null,
      contact_name: r.full_name || r.name || null,
      title: r.office_title || r.office || null,
      level,
      office_type: (r.level || "official").toString().toLowerCase().replace(/\s+/g, "_"),
      email,
      website: r.linkedin_url || null,
      state: stateCode(r.state),
      district: r.district || r.district_id || null,
      source: "officials_db:representatives",
      status: "new",
    });
  }

  // 2. district_representatives (US House delegation)
  const { data: houseReps } = await supabaseAdmin
    .from("district_representatives")
    .select("name, title, office_label, state, district_code, website, contact_url")
    .eq("is_active", true);

  for (const h of houseReps || []) {
    const email = extractEmail(h.contact_url, h.website);
    if (!email) {
      skippedNoEmail++;
      continue;
    }
    if (leads.has(email)) continue;
    leads.set(email, {
      org_name: h.office_label || null,
      contact_name: h.name || null,
      title: h.title || "U.S. Representative",
      level: "federal",
      office_type: "us_house",
      email,
      website: h.website || null,
      state: stateCode(h.state),
      district: h.district_code || null,
      source: "officials_db:district_representatives",
      status: "new",
    });
  }

  const rows = [...leads.values()];
  if (rows.length === 0) {
    return NextResponse.json({
      imported: 0,
      skippedNoEmail,
      message: "No officials with a usable email address were found.",
    });
  }

  // Upsert on email → idempotent re-imports.
  const { error } = await supabaseAdmin
    .from("outreach_leads")
    .upsert(rows, { onConflict: "email", ignoreDuplicates: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ imported: rows.length, skippedNoEmail });
}
