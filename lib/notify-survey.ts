import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Fire-and-forget: ask the server to email district residents that a survey was
 * published. NEVER throws — a failed/slow email must not block or break the
 * publish flow. The server route is idempotent (it stamps `notified_at`), so
 * calling this more than once for the same survey sends at most one blast.
 */
export async function notifySurveyPublished(
  supabase: SupabaseClient,
  surveyId: string
): Promise<void> {
  try {
    if (typeof window === "undefined" || !surveyId) return;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return; // not signed in — nothing to authorize the send

    await fetch("/api/notify-survey", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ surveyId }),
    });
  } catch (err) {
    console.error("notifySurveyPublished failed (non-blocking):", err);
  }
}
