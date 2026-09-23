// X (Twitter) Ads pixel helpers.
//
// The base pixel is loaded site-wide in app/layout.tsx, gated on
// NEXT_PUBLIC_X_PIXEL_ID. Conversion events are fired from here, gated on
// NEXT_PUBLIC_X_SIGNUP_EVENT_ID. Both are placeholder env vars — until you set
// them (Vercel + .env.local), every call below is a safe no-op, so nothing
// loads or fires and no bad data reaches X.
//
// Get the values from X Ads → Tools → Events Manager:
//   NEXT_PUBLIC_X_PIXEL_ID        → the pixel/website tag id (e.g. "oabc1")
//   NEXT_PUBLIC_X_SIGNUP_EVENT_ID → the "SignUp" conversion event id
//                                   (looks like "tw-oabc1-oxyz2")

declare global {
  interface Window {
    twq?: (...args: unknown[]) => void;
  }
}

/**
 * Fire the X "SignUp" conversion event after a citizen completes registration.
 * No-op unless the pixel has loaded and the event id is configured. Never throws.
 */
export function trackXSignup(params?: { email?: string; district?: string }): void {
  if (typeof window === "undefined" || typeof window.twq !== "function") return;
  const eventId = process.env.NEXT_PUBLIC_X_SIGNUP_EVENT_ID;
  if (!eventId) return;
  try {
    window.twq("event", eventId, {
      ...(params?.email ? { email_address: params.email } : {}),
      ...(params?.district ? { contents: [{ content_name: params.district }] } : {}),
    });
  } catch (err) {
    console.error("trackXSignup failed (non-blocking):", err);
  }
}

export {};
