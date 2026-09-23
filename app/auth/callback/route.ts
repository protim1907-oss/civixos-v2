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

  // First-time OAuth sign-up: Supabase stamps created_at at first sign-in, so a
  // very recent created_at means this callback just registered a new account.
  // Flag the redirect so the client can fire the X "SignUp" conversion event
  // (the pixel is client-side and can't run in this server route).
  const isNewSignup =
    !!finalUser?.created_at &&
    Date.now() - new Date(finalUser.created_at).getTime() < 5 * 60 * 1000;
  const flag = (url: string) =>
    isNewSignup ? `${url}${url.includes("?") ? "&" : "?"}x_signup=1` : url;

  if (finalUser && !searchParams.get("next")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", finalUser.id)
      .maybeSingle();

    const role = profile?.role;
    if (role === "admin") return NextResponse.redirect(flag(`${origin}/admin`));
    if (role === "moderator") return NextResponse.redirect(flag(`${origin}/moderator`));
    if (role === "official") return NextResponse.redirect(flag(`${origin}/official-dashboard`));
  }

  return NextResponse.redirect(flag(`${origin}${next}`));
}