"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  CalendarClock,
  FileText,
  Megaphone,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
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
};

type MeetingRow = {
  id: string;
  citizen_name: string | null;
  district: string | null;
  topic: string;
  preferred_times: string;
  status: "pending" | "approved" | "rejected" | "completed";
  meeting_url: string | null;
  created_at: string | null;
};

type SurveyRow = {
  id: string;
  title: string;
  district: string;
  summary: string;
  votes: Record<string, number> | null;
  recent_responses: unknown[] | null;
  deadline: string | null;
  created_at: string | null;
};

function normalizeRole(role?: string | null) {
  return String(role || "").trim().toLowerCase();
}

function isOfficialRole(role?: string | null) {
  const normalized = normalizeRole(role);
  return normalized === "official" || normalized === "admin" || normalized === "moderator";
}

function normalizeDistrict(value?: string | null) {
  return String(value || "").trim().toUpperCase();
}

function districtMatchesScope(value: string | null | undefined, scope: string) {
  const district = normalizeDistrict(value);
  const normalizedScope = normalizeDistrict(scope);

  if (!normalizedScope || normalizedScope === "ALL") return true;
  if (!district) return false;
  if (district === normalizedScope) return true;
  if (!normalizedScope.includes("-")) return district.startsWith(`${normalizedScope}-`);
  return false;
}

function getVoteTotal(votes?: Record<string, number> | null) {
  return Object.values(votes || {}).reduce((sum, value) => sum + Number(value || 0), 0);
}

