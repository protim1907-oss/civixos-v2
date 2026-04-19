"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Sidebar from "@/components/layout/Sidebar";
import {
  Shield,
  Users,
  FileText,
  AlertTriangle,
  Trash2,
  RefreshCw,
  Loader2,
  LogOut,
  Search,
  UserCog,
  ShieldCheck,
  Building2,
  PieChart,
  Clock3,
  Tags,
  BarChart3,
  MapPinned,
  TrendingUp,
} from "lucide-react";

type Issue = {
  id: string;
  title: string;
  description: string;
  category: string | null;
  district: string | null;
  status: string | null;
  created_at: string | null;
  user_id: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  district: string | null;
};

type UserRole = "citizen" | "moderator" | "official" | "admin";

type ModerationQueueRow = {
  id: string;
  post_id: string | null;
  flagged_reason: string | null;
  ai_recommended_action: string | null;
  reviewer_decision: string | null;
  reviewed_at: string | null;
  created_at: string | null;
};

type ModerationInsightStats = {
  approvedPct: number;
  removedPct: number;
  totalEscalations: number;
  avgResolutionHours: number;
  topCategories: { name: string; count: number }[];
};

type DistrictRiskRow = {
  district: string;
  totalPosts: number;
  escalatedPosts: number;
  removedPosts: number;
  escalationRate: number;
  removalRate: number;
  avgResolutionHours: number;
  riskLevel: "Low" | "Medium" | "High";
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [currentUserProfile, setCurrentUserProfile] = useState<ProfileRow | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [moderationQueue, setModerationQueue] = useState<ModerationQueueRow[]>([]);

  const [moderationInsights, setModerationInsights] = useState<ModerationInsightStats>({
    approvedPct: 0,
    removedPct: 0,
    totalEscalations: 0,
    avgResolutionHours: 0,
    topCategories: [],
  });

  const [districtRiskRows, setDistrictRiskRows] = useState<DistrictRiskRow[]>([]);

  const [issueSearch, setIssueSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");

  const [issueActionLoadingId, setIssueActionLoadingId] = useState<string | null>(null);
  const [roleActionLoadingId, setRoleActionLoadingId] = useState<string | null>(null);

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

      const { data: me } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, district")
        .eq("id", user.id)
        .single();

      if (!me) {
        router.push("/login");
        return;
      }

      if (mounted) {
        setCurrentUserProfile(me);
      }

      if (me.role !== "admin") {
        router.push(me.role === "moderator" ? "/moderator" : "/dashboard");
        return;
      }

      await loadDashboardData();

      if (mounted) {
        setLoading(false);
      }
    };

    init();

    const issuesChannel = supabase
      .channel("admin-live-issues")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "issues" },
        async () => {
          await loadIssues();
          await loadModerationQueue();
        }
      )
      .subscribe();

    const profilesChannel = supabase
      .channel("admin-live-profiles")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        async () => {
          await loadProfiles();
        }
      )
      .subscribe();

    const moderationQueueChannel = supabase
      .channel("admin-live-moderation-queue")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "moderation_queue" },
        async () => {
          await loadModerationQueue();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(issuesChannel);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(moderationQueueChannel);
    };
  }, [router, supabase]);

  useEffect(() => {
    computeModerationInsights();
    computeDistrictRiskSignals();
  }, [issues, moderationQueue]);

  async function loadDashboardData() {
    await Promise.all([loadIssues(), loadProfiles(), loadModerationQueue()]);
  }

  async function loadIssues() {
    const { data, error } = await supabase
      .from("issues")
      .select("id, title, description, category, district, status, created_at, user_id")
      .order("created_at", { ascending: false });

    if (!error) {
      setIssues(data ?? []);
    }
  }

  async function loadProfiles() {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, district")
      .order("full_name", { ascending: true });

    if (!error) {
      setProfiles(data ?? []);
    }
  }

  async function loadModerationQueue() {
    const { data, error } = await supabase
      .from("moderation_queue")
      .select(
        "id, post_id, flagged_reason, ai_recommended_action, reviewer_decision, reviewed_at, created_at"
      )
      .order("created_at", { ascending: false });

    if (!error) {
      setModerationQueue((data ?? []) as ModerationQueueRow[]);
    }
  }

  function hoursBetween(start?: string | null, end?: string | null) {
    if (!start || !end) return 0;
    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();

    if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) {
      return 0;
    }

    return (endMs - startMs) / (1000 * 60 * 60);
  }

  function computeModerationInsights() {
    const totalEscalations = moderationQueue.length;

    const resolvedQueue = moderationQueue.filter(
      (row) => row.reviewed_at && row.reviewer_decision
    );

    const totalResolved = resolvedQueue.length;

    const approvedCount = resolvedQueue.filter((row) =>
      ["approve", "approved", "active", "publish"].includes(
        String(row.reviewer_decision ?? "").toLowerCase()
      )
    ).length;

    const removedCount = resolvedQueue.filter((row) =>
      ["remove", "removed", "reject"].includes(
        String(row.reviewer_decision ?? "").toLowerCase()
      )
    ).length;

    const approvedPct =
      totalResolved > 0 ? Math.round((approvedCount / totalResolved) * 100) : 0;

    const removedPct =
      totalResolved > 0 ? Math.round((removedCount / totalResolved) * 100) : 0;

    const avgResolutionHours =
      totalResolved > 0
        ? Number(
            (
              resolvedQueue.reduce((sum, row) => {
                return sum + hoursBetween(row.created_at, row.reviewed_at);
              }, 0) / totalResolved
            ).toFixed(1)
          )
        : 0;

    const issueMap = new Map<string, Issue>();
    for (const issue of issues) {
      issueMap.set(issue.id, issue);
    }

    const categoryCounts = new Map<string, number>();

    for (const row of moderationQueue) {
      const issue = row.post_id ? issueMap.get(row.post_id) : null;
      const category =
        issue?.category?.trim() ||
        row.flagged_reason?.trim() ||
        "Uncategorized";

      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    }

    const topCategories = Array.from(categoryCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);

    setModerationInsights({
      approvedPct,
      removedPct,
      totalEscalations,
      avgResolutionHours,
      topCategories,
    });
  }

  function getRiskLevel(
    escalationRate: number,
    removalRate: number
  ): "Low" | "Medium" | "High" {
    if (escalationRate >= 40 || removalRate >= 25) return "High";
    if (escalationRate >= 20 || removalRate >= 10) return "Medium";
    return "Low";
  }

  function computeDistrictRiskSignals() {
    const districtMap = new Map<
      string,
      {
        totalPosts: number;
        escalatedPosts: number;
        removedPosts: number;
        resolutionHours: number[];
      }
    >();

    for (const issue of issues) {
      const district = issue.district?.trim() || "Unassigned";

      if (!districtMap.has(district)) {
        districtMap.set(district, {
          totalPosts: 0,
          escalatedPosts: 0,
          removedPosts: 0,
          resolutionHours: [],
        });
      }

      const bucket = districtMap.get(district)!;
      bucket.totalPosts += 1;

      if (issue.status === "under_review") {
        bucket.escalatedPosts += 1;
      }

      if (issue.status === "removed") {
        bucket.removedPosts += 1;
      }
    }

    const issueMap = new Map<string, Issue>();
    for (const issue of issues) {
      issueMap.set(issue.id, issue);
    }

    for (const row of moderationQueue) {
      if (!row.reviewed_at || !row.created_at || !row.post_id) continue;

      const linkedIssue = issueMap.get(row.post_id);
      const district = linkedIssue?.district?.trim() || "Unassigned";

      if (!districtMap.has(district)) {
        districtMap.set(district, {
          totalPosts: 0,
          escalatedPosts: 0,
          removedPosts: 0,
          resolutionHours: [],
        });
      }

      const bucket = districtMap.get(district)!;
      const duration = hoursBetween(row.created_at, row.reviewed_at);

      if (duration > 0) {
        bucket.resolutionHours.push(duration);
      }
    }

    const rows: DistrictRiskRow[] = Array.from(districtMap.entries())
      .map(([district, value]) => {
        const escalationRate =
          value.totalPosts > 0
            ? Number(((value.escalatedPosts / value.totalPosts) * 100).toFixed(1))
            : 0;

        const removalRate =
          value.totalPosts > 0
            ? Number(((value.removedPosts / value.totalPosts) * 100).toFixed(1))
            : 0;

        const avgResolutionHours =
          value.resolutionHours.length > 0
            ? Number(
                (
                  value.resolutionHours.reduce((sum, hrs) => sum + hrs, 0) /
                  value.resolutionHours.length
                ).toFixed(1)
              )
            : 0;

        const riskLevel = getRiskLevel(escalationRate, removalRate);

        return {
          district,
          totalPosts: value.totalPosts,
          escalatedPosts: value.escalatedPosts,
          removedPosts: value.removedPosts,
          escalationRate,
          removalRate,
          avgResolutionHours,
          riskLevel,
        };
      })
      .sort((a, b) => {
        const rank = { High: 3, Medium: 2, Low: 1 };
        if (rank[b.riskLevel] !== rank[a.riskLevel]) {
          return rank[b.riskLevel] - rank[a.riskLevel];
        }
        return b.totalPosts - a.totalPosts;
      });

    setDistrictRiskRows(rows);
  }

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await loadDashboardData();
    } finally {
      setRefreshing(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  async function updateIssueStatus(issueId: string, nextStatus: string) {
    try {
      setIssueActionLoadingId(issueId);

      const { error } = await supabase
        .from("issues")
        .update({ status: nextStatus })
        .eq("id", issueId);

      if (error) {
        console.error("Failed to update issue:", error.message);
        return;
      }

      const matchingQueueEntry = moderationQueue.find(
        (row) => row.post_id === issueId && !row.reviewed_at
      );

      if (matchingQueueEntry) {
        await supabase
          .from("moderation_queue")
          .update({
            reviewer_decision: nextStatus,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", matchingQueueEntry.id);
      }

      await loadIssues();
      await loadModerationQueue();
    } catch (error) {
      console.error("Unexpected issue update error:", error);
    } finally {
      setIssueActionLoadingId(null);
    }
  }

  async function updateUserRole(profileId: string, nextRole: UserRole) {
    try {
      setRoleActionLoadingId(profileId);

      const { error } = await supabase
        .from("profiles")
        .update({ role: nextRole })
        .eq("id", profileId);

      if (error) {
        console.error("Failed to update role:", error.message);
        return;
      }

      await loadProfiles();
    } catch (error) {
      console.error("Unexpected role update error:", error);
    } finally {
      setRoleActionLoadingId(null);
    }
  }

  const escalatedIssues = useMemo(() => {
    let list = issues.filter((issue) => issue.status === "under_review");

    if (issueSearch.trim()) {
      const q = issueSearch.toLowerCase();
      list = list.filter(
        (issue) =>
          issue.title?.toLowerCase().includes(q) ||
          issue.description?.toLowerCase().includes(q) ||
          issue.category?.toLowerCase().includes(q) ||
          issue.district?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [issues, issueSearch]);

  const filteredUsers = useMemo(() => {
    let list = [...profiles];

    if (userSearch.trim()) {
      const q = userSearch.toLowerCase();
      list = list.filter(
        (profile) =>
          profile.full_name?.toLowerCase().includes(q) ||
          profile.email?.toLowerCase().includes(q) ||
          profile.role?.toLowerCase().includes(q) ||
          profile.district?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [profiles, userSearch]);

  const stats = useMemo(() => {
    const totalUsers = profiles.length;
    const totalPosts = issues.length;
    const underReview = issues.filter((i) => i.status === "under_review").length;
    const removed = issues.filter((i) => i.status === "removed").length;
    const moderators = profiles.filter((p) => p.role === "moderator").length;
    const officials = profiles.filter((p) => p.role === "official").length;
    const admins = profiles.filter((p) => p.role === "admin").length;

    return {
      totalUsers,
      totalPosts,
      underReview,
      removed,
      moderators,
      officials,
      admins,
    };
  }, [issues, profiles]);

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

  function getRoleClasses(role: string | null) {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "moderator":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "official":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "citizen":
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  }

  function getRiskBadgeClasses(level: "Low" | "Medium" | "High") {
    switch (level) {
      case "High":
        return "bg-red-100 text-red-700 border-red-200";
      case "Medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Low":
      default:
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8">
          <div className="animate-pulse space-y-6">
            <div className="h-10 w-72 rounded-xl bg-slate-200" />
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
              <div className="h-28 rounded-2xl bg-slate-200" />
              <div className="h-28 rounded-2xl bg-slate-200" />
              <div className="h-28 rounded-2xl bg-slate-200" />
              <div className="h-28 rounded-2xl bg-slate-200" />
              <div className="h-28 rounded-2xl bg-slate-200" />
              <div className="h-28 rounded-2xl bg-slate-200" />
            </div>
            <div className="h-56 rounded-2xl bg-slate-200" />
            <div className="h-72 rounded-2xl bg-slate-200" />
            <div className="h-80 rounded-2xl bg-slate-200" />
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
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-500">
                  Civix250 Admin Console
                </p>
                <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
                  Welcome{currentUserProfile?.full_name ? `, ${currentUserProfile.full_name}` : ""}
                </h1>
                <p className="mt-3 max-w-3xl text-base text-slate-600">
                  Manage escalations, oversee users, and control the governance
                  layer of the Civix250 platform.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {refreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>

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

          {/* KPI Cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Users</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {stats.totalUsers}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-100 p-3">
                  <Users className="h-5 w-5 text-slate-700" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Posts</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {stats.totalPosts}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-100 p-3">
                  <FileText className="h-5 w-5 text-slate-700" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Escalated</p>
                  <p className="mt-2 text-3xl font-bold text-yellow-700">
                    {stats.underReview}
                  </p>
                </div>
                <div className="rounded-2xl bg-yellow-100 p-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-700" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Removed</p>
                  <p className="mt-2 text-3xl font-bold text-red-700">
                    {stats.removed}
                  </p>
                </div>
                <div className="rounded-2xl bg-red-100 p-3">
                  <Trash2 className="h-5 w-5 text-red-700" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Moderators</p>
                  <p className="mt-2 text-3xl font-bold text-blue-700">
                    {stats.moderators}
                  </p>
                </div>
                <div className="rounded-2xl bg-blue-100 p-3">
                  <ShieldCheck className="h-5 w-5 text-blue-700" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Officials</p>
                  <p className="mt-2 text-3xl font-bold text-emerald-700">
                    {stats.officials}
                  </p>
                </div>
                <div className="rounded-2xl bg-emerald-100 p-3">
                  <Building2 className="h-5 w-5 text-emerald-700" />
                </div>
              </div>
            </div>
          </section>

          {/* Moderation Intelligence */}
          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                  Moderation Intelligence
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Platform-level insight into moderation outcomes, escalation volume,
                  resolution speed, and flagged categories.
                </p>
              </div>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500">
                    Approved vs Removed
                  </span>
                  <div className="rounded-xl bg-blue-100 p-2 text-blue-700">
                    <PieChart className="h-5 w-5" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-slate-900">
                  {moderationInsights.approvedPct}% / {moderationInsights.removedPct}%
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  Share of resolved moderation decisions.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500">
                    Total Escalations
                  </span>
                  <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-slate-900">
                  {moderationInsights.totalEscalations}
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  Total items sent to elevated review.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500">
                    Avg Resolution Time
                  </span>
                  <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                    <Clock3 className="h-5 w-5" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-slate-900">
                  {moderationInsights.avgResolutionHours}h
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  Average time from escalation to final decision.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500">
                    Top Flagged Categories
                  </span>
                  <div className="rounded-xl bg-rose-100 p-2 text-rose-700">
                    <Tags className="h-5 w-5" />
                  </div>
                </div>

                <div className="space-y-2">
                  {moderationInsights.topCategories.length > 0 ? (
                    moderationInsights.topCategories.map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2"
                      >
                        <span className="truncate text-sm font-medium text-slate-700">
                          {item.name}
                        </span>
                        <span className="ml-3 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                          {item.count}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No flagged categories yet.</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* District Risk Signals */}
          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                    District Risk Signals
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    District-level oversight of escalation pressure, removal rates, and moderation responsiveness.
                  </p>
                </div>

                <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2 text-sm text-slate-600">
                  <MapPinned className="h-4 w-4 text-slate-500" />
                  Live district governance view
                </div>
              </div>
            </div>

            <div className="p-6">
              {districtRiskRows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
                  <BarChart3 className="mx-auto h-8 w-8 text-slate-400" />
                  <h3 className="mt-4 text-lg font-semibold text-slate-800">
                    No district risk data yet
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    District signals will appear once posts and moderation activity are available.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {districtRiskRows.map((row) => (
                    <div
                      key={row.district}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-slate-900">
                              {row.district}
                            </h3>
                            <span
                              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getRiskBadgeClasses(
                                row.riskLevel
                              )}`}
                            >
                              {row.riskLevel} Risk
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-slate-500">
                            Oversight signal based on escalation activity, removals, and review speed.
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-100 p-3">
                          <TrendingUp className="h-5 w-5 text-slate-700" />
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-slate-50 px-4 py-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Total Posts
                          </p>
                          <p className="mt-2 text-2xl font-bold text-slate-900">
                            {row.totalPosts}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 px-4 py-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Escalated
                          </p>
                          <p className="mt-2 text-2xl font-bold text-yellow-700">
                            {row.escalatedPosts}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 px-4 py-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Removed
                          </p>
                          <p className="mt-2 text-2xl font-bold text-red-700">
                            {row.removedPosts}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 px-4 py-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Avg Review Time
                          </p>
                          <p className="mt-2 text-2xl font-bold text-slate-900">
                            {row.avgResolutionHours}h
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 space-y-3">
                        <div>
                          <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-500">
                            <span>Escalation Rate</span>
                            <span>{row.escalationRate}%</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-100">
                            <div
                              className="h-2 rounded-full bg-yellow-500"
                              style={{ width: `${Math.min(row.escalationRate, 100)}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-500">
                            <span>Removal Rate</span>
                            <span>{row.removalRate}%</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-100">
                            <div
                              className="h-2 rounded-full bg-red-500"
                              style={{ width: `${Math.min(row.removalRate, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Escalated Cases */}
          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 px-6 py-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Escalated Cases Queue
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Final admin review for posts escalated by moderators.
                  </p>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 lg:w-[380px]">
                  <Search className="h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    value={issueSearch}
                    onChange={(e) => setIssueSearch(e.target.value)}
                    placeholder="Search escalated cases"
                    className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="p-6">
              {escalatedIssues.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
                  <AlertTriangle className="mx-auto h-8 w-8 text-slate-400" />
                  <h3 className="mt-4 text-lg font-semibold text-slate-800">
                    No escalated cases found
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    All escalated items are cleared or nothing matches your search.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {escalatedIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 hover:shadow-sm transition"
                    >
                      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
                                issue.status
                              )}`}
                            >
                              {issue.status ?? "active"}
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
                          </div>

                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">
                              {issue.title}
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              {issue.description}
                            </p>
                          </div>

                          <div className="text-xs text-slate-500">
                            Posted on {formatDate(issue.created_at)}
                          </div>
                        </div>

                        <div className="flex flex-wrap xl:flex-col gap-2 xl:min-w-[180px]">
                          <button
                            onClick={() => updateIssueStatus(issue.id, "approved")}
                            disabled={issueActionLoadingId === issue.id}
                            className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
                          >
                            {issueActionLoadingId === issue.id ? "Updating..." : "Approve"}
                          </button>

                          <button
                            onClick={() => updateIssueStatus(issue.id, "active")}
                            disabled={issueActionLoadingId === issue.id}
                            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                          >
                            {issueActionLoadingId === issue.id ? "Updating..." : "Restore"}
                          </button>

                          <button
                            onClick={() => updateIssueStatus(issue.id, "removed")}
                            disabled={issueActionLoadingId === issue.id}
                            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                          >
                            {issueActionLoadingId === issue.id ? "Updating..." : "Remove"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* User Management */}
          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 px-6 py-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    User Management
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Manage roles across Civix250 users.
                  </p>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 lg:w-[380px]">
                  <Search className="h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search users by name, email, role, district"
                    className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-slate-600">
                    <th className="px-6 py-4 font-semibold">User</th>
                    <th className="px-6 py-4 font-semibold">Email</th>
                    <th className="px-6 py-4 font-semibold">District</th>
                    <th className="px-6 py-4 font-semibold">Role</th>
                    <th className="px-6 py-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-10 text-center text-slate-500"
                      >
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((profile) => (
                      <tr
                        key={profile.id}
                        className="border-t border-slate-200 align-top"
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">
                            {profile.full_name || "Unnamed User"}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-slate-600">
                          {profile.email || "—"}
                        </td>

                        <td className="px-6 py-4 text-slate-600">
                          {profile.district || "—"}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getRoleClasses(
                              profile.role
                            )}`}
                          >
                            {profile.role || "citizen"}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => updateUserRole(profile.id, "citizen")}
                              disabled={roleActionLoadingId === profile.id}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                            >
                              Citizen
                            </button>

                            <button
                              onClick={() => updateUserRole(profile.id, "moderator")}
                              disabled={roleActionLoadingId === profile.id}
                              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                            >
                              Moderator
                            </button>

                            <button
                              onClick={() => updateUserRole(profile.id, "official")}
                              disabled={roleActionLoadingId === profile.id}
                              className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                            >
                              Official
                            </button>

                            <button
                              onClick={() => updateUserRole(profile.id, "admin")}
                              disabled={
                                roleActionLoadingId === profile.id ||
                                currentUserProfile?.id === profile.id
                              }
                              className="rounded-lg bg-purple-600 px-3 py-2 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-60"
                            >
                              Admin
                            </button>
                          </div>

                          {roleActionLoadingId === profile.id && (
                            <div className="mt-2 text-xs text-slate-500">
                              Updating role...
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Extra governance card */}
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-purple-100 p-3">
                  <Shield className="h-5 w-5 text-purple-700" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Governance Summary
                  </h3>
                  <p className="text-sm text-slate-500">
                    High-level administrative platform control
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <span>Admins</span>
                  <span className="font-semibold text-slate-900">{stats.admins}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <span>Moderators</span>
                  <span className="font-semibold text-slate-900">{stats.moderators}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <span>Officials</span>
                  <span className="font-semibold text-slate-900">{stats.officials}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <span>Open escalations</span>
                  <span className="font-semibold text-slate-900">{stats.underReview}</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-blue-100 p-3">
                  <UserCog className="h-5 w-5 text-blue-700" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Admin Role in Civix250
                  </h3>
                  <p className="text-sm text-slate-500">
                    What this dashboard controls
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3 text-sm text-slate-600">
                <div className="rounded-xl bg-slate-50 px-4 py-3">
                  Review sensitive or escalated civic content.
                </div>
                <div className="rounded-xl bg-slate-50 px-4 py-3">
                  Assign and manage platform roles across users.
                </div>
                <div className="rounded-xl bg-slate-50 px-4 py-3">
                  Oversee platform integrity and governance operations.
                </div>
                <div className="rounded-xl bg-slate-50 px-4 py-3">
                  Make final decisions where moderator action is not enough.
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}