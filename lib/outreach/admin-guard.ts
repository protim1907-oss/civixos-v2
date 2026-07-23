import { createClient } from "@/lib/supabase/server";

export type AdminGuardResult =
  | { ok: true; userId: string }
  | { ok: false; status: number; error: string };

// Verifies the caller is an authenticated admin. Every /api/outreach route runs
// this before touching data — the outreach tables are service-role-only, so the
// route (not RLS) is the access boundary.
export async function requireAdmin(): Promise<AdminGuardResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, status: 401, error: "Not authenticated." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { ok: false, status: 403, error: "Admin access required." };
  }

  return { ok: true, userId: user.id };
}
