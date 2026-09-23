"use client";

import { useEffect } from "react";
import { trackXSignup } from "@/lib/x-pixel";

/**
 * Fires the X "SignUp" conversion event for OAuth (Google) sign-ups.
 *
 * The /auth/callback server route appends `?x_signup=1` to the redirect when it
 * has just registered a brand-new account. This component (mounted site-wide in
 * the layout) watches for that flag on landing, fires the conversion once the
 * pixel is ready, then strips the flag so a refresh can't double-count.
 */
export default function XSignupTracker() {
  useEffect(() => {
    let url: URL;
    try {
      url = new URL(window.location.href);
    } catch {
      return;
    }
    if (url.searchParams.get("x_signup") !== "1") return;

    const cleanUrl = () => {
      url.searchParams.delete("x_signup");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    };

    // The base pixel loads afterInteractive, so twq may not be ready the instant
    // this effect runs. Retry briefly (up to ~5s) until it is.
    let tries = 0;
    const tryFire = () => {
      if (typeof window.twq === "function") {
        trackXSignup();
        cleanUrl();
        return true;
      }
      return false;
    };

    if (tryFire()) return;
    const timer = setInterval(() => {
      tries += 1;
      if (tryFire() || tries > 25) clearInterval(timer);
    }, 200);
    return () => clearInterval(timer);
  }, []);

  return null;
}
