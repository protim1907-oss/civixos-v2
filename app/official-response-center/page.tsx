"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import { createClient } from "@/lib/supabase/client";

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  district: string | null;
  state?: string | null;
};

type IssueRow = {
  id: string;
  title: string | null;
  description: string | null;
  category: string | null;
  district: string | null;
  status: string | null;
  created_at: string | null;
  user_id: string | null;
};

type OfficialUpdateRow = {
  id: string;
  title: string;
  summary: string;
  district: string;
  category: string;
  priority: string;
  status: string;
  source_name: string | null;
  published_by_name: string | null;
  published_at: string | null;
  created_at: string | null;
};

type ResponseAction = "acknowledged" | "request_info" | "public_update";

function normalizeRole(role?: string | null) {
  return String(role || "").trim().toLowerCase();
}

function isVerifiedOfficial(role?: string | null) {
  const normalized = normalizeRole(role);
  return normalized === "official" || normalized === "admin" || normalized === "moderator";
}

function normalizeDistrict(value?: string | null) {
  const raw = String(value || "").trim().toUpperCase();
  if (!raw || raw === "UNKNOWN" || raw === "UNASSIGNED" || raw === "N/A") return "";
  if (raw === "CA42") return "CA-42";
  if (raw === "TX35") return "TX-35";

  const compactMatch = raw.match(/^([A-Z]{2})(\d{1,2})$/);
  if (compactMatch) return `${compactMatch[1]}-${Number(compactMatch[2])}`;

  const spacedMatch = raw.match(/^([A-Z]{2})[\s-]?(\d{1,2})$/);
  if (spacedMatch) return `${spacedMatch[1]}-${Number(spacedMatch[2])}`;

  return raw;
}

function districtMatchesScope(value: string | null | undefined, scope: string) {
  const district = normalizeDistrict(value);
  const normalizedScope = normalizeDistrict(scope);

  if (!normalizedScope || normalizedScope === "ALL") return true;
  if (district === normalizedScope) return true;
  if (!normalizedScope.includes("-")) return district.startsWith(`${normalizedScope}-`);
  return false;
}

