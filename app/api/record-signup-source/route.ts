import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// Normalize a raw ad-source value (from ?src= / utm_source=) to a canonical
// network. Unknown values are stored verbatim (lowercased) so we don't lose
// data, but the admin UI only badges facebook / x.
function normalizeSource(raw: string): string | null {
  const s = String(raw || "").trim().toLowerCase().slice(0, 40);
  if (!s) return null;
  if (/(facebook|instagram|meta|^fb$|^ig$)/.test(s)) return "facebook";
  if (/(^x$|twitter|^tw$)/.test(s)) return "x";
  return s; // keep other sources (e.g. "google", "reddit") for future use
}

export async function POST(req: NextRequest) {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let source: string | null = null;
  try {
    const body = await req.json();
    source = normalizeSource(String(body?.source || ""));
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!source) {
    return NextResponse.json({ ok: true, skipped: "no source" });
  }

  // Set-once: only record on profiles that don't already have a source, so a
  // later ad click can't overwrite a user's original acquisition channel.
  const { data: updated, error } = await admin
    .from("profiles")
    .update({ signup_source: source })
    .eq("id", userData.user.id)
    .is("signup_source", null)
    .select("id");

  if (error) {
    // Most likely the column doesn't exist yet — surface a helpful hint.
    return NextResponse.json(
      {
        error: error.message,
        hint: error.message.includes("signup_source")
          ? "Run sql/add-signup-source.sql in the Supabase SQL editor first."
          : undefined,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, source, recorded: (updated?.length ?? 0) > 0 });
}
