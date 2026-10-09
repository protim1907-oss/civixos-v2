import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// Only these roles may permanently delete feed items.
const ALLOWED_ROLES = new Set(["moderator", "admin"]);

export async function POST(req: NextRequest) {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // --- authenticate caller & check role ---
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();
  if (!profile || !ALLOWED_ROLES.has(String(profile.role))) {
    return NextResponse.json(
      { error: "Forbidden — only moderators or admins can delete feed items." },
      { status: 403 }
    );
  }

  // --- input ---
  let kind = "";
  let id = "";
  try {
    const body = await req.json();
    kind = String(body?.kind || "");
    id = String(body?.id || "");
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!id || (kind !== "issue" && kind !== "post")) {
    return NextResponse.json(
      { error: "Expected { kind: 'issue' | 'post', id }." },
      { status: 400 }
    );
  }

  try {
    if (kind === "issue") {
      // Clear dependents first (best-effort — ignore missing tables).
      for (const t of [
        "issue_votes",
        "issue_comments",
        "issue_status_history",
        "issue_official_responses",
      ]) {
        await admin.from(t).delete().eq("issue_id", id);
      }
      const { error, count } = await admin
        .from("issues")
        .delete({ count: "exact" })
        .eq("id", id);
      if (error) throw error;
      return NextResponse.json({ ok: true, kind, id, deleted: count ?? 0 });
    }

    // kind === "post" → the posts table (never the shared discussion row).
    const { error, count } = await admin
      .from("posts")
      .delete({ count: "exact" })
      .eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true, kind, id, deleted: count ?? 0 });
  } catch (err) {
    return NextResponse.json(
      { error: `Delete failed: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
