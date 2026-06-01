"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Sidebar from "@/components/layout/Sidebar";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock3,
  MessageSquare,
  ThumbsUp,
  ShieldCheck,
  Send,
  Loader2,
  CalendarDays,
  MapPin,
  Tag,
  Users,
  AlertTriangle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Issue = {
  id: string;
  title: string;
  description: string;
  status: string | null;
  category: string | null;
  district: string | null;
  user_id: string;
  created_at: string | null;
  severity: string | null;
  ai_summary: string | null;
};

type StatusHistoryRow = {
  id: string;
  from_status: string | null;
  to_status: string;
  changed_by_name: string | null;
  note: string | null;
  created_at: string;
};

type OfficialResponse = {
  id: string;
  official_name: string;
  official_title: string | null;
  response_text: string;
  created_at: string;
};

type IssueComment = {
  id: number;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: { full_name: string | null; email: string | null } | null;
};

// ─── Lifecycle config ─────────────────────────────────────────────────────────

const lifecycleSteps = [
  { key: "open",               label: "Submitted",         description: "Issue received from citizen" },
  { key: "under_review",       label: "Under Review",      description: "Staff or moderation review" },
  { key: "sent_to_official",   label: "Sent to Official",  description: "Forwarded for official action" },
  { key: "acknowledged",       label: "Response Received", description: "Official update posted" },
  { key: "resolved",           label: "Resolved",          description: "Issue closed or actioned" },
];

function getStepIndex(status?: string | null) {
  const s = String(status || "open").toLowerCase().trim();
  if (["resolved", "approved", "completed", "closed"].includes(s)) return 4;
  if (["acknowledged", "needs_info", "needs info", "response_received"].includes(s)) return 3;
  if (["sent_to_official", "escalated"].includes(s)) return 2;
  if (["under_review", "under review"].includes(s)) return 1;
  return 0;
}

function statusLabel(s: string) {
  const m: Record<string, string> = {
    open: "Submitted",
    active: "Submitted",
    under_review: "Under Review",
    sent_to_official: "Sent to Official",
    acknowledged: "Response Received",
    needs_info: "More Info Requested",
    resolved: "Resolved",
    approved: "Resolved",
    escalated: "Escalated",
    removed: "Removed",
  };
  return m[s.toLowerCase()] ?? s;
}

function formatDate(v?: string | null) {
  if (!v) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  }).format(new Date(v));
}

