import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getDonorTier, isSustainingDonor } from "@/lib/donor-tiers";

// Returns the authenticated user's donor tier, computed from their lifetime
// giving in platform_donations (matched by email). Runs the read with the
// service role and only ever for the caller's own email — donation records are
// otherwise admin-only.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("platform_donations")
    .select("amount, created_at")
    .ilike("donor_email", user.email);

  if (error) {
    console.error("my-donor-tier error:", error.message);
    return NextResponse.json({ error: "Unable to load donor tier." }, { status: 500 });
  }

  const rows = data ?? [];
  const total = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const tier = getDonorTier(total);
  const sustaining = isSustainingDonor(rows.map((r) => r.created_at));

  return NextResponse.json({
    hasDonated: rows.length > 0,
    total,
    donationCount: rows.length,
    tier: tier.name,
    badgeClass: tier.badgeClass,
    sustaining,
  });
}
