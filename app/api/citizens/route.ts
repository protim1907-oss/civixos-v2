import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Directory of citizens for the Community Chat picker. Runs with the service
// role (RLS-independent) since a citizen can't read other profiles directly.
// Returns only display name + district — no email/address.
export const runtime = "nodejs";

// Names hidden from the picker (rows still exist in Supabase). Mirrors the admin
// console's EXCLUDED_USER_NAMES plus leftover test artifacts. Demo accounts and
// any moderator/admin personas (Costa/Constantinos Brown, Protim Ghosh) are not
// real constituents, so they're excluded from the citizen directory.
const EXCLUDED_NAMES = new Set([
  "protim ghosh",
  "protim",
  "costa brown",
  "constantinos brown",
  "rls receiver",
]);

function isExcludedName(name: string) {
  const n = name.trim().toLowerCase();
  if (!n) return true;
  if (/demo citizen/i.test(n)) return true; // seed/demo accounts
  return EXCLUDED_NAMES.has(n);
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("full_name, district")
    .eq("role", "citizen")
    .not("full_name", "is", null);

  if (error) {
    console.error("Failed to load citizen directory:", error.message);
    return NextResponse.json({ error: "Unable to load citizens." }, { status: 500 });
  }

  const seen = new Set<string>();
  const citizens = (data ?? [])
    .map((row) => ({
      name: String(row.full_name || "").trim(),
      district: String(row.district || "").trim(),
    }))
    // Drop blanks, seed/demo accounts, and staff/personal personas.
    .filter((c) => !isExcludedName(c.name))
    // De-duplicate by name+district so the picker shows one row per person.
    .filter((c) => {
      const key = `${c.name.toLowerCase()}|${c.district.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ citizens });
}
