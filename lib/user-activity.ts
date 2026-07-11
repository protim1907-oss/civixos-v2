import type { SupabaseClient } from "@supabase/supabase-js";

// Activity types recorded to the user_activity table. Keep in sync with the
// icon/label maps in the dashboard "My Activity" feed.
export type UserActivityType =
  | "rep_email"
  | "survey_response"
  | "post_created"
  | "issue_upvote"
  | "meeting_request";

export type UserActivityRow = {
  id: string;
  type: UserActivityType;
  title: string | null;
  detail: string | null;
  link: string | null;
  created_at: string;
};

/**
 * Record a single user action to the unified activity log. Best-effort:
 * failures (e.g. table missing, offline) are swallowed so they never block
 * the underlying action the user was performing.
 */
export async function logUserActivity(
  supabase: SupabaseClient,
  userId: string | null | undefined,
  entry: {
    type: UserActivityType;
    title?: string | null;
    detail?: string | null;
    link?: string | null;
  }
): Promise<void> {
  if (!userId) return;

  try {
    const { error } = await supabase.from("user_activity").insert({
      user_id: userId,
      type: entry.type,
      title: entry.title ?? null,
      detail: entry.detail ?? null,
      link: entry.link ?? null,
    });
    if (error) {
      console.error("logUserActivity insert error:", error.message);
    }
  } catch (error) {
    console.error("logUserActivity failed:", error);
  }
}
