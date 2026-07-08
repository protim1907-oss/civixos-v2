import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Returns the set of districts that have signed-up citizens, so the moderator
// only broadcasts Policy Pulse surveys where there are constituents to vote on
// them. Officials/moderators/admins don't vote, so they don't make a district
// "active". Read runs with the service role (RLS-independent), matching the
// pattern used by the other privileged API routes.

// A real congressional-district code, e.g. "IL-10", "TX-21", "CA-42".
const DISTRICT_CODE = /^[A-Z]{2}-\d{1,2}$/;

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("district")
    .eq("role", "citizen")
    .not("district", "is", null);

  if (error) {
    console.error("Failed to load active districts:", error.message);
    return NextResponse.json(
      { error: "Unable to load active districts." },
      { status: 500 }
    );
  }

  const districts = Array.from(
    new Set(
      (data ?? [])
        .map((row) => String(row.district || "").trim().toUpperCase())
        .filter((district) => DISTRICT_CODE.test(district))
    )
  ).sort();

  return NextResponse.json({ districts });
}
