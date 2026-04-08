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
  district: string | null;
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
  const [currentDistrict, setCurrentDistrict] = useState("District 12");
  const [loggingOut, setLoggingOut] = useState(false);

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

      const userDistrict =
        user.user_metadata?.district ||
        user.user_metadata?.district_name ||
        "District 12";

      setCurrentDistrict(userDistrict);

      const { data, error } = await supabase
        .from("issues")
        .select("id, title, description, status, category, district, created_at, user_id")
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

  async function handleLogout() {
    try {
      setLoggingOut(true);
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

    result.sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return sortBy === "oldest" ? aTime - bTime : bTime - aTime;
    });

    return result;
  }, [issues, search, statusFilter, categoryFilter, sortBy]);

  const openCount = issues.filter((i) => (i.status || "").toLowerCase() === "open").length;
  const underReviewCount = issues.filter((i) => (i.status || "").toLowerCase() === "under_review").length;
  const resolvedCount = issues.filter((i) => (i.status || "").toLowerCase() === "resolved").length;
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

      {/* HEADER */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

          <div>
            <p className="text-sm text-slate-500">Citizen Dashboard</p>
            <h1 className="mt-2 text-4xl font-bold text-slate-900">
              Welcome back, {userName}
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Explore district activity in {currentDistrict}.
            </p>
          </div>

          {/* BUTTON GROUP */}
          <div className="flex flex-wrap items-center gap-3">

            <Link href="/create-post" className="rounded-2xl bg-red-500 px-6 py-3 text-white">
              Create Post +
            </Link>

            <Link href="/district-feed" className="rounded-2xl bg-blue-600 px-6 py-3 text-white">
              View District Feed
            </Link>

            {/* POLICY + LOGOUT (FIXED) */}
            <div className="flex items-center gap-2">
              <Link href="/policy-pulse" className="rounded-2xl bg-green-600 px-6 py-3 text-white">
                Policy Pulse
              </Link>

              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="rounded-2xl border px-6 py-3"
              >
                {loggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* FILTER BUTTONS */}
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">

          <Link href="/district-feed" className="rounded-2xl bg-red-500 px-5 py-3 text-white">
            All Posts
          </Link>

          <Link href="/official-updates" className="rounded-2xl bg-green-500 px-5 py-3 text-white">
            Official Updates
          </Link>

          <Link href="/district-feed?tab=community" className="rounded-2xl bg-yellow-400 px-5 py-3">
            Community Issues
          </Link>

          <Link href="/trending-posts" className="rounded-2xl bg-blue-500 px-5 py-3 text-white">
            Trending Posts
          </Link>

        </div>
      </section>

      {/* POSTS */}
      <section className="space-y-4">
        {loading ? (
          <p>Loading...</p>
        ) : filteredIssues.map((issue) => (
          <Link key={issue.id} href={`/district-feed?issue=${encodeURIComponent(issue.title)}`}>
            <div className="rounded-3xl border bg-white p-6">
              <h3 className="text-xl font-bold">{issue.title}</h3>
              <p>{issue.description}</p>
              <p className="text-sm text-slate-500">{formatDate(issue.created_at)}</p>
            </div>
          </Link>
        ))}
      </section>

    </div>
  );
}