"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { startPresence } from "@/lib/supabase/presence";
import {
  startChatNotifications,
  subscribeUnread,
  subscribeChatToast,
  type ChatToast,
} from "@/lib/supabase/chat-notifications";
import {
  LayoutDashboard,
  Newspaper,
  Megaphone,
  MessageSquareText,
  TrendingUp,
  UserCircle2,
  Activity,
  BarChart3,
  ShieldCheck,
  CalendarClock,
  HeartHandshake,
  MessageCircle,
  Video,
  Bell,
} from "lucide-react";

type BadgeColor = "red" | "green" | "blue" | "slate";

// --- New-survey (Policy Pulse) in-app alert -------------------------------
// "Seen" state is tracked per user in localStorage: the timestamp of the most
// recent survey the user has acknowledged by opening Policy Pulse. The badge
// counts published surveys in their district newer than that. localStorage is
// per-device, which is fine — email (notify-survey) is the reliable channel;
// this badge is a convenience.
const PP_SEEN_PREFIX = "civix_pp_seen_";

// Districts are stored padded (MD-01) or unpadded (MD-1); match every variant.
function ppDistrictVariants(raw: string): string[] {
  const d = String(raw || "").trim().toUpperCase();
  const m = d.match(/^([A-Z]{2})-(\d{1,3})$/);
  if (!m) return [d];
  const n = Number(m[2]);
  return Array.from(
    new Set([d, `${m[1]}-${n}`, `${m[1]}-${String(n).padStart(2, "0")}`])
  );
}

function readPpSeen(userId: string): number {
  try {
    return Number(localStorage.getItem(PP_SEEN_PREFIX + userId)) || 0;
  } catch {
    return 0;
  }
}

function writePpSeen(userId: string, ts: number) {
  try {
    localStorage.setItem(PP_SEEN_PREFIX + userId, String(ts));
  } catch {
    /* storage unavailable (private mode etc.) — badge still works in-memory */
  }
}

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  badge?: number | string | null;
  badgeColor?: BadgeColor;
};

function isActivePath(pathname: string, href: string, exact?: boolean) {
  const cleanHref = href.split("#")[0];

  if (exact) return pathname === cleanHref;
  return pathname === cleanHref || pathname.startsWith(`${cleanHref}/`);
}

function getBadgeClasses(color: BadgeColor | undefined) {
  switch (color) {
    case "red":
      return "bg-red-500 text-white";
    case "green":
      return "bg-green-500 text-white";
    case "blue":
      return "bg-blue-500 text-white";
    default:
      return "bg-slate-200 text-slate-700";
  }
}

