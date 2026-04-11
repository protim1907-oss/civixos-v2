"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Sidebar from "@/components/layout/Sidebar";
import {
  LogOut,
  Search,
  Filter,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  FileText,
  BarChart3,
  MapPinned,
  Activity,
} from "lucide-react";

type Issue = {
  id: string;
  title: string;
  description: string;
  status: string | null;
  category: string | null;
  district: string | null;
  created_at: string | null;
  user_id: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  district: string | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [userName, setUserName] = useState("Citizen");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [currentDistrict, setCurrentDistrict] = useState("District 12");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);

      const { data } = await supabase.auth.getSession();
      const session = data?.session;

      const guestUser =
        typeof window !== "undefined"
          ? localStorage.getItem("guest_user")
          : null;

      if (!session?.user && !guestUser) {
        router.replace("/login");
        return;
      }

      if (!session?.user && guestUser) {
        try {
          const parsedGuest = JSON.parse(guestUser);

          const guestName =
            parsedGuest?.name ||
            parsedGuest?.full_name ||
            "Guest Citizen";

          const guestDistrict =
            parsedGuest?.district ||
            parsedGuest?.district_name ||
            parsedGuest?.district_id ||
            "District 12";

          setUserName(guestName);
          setCurrentDistrict(guestDistrict);

          const { data: guestIssues, error: guestError } = await supabase
            .from("issues")
            .select(
              "id, title, description, status, category, district, created_at, user_id"
            )
            .eq("district", guestDistrict)
            .order("created_at", { ascending: false });

          if (guestError) {
            console.error("Dashboard load error:", guestError);
            setIssues([]);
            setLoading(false);
            return;
          }

          setIssues((guestIssues as Issue[]) || []);
          setLoading(false);
          return;
        } catch (error) {
          console.error("Guest parse error:", error);
          localStorage.removeItem("guest_user");
          router.replace("/login");
          return;
        }
      }

      const user = session!.user;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, district")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Profile load error:", profileError);
      }

      const typedProfile = profile as ProfileRow | null;

      const displayName =
        typedProfile?.full_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "Citizen";

      setUserName(displayName);

      const resolvedDistrict =
        typedProfile?.district ||
        user.user_metadata?.district ||
        user.user_metadata?.district_name ||
        user.user_metadata?.district_id ||
        "District 12";

      setCurrentDistrict(resolvedDistrict);

      const { data: districtIssues, error } = await supabase
        .from("issues")
        .select(
          "id, title, description, status, category, district, created_at, user_id"
        )
        .eq("district", resolvedDistrict)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Dashboard load error:", error);
        setIssues([]);
        setLoading(false);
        return;
      }

      setIssues((districtIssues as Issue[]) || []);
      setLoading(false);
    }

    loadDashboard();
  }, [router, supabase]);

  async function handleLogout() {
    try {
      setLoggingOut(true);

      if (typeof window !== "undefined") {
        localStorage.removeItem("guest_user");
      }

      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
      router.replace("/login");
    } finally {
      setLoggingOut(false);
    }
  }

  const filteredIssues = useMemo(() => {
    let result = [...issues];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (issue) =>
          issue.title?.toLowerCase().includes(q) ||
          issue.description?.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter(
        (issue) => (issue.status || "").toLowerCase() === statusFilter
      );
    }

    if (categoryFilter !== "all") {
      result = result.filter(
        (issue) => (issue.category || "").toLowerCase() === categoryFilter
      );
    }

    if (sortBy === "oldest") {
      result.sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return aTime - bTime;
      });
    } else {
      result.sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTime - aTime;
      });
    }

    return result;
  }, [issues, search, statusFilter, categoryFilter, sortBy]);

  const openCount = issues.filter(
    (i) => (i.status || "").toLowerCase() === "open"
  ).length;

  const underReviewCount = issues.filter(
    (i) => (i.status || "").toLowerCase() === "under_review"
  ).length;

  const resolvedCount = issues.filter(
    (i) => (i.status || "").toLowerCase() === "resolved"
  ).length;

  const totalCount = issues.length;

  function formatStatus(status: string | null) {
    if (!status) return "Open";
    if (status === "under_review") return "Under Review";
    if (status === "resolved") return "Resolved";
    if (status === "escalated") return "Escalated";
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return "Recently";
    return new Date(dateString).toLocaleDateString();
  }

  function getTopValue(values: string[]) {
    if (!values.length) return "N/A";

    const counts: Record<string, number> = {};
    values.forEach((value) => {
      counts[value] = (counts[value] || 0) + 1;
    });

    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }

  const topIssueCategory = useMemo(() => {
    const categories = issues.map((i) => i.category || "General").filter(Boolean);
    return getTopValue(categories);
  }, [issues]);

  const mostActiveDistrict = useMemo(() => {
    const districts = issues
      .map((i) => i.district || currentDistrict || "District 12")
      .filter(Boolean);
    return getTopValue(districts);
  }, [issues, currentDistrict]);

  const riskTrend = useMemo(() => {
    if (!issues.length) return 0;

    const risky = issues.filter((issue) => {
      const status = (issue.status || "").toLowerCase();
      return status === "under_review" || status === "escalated";
    }).length;

    return Math.round((risky / issues.length) * 100);
  }, [issues]);

  const districtIssues = useMemo(() => {
    return issues.filter(
      (issue) => (issue.district || currentDistrict || "District 12") === currentDistrict
    );
  }, [issues, currentDistrict]);

  const trendingIssues = useMemo(() => {
    const titleCounts: Record<string, number> = {};

    districtIssues.forEach((issue) => {
      const normalized = issue.title?.trim() || "Untitled issue";
      titleCounts[normalized] = (titleCounts[normalized] || 0) + 1;
    });

    return Object.entries(titleCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [districtIssues]);

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <Sidebar />

        <div className="flex min-w-0 flex-1">
          <div className="w-full p-4 md:p-6 xl:p-8">
            <div className="mx-auto max-w-7xl space-y-6">
              <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 px-6 py-6 md:px-8">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-100/80">
                        Citizen Dashboard
                      </p>
                      <h1 className="mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">
                        Welcome back, {userName}
                      </h1>
                      <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100/80 md:text-base">
                        Explore district activity, official announcements,
                        community issues, and civic progress updates in{" "}
                        {currentDistrict}.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white backdrop-blur">
                        <span className="font-semibold">Current district:</span>{" "}
                        {currentDistrict}
                      </div>

                      <button
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <LogOut className="h-4 w-4" />
                        {loggingOut ? "Logging out..." : "Logout"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 md:grid-cols-4 md:p-6">
                  <div className="rounded-3xl bg-gradient-to-br from-green-500 to-emerald-400 p-5 text-white shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-white/85">Open Issues</p>
                      <AlertTriangle className="h-5 w-5 text-white/85" />
                    </div>
                    <p className="mt-4 text-3xl font-bold">{openCount}</p>
                  </div>

                  <div className="rounded-3xl bg-gradient-to-br from-violet-500 to-fuchsia-500 p-5 text-white shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-white/85">
                        Under Review
                      </p>
                      <Activity className="h-5 w-5 text-white/85" />
                    </div>
                    <p className="mt-4 text-3xl font-bold">{underReviewCount}</p>
                  </div>

                  <div className="rounded-3xl bg-gradient-to-br from-blue-500 to-sky-400 p-5 text-white shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-white/85">Resolved</p>
                      <CheckCircle2 className="h-5 w-5 text-white/85" />
                    </div>
                    <p className="mt-4 text-3xl font-bold">{resolvedCount}</p>
                  </div>

                  <div className="rounded-3xl bg-gradient-to-br from-amber-400 to-orange-400 p-5 text-white shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-white/85">Total Posts</p>
                      <FileText className="h-5 w-5 text-white/85" />
                    </div>
                    <p className="mt-4 text-3xl font-bold">{totalCount}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href="/feed"
                    className="rounded-2xl bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600 active:scale-[0.98]"
                  >
                    All Posts
                  </Link>

                  <Link
                    href="/official-updates"
                    className="rounded-2xl bg-green-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-600 active:scale-[0.98]"
                  >
                    Official Updates
                  </Link>

                  <Link
                    href="/feed?tab=community"
                    className="rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-yellow-500 active:scale-[0.98]"
                  >
                    Community Issues
                  </Link>

                  <Link
                    href="/trending-posts"
                    className="rounded-2xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 active:scale-[0.98]"
                  >
                    Trending Posts
                  </Link>
                </div>
              </section>

              <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                <div className="xl:col-span-8 space-y-6">
                  <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-sm text-slate-500">District Insights</p>
                        <h2 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">
                          Insights for {currentDistrict}
                        </h2>
                        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 md:text-base">
                          Real-time signals based on issue activity, category
                          patterns, and risk indicators in this district.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                        <div className="flex items-center gap-2 text-slate-500">
                          <BarChart3 className="h-4 w-4" />
                          <p className="text-sm">Top Issue Category</p>
                        </div>
                        <p className="mt-3 text-2xl font-bold text-slate-900">
                          {topIssueCategory}
                        </p>
                      </div>

                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                        <div className="flex items-center gap-2 text-slate-500">
                          <MapPinned className="h-4 w-4" />
                          <p className="text-sm">Most Active District</p>
                        </div>
                        <p className="mt-3 text-2xl font-bold text-slate-900">
                          {mostActiveDistrict}
                        </p>
                      </div>

                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                        <div className="flex items-center gap-2 text-slate-500">
                          <TrendingUp className="h-4 w-4" />
                          <p className="text-sm">Risk Trend</p>
                        </div>
                        <p className="mt-3 text-2xl font-bold text-slate-900">
                          {riskTrend}%
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          Based on issues marked under review or escalated
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-500">Trending Issues</p>
                          <h3 className="mt-1 text-xl font-bold text-slate-900 md:text-2xl">
                            What’s trending in {currentDistrict}
                          </h3>
                        </div>
                      </div>

                      <div className="mt-5 space-y-3">
                        {trendingIssues.length === 0 ? (
                          <p className="text-slate-500">
                            No trending issues yet for this district.
                          </p>
                        ) : (
                          trendingIssues.map(([title, count], index) => (
                            <Link
                              key={title}
                              href={`/feed?issue=${encodeURIComponent(title)}`}
                              className="block"
                            >
                              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 transition hover:border-slate-300 hover:bg-slate-50">
                                <div className="flex items-center gap-4">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-sm font-bold text-red-600">
                                    {index + 1}
                                  </div>
                                  <div>
                                    <p className="text-base font-semibold text-slate-900">
                                      {title}
                                    </p>
                                    <p className="text-sm text-slate-500">
                                      Recurring issue in {currentDistrict}
                                    </p>
                                  </div>
                                </div>

                                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                                  {count} report{count > 1 ? "s" : ""}
                                </span>
                              </div>
                            </Link>
                          ))
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <p className="text-base text-slate-600 md:text-lg">
                        {loading
                          ? "Loading posts..."
                          : `${filteredIssues.length} posts found`}
                      </p>

                      <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-500 md:text-base">
                          Sort by:
                        </span>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none"
                        >
                          <option value="newest">Newest</option>
                          <option value="oldest">Oldest</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-6">
                      {loading ? (
                        <div className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-16 text-center">
                          <h3 className="text-3xl font-bold text-slate-900">
                            Loading...
                          </h3>
                          <p className="mt-4 text-lg text-slate-500">
                            Fetching your issues.
                          </p>
                        </div>
                      ) : filteredIssues.length === 0 ? (
                        <div className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-16 text-center">
                          <h3 className="text-3xl font-bold text-slate-900">
                            No posts found
                          </h3>
                          <p className="mt-4 text-lg text-slate-500">
                            Try changing filters or create the first issue for
                            this district.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {filteredIssues.map((issue) => (
                            <Link
                              key={issue.id}
                              href={`/feed?issue=${encodeURIComponent(issue.title)}`}
                              className="block"
                            >
                              <div className="rounded-3xl border border-slate-200 bg-white p-6 transition hover:border-slate-300 hover:bg-slate-50">
                                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                  <div>
                                    <h3 className="text-xl font-bold text-slate-900 md:text-2xl">
                                      {issue.title}
                                    </h3>
                                    <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
                                      {issue.description}
                                    </p>
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                                      {formatStatus(issue.status)}
                                    </span>
                                    <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
                                      {issue.category || "General"}
                                    </span>
                                  </div>
                                </div>

                                <div className="mt-4 text-sm text-slate-500">
                                  Created on {formatDate(issue.created_at)}
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                </div>

                <aside className="xl:col-span-4">
                  <div className="sticky top-6 space-y-6">
                    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="flex items-center gap-2">
                        <Search className="h-5 w-5 text-slate-400" />
                        <h2 className="text-xl font-semibold text-slate-900">
                          Search
                        </h2>
                      </div>

                      <input
                        type="text"
                        placeholder="Search posts..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="mt-4 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                      />
                    </section>

                    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="flex items-center gap-2">
                        <Filter className="h-5 w-5 text-slate-400" />
                        <h3 className="text-xl font-semibold text-slate-900">
                          Filters
                        </h3>
                      </div>

                      <div className="mt-6">
                        <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                          Status
                        </h4>
                        <div className="mt-4 space-y-4 text-slate-700">
                          {[
                            ["all", "All"],
                            ["open", "Open"],
                            ["under_review", "Under Review"],
                            ["resolved", "Resolved"],
                            ["escalated", "Escalated"],
                          ].map(([value, label]) => (
                            <label key={value} className="flex items-center gap-3">
                              <input
                                type="radio"
                                name="status"
                                checked={statusFilter === value}
                                onChange={() => setStatusFilter(value)}
                                className="h-4 w-4"
                              />
                              <span>{label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="mt-8">
                        <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                          Category
                        </h4>
                        <div className="mt-4 space-y-4 text-slate-700">
                          {[
                            ["all", "All"],
                            ["infrastructure", "Infrastructure"],
                            ["safety", "Safety"],
                            ["transportation", "Transportation"],
                            ["environment", "Environment"],
                            ["drainage and flooding", "Drainage and flooding"],
                          ].map(([value, label]) => (
                            <label key={value} className="flex items-center gap-3">
                              <input
                                type="radio"
                                name="category"
                                checked={categoryFilter === value}
                                onChange={() => setCategoryFilter(value)}
                                className="h-4 w-4"
                              />
                              <span>{label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </section>
                  </div>
                </aside>
              </section>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}