function formatDateShort(v?: string | null) {
  if (!v) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric",
  }).format(new Date(v));
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IssueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const issueId = params.id as string;
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [issue, setIssue] = useState<Issue | null>(null);
  const [history, setHistory] = useState<StatusHistoryRow[]>([]);
  const [officialResponses, setOfficialResponses] = useState<OfficialResponse[]>([]);
  const [comments, setComments] = useState<IssueComment[]>([]);
  const [voteCount, setVoteCount] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [togglingVote, setTogglingVote] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          setUserId(user.id);
        } else {
          // Allow guest access
          const guestRaw = typeof window !== "undefined" ? localStorage.getItem("guest_user") : null;
          if (!guestRaw) {
            router.replace("/login");
            return;
          }
          setIsGuest(true);
        }

        const [issueRes, historyRes, responsesRes, commentsRes, votesRes] = await Promise.all([
          supabase
            .from("issues")
            .select("id, title, description, status, category, district, user_id, created_at, severity, ai_summary")
            .eq("id", issueId)
            .single(),

          supabase
            .from("issue_status_history")
            .select("id, from_status, to_status, changed_by_name, note, created_at")
            .eq("issue_id", issueId)
            .order("created_at", { ascending: true }),

          supabase
            .from("issue_official_responses")
            .select("id, official_name, official_title, response_text, created_at")
            .eq("issue_id", issueId)
            .order("created_at", { ascending: true }),

          supabase
            .from("issue_comments")
            .select("id, user_id, content, created_at, profiles(full_name, email)")
            .eq("issue_id", issueId)
            .order("created_at", { ascending: true }),

          supabase
            .from("issue_votes")
            .select("id, user_id", { count: "exact" })
            .eq("issue_id", issueId),
        ]);

        if (issueRes.error || !issueRes.data) {
          setError("Issue not found.");
          return;
        }

        setIssue(issueRes.data as Issue);
        setHistory((historyRes.data as StatusHistoryRow[]) || []);
        setOfficialResponses((responsesRes.data as OfficialResponse[]) || []);
        setVoteCount(votesRes.data?.length ?? 0);

        const rawComments = (commentsRes.data || []) as any[];
        setComments(rawComments.map((c) => ({
          ...c,
          profiles: Array.isArray(c.profiles) ? c.profiles[0] ?? null : c.profiles ?? null,
        })));

        if (user) {
          const voted = (votesRes.data || []).some((v: any) => v.user_id === user.id);
          setHasVoted(voted);
        }
      } catch (err) {
        console.error("Issue load error:", err);
        setError("Failed to load issue.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [issueId, router, supabase]);

  async function handleVote() {
    if (!userId || isGuest) return;
    try {
      setTogglingVote(true);
      if (hasVoted) {
        await supabase.from("issue_votes").delete().eq("issue_id", issueId).eq("user_id", userId);
        setHasVoted(false);
        setVoteCount((n) => Math.max(0, n - 1));
      } else {
        await supabase.from("issue_votes").insert({ issue_id: issueId, user_id: userId });
        setHasVoted(true);
        setVoteCount((n) => n + 1);
      }
    } finally {
      setTogglingVote(false);
    }
  }

  async function handleComment() {
    if (!userId || !commentText.trim()) return;
    try {
      setSubmittingComment(true);
      const { data, error } = await supabase
        .from("issue_comments")
        .insert({ issue_id: issueId, user_id: userId, content: commentText.trim() })
        .select("id, user_id, content, created_at")
        .single();
      if (!error && data) {
        setComments((prev) => [...prev, { ...(data as IssueComment), profiles: null }]);
        setCommentText("");
      }
    } finally {
      setSubmittingComment(false);
    }
  }

  const currentStepIndex = getStepIndex(issue?.status);

  // Match history entries to lifecycle steps
  const stepTimestamps = useMemo(() => {
    const map: Record<string, string> = {};
    for (const h of history) {
      const idx = getStepIndex(h.to_status);
      const key = lifecycleSteps[idx]?.key;
      if (key && !map[key]) map[key] = h.created_at;
    }
    return map;
  }, [history]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 lg:flex">
        <Sidebar />
        <main className="flex flex-1 items-center justify-center">
          <div className="rounded-3xl bg-white p-8 shadow-sm">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-400" />
            <p className="mt-3 text-sm text-slate-500">Loading issue...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="min-h-screen bg-slate-100 lg:flex">
        <Sidebar />
        <main className="flex flex-1 items-center justify-center">
          <div className="rounded-3xl bg-white p-8 shadow-sm text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-red-400" />
            <p className="mt-3 font-semibold text-slate-900">{error || "Issue not found"}</p>
            <Link href="/dashboard" className="mt-4 inline-block text-sm text-blue-600 underline">Back to dashboard</Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
      <Sidebar />

      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-4xl space-y-6">

          {/* Back */}
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

          {/* Header card */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              {issue.category && (
                <span className="flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                  <Tag className="h-3 w-3" />{issue.category}
                </span>
              )}
              {issue.district && (
                <span className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                  <MapPin className="h-3 w-3" />{issue.district}
                </span>
              )}
              {issue.severity && (
                <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">{issue.severity} severity</span>
              )}
              <span className={`rounded-full px-3 py-1 ${
                currentStepIndex === 4 ? "bg-emerald-50 text-emerald-700" :
                currentStepIndex >= 3 ? "bg-indigo-50 text-indigo-700" :
                "bg-slate-100 text-slate-600"
              }`}>
                {statusLabel(issue.status || "open")}
              </span>
            </div>

            <h1 className="mt-4 text-2xl font-extrabold leading-snug tracking-tight text-slate-950 md:text-3xl">
              {issue.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                Submitted {formatDateShort(issue.created_at)}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {voteCount} {voteCount === 1 ? "citizen" : "citizens"} affected
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" />
                {comments.length} {comments.length === 1 ? "comment" : "comments"}
              </span>
            </div>

            {issue.ai_summary && (
              <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm leading-6 text-indigo-800">
                <span className="mr-1.5 font-semibold">AI Summary:</span>{issue.ai_summary}
              </div>
            )}

            <p className="mt-5 text-sm leading-7 text-slate-700 whitespace-pre-line">
              {issue.description}
            </p>

            {/* Vote */}
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={handleVote}
                disabled={togglingVote || isGuest || !userId}
                className={`inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold transition ${
                  hasVoted
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {togglingVote ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
                {hasVoted ? "You're affected" : "I'm affected too"} · {voteCount}
              </button>
              {(isGuest || !userId) && (
                <Link href="/signup" className="text-xs text-blue-600 hover:underline">
                  Sign up to mark yourself as affected
                </Link>
              )}
            </div>
          </section>

          {/* Status Timeline */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-lg font-bold text-slate-900">Issue Timeline</h2>
            <p className="mt-1 text-sm text-slate-500">Track how this issue has moved through the civic process.</p>

            <div className="mt-6 space-y-0">
              {lifecycleSteps.map((step, index) => {
                const complete = index < currentStepIndex;
                const active = index === currentStepIndex;
                const pending = index > currentStepIndex;
                const timestamp = stepTimestamps[step.key];
                const isLast = index === lifecycleSteps.length - 1;

                // Find history note for this step
                const historyEntry = history.find(h => getStepIndex(h.to_status) === index);

                return (
                  <div key={step.key} className="flex gap-4">
                    {/* Connector */}
                    <div className="flex flex-col items-center">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${
                        complete ? "border-emerald-400 bg-emerald-100 text-emerald-700" :
                        active  ? "border-blue-400 bg-blue-100 text-blue-700" :
                                  "border-slate-200 bg-white text-slate-300"
                      }`}>
                        {complete ? <CheckCircle2 className="h-5 w-5" /> :
                         active   ? <Clock3 className="h-5 w-5" /> :
                                    <Circle className="h-5 w-5" />}
                      </span>
                      {!isLast && (
                        <div className={`mt-1 w-0.5 flex-1 min-h-[2rem] ${
                          complete ? "bg-emerald-300" : "bg-slate-200"
                        }`} />
                      )}
                    </div>

                    {/* Content */}
                    <div className={`pb-6 min-w-0 flex-1 ${isLast ? "pb-0" : ""}`}>
                      <div className="flex flex-wrap items-baseline gap-2">
                        <p className={`text-sm font-bold ${
                          pending ? "text-slate-400" : "text-slate-900"
                        }`}>{step.label}</p>
                        {timestamp && (
                          <span className="text-xs text-slate-400">{formatDate(timestamp)}</span>
                        )}
                        {active && !timestamp && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">Current</span>
                        )}
                      </div>
                      <p className={`mt-0.5 text-xs ${pending ? "text-slate-300" : "text-slate-500"}`}>
                        {step.description}
                      </p>
                      {historyEntry?.note && (
                        <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                          {historyEntry.note}
                          {historyEntry.changed_by_name && (
                            <span className="ml-1 font-medium text-slate-700">— {historyEntry.changed_by_name}</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Official Response */}
          {officialResponses.length > 0 && (
            <section className="rounded-3xl border border-indigo-200 bg-indigo-50 p-6 shadow-sm md:p-8">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-indigo-900">
                  Official Response{officialResponses.length > 1 ? "s" : ""}
                </h2>
              </div>

              <div className="mt-4 space-y-4">
                {officialResponses.map((r) => (
                  <div key={r.id} className="rounded-2xl border border-indigo-200 bg-white p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{r.official_name}</p>
                        {r.official_title && (
                          <p className="text-xs text-slate-500">{r.official_title}</p>
                        )}
                      </div>
                      <span className="shrink-0 text-xs text-slate-400">{formatDate(r.created_at)}</span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-700">{r.response_text}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {officialResponses.length === 0 && (
            <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm">
              <ShieldCheck className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 font-semibold text-slate-600">No official response yet</p>
              <p className="mt-1 text-sm text-slate-400">
                When a representative or official responds to this issue, their response will appear here.
              </p>
            </section>
          )}

          {/* Comments */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-lg font-bold text-slate-900">
              Community Discussion
              <span className="ml-2 rounded-full bg-slate-100 px-2.5 py-0.5 text-sm font-semibold text-slate-500">
                {comments.length}
              </span>
            </h2>

            {/* Add comment */}
            {userId && !isGuest ? (
              <div className="mt-4 flex gap-3">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment(); }}}
                  placeholder="Share your experience or perspective..."
                  className="flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400"
                />
                <button
                  onClick={handleComment}
                  disabled={submittingComment || !commentText.trim()}
                  className="flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-white transition hover:bg-slate-700 disabled:opacity-50"
                >
                  {submittingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                <Link href="/signup" className="font-semibold text-blue-600 hover:underline">Create a free account</Link>
                {" "}to join the discussion and add your voice.
              </div>
            )}

            {/* Comment list */}
            <div className="mt-5 space-y-4">
              {comments.length === 0 ? (
                <p className="text-sm text-slate-400">No comments yet. Be the first to share your perspective.</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
                      {(c.profiles?.full_name || c.profiles?.email || "C")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-700">
                          {c.profiles?.full_name || c.profiles?.email?.split("@")[0] || "Citizen"}
                        </p>
                        <p className="text-xs text-slate-400">{formatDate(c.created_at)}</p>
                      </div>
                      <p className="mt-1.5 text-sm leading-6 text-slate-700">{c.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
