import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function getDistrictMappingFromEmail(email?: string | null) {
  const normalized = (email || "").trim().toLowerCase();

  if (normalized === "protim1907@gmail.com") {
    return {
      state: "Texas",
      district: "TX-35",
      district_id: "TX-35",
    };
  }

  return null;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  const supabase = await createClient();

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.email) {
      const mapped = getDistrictMappingFromEmail(user.email);

      if (mapped) {
        const currentDistrict =
          user.user_metadata?.district_id ||
          user.user_metadata?.district ||
          "";

        const currentState = user.user_metadata?.state || "";

        const needsUpdate =
          currentDistrict !== mapped.district_id ||
          currentState !== mapped.state;

        if (needsUpdate) {
          await supabase.auth.updateUser({
            data: {
              ...user.user_metadata,
              state: mapped.state,
              district: mapped.district,
              district_id: mapped.district_id,
            },
          });
        }
      }
    }
  }

  const {
    data: { user: finalUser },
  } = await supabase.auth.getUser();

  if (finalUser && !searchParams.get("next")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", finalUser.id)
      .maybeSingle();

    const role = profile?.role;
    if (role === "admin") return NextResponse.redirect(`${origin}/admin`);
    if (role === "moderator") return NextResponse.redirect(`${origin}/moderator`);
    if (role === "official") return NextResponse.redirect(`${origin}/official-dashboard`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}