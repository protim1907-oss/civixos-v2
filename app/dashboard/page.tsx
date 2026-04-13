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
  FileText,
  BarChart3,
  Activity,
  User,
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

type FilterType =
  | "all"
  | "my_posts"
  | "flagged"
  | "community"
  | "trending";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push("/login");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, district")
        .eq("id", user.id)
        .single();

      if (mounted) {
        setProfile(profileData ?? null);
      }

      const districtToUse =
        profileData?.district ||
        user.user_metadata?.district_id ||
        user.user_metadata?.district ||
        null;

      let query = supabase
        .from("issues")
        .select("id, title, description, status, category, district, created_at, user_id")
        .order("created_at", { ascending: false });

      if (districtToUse) {
        query = query.eq("district", districtToUse);
      }

      const { data: issuesData } = await query;

      if (mounted) {
        setIssues(issuesData ?? []);
        setLoading(false);
      }
    };

    init();

    const channel = supabase
      .channel("citizen-dashboard-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "issues" },
        async () => {
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (!user) return;

          const { data: profileData } = await supabase
            .from("profiles")
            .select("district")
            .eq("id", user.id)
            .single();

          const districtToUse =
            profileData?.district ||
            user.user_metadata?.district_id ||
            user.user_metadata?.district ||
            null;

          let query = supabase
            .from("issues")
            .select("id, title, description, status, category, district, created_at, user_id")
            .order("created_at", { ascending: false });

          if (districtToUse) {
            query = query.eq("district", districtToUse);
          }

          const { data } = await query;
          setIssues(data ?? []);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [router, supabase]);

  const stats = useMemo(() => {
    const currentUserId = profile?.id;

    const totalPosts = issues.length;

    const myPosts = issues.filter((issue) => issue.user_id === currentUserId).length;

    const flaggedForReview = issues.filter(
      (issue) => issue.status === "under_review"
    ).length;

    return {
      totalPosts,
      myPosts,
      flaggedForReview,
    };
  }, [issues, profile?.id]);

  const filteredIssues = useMemo(() => {
    let list = [...issues];

    if (activeFilter === "my_posts") {
      list = list.filter((issue) => issue.user_id === profile?.id);
    }

    if (activeFilter === "flagged") {
      list = list.filter((issue) => issue.status === "under_review");
    }

    if (activeFilter === "community") {
      list = list.filter((issue) => issue.user_id !== profile?.id);
    }

    if (activeFilter === "trending") {
      list = [...list].sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTime - aTime;
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (issue) =>
          issue.title?.toLowerCase().includes(q) ||
          issue.description?.toLowerCase().includes(q) ||
          issue.category?.toLowerCase().includes(q) ||
          issue.district?.toLowerCase().includes(q) ||
          issue.status?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [issues, activeFilter, search, profile?.id]);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleString();
  }

  function getStatusClasses(status: string | null) {
    switch (status) {
      case "under_review":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "removed":
        return "bg-red-100 text-red-700 border-red-200";
      case "approved":
        return "bg-green-100 text-green-700 border-green-200";
      case "active":
      case "open":
      case null:
      default:
        return "bg-blue-100 text-blue-700 border-blue-200";
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8">
          <div className="animate-pulse space-y-6">
            <div className="h-10 w-72 rounded-xl bg-slate-200" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-28 rounded-2xl bg-slate-200" />
              <div className="h-28 rounded-2xl bg-slate-200" />
              <div className="h-28 rounded-2xl bg-slate-200" />
            </div>
            <div className="h-96 rounded-2xl bg-slate-200" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />

      <main className="flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Citizen Dashboard
                </p>
                <h1 className="text-3xl font-bold text-slate-900 mt-1">
                  Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}
                </h1>
                <p className="text-sm text-slate-600 mt-2">
                  View district activity, track your own posts, and stay informed
                  about local civic discussions.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/create-post"
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  <Activity className="h-4 w-4" />
                  Create Post
                </Link>

                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">My Posts</p>
                  <p className="mt-2 text-3xl font-bold text-green-700">
                    {stats.myPosts}
                  </p>
                </div>
                <div className="rounded-2xl bg-green-100 p-3">
                  <User className="h-5 w-5 text-green-700" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Flagged for Review</p>
                  <p className="mt-2 text-3xl font-bold text-purple-700">
                    {stats.flaggedForReview}
                  </p>
                </div>
                <div className="rounded-2xl bg-purple-100 p-3">
                  <AlertTriangle className="h-5 w-5 text-purple-700" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Posts</p>
                  <p className="mt-2 text-3xl font-bold text-amber-600">
                    {stats.totalPosts}
                  </p>
                </div>
                <div className="rounded-2xl bg-amber-100 p-3">
                  <FileText className="h-5 w-5 text-amber-700" />
                </div>
              </div>
            </div>
          </section>

          {/* Search + Filters */}
          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <Search className="h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by title, description, district, category, or status"
                  className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 mr-2">
                  <Filter className="h-4 w-4" />
                  Filters
                </div>

                {[
                  { key: "all", label: "All Posts" },
                  { key: "my_posts", label: "My Posts" },
                  { key: "flagged", label: "Flagged for Review" },
                  { key: "community", label: "Community Issues" },
                  { key: "trending", label: "Trending Posts" },
                ].map((item) => {
                  const selected = activeFilter === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setActiveFilter(item.key as FilterType)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        selected
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Feed */}
          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-xl font-semibold text-slate-900">
                District Feed
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Explore posts from your district and monitor the status of your
                civic issues.
              </p>
            </div>

            <div className="p-6">
              {filteredIssues.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
                  <BarChart3 className="mx-auto h-8 w-8 text-slate-400" />
                  <h3 className="mt-4 text-lg font-semibold text-slate-800">
                    No posts found
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Try changing your search or filter to view more posts.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredIssues.map((issue) => (
                    <Link
                      key={issue.id}
                      href="/district-feed"
                      className="block rounded-2xl border border-slate-200 bg-white p-5 hover:shadow-sm transition"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
                                issue.status
                              )}`}
                            >
                              {issue.status === "under_review"
                                ? "flagged for review"
                                : issue.status ?? "active"}
                            </span>

                            {issue.category && (
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                                {issue.category}
                              </span>
                            )}

                            {issue.district && (
                              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                                {issue.district}
                              </span>
                            )}

                            {issue.user_id === profile?.id && (
                              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                                My Post
                              </span>
                            )}
                          </div>

                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">
                              {issue.title}
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              {issue.description}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                            <span>Posted on {formatDate(issue.created_at)}</span>
                            <span className="inline-flex items-center gap-1">
                              <TrendingUp className="h-3.5 w-3.5" />
                              District Activity
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}