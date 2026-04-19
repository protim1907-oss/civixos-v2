"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Sidebar from "@/components/layout/Sidebar";
import {
  Search,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Trash2,
  RefreshCw,
  FileText,
  Filter,
  LogOut,
  Loader2,
  History,
  UserCircle2,
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

type AuditLogDetails = {
  actor_name?: string;
  target_title?: string;
  district?: string;
  previous_status?: string | null;
  new_status?: string | null;
  notes?: string;
};

type AuditLogRow = {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  entity_type: string | null;
  entity_id: string | null;
  event_type: string | null;
  details: AuditLogDetails | null;
  created_at: string | null;
};

type FilterType =
  | "all"
  | "active"
  | "under_review"
  | "removed"
  | "approved";

export default function ModeratorDashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.push("/login");
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, email, role, district")
          .eq("id", user.id)
          .single();

        if (profileError) {
          console.error("Failed to load moderator profile:", profileError.message);
        }

        if (mounted) {
          setProfile((profileData as ProfileRow) ?? null);
        }

        await Promise.all([fetchIssues(), fetchAuditLogs()]);

        if (mounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error("Moderator init failed:", error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    init();

    const issuesChannel = supabase
      .channel("moderator-live-issues")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "issues" },
        async () => {
          await fetchIssues();
        }
      )
      .subscribe();

    const auditChannel = supabase
      .channel("moderator-live-audit-logs")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "audit_logs" },
        async () => {
          await fetchAuditLogs();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(issuesChannel);
      supabase.removeChannel(auditChannel);
    };
  }, [router, supabase]);

  async function fetchIssues() {
    const { data, error } = await supabase
      .from("issues")
      .select(
        "id, title, description, category, district, status, created_at, user_id"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch issues:", error.message);
      return;
    }

    setIssues((data as Issue[]) ?? []);
  }

  async function fetchAuditLogs() {
    const { data, error } = await supabase
      .from("audit_logs")
      .select(
        "id, actor_id, actor_role, entity_type, entity_id, event_type, details, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Failed to fetch audit logs:", error.message);
      return;
    }

    setAuditLogs((data as AuditLogRow[]) ?? []);
  }

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await Promise.all([fetchIssues(), fetchAuditLogs()]);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  async function insertAuditLog(
    issue: Issue,
    nextStatus: string,
    actorProfile: ProfileRow | null
  ) {
    const eventType =
      nextStatus === "approved"
        ? "approved"
        : nextStatus === "removed"
        ? "removed"
        : nextStatus === "under_review"
        ? "escalated"
        : "updated";

    const actorRole =
      actorProfile?.role === "admin" || actorProfile?.role === "moderator"
        ? actorProfile.role
        : "moderator";

    const details: AuditLogDetails = {
      actor_name:
        actorProfile?.full_name?.trim() ||
        actorProfile?.email?.trim() ||
        "Moderator",
      target_title: issue.title,
      district: issue.district || undefined,
      previous_status: issue.status,
      new_status: nextStatus,
      notes:
        nextStatus === "approved"
          ? "Approved via moderator console"
          : nextStatus === "removed"
          ? "Removed via moderator console"
          : nextStatus === "under_review"
          ? "Escalated for further review via moderator console"
          : "Status updated via moderator console",
    };

    const { error } = await supabase.from("audit_logs").insert({
      actor_id: actorProfile?.id || null,
      actor_role: actorRole,
      entity_type: "issue",
      entity_id: issue.id,
      event_type: eventType,
      details,
    });

    if (error) {
      console.error("Failed to insert audit log:", error);
      alert(`Audit log insert failed: ${error.message}`);
    }
  }

  async function updateIssueStatus(issueId: string, nextStatus: string) {
    try {
      setActionLoadingId(issueId);

      const issue = issues.find((item) => item.id === issueId);
      if (!issue) return;

      const { error } = await supabase
        .from("issues")
        .update({ status: nextStatus })
        .eq("id", issueId);

      if (error) {
        console.error("Failed to update issue status:", error.message);
        return;
      }

      await insertAuditLog(issue, nextStatus, profile);
      await Promise.all([fetchIssues(), fetchAuditLogs()]);
    } catch (err) {
      console.error("Unexpected moderation error:", err);
    } finally {
      setActionLoadingId(null);
    }
  }

  const filteredIssues = useMemo(() => {
    let list = [...issues];

    if (activeFilter === "active") {
      list = list.filter(
        (issue) =>
          !issue.status ||
          issue.status === "active" ||
          issue.status === "open"
      );
    }

    if (activeFilter === "under_review") {
      list = list.filter((issue) => issue.status === "under_review");
    }

    if (activeFilter === "removed") {
      list = list.filter((issue) => issue.status === "removed");
    }

    if (activeFilter === "approved") {
      list = list.filter((issue) => issue.status === "approved");
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
  }, [issues, search, activeFilter]);

  const stats = useMemo(() => {
    const total = issues.length;
    const active = issues.filter(
      (i) => !i.status || i.status === "active" || i.status === "open"
    ).length;
    const underReview = issues.filter((i) => i.status === "under_review").length;
    const removed = issues.filter((i) => i.status === "removed").length;
    const approved = issues.filter((i) => i.status === "approved").length;

    return { total, active, underReview, removed, approved };
  }, [issues]);

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

  function getAuditActionClasses(action: string | null) {
    switch (action) {
      case "approved":
        return "bg-green-100 text-green-700";
      case "removed":
        return "bg-red-100 text-red-700";
      case "escalated":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8">
          <div className="animate-pulse space-y-6">
            <div className="h-10 w-72 rounded-xl bg-slate-200" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="h-28 rounded-2xl bg-slate-200" />
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
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-500">
                  Moderator Console
                </p>
                <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
                  Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}
                </h1>
                <p className="mt-3 max-w-3xl text-base text-slate-600">
                  Review citizen posts, manage moderation status, and keep the
                  platform healthy.
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

          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Posts</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {stats.total}
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
                  <p className="text-sm text-slate-500">Active</p>
                  <p className="mt-2 text-3xl font-bold text-blue-700">
                    {stats.active}
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
                  <p className="text-sm text-slate-500">Under Review</p>
                  <p className="mt-2 text-3xl font-bold text-yellow-700">
                    {stats.underReview}
                  </p>
                </div>
                <div className="rounded-2xl bg-yellow-100 p-3">
                  <Clock3 className="h-5 w-5 text-yellow-700" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Approved</p>
                  <p className="mt-2 text-3xl font-bold text-green-700">
                    {stats.approved}
                  </p>
                </div>
                <div className="rounded-2xl bg-green-100 p-3">
                  <CheckCircle2 className="h-5 w-5 text-green-700" />
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
          </section>

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
                  { key: "active", label: "Active" },
                  { key: "under_review", label: "Under Review" },
                  { key: "approved", label: "Approved" },
                  { key: "removed", label: "Removed" },
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

          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-xl font-semibold text-slate-900">
                Moderation Queue
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Review, approve, remove, or escalate posts.
              </p>
            </div>

            <div className="p-6">
              {filteredIssues.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
                  <AlertTriangle className="mx-auto h-8 w-8 text-slate-400" />
                  <h3 className="mt-4 text-lg font-semibold text-slate-800">
                    No posts found
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Try adjusting your search or filter selection.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredIssues.map((issue) => (
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
                            disabled={actionLoadingId === issue.id}
                            className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
                          >
                            {actionLoadingId === issue.id
                              ? "Updating..."
                              : "Approve"}
                          </button>

                          <button
                            onClick={() =>
                              updateIssueStatus(issue.id, "under_review")
                            }
                            disabled={actionLoadingId === issue.id}
                            className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600 disabled:opacity-60"
                          >
                            {actionLoadingId === issue.id
                              ? "Updating..."
                              : "Escalate"}
                          </button>

                          <button
                            onClick={() => updateIssueStatus(issue.id, "removed")}
                            disabled={actionLoadingId === issue.id}
                            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                          >
                            {actionLoadingId === issue.id
                              ? "Updating..."
                              : "Remove"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <History className="h-5 w-5 text-slate-700" />
                <h2 className="text-xl font-semibold text-slate-900">
                  Audit Trail
                </h2>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Recent moderation actions for transparency and accountability.
              </p>
            </div>

            <div className="p-6">
              {auditLogs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
                  <History className="mx-auto h-8 w-8 text-slate-400" />
                  <h3 className="mt-4 text-lg font-semibold text-slate-800">
                    No audit activity yet
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Moderator actions will appear here automatically.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${getAuditActionClasses(
                                log.event_type
                              )}`}
                            >
                              {log.event_type || "updated"}
                            </span>

                            {log.entity_type && (
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                                {log.entity_type}
                              </span>
                            )}

                            {log.details?.district && (
                              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                                {log.details.district}
                              </span>
                            )}
                          </div>

                          <div className="text-sm text-slate-900">
                            <span className="font-semibold">
                              {log.details?.target_title || "Untitled issue"}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                            <UserCircle2 className="h-4 w-4 text-slate-400" />
                            <span>{log.details?.actor_name || "System"}</span>
                          </div>

                          {log.details?.notes ? (
                            <p className="text-sm text-slate-500">
                              {log.details.notes}
                            </p>
                          ) : null}

                          {log.details?.previous_status || log.details?.new_status ? (
                            <p className="text-xs text-slate-400">
                              {log.details?.previous_status || "unknown"} →{" "}
                              {log.details?.new_status || "unknown"}
                            </p>
                          ) : null}
                        </div>

                        <div className="text-xs text-slate-500">
                          {formatDate(log.created_at)}
                        </div>
                      </div>
                    </div>
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