export default function Sidebar() {
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);

  const [myActivityCount, setMyActivityCount] = useState<number>(0);
  const [officialUpdatesCount, setOfficialUpdatesCount] = useState<number>(0);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userDistrict, setUserDistrict] = useState<string | null>(null);
  const [newSurveyCount, setNewSurveyCount] = useState<number>(0);
  const [surveyToast, setSurveyToast] = useState<
    { id: string; title: string; district: string } | null
  >(null);
  const [chatUnread, setChatUnread] = useState<number>(0);
  const [chatToast, setChatToast] = useState<ChatToast | null>(null);

  const loadBadgeCounts = useCallback(async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError && userError.name !== "AuthSessionMissingError") {
        console.error("Sidebar user load error:", userError);
      }

      let nextMyActivityCount = 0;

      setUserId(user?.id ?? null);

      if (user?.id) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, district")
          .eq("id", user.id)
          .single();

        if (profileError) {
          console.error("Sidebar profile load error:", profileError);
        } else {
          setUserRole(profile?.role ?? null);
          setUserDistrict(profile?.district ?? null);
        }

        const [
          { count: commentCount, error: commentsError },
          { count: upvoteCount, error: upvotesError },
        ] = await Promise.all([
          supabase
            .from("news_comments")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),

          supabase
            .from("news_interactions")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("interaction_type", "upvote"),
        ]);

        if (commentsError) {
          console.error("Sidebar comments count error:", commentsError);
        }

        if (upvotesError) {
          console.error("Sidebar upvotes count error:", upvotesError);
        }

        nextMyActivityCount = (commentCount ?? 0) + (upvoteCount ?? 0);
      }

      setMyActivityCount(nextMyActivityCount);

      const { count: updatesCount, error: updatesError } = await supabase
        .from("official_updates")
        .select("id", { count: "exact", head: true });

      if (updatesError) {
        console.error("Sidebar official updates count error:", updatesError);
        setOfficialUpdatesCount(0);
      } else {
      setOfficialUpdatesCount(updatesCount ?? 0);
      }
    } catch (error) {
      console.error("Sidebar badge load error:", error);
    }
  }, [supabase]);

  useEffect(() => {
    void Promise.resolve().then(() => loadBadgeCounts());

    const commentsChannel = supabase
      .channel("sidebar-news-comments")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "news_comments" },
        async () => {
          await loadBadgeCounts();
        }
      )
      .subscribe();

    const interactionsChannel = supabase
      .channel("sidebar-news-interactions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "news_interactions" },
        async () => {
          await loadBadgeCounts();
        }
      )
      .subscribe();

    const officialUpdatesChannel = supabase
      .channel("sidebar-official-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "official_updates" },
        async () => {
          await loadBadgeCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(interactionsChannel);
      supabase.removeChannel(officialUpdatesChannel);
    };
  }, [loadBadgeCounts, supabase]);

  // Realtime Presence: while the logged-in user has the app open, advertise them
  // as online (via the shared presence channel) so the Community Chat directory
  // can show who's online. Started once per session — kept alive across nav.
  useEffect(() => {
    void startPresence();
  }, []);

  // In-app chat notifications: subscribe to the unread badge count and pop a
  // toast when a new message arrives. Started once per session.
  useEffect(() => {
    void startChatNotifications();
    const unsubUnread = subscribeUnread(setChatUnread);
    const unsubToast = subscribeChatToast((toast) => setChatToast(toast));
    return () => {
      unsubUnread();
      unsubToast();
    };
  }, []);

  // Auto-dismiss the toast after a few seconds.
  useEffect(() => {
    if (!chatToast) return;
    const t = setTimeout(() => setChatToast(null), 6000);
    return () => clearTimeout(t);
  }, [chatToast]);

  // New-survey badge: count published surveys in the citizen's district that
  // are newer than what they've seen, and live-update via realtime (pops a
  // toast when one arrives). Citizens only — moderators/officials create them.
  useEffect(() => {
    if (!userId || userRole !== "citizen" || !userDistrict) {
      setNewSurveyCount(0);
      return;
    }
    const variants = ppDistrictVariants(userDistrict);
    let cancelled = false;

    const recompute = async () => {
      const { data, error } = await supabase
        .from("policy_pulse_surveys")
        .select("id, created_at")
        .eq("is_published", true)
        .in("district", variants);
      if (cancelled || error) return;
      const seen = readPpSeen(userId);
      const count = (data || []).filter(
        (r) => new Date(r.created_at as string).getTime() > seen
      ).length;
      setNewSurveyCount(count);
    };

    void recompute();

    const channel = supabase
      .channel("sidebar-policy-pulse")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "policy_pulse_surveys" },
        (payload) => {
          const row = payload.new as {
            id?: string;
            title?: string;
            district?: string;
            is_published?: boolean;
            created_at?: string;
          } | null;
          if (
            row?.is_published &&
            variants.includes(String(row.district || "").trim().toUpperCase()) &&
            new Date(row.created_at || 0).getTime() > readPpSeen(userId)
          ) {
            setSurveyToast({
              id: String(row.id),
              title: row.title || "New survey",
              district: String(row.district),
            });
          }
          void recompute();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId, userRole, userDistrict, supabase]);

  // Opening Policy Pulse acknowledges every current survey → clear the badge.
  useEffect(() => {
    if (!userId) return;
    if (pathname === "/policy-pulse" || pathname.startsWith("/policy-pulse/")) {
      writePpSeen(userId, Date.now());
      setNewSurveyCount(0);
      setSurveyToast(null);
    }
  }, [pathname, userId]);

  // Auto-dismiss the survey toast after a few seconds.
  useEffect(() => {
    if (!surveyToast) return;
    const t = setTimeout(() => setSurveyToast(null), 7000);
    return () => clearTimeout(t);
  }, [surveyToast]);

  const navItems = [
    {
      href: "/official-dashboard",
      label: "Official Dashboard",
      icon: ShieldCheck,
      exact: true,
      officialOnly: true,
    },
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      href: "/create-post",
      label: "Create Post",
      icon: MessageSquareText,
    },
    {
      href: "/policy-pulse",
      label: "Policy Pulse",
      icon: ShieldCheck,
      badge: newSurveyCount > 0 ? newSurveyCount : null,
      badgeColor: "red" as const,
    },
    {
      href: "/my-representatives",
      label: "My Representative",
      icon: UserCircle2,
    },
    {
      href: "/district-analytics",
      label: "District Analytics",
      icon: BarChart3,
    },
    {
      href: "/feed",
      label: "District Feed",
      icon: Newspaper,
    },
    // "Official Updates" is hidden from the sidebar until representatives are
    // signed in. Page + badge wiring are kept intact so it can be restored by
    // re-adding this nav entry.
    {
      href: "/official-meetings",
      label: "Official Meetings",
      icon: CalendarClock,
      officialOnly: true,
    },
    {
      href: "/official-response-center",
      label: "Response Center",
      icon: MessageCircle,
      officialOnly: true,
    },
    {
      href: "/town-hall",
      label: "Town Hall Calendar",
      icon: CalendarClock,
    },
    {
      href: "/chat",
      label: "Community Chat",
      icon: Video,
      badge: chatUnread > 0 ? chatUnread : null,
      badgeColor: "red" as const,
    },
    {
      href: "/trending-posts",
      label: "Trending Posts",
      icon: TrendingUp,
    },
    {
      href: "/dashboard#activity",
      label: "My Activity",
      icon: Activity,
      badge: myActivityCount > 0 ? myActivityCount : null,
      badgeColor: "red" as const,
    },
    {
      href: "/donate",
      label: "Support Civix250",
      icon: HeartHandshake,
    },
  ] satisfies Array<NavItem & { officialOnly?: boolean }>;

  const visibleNavItems = navItems.filter(
    (item) =>
      (item.officialOnly
        ? userRole === "official" || userRole === "admin" || userRole === "moderator"
        : true) &&
      // Official Dashboard is only meaningful for actual officials. Hide it
      // for moderators/admins until we have signed officials in the system.
      !(item.href === "/official-dashboard" && userRole !== "official") &&
      // Trending Posts is a citizen-facing feed; not relevant to moderators.
      !(item.href === "/trending-posts" && userRole === "moderator") &&
      // My Activity is a citizen view; not relevant to moderators.
      !(item.href === "/dashboard#activity" && userRole === "moderator") &&
      !(
        (userRole === "admin" || userRole === "moderator" || userRole === "official") &&
        item.href === "/my-representatives"
      ) &&
      !(userRole === "official" && item.href === "/dashboard")
  );

  return (
    <>
    <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white lg:block">
      <div className="sticky top-0 flex h-screen flex-col">
        <div className="border-b border-slate-200 px-6 py-6">
          <Link href="/dashboard" className="block">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
              Civic Platform
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
              Civix250
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Citizen engagement and district intelligence
            </p>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-5">
          <div className="space-y-2">
            {visibleNavItems.map((item) => {
              const active = isActivePath(pathname, item.href, item.exact);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    active
                      ? "border-l-4 border-blue-500 bg-slate-900 pl-3 text-white shadow-sm"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${
                      active ? "text-white" : "text-slate-500"
                    }`}
                  />

                  <span className="flex-1">{item.label}</span>

                  {item.badge ? (
                    <span
                      className={`ml-auto rounded-full px-2 py-0.5 text-xs font-bold ${getBadgeClasses(
                        item.badgeColor
                      )}`}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-slate-200 px-4 py-4">
          <div className="rounded-2xl bg-slate-50 px-4 py-4">
            <p className="text-sm font-semibold text-slate-900">
              Civic engagement hub
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Follow district issues, track updates, and participate in local
              discussions.
            </p>
          </div>
        </div>
      </div>
    </aside>

    {/* In-app chat notification toast (app-wide, incl. mobile) */}
    {chatToast ? (
      <div className="fixed right-4 top-4 z-[60] w-[calc(100%-2rem)] max-w-sm sm:right-6 sm:top-6">
        <Link
          href="/chat"
          onClick={() => setChatToast(null)}
          className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl transition hover:bg-slate-50"
        >
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <MessageCircle className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">
              New message from {chatToast.senderName}
            </p>
            <p className="mt-0.5 truncate text-sm text-slate-500">
              {chatToast.message || "Open chat to view"}
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setChatToast(null);
            }}
            className="shrink-0 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Dismiss"
          >
            <span className="text-lg leading-none">&times;</span>
          </button>
        </Link>
      </div>
    ) : null}

    {/* In-app new-survey notification toast */}
    {surveyToast ? (
      <div className="fixed right-4 top-4 z-[60] w-[calc(100%-2rem)] max-w-sm sm:right-6 sm:top-6">
        <Link
          href="/policy-pulse"
          onClick={() => setSurveyToast(null)}
          className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl transition hover:bg-slate-50"
        >
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <Bell className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">
              New survey in {surveyToast.district}
            </p>
            <p className="mt-0.5 truncate text-sm text-slate-500">
              {surveyToast.title}
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSurveyToast(null);
            }}
            className="shrink-0 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Dismiss"
          >
            <span className="text-lg leading-none">&times;</span>
          </button>
        </Link>
      </div>
    ) : null}
    </>
  );
}
