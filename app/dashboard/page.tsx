"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Issue = {
  id: string;
  title: string;
  description: string;
  status: string | null;
  category: string | null;
  created_at: string | null;
  user_id: string;
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

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      const user = session.user;
      const displayName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "Citizen";

      setUserName(displayName);

      const { data, error } = await supabase
        .from("issues")
        .select("id, title, description, status, category, created_at, user_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Dashboard load error:", error);
        setIssues([]);
        setLoading(false);
        return;
      }

      setIssues((data as Issue[]) || []);
      setLoading(false);
    }

    loadDashboard();
  }, [router, supabase]);

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

  const openCount = issues.filter((i) => (i.status || "").toLowerCase() === "open").length;
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

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-slate-500">Citizen Dashboard</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
              Welcome back, {userName}
            </h1>
            <p className="mt-4 max-w-4xl text-lg text-slate-600">
              Explore district activity, official announcements, community issues, and progress
              updates in Your District.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/create-post"
              className="rounded-2xl bg-red-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-600"
            >
              Create Post +
            </Link>

            <Link
              href="/feed"
              className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              View District Feed
            </Link>

            <Link
              href="/policy-pulse"
              className="rounded-2xl bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
            >
              Policy Pulse
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <button className="rounded-2xl bg-red-500 px-5 py-3 text-sm font-semibold text-white">
            All Posts
          </button>
          <button className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200">
            Official Updates
          </button>
          <button className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200">
            Community Issues
          </button>
          <button className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200">
            Resolved
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-1">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Search</h2>
            <input
              type="text"
              placeholder="Search posts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mt-4 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            />
          </div>

          <div className="mt-8">
            <h3 className="text-xl font-semibold text-slate-900">Status</h3>
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
            <h3 className="text-xl font-semibold text-slate-900">Category</h3>
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
        </div>

        <div className="space-y-6 xl:col-span-3">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-lg text-slate-500">Open Issues</p>
              <p className="mt-4 text-5xl font-bold text-slate-900">{openCount}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-lg text-slate-500">Under Review</p>
              <p className="mt-4 text-5xl font-bold text-slate-900">{underReviewCount}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-lg text-slate-500">Resolved</p>
              <p className="mt-4 text-5xl font-bold text-slate-900">{resolvedCount}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-lg text-slate-500">Total Posts</p>
              <p className="mt-4 text-5xl font-bold text-slate-900">{totalCount}</p>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
            <p className="text-lg text-slate-600">
              {loading ? "Loading posts..." : `${filteredIssues.length} posts found`}
            </p>

            <div className="flex items-center gap-4">
              <span className="text-lg text-slate-600">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm text-slate-700 outline-none"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
              <h3 className="text-3xl font-bold text-slate-900">Loading...</h3>
              <p className="mt-4 text-lg text-slate-500">Fetching your issues.</p>
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
              <h3 className="text-4xl font-bold text-slate-900">No posts found</h3>
              <p className="mt-4 text-xl text-slate-500">
                Try changing filters or create the first issue for this district.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900">{issue.title}</h3>
                      <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
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
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}