function formatDate(value?: string | null) {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getStatusClasses(status?: string | null) {
  const normalized = String(status || "active").toLowerCase();

  if (normalized === "acknowledged") return "border-blue-200 bg-blue-50 text-blue-700";
  if (normalized === "needs_info") return "border-amber-200 bg-amber-50 text-amber-800";
  if (normalized === "under_review") return "border-yellow-200 bg-yellow-50 text-yellow-800";
  if (normalized === "removed") return "border-red-200 bg-red-50 text-red-700";
  if (normalized === "resolved" || normalized === "approved") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function getActionCopy(action: ResponseAction) {
  switch (action) {
    case "acknowledged":
      return {
        label: "Acknowledge issue",
        title: "Acknowledged",
        status: "acknowledged",
        priority: "Medium",
        prompt: "Confirm what your office has received and what will happen next.",
      };
    case "request_info":
      return {
        label: "Request more information",
        title: "More information requested",
        status: "needs_info",
        priority: "High",
        prompt: "Ask the resident or district community for the missing details you need.",
      };
    default:
      return {
        label: "Post public update",
        title: "Official update",
        status: null,
        priority: "Medium",
        prompt: "Share a public progress update, clarification, or next step.",
      };
  }
}

export default function OfficialResponseCenterPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [districtScope, setDistrictScope] = useState("ALL");
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [updates, setUpdates] = useState<OfficialUpdateRow[]>([]);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("open");
  const [responseAction, setResponseAction] = useState<ResponseAction>("acknowledged");
  const [responseText, setResponseText] = useState("");
  const [message, setMessage] = useState("");

  const loadWorkspace = useCallback(async () => {
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.replace("/login");
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, district, state")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Response center profile load error:", profileError.message);
    }

    const officialProfile = (profileData as ProfileRow | null) ?? null;
    const metadataRole =
      (user.user_metadata?.role as string | undefined) ||
      (user.user_metadata?.account_type as string | undefined) ||
      "";
    const role = officialProfile?.role || metadataRole;

    if (!isVerifiedOfficial(role)) {
      router.replace("/dashboard");
      return;
    }

    const metadataDistrict =
      (user.user_metadata?.district_id as string | undefined) ||
      (user.user_metadata?.district as string | undefined) ||
      (user.user_metadata?.district_name as string | undefined) ||
      "";
    const scope =
      normalizeRole(role) === "admin" || normalizeRole(role) === "moderator"
        ? "ALL"
        : normalizeDistrict(officialProfile?.district || metadataDistrict || "ALL");

    const [issuesResult, updatesResult] = await Promise.all([
      supabase
        .from("issues")
        .select("id, title, description, category, district, status, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(250),
      supabase
        .from("official_updates")
        .select(
          "id, title, summary, district, category, priority, status, source_name, published_by_name, published_at, created_at"
        )
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    if (issuesResult.error) {
      console.error("Response center issues load error:", issuesResult.error.message);
    }
    if (updatesResult.error) {
      console.error("Response center updates load error:", updatesResult.error.message);
    }

    const scopedIssues = ((issuesResult.data as IssueRow[]) || []).filter((issue) =>
      districtMatchesScope(issue.district, scope)
    );
    const scopedUpdates = ((updatesResult.data as OfficialUpdateRow[]) || []).filter((update) =>
      districtMatchesScope(update.district, scope)
    );

    setProfile(officialProfile);
    setDistrictScope(scope);
    setIssues(scopedIssues);
    setUpdates(scopedUpdates);
    setSelectedIssueId((current) => current || scopedIssues[0]?.id || null);
  }, [router, supabase]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        await loadWorkspace();
      } catch (error) {
        console.error("Response center load error:", error);
        if (mounted) setMessage("Unable to load the response center right now.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    const issuesChannel = supabase
      .channel("official-response-center-issues")
      .on("postgres_changes", { event: "*", schema: "public", table: "issues" }, () => {
        void loadWorkspace();
      })
      .subscribe();

    const updatesChannel = supabase
      .channel("official-response-center-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "official_updates" },
        () => {
          void loadWorkspace();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(issuesChannel);
      supabase.removeChannel(updatesChannel);
    };
  }, [loadWorkspace, supabase]);

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await loadWorkspace();
    } finally {
      setRefreshing(false);
    }
  }

  const selectedIssue = useMemo(() => {
    return issues.find((issue) => issue.id === selectedIssueId) || issues[0] || null;
  }, [issues, selectedIssueId]);

  const stats = useMemo(() => {
    const openStatuses = new Set(["active", "open", "under_review", "needs_info", "acknowledged"]);
    const openIssues = issues.filter((issue) =>
      openStatuses.has(String(issue.status || "active").toLowerCase())
    ).length;
    const acknowledged = issues.filter((issue) => issue.status === "acknowledged").length;
    const needsInfo = issues.filter((issue) => issue.status === "needs_info").length;
    const publicResponses = updates.filter((update) =>
      update.category?.toLowerCase().includes("public")
    ).length;

    return { openIssues, acknowledged, needsInfo, publicResponses };
  }, [issues, updates]);

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      const normalizedStatus = String(issue.status || "active").toLowerCase();
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        issue.title?.toLowerCase().includes(q) ||
        issue.description?.toLowerCase().includes(q) ||
        issue.category?.toLowerCase().includes(q) ||
        normalizeDistrict(issue.district).toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "open" && normalizedStatus !== "removed") ||
        normalizedStatus === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [issues, query, statusFilter]);

  const recentResponses = updates.slice(0, 6);
  const actionCopy = getActionCopy(responseAction);

  async function handlePublishResponse() {
    if (!selectedIssue || !profile) return;

    const response = responseText.trim();
    if (!response) {
      setMessage("Write a response before publishing.");
      return;
    }

    const district = normalizeDistrict(selectedIssue.district || districtScope);
    const title = `${actionCopy.title}: ${selectedIssue.title || "District issue"}`;

    try {
      setPublishing(true);
      setMessage("");

      if (actionCopy.status) {
        const { error: updateError } = await supabase
          .from("issues")
          .update({ status: actionCopy.status })
          .eq("id", selectedIssue.id);

        if (updateError) {
          console.error("Issue status update error:", updateError.message);
          setMessage(updateError.message || "Unable to update issue status.");
          return;
        }
      }

      const { error: insertError } = await supabase.from("official_updates").insert({
        title,
        summary: response,
        district,
        category: responseAction === "request_info" ? "Community" : "Public Notice",
        priority: actionCopy.priority,
        status: "Active",
        source_name: profile.full_name || profile.email || "Official Office",
        source_url: null,
        published_by: profile.id,
        published_by_name: profile.full_name || profile.email || "Official",
      });

      if (insertError) {
        console.error("Official response publish error:", insertError.message);
        setMessage(insertError.message || "Unable to publish response.");
        return;
      }

      setResponseText("");
      setMessage("Official response published.");
      await loadWorkspace();
    } finally {
      setPublishing(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <p className="text-2xl font-bold text-slate-950">Loading response center...</p>
          <p className="mt-2 text-slate-500">Preparing district issues and updates.</p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
      <Sidebar />

      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-slate-950 px-6 py-8 text-white md:px-10">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-200">
                    Official Response Center
                  </p>
                  <h1 className="mt-3 text-4xl font-extrabold tracking-tight md:text-5xl">
                    Respond publicly to district issues
                  </h1>
                  <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
                    Acknowledge issues, post verified updates, and request more information for{" "}
                    {districtScope === "ALL" ? "all tracked districts" : districtScope}.
                  </p>
                </div>

                <button
                  onClick={handleRefresh}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-4">
              {[
                { label: "Open Issues", value: stats.openIssues, icon: FileText },
                { label: "Acknowledged", value: stats.acknowledged, icon: CheckCircle2 },
                { label: "Needs Info", value: stats.needsInfo, icon: AlertTriangle },
                { label: "Public Updates", value: stats.publicResponses, icon: MessageCircle },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-2xl bg-slate-50 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-slate-500">{item.label}</p>
                      <Icon className="h-5 w-5 text-slate-500" />
                    </div>
                    <p className="mt-3 text-3xl font-bold text-slate-950">{item.value}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {message && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm font-semibold text-blue-800">
              {message}
            </div>
          )}

          <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-950">District Issue Queue</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Select an issue to draft a public response.
                    </p>
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none"
                  >
                    <option value="open">Open</option>
                    <option value="under_review">Under review</option>
                    <option value="acknowledged">Acknowledged</option>
                    <option value="needs_info">Needs info</option>
                    <option value="all">All</option>
                  </select>
                </div>

                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <Search className="h-5 w-5 text-slate-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search issue, category, district"
                    className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="max-h-[720px] space-y-3 overflow-y-auto p-5">
                {filteredIssues.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 px-5 py-10 text-center">
                    <FileText className="mx-auto h-8 w-8 text-slate-400" />
                    <p className="mt-3 font-semibold text-slate-800">No matching issues</p>
                    <p className="mt-1 text-sm text-slate-500">
                      New district issues will appear here when residents submit them.
                    </p>
                  </div>
                ) : (
                  filteredIssues.map((issue) => {
                    const active = selectedIssue?.id === issue.id;
                    return (
                      <button
                        key={issue.id}
                        type="button"
                        onClick={() => setSelectedIssueId(issue.id)}
                        className={`w-full rounded-2xl border p-4 text-left transition ${
                          active
                            ? "border-blue-400 bg-blue-50 shadow-sm"
                            : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                              issue.status
                            )}`}
                          >
                            {String(issue.status || "active").replaceAll("_", " ")}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                            {normalizeDistrict(issue.district)}
                          </span>
                        </div>
                        <p className="mt-3 line-clamp-2 font-semibold text-slate-950">
                          {issue.title || "Untitled issue"}
                        </p>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                          {issue.description || "No description provided."}
                        </p>
                        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                          <Clock3 className="h-3.5 w-3.5" />
                          {formatDate(issue.created_at)}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-slate-950">Public Response Composer</h2>

                {selectedIssue ? (
                  <>
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                          {normalizeDistrict(selectedIssue.district)}
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                          {selectedIssue.category || "General"}
                        </span>
                      </div>
                      <h3 className="mt-3 text-lg font-bold text-slate-950">
                        {selectedIssue.title || "Untitled issue"}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {selectedIssue.description || "No description provided."}
                      </p>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      {(["acknowledged", "request_info", "public_update"] as ResponseAction[]).map(
                        (action) => {
                          const copy = getActionCopy(action);
                          const active = responseAction === action;
                          return (
                            <button
                              key={action}
                              type="button"
                              onClick={() => setResponseAction(action)}
                              className={`rounded-2xl border-2 px-4 py-3 text-left text-sm font-semibold transition ${
                                active
                                  ? "border-slate-950 bg-slate-950 text-white"
                                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              {copy.label}
                            </button>
                          );
                        }
                      )}
                    </div>

                    <label className="mt-5 block">
                      <span className="text-sm font-semibold text-slate-700">
                        {actionCopy.prompt}
                      </span>
                      <textarea
                        value={responseText}
                        onChange={(event) => setResponseText(event.target.value)}
                        rows={8}
                        placeholder="Write a clear public response residents can read..."
                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={handlePublishResponse}
                      disabled={publishing}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      {publishing ? "Publishing..." : "Publish official response"}
                    </button>
                  </>
                ) : (
                  <div className="mt-4 rounded-2xl bg-slate-50 px-5 py-12 text-center">
                    <MessageCircle className="mx-auto h-8 w-8 text-slate-400" />
                    <p className="mt-3 font-semibold text-slate-800">Select an issue</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Choose a district issue from the queue to publish a response.
                    </p>
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-slate-950">Recent Public Responses</h2>
                <div className="mt-4 space-y-3">
                  {recentResponses.length === 0 ? (
                    <p className="rounded-2xl bg-slate-50 px-5 py-6 text-sm text-slate-500">
                      Published official responses will appear here and on Official Updates.
                    </p>
                  ) : (
                    recentResponses.map((update) => (
                      <div
                        key={update.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                            {update.district}
                          </span>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                            {update.category}
                          </span>
                        </div>
                        <p className="mt-3 font-semibold text-slate-950">{update.title}</p>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                          {update.summary}
                        </p>
                        <p className="mt-2 text-xs text-slate-400">
                          {update.published_by_name || update.source_name || "Official"} •{" "}
                          {formatDate(update.published_at || update.created_at)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
