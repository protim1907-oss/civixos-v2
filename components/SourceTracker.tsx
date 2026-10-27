"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Captures the ad acquisition source (facebook / x) and attaches it to the
 * user's profile so the admin User Management dashboard can badge each user.
 *
 * Flow (mounted site-wide in the layout, so it runs on ad landing pages too):
 *  1. On any page load, read `?src=` (or `utm_source=`) from the URL. If present
 *     and nothing is stored yet, save it to localStorage — FIRST-TOUCH wins, so
 *     it survives the hop to /signup and through the Google OAuth round-trip.
 *  2. Once the visitor has a session (right after email signup login, or after
 *     the OAuth callback), POST it to /api/record-signup-source, which writes it
 *     to their profile only if not already set, then clear localStorage.
 *
 * Tag ad destination URLs accordingly, e.g.
 *   Facebook/Instagram ad -> https://www.civix250.ai/lp/the-boss-is-you?src=facebook
 *   X ad                   -> https://www.civix250.ai/signup?src=x
 */
const SRC_KEY = "civix_signup_source";

export default function SourceTracker() {
  useEffect(() => {
    // 1. Capture first-touch source from the URL.
    try {
      const params = new URLSearchParams(window.location.search);
      const src = params.get("src") || params.get("utm_source");
      if (src && !localStorage.getItem(SRC_KEY)) {
        localStorage.setItem(SRC_KEY, src.slice(0, 40));
      }
    } catch {
      /* storage/URL unavailable — nothing to capture */
    }

    const supabase = createClient();

    // 2. Record it against the profile once a session exists.
    const record = async () => {
      let source: string | null = null;
      try {
        source = localStorage.getItem(SRC_KEY);
      } catch {
        return;
      }
      if (!source) return;

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return; // not signed in yet — try again on auth change

      try {
        const res = await fetch("/api/record-signup-source", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ source }),
        });
        if (res.ok) {
          // Clear so it only applies to this signup, on this browser.
          try {
            localStorage.removeItem(SRC_KEY);
          } catch {
            /* ignore */
          }
        }
      } catch {
        /* non-blocking — will retry on the next auth change / page load */
      }
    };

    void record();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") void record();
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return null;
}
