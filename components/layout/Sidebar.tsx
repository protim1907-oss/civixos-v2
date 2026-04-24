"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
} from "lucide-react";

type BadgeColor = "red" | "green" | "blue" | "slate";

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

  async function loadBadgeCounts() {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("Sidebar user load error:", userError);
      }

      let nextMyActivityCount = 0;

      if (user?.id) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profileError) {
          console.error("Sidebar profile load error:", profileError);
        } else {
          setUserRole(profile?.role ?? null);
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
  }

  useEffect(() => {
    loadBadgeCounts();

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
  }, [supabase]);

  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      href: "/district-analytics",
      label: "District Analytics",
      icon: BarChart3,
    },
    {
      href: "/dashboard#activity",
      label: "My Activity",
      icon: Activity,
      badge: myActivityCount > 0 ? myActivityCount : null,
      badgeColor: "red" as const,
    },
    {
      href: "/feed",
      label: "District Feed",
      icon: Newspaper,
    },
    {
      href: "/official-updates",
      label: "Official Updates",
      icon: Megaphone,
      badge: officialUpdatesCount > 0 ? officialUpdatesCount : null,
      badgeColor: "green" as const,
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
    },
    {
      href: "/trending-posts",
      label: "Trending Posts",
      icon: TrendingUp,
    },
    {
      href: "/my-representatives",
      label: "My Representative",
      icon: UserCircle2,
    },
  ] satisfies NavItem[];

  const visibleNavItems = navItems.filter(
    (item) => !(userRole === "admin" && item.href === "/my-representatives")
  );

  return (
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
  );
}
