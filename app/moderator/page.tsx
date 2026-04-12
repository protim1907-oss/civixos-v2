"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Sidebar from "@/components/layout/Sidebar";
import {
  ShieldCheck,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock3,
  UserCheck,
  FileWarning,
  Activity,
  Eye,
  MessageSquare,
  Flag,
  Brain,
  Layers3,
} from "lucide-react";

type UserRole = "citizen" | "official" | "moderator" | "admin";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  district: string | null;
  avatar_url: string | null;
  is_suspended: boolean;
};

type Post = {
  id: string;
  discussion_id: string;
  parent_post_id: string | null;
  author_id: string | null;
  content: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type ModerationQueueRow = {
  id: string;
  post_id: string;
  flagged_reason: string | null;
  ai_recommended_action: string | null;
  reviewed_by: string | null;
  reviewer_decision: "approve" | "remove" | "escalate" | null;
  reviewed_at: string | null;
};

type ModerationAction = {
  id: string;
  flag_id: string | null;
  post_id: string;
  moderator_id: string | null;
  policy_id: string | null;
  action: string;
  notes: string | null;
  created_at: string;
};

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

type IssueAIModeration = {
  id: string;
  issue_id: string;
  toxicity_score: number | null;
  spam_score: number | null;
  misinformation_score: number | null;
  recommended_action: string | null;
  created_at: string;
  updated_at: string;
};

type UnifiedItem = {
  id: string;
  kind: "post" | "issue";
  title: string;
  body: string;
  createdAt: string | null;
  status: string;
  district: string | null;
  ownerId: string | null;
  ownerName: string;
  riskScore: number;
  severity: "Low" | "Medium" | "High";
  recommendedAction: string;
  queueId?: string;
  queueDecision?: string | null;
  queueReviewedBy?: string | null;
  queueReviewedAt?: string | null;
  flaggedReason?: string | null;
  aiBreakdown?: {
    toxicity?: number;
    spam?: number;
    misinformation?: number;
  };
};

function pct(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return 0;
  const numeric = Number(value);
  if (numeric <= 1) return Math.round(numeric * 100);
  return Math.round(numeric);
}

function clampRisk(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getSeverity(score: number): "Low" | "Medium" | "High" {
  if (score >= 80) return "High";
  if (score >= 50) return "Medium";
  return "Low";
}

function severityClasses(severity: "Low" | "Medium" | "High") {
  if (severity === "High") return "bg-red-100 text-red-700 border-red-200";
  if (severity === "Medium") return "bg-yellow-100 text-yellow-700 border-yellow-200";
  return "bg-green-100 text-green-700 border-green-200";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "—";
  }
}

function getPostRiskScore(queueRow: ModerationQueueRow) {
  let base = 35;

  const reason = (queueRow.flagged_reason || "").toLowerCase();
  const action = (queueRow.ai_recommended_action || "").toLowerCase();

  if (reason.includes("spam")) base += 18;
  if (reason.includes("abuse")) base += 25;
  if (reason.includes("harass")) base += 25;
  if (reason.includes("hate")) base += 30;
  if (reason.includes("misinformation")) base += 22;
  if (reason.includes("violence")) base += 35;

  if (action.includes("remove")) base += 20;
  if (action.includes("escalate")) base += 15;
  if (action.includes("review")) base += 10;

  if (queueRow.reviewer_decision === "escalate") base += 20;

  return clampRisk(base);
}

function getIssueRiskScore(ai: IssueAIModeration | undefined) {
  if (!ai) return 0;
  const toxicity = pct(ai.toxicity_score);
  const spam = pct(ai.spam_score);
  const misinformation = pct(ai.misinformation_score);
  return clampRisk(Math.max(toxicity, spam, misinformation));
}

export default function ModeratorDashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profilesMap, setProfilesMap] = useState<Record<string, Profile>>({});

  const [posts, setPosts] = useState<Post[]>([]);
  const [moderationQueue, setModerationQueue] = useState<ModerationQueueRow[]>([]);
  const [moderationActions, setModerationActions] = useState<ModerationAction[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [issueAI, setIssueAI] = useState<IssueAIModeration[]>([]);

  const [tab, setTab] = useState<"queue" | "posts" | "issues" | "activity">("queue");
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<"All" | "High" | "Medium" | "Low">("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedKind, setSelectedKind] = useState<"post" | "issue" | null>(null);

  const [bulkSelected, setBulkSelected] = useState<string[]>([]);
  const [actionNotes, setActionNotes] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);

  async function loadData(mode: "initial" | "refresh" = "initial") {
    if (mode === "initial") setLoading(true);
    if (mode === "refresh") setRefreshing(true);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      router.push("/login");
      return;
    }

    const { data: myProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, district, avatar_url, is_suspended")
      .eq("id", session.user.id)
      .single();

    if (profileError || !myProfile) {
      router.push("/login");
      return;
    }

    const typedProfile = myProfile as Profile;
    const allowedRoles = ["moderator", "admin"];

    if (!allowedRoles.includes(typedProfile.role)) {
      router.push("/dashboard");
      return;
    }

    setProfile(typedProfile);

    const [
      profilesRes,
      postsRes,
      queueRes,
      actionsRes,
      issuesRes,
      issueAiRes,
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, role, district, avatar_url, is_suspended"),
      supabase
        .from("posts")
        .select("id, discussion_id, parent_post_id, author_id, content, status, created_at, updated_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("moderation_queue")
        .select("id, post_id, flagged_reason, ai_recommended_action, reviewed_by, reviewer_decision, reviewed_at"),
      supabase
        .from("moderation_actions")
        .select("id, flag_id, post_id, moderator_id, policy_id, action, notes, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("issues")
        .select("id, title, description, status, category, district, created_at, user_id")
        .order("created_at", { ascending: false }),
      supabase
        .from("issue_ai_moderation")
        .select("id, issue_id, toxicity_score, spam_score, misinformation_score, recommended_action, created_at, updated_at"),
    ]);

    const profileRows = (profilesRes.data || []) as Profile[];
    const profileMap: Record<string, Profile> = {};
    for (const item of profileRows) profileMap[item.id] = item;

    setProfilesMap(profileMap);
    setPosts((postsRes.data || []) as Post[]);
    setModerationQueue((queueRes.data || []) as ModerationQueueRow[]);
    setModerationActions((actionsRes.data || []) as ModerationAction[]);
    setIssues((issuesRes.data || []) as Issue[]);
    setIssueAI((issueAiRes.data || []) as IssueAIModeration[]);

    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const queueMap = useMemo(() => {
    const map = new Map<string, ModerationQueueRow>();
    for (const row of moderationQueue) {
      map.set(row.post_id, row);
    }
    return map;
  }, [moderationQueue]);

  const issueAiMap = useMemo(() => {
    const map = new Map<string, IssueAIModeration>();
    for (const row of issueAI) {
      map.set(row.issue_id, row);
    }
    return map;
  }, [issueAI]);

  const unifiedItems = useMemo<UnifiedItem[]>(() => {
    const postItems: UnifiedItem[] = posts.map((post) => {
      const queueRow = queueMap.get(post.id);
      const riskScore = queueRow ? getPostRiskScore(queueRow) : 10;
      const severity = getSeverity(riskScore);
      const author = post.author_id ? profilesMap[post.author_id] : undefined;

      return {
        id: post.id,
        kind: "post",
        title: post.parent_post_id ? "Reply Post" : "Discussion Post",
        body: post.content,
        createdAt: post.created_at,
        status: post.status || (queueRow?.reviewer_decision ? queueRow.reviewer_decision : "active"),
        district: author?.district || null,
        ownerId: post.author_id,
        ownerName: author?.full_name || author?.email || "Unknown author",
        riskScore,
        severity,
        recommendedAction: queueRow?.ai_recommended_action || "Review",
        queueId: queueRow?.id,
        queueDecision: queueRow?.reviewer_decision || null,
        queueReviewedBy: queueRow?.reviewed_by || null,
        queueReviewedAt: queueRow?.reviewed_at || null,
        flaggedReason: queueRow?.flagged_reason || null,
      };
    });

    const issueItems: UnifiedItem[] = issues.map((issue) => {
      const ai = issueAiMap.get(issue.id);
      const riskScore = getIssueRiskScore(ai);
      const severity = getSeverity(riskScore);
      const owner = profilesMap[issue.user_id];

      return {
        id: issue.id,
        kind: "issue",
        title: issue.title,
        body: issue.description,
        createdAt: issue.created_at,
        status: issue.status || "submitted",
        district: issue.district || owner?.district || null,
        ownerId: issue.user_id,
        ownerName: owner?.full_name || owner?.email || "Unknown user",
        riskScore,
        severity,
        recommendedAction: ai?.recommended_action || "Approve",
        aiBreakdown: {
          toxicity: pct(ai?.toxicity_score),
          spam: pct(ai?.spam_score),
          misinformation: pct(ai?.misinformation_score),
        },
      };
    });

    return [...postItems, ...issueItems].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [posts, issues, queueMap, issueAiMap, profilesMap]);

  const queueItems = useMemo(() => {
    return unifiedItems.filter((item) => {
      if (item.kind === "post") {
        return !item.queueDecision;
      }
      if (item.kind === "issue") {
        return item.riskScore >= 50;
      }
      return false;
    });
  }, [unifiedItems]);

  const filteredQueueItems = useMemo(() => {
    return queueItems.filter((item) => {
      const blob = [
        item.title,
        item.body,
        item.ownerName,
        item.district,
        item.flaggedReason,
        item.recommendedAction,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = blob.includes(search.toLowerCase());
      const matchesSeverity = severityFilter === "All" || item.severity === severityFilter;
      const normalizedStatus = (item.queueDecision || item.status || "").toLowerCase();
      const matchesStatus =
        statusFilter === "All" || normalizedStatus === statusFilter.toLowerCase();

      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [queueItems, search, severityFilter, statusFilter]);

  const filteredPosts = useMemo(() => {
    return unifiedItems.filter((item) => {
      if (item.kind !== "post") return false;
      const blob = [item.title, item.body, item.ownerName, item.flaggedReason, item.district]
        .join(" ")
        .toLowerCase();
      return (
        blob.includes(search.toLowerCase()) &&
        (severityFilter === "All" || item.severity === severityFilter)
      );
    });
  }, [unifiedItems, search, severityFilter]);

  const filteredIssues = useMemo(() => {
    return unifiedItems.filter((item) => {
      if (item.kind !== "issue") return false;
      const blob = [item.title, item.body, item.ownerName, item.district]
        .join(" ")
        .toLowerCase();
      return (
        blob.includes(search.toLowerCase()) &&
        (severityFilter === "All" || item.severity === severityFilter)
      );
    });
  }, [unifiedItems, search, severityFilter]);

  const stats = useMemo(() => {
    const pendingPosts = moderationQueue.filter((row) => !row.reviewer_decision).length;
    const escalatedPosts = moderationQueue.filter((row) => row.reviewer_decision === "escalate").length;
    const highRiskIssues = unifiedItems.filter((item) => item.kind === "issue" && item.riskScore >= 80).length;
    const totalReviewed = moderationQueue.filter((row) => !!row.reviewer_decision).length;

    return {
      pendingPosts,
      escalatedPosts,
      highRiskIssues,
      totalReviewed,
    };
  }, [moderationQueue, unifiedItems]);

  const selectedItem = useMemo(() => {
    if (!selectedId || !selectedKind) return null;
    return unifiedItems.find((item) => item.id === selectedId && item.kind === selectedKind) || null;
  }, [selectedId, selectedKind, unifiedItems]);

  const recentActionsForSelectedPost = useMemo(() => {
    if (!selectedItem || selectedItem.kind !== "post") return [];
    return moderationActions.filter((row) => row.post_id === selectedItem.id).slice(0, 10);
  }, [selectedItem, moderationActions]);

  function toggleBulkSelection(item: UnifiedItem) {
    const key = `${item.kind}:${item.id}`;
    setBulkSelected((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
    );
  }

  function isBulkSelected(item: UnifiedItem) {
    return bulkSelected.includes(`${item.kind}:${item.id}`);
  }

  async function handlePostModeration(
    postId: string,
    action: "approve" | "remove" | "escalate",
    notes?: string
  ) {
    if (!profile) return;
    setSavingId(postId);

    const queueRow = moderationQueue.find((row) => row.post_id === postId);

    if (queueRow) {
      await supabase
        .from("moderation_queue")
        .update({
          reviewer_decision: action,
          reviewed_by: profile.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("post_id", postId);
    }

    await supabase.from("moderation_actions").insert({
      post_id: postId,
      moderator_id: profile.id,
      action,
      notes: notes || null,
    });

    await supabase
      .from("posts")
      .update({
        status: action === "remove" ? "removed" : "active",
      })
      .eq("id", postId);

    setActionNotes("");
    await loadData("refresh");
    setSavingId(null);
  }

  async function handleIssueDecision(
    issueId: string,
    action: "approve" | "remove" | "escalate"
  ) {
    setSavingId(issueId);

    let nextStatus = "active";
    if (action === "remove") nextStatus = "removed";
    if (action === "escalate") nextStatus = "under_review";

    await supabase
      .from("issues")
      .update({
        status: nextStatus,
      })
      .eq("id", issueId);

    setActionNotes("");
    await loadData("refresh");
    setSavingId(null);
  }

  async function handleBulkAction(action: "approve" | "remove" | "escalate") {
    if (!profile || bulkSelected.length === 0) return;
    setBulkSaving(true);

    for (const key of bulkSelected) {
      const [kind, id] = key.split(":") as ["post" | "issue", string];
      if (kind === "post") {
        const queueRow = moderationQueue.find((row) => row.post_id === id);

        if (queueRow) {
          await supabase
            .from("moderation_queue")
            .update({
              reviewer_decision: action,
              reviewed_by: profile.id,
              reviewed_at: new Date().toISOString(),
            })
            .eq("post_id", id);
        }

        await supabase.from("moderation_actions").insert({
          post_id: id,
          moderator_id: profile.id,
          action,
          notes: actionNotes || null,
        });

        await supabase
          .from("posts")
          .update({
            status: action === "remove" ? "removed" : "active",
          })
          .eq("id", id);
      } else {
        let nextStatus = "active";
        if (action === "remove") nextStatus = "removed";
        if (action === "escalate") nextStatus = "under_review";

        await supabase
          .from("issues")
          .update({
            status: nextStatus,
          })
          .eq("id", id);
      }
    }

    setBulkSelected([]);
    setActionNotes("");
    await loadData("refresh");
    setBulkSaving(false);
  }

  async function assignToMe(item: UnifiedItem) {
    if (!profile || item.kind !== "post") return;
    await supabase
      .from("moderation_queue")
      .update({
        reviewed_by: profile.id,
      })
      .eq("post_id", item.id);

    await loadData("refresh");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto flex max-w-7xl">
          <Sidebar />
          <main className="flex-1 p-6 md:p-8">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 text-slate-700">
                <RefreshCw className="h-5 w-5 animate-spin" />
                Loading moderator operations console...
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const tabItems = tab === "queue"
    ? filteredQueueItems
    : tab === "posts"
    ? filteredPosts
    : tab === "issues"
    ? filteredIssues
    : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-7xl">
        <Sidebar />

        <main className="flex-1 p-4 md:p-8">
          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                <ShieldCheck className="h-4 w-4" />
                Enterprise Moderation Console
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                Moderator Dashboard
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Unified oversight for discussion posts, civic issues, AI risk signals, and moderator actions.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
                <p className="text-xs text-slate-500">Signed in as</p>
                <p className="text-sm font-semibold text-slate-900">
                  {profile?.full_name || profile?.email || "Moderator"}
                </p>
              </div>

              <button
                onClick={() => loadData("refresh")}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>

          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-amber-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Pending Posts</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{stats.pendingPosts}</p>
                </div>
                <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                  <Clock3 className="h-6 w-6" />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-red-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">High Risk Issues</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{stats.highRiskIssues}</p>
                </div>
                <div className="rounded-2xl bg-red-100 p-3 text-red-700">
                  <FileWarning className="h-6 w-6" />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-yellow-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Escalated Posts</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{stats.escalatedPosts}</p>
                </div>
                <div className="rounded-2xl bg-yellow-100 p-3 text-yellow-700">
                  <AlertTriangle className="h-6 w-6" />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-green-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Reviewed Queue Items</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{stats.totalReviewed}</p>
                </div>
                <div className="rounded-2xl bg-green-100 p-3 text-green-700">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
              </div>
            </div>
          </section>

          <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
              <div className="relative lg:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search content, owner, district, reason, or recommendation"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:bg-white"
                />
              </div>

              <div className="relative">
                <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={severityFilter}
                  onChange={(e) =>
                    setSeverityFilter(e.target.value as "All" | "High" | "Medium" | "Low")
                  }
                  className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:bg-white"
                >
                  <option value="All">All Severity</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:bg-white"
                >
                  <option value="All">All Status</option>
                  <option value="active">Active</option>
                  <option value="removed">Removed</option>
                  <option value="approve">Approve</option>
                  <option value="remove">Remove</option>
                  <option value="escalate">Escalate</option>
                  <option value="under_review">Under Review</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTab("queue")}
                  className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                    tab === "queue" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  Queue
                </button>
                <button
                  onClick={() => setTab("posts")}
                  className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                    tab === "posts" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  Posts
                </button>
                <button
                  onClick={() => setTab("issues")}
                  className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                    tab === "issues" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  Issues
                </button>
                <button
                  onClick={() => setTab("activity")}
                  className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                    tab === "activity" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  Activity
                </button>
              </div>
            </div>
          </section>

          {(tab === "queue" || tab === "posts" || tab === "issues") && (
            <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Bulk moderation actions</h2>
                  <p className="text-sm text-slate-500">
                    {bulkSelected.length} selected
                  </p>
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <input
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    placeholder="Optional moderation note"
                    className="min-w-[240px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:bg-white"
                  />
                  <button
                    onClick={() => handleBulkAction("approve")}
                    disabled={bulkSelected.length === 0 || bulkSaving}
                    className="rounded-2xl bg-green-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Bulk Approve
                  </button>
                  <button
                    onClick={() => handleBulkAction("escalate")}
                    disabled={bulkSelected.length === 0 || bulkSaving}
                    className="rounded-2xl bg-yellow-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Bulk Escalate
                  </button>
                  <button
                    onClick={() => handleBulkAction("remove")}
                    disabled={bulkSelected.length === 0 || bulkSaving}
                    className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Bulk Remove
                  </button>
                </div>
              </div>
            </section>
          )}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <section className="xl:col-span-2 rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {tab === "queue"
                      ? "Unified moderation queue"
                      : tab === "posts"
                      ? "Post moderation view"
                      : tab === "issues"
                      ? "Issue risk monitoring"
                      : "Recent moderation activity"}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {tab === "activity"
                      ? `${moderationActions.length} action records`
                      : `${tabItems.length} items shown`}
                  </p>
                </div>
              </div>

              {tab === "activity" ? (
                <div className="divide-y divide-slate-100">
                  {moderationActions.length === 0 ? (
                    <div className="p-8 text-sm text-slate-500">No moderation actions yet.</div>
                  ) : (
                    moderationActions.map((row) => {
                      const moderator = row.moderator_id ? profilesMap[row.moderator_id] : undefined;
                      return (
                        <div key={row.id} className="p-5">
                          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="font-semibold capitalize text-slate-900">
                                {row.action}
                              </p>
                              <p className="text-sm text-slate-600">
                                Moderator: {moderator?.full_name || moderator?.email || "Unknown"}
                              </p>
                              <p className="text-sm text-slate-500">
                                Post ID: {row.post_id}
                              </p>
                            </div>
                            <p className="text-sm text-slate-500">{formatDate(row.created_at)}</p>
                          </div>
                          {row.notes && (
                            <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                              {row.notes}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {tabItems.length === 0 ? (
                    <div className="p-8 text-sm text-slate-500">No items match the current filters.</div>
                  ) : (
                    tabItems.map((item) => {
                      const assignedModerator = item.queueReviewedBy
                        ? profilesMap[item.queueReviewedBy]
                        : undefined;

                      return (
                        <div
                          key={`${item.kind}:${item.id}`}
                          className="p-5 transition hover:bg-slate-50"
                        >
                          <div className="flex gap-4">
                            <div className="pt-1">
                              <input
                                type="checkbox"
                                checked={isBulkSelected(item)}
                                onChange={() => toggleBulkSelection(item)}
                                className="h-4 w-4 rounded border-slate-300"
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                  {item.kind === "post" ? "Post" : "Issue"}
                                </span>

                                <span
                                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${severityClasses(
                                    item.severity
                                  )}`}
                                >
                                  {item.severity} Risk
                                </span>

                                <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                                  {item.riskScore} Score
                                </span>

                                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-700">
                                  {item.status}
                                </span>
                              </div>

                              <button
                                onClick={() => {
                                  setSelectedId(item.id);
                                  setSelectedKind(item.kind);
                                }}
                                className="text-left"
                              >
                                <p className="font-semibold text-slate-900 hover:text-indigo-700">
                                  {item.title}
                                </p>
                                <p className="mt-1 line-clamp-3 text-sm text-slate-600">
                                  {item.body}
                                </p>
                              </button>

                              <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-500 md:grid-cols-2">
                                <p>Owner: {item.ownerName}</p>
                                <p>District: {item.district || "—"}</p>
                                <p>Created: {formatDate(item.createdAt)}</p>
                                <p>Recommended: {item.recommendedAction}</p>
                              </div>

                              {item.flaggedReason && (
                                <div className="mt-3 rounded-2xl bg-red-50 p-3 text-sm text-red-700">
                                  <span className="font-semibold">Flagged reason:</span> {item.flaggedReason}
                                </div>
                              )}

                              {item.kind === "post" && (
                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                  <button
                                    onClick={() => handlePostModeration(item.id, "approve", actionNotes)}
                                    disabled={savingId === item.id}
                                    className="rounded-xl bg-green-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handlePostModeration(item.id, "escalate", actionNotes)}
                                    disabled={savingId === item.id}
                                    className="rounded-xl bg-yellow-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                                  >
                                    Escalate
                                  </button>
                                  <button
                                    onClick={() => handlePostModeration(item.id, "remove", actionNotes)}
                                    disabled={savingId === item.id}
                                    className="rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                                  >
                                    Remove
                                  </button>
                                  <button
                                    onClick={() => assignToMe(item)}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                                  >
                                    <UserCheck className="h-3.5 w-3.5" />
                                    Assign to me
                                  </button>
                                  {assignedModerator && (
                                    <span className="text-xs text-slate-500">
                                      Assigned/Reviewed by {assignedModerator.full_name || assignedModerator.email}
                                    </span>
                                  )}
                                </div>
                              )}

                              {item.kind === "issue" && (
                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                  <button
                                    onClick={() => handleIssueDecision(item.id, "approve")}
                                    disabled={savingId === item.id}
                                    className="rounded-xl bg-green-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                                  >
                                    Mark Safe
                                  </button>
                                  <button
                                    onClick={() => handleIssueDecision(item.id, "escalate")}
                                    disabled={savingId === item.id}
                                    className="rounded-xl bg-yellow-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                                  >
                                    Under Review
                                  </button>
                                  <button
                                    onClick={() => handleIssueDecision(item.id, "remove")}
                                    disabled={savingId === item.id}
                                    className="rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                                  >
                                    Remove
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </section>

            <aside className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Eye className="h-5 w-5 text-indigo-600" />
                  <h2 className="text-lg font-semibold text-slate-900">Inspector Panel</h2>
                </div>

                {!selectedItem ? (
                  <p className="text-sm text-slate-500">
                    Select a post or issue from the queue to inspect its full context.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {selectedItem.kind === "post" ? "Post" : "Issue"}
                      </span>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${severityClasses(
                          selectedItem.severity
                        )}`}
                      >
                        {selectedItem.severity}
                      </span>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Title</p>
                      <p className="mt-1 font-semibold text-slate-900">{selectedItem.title}</p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Body</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                        {selectedItem.body}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-slate-500">Owner</p>
                        <p className="mt-1 font-medium text-slate-900">{selectedItem.ownerName}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-slate-500">District</p>
                        <p className="mt-1 font-medium text-slate-900">{selectedItem.district || "—"}</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <Brain className="h-4 w-4 text-slate-600" />
                        <p className="font-medium text-slate-900">AI / Risk Signals</p>
                      </div>

                      <div className="space-y-2 text-sm text-slate-700">
                        <div className="flex items-center justify-between">
                          <span>Risk Score</span>
                          <span>{selectedItem.riskScore}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Recommended</span>
                          <span>{selectedItem.recommendedAction}</span>
                        </div>
                        {selectedItem.aiBreakdown && (
                          <>
                            <div className="flex items-center justify-between">
                              <span>Toxicity</span>
                              <span>{selectedItem.aiBreakdown.toxicity || 0}%</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Spam</span>
                              <span>{selectedItem.aiBreakdown.spam || 0}%</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Misinformation</span>
                              <span>{selectedItem.aiBreakdown.misinformation || 0}%</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {selectedItem.flaggedReason && (
                      <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
                        <span className="font-semibold">Flagged reason:</span> {selectedItem.flaggedReason}
                      </div>
                    )}

                    {selectedItem.kind === "post" && recentActionsForSelectedPost.length > 0 && (
                      <div>
                        <div className="mb-2 flex items-center gap-2">
                          <Activity className="h-4 w-4 text-slate-600" />
                          <p className="font-medium text-slate-900">Recent audit trail</p>
                        </div>
                        <div className="space-y-2">
                          {recentActionsForSelectedPost.map((row) => {
                            const moderator = row.moderator_id ? profilesMap[row.moderator_id] : undefined;
                            return (
                              <div key={row.id} className="rounded-2xl bg-slate-50 p-3 text-sm">
                                <p className="font-semibold capitalize text-slate-900">{row.action}</p>
                                <p className="text-slate-600">
                                  {moderator?.full_name || moderator?.email || "Unknown"}
                                </p>
                                <p className="text-slate-500">{formatDate(row.created_at)}</p>
                                {row.notes && <p className="mt-1 text-slate-700">{row.notes}</p>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Layers3 className="h-5 w-5 text-indigo-600" />
                  <h2 className="text-lg font-semibold text-slate-900">Operating Model</h2>
                </div>

                <div className="space-y-3 text-sm text-slate-600">
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="font-semibold text-slate-800">Approve / Mark Safe</p>
                    <p className="mt-1">Use when the content is acceptable and can remain visible.</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="font-semibold text-slate-800">Escalate / Under Review</p>
                    <p className="mt-1">Use when policy context or human judgment is still needed.</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="font-semibold text-slate-800">Remove</p>
                    <p className="mt-1">Use for harmful, abusive, spam, or policy-violating content.</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-700">
                    <MessageSquare className="mb-2 h-4 w-4" />
                    Posts queue
                  </div>
                  <div className="rounded-2xl bg-red-50 p-3 text-red-700">
                    <Flag className="mb-2 h-4 w-4" />
                    Issue risk
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}