function getCategoryCounts(issues: IssueRow[]) {
  const counts = new Map<string, number>();
  issues.forEach((issue) => {
    const category = issue.category || "General";
    counts.set(category, (counts.get(category) || 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
}

function formatDate(value?: string | null) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function OfficialDashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [districtScope, setDistrictScope] = useState("");
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [meetings, setMeetings] = useState<MeetingRow[]>([]);
  const [surveys, setSurveys] = useState<SurveyRow[]>([]);
  const [error, setError] = useState("");

  async function loadOfficialWorkspace() {
    setError("");

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

    const metadataRole =
      (user.user_metadata?.role as string | undefined) ||
      (user.user_metadata?.account_type as string | undefined) ||
      "";
    const metadataDistrict =
      (user.user_metadata?.district_id as string | undefined) ||
      (user.user_metadata?.district as string | undefined) ||
      (user.user_metadata?.jurisdiction as string | undefined) ||
      "";

    if (profileError) {
      console.error("Official profile load error:", profileError.message);
    }

    const officialProfile = (profileData as ProfileRow | null) ?? null;
    const role = officialProfile?.role || metadataRole;

    if (!isOfficialRole(role)) {
      router.replace("/dashboard");
      return;
    }

    const scope = normalizeDistrict(officialProfile?.district || metadataDistrict || "All");

    const [issuesResult, meetingsResult, surveysResult] = await Promise.all([
      supabase
        .from("issues")
        .select("id, title, description, category, district, status, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("video_meeting_requests")
        .select("id, citizen_name, district, topic, preferred_times, status, meeting_url, created_at")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("policy_pulse_surveys")
        .select("id, title, district, summary, votes, recent_responses, deadline, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    if (issuesResult.error) console.error("Official issues load error:", issuesResult.error);
    if (meetingsResult.error) console.error("Official meetings load error:", meetingsResult.error);
    if (surveysResult.error) console.error("Official surveys load error:", surveysResult.error);

    const scopedIssues = ((issuesResult.data as IssueRow[]) || []).filter((issue) =>
      districtMatchesScope(issue.district, scope)
    );
    const scopedMeetings = ((meetingsResult.data as MeetingRow[]) || []).filter((meeting) =>
      districtMatchesScope(meeting.district, scope)
    );
    const scopedSurveys = ((surveysResult.data as SurveyRow[]) || []).filter((survey) =>
      districtMatchesScope(survey.district, scope)
    );

    setProfile(officialProfile);
    setDistrictScope(scope || "All");
    setIssues(scopedIssues);
    setMeetings(scopedMeetings);
    setSurveys(scopedSurveys);
  }

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        await loadOfficialWorkspace();
      } catch (err) {
        console.error("Official dashboard load error:", err);
        if (mounted) setError("Unable to load the official workspace right now.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    const issuesChannel = supabase
      .channel("official-dashboard-issues")
      .on("postgres_changes", { event: "*", schema: "public", table: "issues" }, () => {
        void loadOfficialWorkspace();
      })
      .subscribe();

    const meetingsChannel = supabase
      .channel("official-dashboard-meetings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "video_meeting_requests" },
        () => {
          void loadOfficialWorkspace();
        }
      )
      .subscribe();

    const surveysChannel = supabase
      .channel("official-dashboard-surveys")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "policy_pulse_surveys" },
        () => {
          void loadOfficialWorkspace();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(issuesChannel);
      supabase.removeChannel(meetingsChannel);
      supabase.removeChannel(surveysChannel);
    };
  }, [router, supabase]);

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await loadOfficialWorkspace();
    } finally {
      setRefreshing(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const stats = useMemo(() => {
    const openIssues = issues.filter((issue) =>
      ["active", "open", "under_review"].includes(String(issue.status || "").toLowerCase())
    ).length;
    const pendingMeetings = meetings.filter((meeting) => meeting.status === "pending").length;
    const scheduledMeetings = meetings.filter((meeting) => meeting.status === "approved").length;
    const totalSurveyVotes = surveys.reduce((sum, survey) => sum + getVoteTotal(survey.votes), 0);

    return {
      openIssues,
      pendingMeetings,
      scheduledMeetings,
      activeSurveys: surveys.length,
      totalSurveyVotes,
    };
  }, [issues, meetings, surveys]);

  const topCategories = useMemo(() => getCategoryCounts(issues), [issues]);
  const recentIssues = issues.slice(0, 5);
  const upcomingMeetings = meetings
    .filter((meeting) => meeting.status === "pending" || meeting.status === "approved")
    .slice(0, 4);
  const latestSurveys = surveys.slice(0, 3);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <p className="text-2xl font-bold text-slate-950">Loading official workspace...</p>
          <p className="mt-2 text-slate-500">Preparing your jurisdiction view.</p>
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
                    Official Workspace
                  </p>
                  <h1 className="mt-3 text-4xl font-extrabold tracking-tight md:text-5xl">
                    Welcome back, {profile?.full_name || "Official"}
                  </h1>
                  <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
                    Monitor constituent activity, publish verified updates, coordinate meetings,
                    and track policy sentiment for {districtScope === "ALL" ? "all districts" : districtScope}.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleRefresh}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                  <button
                    onClick={handleLogout}
                    className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-5">
              <StatCard label="Open Issues" value={stats.openIssues} icon={MessageSquareText} tone="blue" />
              <StatCard label="Pending Meetings" value={stats.pendingMeetings} icon={CalendarClock} tone="amber" />
              <StatCard label="Scheduled" value={stats.scheduledMeetings} icon={Users} tone="green" />
              <StatCard label="Policy Surveys" value={stats.activeSurveys} icon={ShieldCheck} tone="violet" />
              <StatCard label="Survey Votes" value={stats.totalSurveyVotes} icon={BarChart3} tone="slate" />
            </div>
          </section>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Constituent Feed
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-950">Issues Needing Attention</h2>
                </div>
                <Link
                  href="/feed"
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Open Feed
                </Link>
              </div>

              <div className="mt-5 space-y-3">
                {recentIssues.length ? (
                  recentIssues.map((issue) => (
                    <div key={issue.id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-base font-bold text-slate-950">{issue.title || "Untitled issue"}</p>
                          <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                            {issue.description || "No description provided."}
                          </p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          {issue.status || "active"}
                        </span>
                      </div>
                      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                        {issue.category || "General"} • {issue.district || districtScope} •{" "}
                        {formatDate(issue.created_at)}
                      </p>
                    </div>
                  ))
                ) : (
                  <EmptyState text="No constituent issues are visible for this jurisdiction yet." />
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-slate-950">District Overview</h2>
                </div>
                <div className="mt-5 space-y-3">
                  {topCategories.length ? (
                    topCategories.map((item) => (
                      <div key={item.category}>
                        <div className="flex items-center justify-between text-sm font-semibold">
                          <span className="text-slate-700">{item.category}</span>
                          <span className="text-slate-500">{item.count}</span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full bg-blue-600"
                            style={{
                              width: `${Math.max(12, (item.count / Math.max(1, issues.length)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState text="Category trends will appear once residents create posts." />
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <CalendarClock className="h-6 w-6 text-emerald-600" />
                    <h2 className="text-2xl font-bold text-slate-950">Meetings</h2>
                  </div>
                  <Link href="/official-meetings" className="text-sm font-semibold text-blue-600">
                    Manage
                  </Link>
                </div>
                <div className="mt-5 space-y-3">
                  {upcomingMeetings.length ? (
                    upcomingMeetings.map((meeting) => (
                      <div key={meeting.id} className="rounded-2xl border border-slate-200 p-4">
                        <p className="font-bold text-slate-950">{meeting.topic}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {meeting.citizen_name || "Citizen"} • {meeting.preferred_times}
                        </p>
                        <span className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          {meeting.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <EmptyState text="No pending or scheduled meetings yet." />
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <ActionCard
              href="/official-updates"
              icon={Megaphone}
              title="Publish Official Update"
              text="Post verified announcements, public notices, or meeting updates."
            />
            <ActionCard
              href="/policy-pulse"
              icon={ShieldCheck}
              title="Review Policy Pulse"
              text="See survey support, objections, and recommended next actions."
            />
            <ActionCard
              href="/create-post"
              icon={FileText}
              title="Create District Post"
              text="Seed a civic discussion or document an issue in your jurisdiction."
            />
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Policy Pulse
                </p>
                <h2 className="mt-2 text-2xl font-bold text-slate-950">Live Citizen Sentiment</h2>
              </div>
              <Link href="/policy-pulse" className="text-sm font-semibold text-blue-600">
                Open Policy Pulse
              </Link>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {latestSurveys.length ? (
                latestSurveys.map((survey) => (
                  <div key={survey.id} className="rounded-2xl border border-slate-200 p-5">
                    <p className="text-lg font-bold text-slate-950">{survey.title}</p>
                    <p className="mt-2 line-clamp-3 text-sm text-slate-500">{survey.summary}</p>
                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-600">
                        {getVoteTotal(survey.votes)} votes
                      </span>
                      <span className="text-slate-500">Due {formatDate(survey.deadline)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="md:col-span-3">
                  <EmptyState text="No policy pulse surveys are visible for this jurisdiction yet." />
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
  tone: "blue" | "amber" | "green" | "violet" | "slate";
}) {
  const toneClasses = {
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    green: "bg-emerald-50 text-emerald-700",
    violet: "bg-violet-50 text-violet-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-3 text-4xl font-extrabold text-slate-950">{value}</p>
        </div>
        <span className={`rounded-2xl p-3 ${toneClasses[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

function ActionCard({
  href,
  icon: Icon,
  title,
  text,
}: {
  href: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <Icon className="h-7 w-7 text-blue-600" />
      <p className="mt-4 text-xl font-bold text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
    </Link>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}
