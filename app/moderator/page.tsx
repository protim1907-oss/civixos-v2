"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Sidebar from "@/components/layout/Sidebar";
import {
  initialVotes,
  loadAllPolicyPulseSurveys,
  toggleSurveyPublished,
  PolicyPulseSurvey,
  publishPolicyPulseSurvey,
  uploadPolicyPulseFiles,
  voteOptions,
} from "@/lib/policy-pulse";
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
  BarChart3,
  TrendingUp,
  Users,
  Timer,
  ArrowRight,
  ListChecks,
  Video,
  MapPinned,
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

type VideoMeetingRequestRow = {
  id: string;
  citizen_id: string | null;
  citizen_name: string | null;
  citizen_email: string | null;
  district: string | null;
  representative_id: string | null;
  representative_name: string | null;
  representative_title: string | null;
  representative_office: string | null;
  topic: string;
  preferred_times: string;
  notes: string | null;
  status: "pending" | "approved" | "rejected" | "completed";
  meeting_url: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string | null;
};

type FilterType =
  | "all"
  | "active"
  | "under_review"
  | "removed"
  | "approved";

type InsightKey = "outcomes" | "response" | "escalation" | "actions";
type MeetingStatusFilter =
  | "all"
  | "pending"
  | "approved"
  | "completed"
  | "rejected";

type LeaderboardRow = {
  actorId: string;
  actorName: string;
  totalActions: number;
  approved: number;
  removed: number;
  escalated: number;
};

type CategoryMetric = {
  category: string;
  total: number;
  removed: number;
  approved: number;
  escalated: number;
};

type TriageItem = {
  issue: Issue;
  score: number;
  ageHours: number;
  slaLabel: string;
  slaClass: string;
  suggestedAction: string;
  suggestedStatus: "approved" | "removed" | "under_review";
  reasonChips: string[];
  bulkEligible: boolean;
};

type DistrictOverview = {
  district: string;
  total: number;
  active: number;
  underReview: number;
  removed: number;
  approved: number;
  pendingMeetings: number;
  topCategory: string;
  riskScore: number;
};

type ModeratorSurveyForm = {
  title: string;
  summary: string;
  primaryQuestion: string;
  deadline: string;
};

const MODERATOR_SURVEY_DISTRICTS = [
  "TX-21",
  "TX-23",
  "TX-35",
  "CA-42",
  "IL-01",
  "IL-02",
  "IL-03",
  "IL-04",
  "IL-05",
  "IL-06",
  "IL-07",
  "IL-08",
  "IL-09",
  "IL-10",
  "IL-11",
  "IL-12",
  "IL-13",
  "IL-14",
  "IL-15",
  "IL-16",
  "IL-17",
];

function getSurveyDeadlineTime(value: string) {
  if (!value) return Number.NaN;

  const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
  const deadline = dateOnlyPattern.test(value)
    ? new Date(`${value}T23:59:59`)
    : new Date(value);

  return deadline.getTime();
}

export default function ModeratorDashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);
  const [meetingRequests, setMeetingRequests] = useState<VideoMeetingRequestRow[]>([]);
  const [policySurveys, setPolicySurveys] = useState<PolicyPulseSurvey[]>([]);
  const [activeDistricts, setActiveDistricts] = useState<string[]>([]);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [meetingActionLoadingId, setMeetingActionLoadingId] = useState<string | null>(null);
  const [selectedQueueIds, setSelectedQueueIds] = useState<string[]>([]);
  const [selectedInsight, setSelectedInsight] = useState<InsightKey | null>(null);
  const [meetingStatusFilter, setMeetingStatusFilter] = useState<MeetingStatusFilter>("all");
  const [meetingDistrictFilter, setMeetingDistrictFilter] = useState<string | null>(null);
  const [surveyForm, setSurveyForm] = useState<ModeratorSurveyForm>({
    title: "",
    summary: "",
    primaryQuestion: "Do you support this policy proposal for your district?",
    deadline: "",
  });
  const [surveyPublishing, setSurveyPublishing] = useState(false);
  const [surveyMessage, setSurveyMessage] = useState("");
  const [surveyFiles, setSurveyFiles] = useState<File[]>([]);
  const surveyFileInputRef = useRef<HTMLInputElement | null>(null);
  const [sharingSurveyDistrict, setSharingSurveyDistrict] = useState<string | null>(null);
  const [broadcastingSurveyId, setBroadcastingSurveyId] = useState<string | null>(null);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [auditActorFilter, setAuditActorFilter] = useState<{
    actorId: string;
    actorName: string;
  } | null>(null);
  const postsSectionRef = useRef<HTMLElement | null>(null);
  const auditTrailRef = useRef<HTMLElement | null>(null);
  const surveySectionRef = useRef<HTMLElement | null>(null);

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

        await Promise.all([
          fetchIssues(),
          fetchAuditLogs(),
          fetchMeetingRequests(),
          fetchPolicySurveys(),
          fetchActiveDistricts(),
        ]);

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

    const meetingsChannel = supabase
      .channel("moderator-live-video-meetings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "video_meeting_requests" },
        async () => {
          await fetchMeetingRequests();
        }
      )
      .subscribe();

    const surveysChannel = supabase
      .channel("moderator-live-policy-surveys")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "policy_pulse_surveys" },
        async () => {
          await fetchPolicySurveys();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(issuesChannel);
      supabase.removeChannel(auditChannel);
      supabase.removeChannel(meetingsChannel);
      supabase.removeChannel(surveysChannel);
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
      .limit(200);

    if (error) {
      console.error("Failed to fetch audit logs:", error.message);
      return;
    }

    setAuditLogs((data as AuditLogRow[]) ?? []);
  }

  async function fetchMeetingRequests() {
    const { data, error } = await supabase
      .from("video_meeting_requests")
      .select(
        "id, citizen_id, citizen_name, citizen_email, district, representative_id, representative_name, representative_title, representative_office, topic, preferred_times, notes, status, meeting_url, reviewed_by, reviewed_at, created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch meeting requests:", error.message);
      return;
    }

    setMeetingRequests((data as VideoMeetingRequestRow[]) ?? []);
  }

  async function fetchPolicySurveys() {
    const surveys = await loadAllPolicyPulseSurveys(supabase);
    setPolicySurveys(surveys);
  }

  async function fetchActiveDistricts() {
    try {
      const res = await fetch("/api/active-districts");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.districts)) {
        setActiveDistricts(data.districts as string[]);
      }
    } catch (error) {
      console.error("Failed to load active districts:", error);
    }
  }

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await Promise.all([
        fetchIssues(),
        fetchAuditLogs(),
        fetchMeetingRequests(),
        fetchPolicySurveys(),
        fetchActiveDistricts(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  function escapeHtml(value: string) {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function handleLaunchDistrictSurveys() {
    const title = surveyForm.title.trim();
    const summary = surveyForm.summary.trim();
    const primaryQuestion = surveyForm.primaryQuestion.trim();

    setSurveyMessage("");

    if (!profile?.id) {
      setSurveyMessage("Please sign in as a moderator before launching surveys.");
      return;
    }

    if (!title || !summary || !primaryQuestion || !surveyForm.deadline) {
      setSurveyMessage("Complete the title, summary, question, and deadline first.");
      return;
    }

    const deadlineTime = getSurveyDeadlineTime(surveyForm.deadline);
    if (Number.isNaN(deadlineTime) || deadlineTime < Date.now()) {
      setSurveyMessage("Choose a valid future deadline before launching surveys.");
      return;
    }

    try {
      setSurveyPublishing(true);

      const createdAt = new Date().toISOString();
      const surveyBatchId = `moderator-${Date.now()}`;

      // Upload attachments once and share the metadata across every district row.
      const uploadedFiles =
        surveyFiles.length > 0
          ? await uploadPolicyPulseFiles(supabase, surveyBatchId, surveyFiles)
          : [];

      await Promise.all(
        broadcastDistricts.map((district) =>
          publishPolicyPulseSurvey(supabase, {
            id: `${surveyBatchId}-${district.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
            title,
            district,
            createdByUserId: profile.id,
            createdByName: profile.full_name || profile.email || "Moderator",
            summary,
            primaryQuestion,
            deadline: surveyForm.deadline,
            uploadedFiles,
            createdAt,
            votes: { ...initialVotes },
            recentResponses: [],
            isPublished: true,
          })
        )
      );

      await fetchPolicySurveys();
      setSurveyMessage("Survey launched for all districts.");
      setSurveyForm({
        title: "",
        summary: "",
        primaryQuestion: "Do you support this policy proposal for your district?",
        deadline: "",
      });
      setSurveyFiles([]);
      if (surveyFileInputRef.current) surveyFileInputRef.current.value = "";
    } catch (error) {
      console.error("Failed to launch district surveys:", error);
      setSurveyMessage("Unable to launch surveys. Confirm Supabase survey permissions.");
    } finally {
      setSurveyPublishing(false);
    }
  }

  function handleExportDistrictSurveyPdf(survey: PolicyPulseSurvey) {
    const printWindow = window.open("", "_blank", "width=960,height=720");
    if (!printWindow) return;

    const totalVotes = Object.values(survey.votes).reduce((sum, count) => sum + count, 0);
    const topVote = voteOptions
      .map((option) => ({ option, count: survey.votes[option] }))
      .sort((a, b) => b.count - a.count)[0];
    const supportCount = (survey.votes["Strongly Support"] ?? 0) + (survey.votes["Support"] ?? 0);
    const opposeCount = (survey.votes["Oppose"] ?? 0) + (survey.votes["Strongly Oppose"] ?? 0);
    const supportPct = totalVotes > 0 ? Math.round((supportCount / totalVotes) * 100) : 0;
    const opposePct = totalVotes > 0 ? Math.round((opposeCount / totalVotes) * 100) : 0;
    const exportedAt = new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" });

    const voteBarRows = voteOptions
      .map((option) => {
        const value = survey.votes[option] ?? 0;
        const pct = totalVotes > 0 ? ((value / totalVotes) * 100).toFixed(1) : "0.0";
        const barColor =
          option === "Strongly Support" ? "#10b981"
          : option === "Support" ? "#6ee7b7"
          : option === "Neutral" ? "#cbd5e1"
          : option === "Oppose" ? "#fca5a5"
          : "#ef4444";
        return `
          <tr>
            <td style="width:160px">${escapeHtml(option)}</td>
            <td>
              <div style="background:#f1f5f9;border-radius:4px;height:14px;width:100%">
                <div style="background:${barColor};border-radius:4px;height:14px;width:${pct}%"></div>
              </div>
            </td>
            <td style="width:90px;text-align:right">${value} (${pct}%)</td>
          </tr>
        `;
      })
      .join("");

    const responseRows =
      survey.recentResponses.length > 0
        ? survey.recentResponses
            .map(
              (r, i) => `
                <tr style="background:${i % 2 === 0 ? "#fff" : "#f8fafc"}">
                  <td>${escapeHtml(r.citizenLabel)}</td>
                  <td><span style="padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;background:${
                    r.supportLevel === "Strongly Support" || r.supportLevel === "Support" ? "#d1fae5;color:#065f46"
                    : r.supportLevel === "Neutral" ? "#f1f5f9;color:#475569"
                    : "#fee2e2;color:#991b1b"
                  }">${escapeHtml(r.supportLevel)}</span></td>
                  <td>${escapeHtml(r.topConcern)}</td>
                  <td>${escapeHtml(r.recommendation)}</td>
                </tr>
              `
            )
            .join("")
        : `<tr><td colspan="4" style="text-align:center;color:#94a3b8">No feedback submitted.</td></tr>`;

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Civix250 — ${escapeHtml(survey.district)} Survey Results</title>
          <style>
            @media print { body { margin: 0; } .no-print { display: none; } }
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; margin: 0; color: #0f172a; background: #fff; }
            .header { background: #0f172a; color: #fff; padding: 28px 40px; display: flex; justify-content: space-between; align-items: center; }
            .header-left h1 { margin: 0 0 4px; font-size: 22px; }
            .header-left p { margin: 0; font-size: 13px; color: #94a3b8; }
            .header-right { text-align: right; font-size: 12px; color: #94a3b8; }
            .content { padding: 32px 40px; }
            .badge { display: inline-block; padding: 3px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; background: #ede9fe; color: #4c1d95; margin-bottom: 12px; }
            .title { font-size: 26px; font-weight: 700; margin: 0 0 8px; }
            .summary { font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 24px; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 28px; }
            .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; }
            .meta-box .label { font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 4px; }
            .meta-box .value { font-size: 16px; font-weight: 700; color: #0f172a; }
            .section-title { font-size: 15px; font-weight: 700; color: #0f172a; margin: 24px 0 12px; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th { background: #f8fafc; padding: 9px 12px; text-align: left; font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: .04em; border-bottom: 1px solid #e2e8f0; }
            td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
            .bar-table td { border: none; padding: 5px 8px; vertical-align: middle; }
            .footer { margin-top: 40px; padding: 16px 40px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; }
            .print-btn { display: block; margin: 20px auto 0; padding: 10px 28px; background: #0f172a; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-left">
              <h1>Civix250 — Policy Pulse Report</h1>
              <p>District Survey Results &nbsp;·&nbsp; Moderator Export</p>
            </div>
            <div class="header-right">
              <div>Exported by: ${escapeHtml(profile?.full_name || profile?.email || "Moderator")}</div>
              <div>${exportedAt}</div>
            </div>
          </div>

          <div class="content">
            <span class="badge">${escapeHtml(survey.district)}</span>
            <h2 class="title">${escapeHtml(survey.title)}</h2>
            <p class="summary">${escapeHtml(survey.summary)}</p>

            <div class="meta-grid">
              <div class="meta-box">
                <div class="label">Survey Question</div>
                <div class="value" style="font-size:13px">${escapeHtml(survey.primaryQuestion)}</div>
              </div>
              <div class="meta-box">
                <div class="label">Voting Period</div>
                <div class="value" style="font-size:13px">Closed ${escapeHtml(formatDate(survey.deadline))}</div>
              </div>
              <div class="meta-box">
                <div class="label">Total Votes Cast</div>
                <div class="value">${totalVotes}</div>
              </div>
              <div class="meta-box">
                <div class="label">Leading Response</div>
                <div class="value" style="font-size:13px">${escapeHtml(topVote?.option ?? "—")} (${topVote?.count ?? 0})</div>
              </div>
              <div class="meta-box">
                <div class="label">Support Rate</div>
                <div class="value" style="color:#10b981">${supportPct}%</div>
              </div>
              <div class="meta-box">
                <div class="label">Opposition Rate</div>
                <div class="value" style="color:#ef4444">${opposePct}%</div>
              </div>
            </div>

            <div class="section-title">Vote Breakdown</div>
            <table class="bar-table">
              <tbody>${voteBarRows}</tbody>
            </table>

            <div class="section-title">Citizen Feedback (${survey.recentResponses.length} responses)</div>
            <table>
              <thead>
                <tr>
                  <th>Citizen</th>
                  <th>Vote</th>
                  <th>Top Concern</th>
                  <th>Recommendation</th>
                </tr>
              </thead>
              <tbody>${responseRows}</tbody>
            </table>
          </div>

          <div class="footer">
            <span>Civix250 · civix250.ai · Confidential moderator report</span>
            <span>Generated ${exportedAt}</span>
          </div>

          <button class="print-btn no-print" onclick="window.print()">Print / Save as PDF</button>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  async function handleShareSurveyResults(survey: PolicyPulseSurvey) {
    const totalVotes = Object.values(survey.votes).reduce((sum, count) => sum + count, 0);
    const topVote = voteOptions
      .map((option) => ({ option, count: survey.votes[option] }))
      .sort((a, b) => b.count - a.count)[0];
    const topConcern =
      survey.recentResponses[0]?.topConcern ||
      "No top concern submitted yet";

    try {
      setSharingSurveyDistrict(survey.district);
      setSurveyMessage("");

      const { error } = await supabase.from("official_updates").insert({
        title: `Policy Pulse results ready: ${survey.title}`,
        summary: `${survey.district} survey results are ready for representative review. Total votes: ${totalVotes}. Leading response: ${topVote.option} (${topVote.count}). Top recent concern: ${topConcern}.`,
        district: survey.district,
        category: "Policy Update",
        priority: "High",
        status: "Active",
        source_name: profile?.full_name || profile?.email || "Moderator",
        source_url: `/policy-pulse?survey=${encodeURIComponent(survey.id)}`,
        published_by: profile?.id || null,
        published_by_name: profile?.full_name || profile?.email || "Moderator",
      });

      if (error) {
        console.error("Failed to share survey results:", error.message);
        setSurveyMessage(error.message || "Unable to share survey results.");
        return;
      }

      setSurveyMessage(`Results shared with ${survey.district} representatives via Official Updates.`);
    } finally {
      setSharingSurveyDistrict(null);
    }
  }

  function handleStatsCardClick(filter: FilterType) {
    setActiveFilter(filter);
    setSearch("");
    setAuditActorFilter(null);

    requestAnimationFrame(() => {
      postsSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  async function handleBroadcastSurvey(survey: PolicyPulseSurvey) {
    const targetDistricts = broadcastDistricts.filter(
      (d) => d !== survey.district
    );
    if (targetDistricts.length === 0) return;

    try {
      setBroadcastingSurveyId(survey.id);
      setBroadcastMessage("");

      // Deterministic per (source survey, target district) so re-broadcasting
      // the same survey reuses the existing row instead of creating a
      // duplicate that fragments votes across multiple rows.
      const targetIdFor = (district: string) =>
        `broadcast-${survey.id}-${district.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

      const { data: existingRows } = await supabase
        .from("policy_pulse_surveys")
        .select("id")
        .in("id", targetDistricts.map(targetIdFor));

      const existingIds = new Set((existingRows ?? []).map((row) => row.id));
      const newDistricts = targetDistricts.filter(
        (district) => !existingIds.has(targetIdFor(district))
      );
      const alreadyBroadcastDistricts = targetDistricts.filter((district) =>
        existingIds.has(targetIdFor(district))
      );

      if (newDistricts.length > 0) {
        await Promise.all(
          newDistricts.map((district) =>
            publishPolicyPulseSurvey(supabase, {
              id: targetIdFor(district),
              title: survey.title,
              district,
              createdByUserId: profile?.id || "",
              createdByName: profile?.full_name || profile?.email || "Moderator",
              summary: survey.summary,
              primaryQuestion: survey.primaryQuestion,
              deadline: survey.deadline,
              uploadedFiles: survey.uploadedFiles ?? [],
              createdAt: new Date().toISOString(),
              votes: { ...initialVotes },
              recentResponses: [],
              isPublished: true,
            })
          )
        );
      }

      await fetchPolicySurveys();

      if (newDistricts.length > 0 && alreadyBroadcastDistricts.length > 0) {
        setBroadcastMessage(
          `Survey broadcast to ${newDistricts.join(", ")}. Already broadcast to ${alreadyBroadcastDistricts.join(", ")} — existing votes preserved.`
        );
      } else if (newDistricts.length > 0) {
        setBroadcastMessage(`Survey broadcast to ${newDistricts.join(", ")}.`);
      } else {
        setBroadcastMessage(
          `Already broadcast to ${alreadyBroadcastDistricts.join(", ")} — no new districts to broadcast to.`
        );
      }
    } catch (error) {
      console.error("Failed to broadcast survey:", error);
      setBroadcastMessage("Failed to broadcast survey. Please try again.");
    } finally {
      setBroadcastingSurveyId(null);
    }
  }

  function handleDistrictCardClick(district: string) {
    setActiveFilter("all");
    setSearch(district);
    setAuditActorFilter(null);

    requestAnimationFrame(() => {
      postsSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function handleCategoryInsightClick(category: string) {
    setActiveFilter("all");
    setSearch(category);
    setAuditActorFilter(null);

    requestAnimationFrame(() => {
      postsSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function handleLeaderboardClick(item: LeaderboardRow) {
    setAuditActorFilter({
      actorId: item.actorId,
      actorName: item.actorName,
    });

    requestAnimationFrame(() => {
      auditTrailRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function buildMeetingUrl(requestId: string) {
    const token = requestId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 18);
    return `https://meet.jit.si/civix250-${token}`;
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

  async function updateMeetingRequestStatus(
    request: VideoMeetingRequestRow,
    nextStatus: "approved" | "rejected" | "completed"
  ) {
    try {
      setMeetingActionLoadingId(request.id);

      const meetingUrl =
        nextStatus === "approved"
          ? request.meeting_url || buildMeetingUrl(request.id)
          : request.meeting_url;

      const { error } = await supabase
        .from("video_meeting_requests")
        .update({
          status: nextStatus,
          meeting_url: meetingUrl,
          reviewed_by: profile?.id ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (error) {
        console.error("Failed to update meeting request:", error.message);
        return;
      }

      const details: AuditLogDetails = {
        actor_name: profile?.full_name || profile?.email || "Moderator",
        target_title: request.topic,
        district: request.district || undefined,
        previous_status: request.status,
        new_status: nextStatus,
        notes:
          nextStatus === "approved"
            ? `Meeting approved with ${request.representative_name || "representative"}`
            : nextStatus === "completed"
            ? "Meeting marked completed by moderator"
            : "Meeting request rejected by moderator",
      };

      await supabase.from("audit_logs").insert({
        actor_id: profile?.id || null,
        actor_role: profile?.role || "moderator",
        entity_type: "video_meeting_request",
        entity_id: request.id,
        event_type: "video_meeting_request_updated",
        details,
      });

      await Promise.all([fetchMeetingRequests(), fetchAuditLogs()]);
    } catch (error) {
      console.error("Unexpected meeting coordination error:", error);
    } finally {
      setMeetingActionLoadingId(null);
    }
  }

  async function handleBulkApproveSelected() {
    const selectedIssues = issues.filter((issue) => selectedQueueIds.includes(issue.id));
    if (selectedIssues.length === 0) return;

    try {
      setActionLoadingId("bulk-approve");

      for (const issue of selectedIssues) {
        const { error } = await supabase
          .from("issues")
          .update({ status: "approved" })
          .eq("id", issue.id);

        if (error) {
          console.error("Failed to bulk approve issue:", error.message);
          continue;
        }

        await insertAuditLog(issue, "approved", profile);
      }

      setSelectedQueueIds([]);
      await Promise.all([fetchIssues(), fetchAuditLogs()]);
    } catch (err) {
      console.error("Unexpected bulk moderation error:", err);
    } finally {
      setActionLoadingId(null);
    }
  }

  function toggleQueueSelection(issueId: string) {
    setSelectedQueueIds((current) =>
      current.includes(issueId)
        ? current.filter((id) => id !== issueId)
        : [...current, issueId]
    );
  }

  function getIssueAgeHours(issue: Issue) {
    if (!issue.created_at) return 0;
    const createdAt = new Date(issue.created_at).getTime();
    if (Number.isNaN(createdAt)) return 0;
    return Math.max(0, Math.round((Date.now() - createdAt) / 3600000));
  }

  function buildTriageItem(issue: Issue): TriageItem {
    const status = issue.status || "active";
    const ageHours = getIssueAgeHours(issue);
    const category = (issue.category || "").toLowerCase();
    const content = `${issue.title} ${issue.description}`.toLowerCase();
    const reasonChips: string[] = [];
    let score = 10;

    if (status === "under_review") {
      score += 45;
      reasonChips.push("Under review");
    } else {
      score += 18;
      reasonChips.push("New queue item");
    }

    if (ageHours >= 48) {
      score += 25;
      reasonChips.push("Overdue");
    } else if (ageHours >= 24) {
      score += 18;
      reasonChips.push("Needs action today");
    } else if (ageHours >= 8) {
      score += 10;
      reasonChips.push("Aging");
    }

    if (["safety", "transportation", "environment"].some((risk) => category.includes(risk))) {
      score += 15;
      reasonChips.push(issue.category || "Risk category");
    }

    if (
      ["urgent", "unsafe", "hazard", "emergency", "threat", "misinformation"].some((word) =>
        content.includes(word)
      )
    ) {
      score += 20;
      reasonChips.push("Risk language");
    }

    const slaLabel =
      ageHours >= 48 ? "Overdue" : status === "under_review" || ageHours >= 24 ? "Needs action today" : "On track";
    const slaClass =
      ageHours >= 48
        ? "bg-red-100 text-red-700"
        : status === "under_review" || ageHours >= 24
        ? "bg-yellow-100 text-yellow-700"
        : "bg-emerald-100 text-emerald-700";

    const suggestedStatus =
      status === "under_review"
        ? score >= 75
          ? "removed"
          : "approved"
        : score >= 75
        ? "under_review"
        : score <= 38
        ? "approved"
        : "under_review";
    const suggestedAction =
      suggestedStatus === "removed"
        ? "Remove high-risk reviewed post"
        : suggestedStatus === "approved"
        ? "Approve low-risk post"
        : "Escalate for closer review";

    return {
      issue,
      score: Math.min(score, 100),
      ageHours,
      slaLabel,
      slaClass,
      suggestedAction,
      suggestedStatus,
      reasonChips: [...new Set(reasonChips)].slice(0, 4),
      bulkEligible: suggestedStatus === "approved" && status !== "under_review",
    };
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
          (issue.category?.trim() || "Uncategorized").toLowerCase().includes(q) ||
          (issue.district?.trim() || "Unassigned").toLowerCase().includes(q) ||
          issue.status?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [issues, search, activeFilter]);

  const filteredAuditLogs = useMemo(() => {
    if (!auditActorFilter) return auditLogs;

    return auditLogs.filter((log) => {
      if (auditActorFilter.actorId !== "unknown" && log.actor_id === auditActorFilter.actorId) {
        return true;
      }

      const actorName = log.details?.actor_name?.trim() || log.actor_role || "Unknown moderator";
      return actorName === auditActorFilter.actorName;
    });
  }, [auditLogs, auditActorFilter]);

  // Districts we broadcast to: only those with signed-up users. Falls back to
  // the static roster if the active-districts fetch hasn't resolved yet, so a
  // slow/failed request never silently produces an empty broadcast target.
  const broadcastDistricts = useMemo(
    () =>
      activeDistricts.length > 0 ? activeDistricts : MODERATOR_SURVEY_DISTRICTS,
    [activeDistricts]
  );

  const districtSurveyRows = useMemo(() => {
    // Show a row for every district with users plus any that already have a
    // survey, so past surveys in now-empty districts remain visible.
    const allDistricts = Array.from(
      new Set([
        ...broadcastDistricts,
        ...policySurveys.map((s) => s.district).filter(Boolean),
      ])
    ).sort();

    return allDistricts.map((district) => {
      const surveys = policySurveys
        .filter((survey) => survey.district === district)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      const latestSurvey = surveys[0] || null;
      const totalVotes = latestSurvey
        ? Object.values(latestSurvey.votes).reduce((sum, count) => sum + count, 0)
        : 0;
      const deadlineTime = latestSurvey
        ? getSurveyDeadlineTime(latestSurvey.deadline)
        : 0;
      const votingClosed =
        Boolean(latestSurvey) &&
        !Number.isNaN(deadlineTime) &&
        deadlineTime < Date.now();

      return {
        district,
        latestSurvey,
        totalVotes,
        responseCount: latestSurvey?.recentResponses.length || 0,
        votingClosed,
      };
    });
  }, [policySurveys, broadcastDistricts]);

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

  const triageQueue = issues
    .filter((issue) => !["approved", "removed"].includes(issue.status || "active"))
    .map((issue) => buildTriageItem(issue))
    .sort((a, b) => b.score - a.score || b.ageHours - a.ageHours)
    .slice(0, 6);

  const lowRiskQueueIds = triageQueue
    .filter((item) => item.bulkEligible)
    .map((item) => item.issue.id);

  const pendingMeetingRequests = meetingRequests.filter(
    (request) => request.status === "pending"
  );

  const meetingCoordination = useMemo(() => {
    const stats = {
      all: meetingRequests.length,
      pending: 0,
      approved: 0,
      completed: 0,
      rejected: 0,
    };
    const districtMap = new Map<
      string,
      {
        district: string;
        total: number;
        pending: number;
        approved: number;
        completed: number;
        rejected: number;
        representatives: Set<string>;
      }
    >();

    meetingRequests.forEach((request) => {
      stats[request.status] += 1;

      const district = request.district?.trim() || "Unassigned";
      if (!districtMap.has(district)) {
        districtMap.set(district, {
          district,
          total: 0,
          pending: 0,
          approved: 0,
          completed: 0,
          rejected: 0,
          representatives: new Set<string>(),
        });
      }

      const entry = districtMap.get(district)!;
      entry.total += 1;
      entry[request.status] += 1;
      entry.representatives.add(request.representative_name?.trim() || "Representative");
    });

    const districtQueues = [...districtMap.values()]
      .map((entry) => ({
        ...entry,
        representativeCount: entry.representatives.size,
      }))
      .sort((a, b) => b.pending - a.pending || b.total - a.total || a.district.localeCompare(b.district));

    const filteredRequests = meetingRequests.filter((request) => {
      const statusMatches =
        meetingStatusFilter === "all" || request.status === meetingStatusFilter;
      const district = request.district?.trim() || "Unassigned";
      const districtMatches = !meetingDistrictFilter || district === meetingDistrictFilter;

      return statusMatches && districtMatches;
    });

    return { stats, districtQueues, filteredRequests };
  }, [meetingRequests, meetingStatusFilter, meetingDistrictFilter]);

  const districtOverview = useMemo<DistrictOverview[]>(() => {
    const map = new Map<string, DistrictOverview & { categories: Record<string, number> }>();

    function ensureDistrict(districtValue: string | null | undefined) {
      const district = districtValue?.trim() || "Unassigned";
      if (!map.has(district)) {
        map.set(district, {
          district,
          total: 0,
          active: 0,
          underReview: 0,
          removed: 0,
          approved: 0,
          pendingMeetings: 0,
          topCategory: "—",
          riskScore: 0,
          categories: {},
        });
      }
      return map.get(district)!;
    }

    issues.forEach((issue) => {
      const entry = ensureDistrict(issue.district);
      const status = issue.status || "active";
      const category = issue.category || "Uncategorized";

      entry.total += 1;
      entry.categories[category] = (entry.categories[category] || 0) + 1;

      if (status === "under_review") entry.underReview += 1;
      else if (status === "removed") entry.removed += 1;
      else if (status === "approved") entry.approved += 1;
      else entry.active += 1;
    });

    meetingRequests
      .filter((request) => request.status === "pending")
      .forEach((request) => {
        ensureDistrict(request.district).pendingMeetings += 1;
      });

    return [...map.values()].filter((entry) => entry.district !== "Unassigned")
      .map(({ categories, ...entry }) => {
        const [topCategory] =
          Object.entries(categories).sort((a, b) => b[1] - a[1])[0] || [];
        const riskScore =
          entry.total > 0
            ? Math.round(((entry.underReview + entry.removed) / entry.total) * 100)
            : entry.pendingMeetings > 0
            ? 10
            : 0;

        return {
          ...entry,
          topCategory: topCategory || "—",
          riskScore,
        };
      })
      .sort(
        (a, b) =>
          b.riskScore - a.riskScore ||
          b.pendingMeetings - a.pendingMeetings ||
          b.total - a.total
      )
      .slice(0, 6);
  }, [issues, meetingRequests]);

  const moderationInsights = useMemo(() => {
    const issueMap = new Map<string, Issue>();
    issues.forEach((issue) => issueMap.set(issue.id, issue));

    const actionLogs = auditLogs.filter(
      (log) =>
        log.entity_type === "issue" &&
        ["approved", "removed", "escalated"].includes(log.event_type || "")
    );

    const approvedCount = actionLogs.filter((log) => log.event_type === "approved").length;
    const removedCount = actionLogs.filter((log) => log.event_type === "removed").length;
    const escalatedCount = actionLogs.filter((log) => log.event_type === "escalated").length;
    const totalModerationActions = approvedCount + removedCount + escalatedCount;

    const removedPct =
      totalModerationActions > 0
        ? Math.round((removedCount / totalModerationActions) * 100)
        : 0;

    const approvedPct =
      totalModerationActions > 0
        ? Math.round((approvedCount / totalModerationActions) * 100)
        : 0;

    const escalatedPct =
      totalModerationActions > 0
        ? Math.round((escalatedCount / totalModerationActions) * 100)
        : 0;

    const categoryMap = new Map<string, CategoryMetric>();

    actionLogs.forEach((log) => {
      const issue = log.entity_id ? issueMap.get(log.entity_id) : undefined;
      const category = issue?.category?.trim() || "Uncategorized";

      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          category,
          total: 0,
          removed: 0,
          approved: 0,
          escalated: 0,
        });
      }

      const entry = categoryMap.get(category)!;
      entry.total += 1;

      if (log.event_type === "removed") entry.removed += 1;
      if (log.event_type === "approved") entry.approved += 1;
      if (log.event_type === "escalated") entry.escalated += 1;
    });

    const topFlaggedCategories = [...categoryMap.values()]
      .sort((a, b) => {
        if (b.removed !== a.removed) return b.removed - a.removed;
        if (b.escalated !== a.escalated) return b.escalated - a.escalated;
        return b.total - a.total;
      })
      .slice(0, 5);

    const leaderboardMap = new Map<string, LeaderboardRow>();

    actionLogs.forEach((log) => {
      const actorId = log.actor_id || "unknown";
      const actorName =
        log.details?.actor_name?.trim() || log.actor_role || "Unknown moderator";

      if (!leaderboardMap.has(actorId)) {
        leaderboardMap.set(actorId, {
          actorId,
          actorName,
          totalActions: 0,
          approved: 0,
          removed: 0,
          escalated: 0,
        });
      }

      const entry = leaderboardMap.get(actorId)!;
      entry.totalActions += 1;

      if (log.event_type === "approved") entry.approved += 1;
      if (log.event_type === "removed") entry.removed += 1;
      if (log.event_type === "escalated") entry.escalated += 1;
    });

    const leaderboard = [...leaderboardMap.values()]
      .sort((a, b) => b.totalActions - a.totalActions)
      .slice(0, 5);

    const firstModerationByIssue = new Map<string, AuditLogRow>();

    actionLogs
      .filter((log) => !!log.entity_id && !!log.created_at)
      .forEach((log) => {
        const existing = log.entity_id ? firstModerationByIssue.get(log.entity_id) : undefined;

        if (!log.entity_id) return;

        if (!existing) {
          firstModerationByIssue.set(log.entity_id, log);
          return;
        }

        const existingTime = new Date(existing.created_at || "").getTime();
        const logTime = new Date(log.created_at || "").getTime();

        if (!Number.isNaN(logTime) && (Number.isNaN(existingTime) || logTime < existingTime)) {
          firstModerationByIssue.set(log.entity_id, log);
        }
      });

    let totalResponseMinutes = 0;
    let responseSamples = 0;
    const responseMinutes: number[] = [];

    firstModerationByIssue.forEach((log, issueId) => {
      const issue = issueMap.get(issueId);
      if (!issue?.created_at || !log.created_at) return;

      const createdAt = new Date(issue.created_at).getTime();
      const moderatedAt = new Date(log.created_at).getTime();

      if (Number.isNaN(createdAt) || Number.isNaN(moderatedAt) || moderatedAt < createdAt) {
        return;
      }

      const responseMinute = Math.round((moderatedAt - createdAt) / 60000);
      totalResponseMinutes += responseMinute;
      responseMinutes.push(responseMinute);
      responseSamples += 1;
    });

    const avgResponseMinutes =
      responseSamples > 0 ? Math.round(totalResponseMinutes / responseSamples) : 0;
    const fastestResponseMinutes =
      responseMinutes.length > 0 ? Math.min(...responseMinutes) : 0;
    const slowestResponseMinutes =
      responseMinutes.length > 0 ? Math.max(...responseMinutes) : 0;

    return {
      approvedCount,
      removedCount,
      escalatedCount,
      totalModerationActions,
      removedPct,
      approvedPct,
      escalatedPct,
      topFlaggedCategories,
      leaderboard,
      avgResponseMinutes,
      fastestResponseMinutes,
      slowestResponseMinutes,
      responseSamples,
    };
  }, [issues, auditLogs]);

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

  function formatMinutes(minutes: number) {
    if (minutes <= 0) return "—";
    if (minutes < 60) return `${minutes} min`;
    const hours = (minutes / 60).toFixed(1);
    return `${hours} hrs`;
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
          <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-sm p-6 pl-8 before:absolute before:inset-y-0 before:left-0 before:w-2 before:bg-blue-500">
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
            <button
              type="button"
              onClick={() => handleStatsCardClick("all")}
              className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 p-5 pl-7 text-left shadow-sm transition before:absolute before:inset-y-0 before:left-0 before:w-2 before:bg-slate-500 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
              aria-label="Show all moderation posts"
            >
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
            </button>

            <button
              type="button"
              onClick={() => handleStatsCardClick("active")}
              className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 p-5 pl-7 text-left shadow-sm transition before:absolute before:inset-y-0 before:left-0 before:w-2 before:bg-blue-500 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
              aria-label="Show active moderation posts"
            >
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
            </button>

            <button
              type="button"
              onClick={() => handleStatsCardClick("under_review")}
              className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 p-5 pl-7 text-left shadow-sm transition before:absolute before:inset-y-0 before:left-0 before:w-2 before:bg-yellow-500 hover:-translate-y-0.5 hover:border-yellow-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-700 focus-visible:ring-offset-2"
              aria-label="Show under review moderation posts"
            >
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
            </button>

            <button
              type="button"
              onClick={() => handleStatsCardClick("approved")}
              className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 p-5 pl-7 text-left shadow-sm transition before:absolute before:inset-y-0 before:left-0 before:w-2 before:bg-green-500 hover:-translate-y-0.5 hover:border-green-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2"
              aria-label="Show approved moderation posts"
            >
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
            </button>

            <button
              type="button"
              onClick={() => handleStatsCardClick("removed")}
              className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 p-5 pl-7 text-left shadow-sm transition before:absolute before:inset-y-0 before:left-0 before:w-2 before:bg-red-500 hover:-translate-y-0.5 hover:border-red-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
              aria-label="Show removed moderation posts"
            >
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
            </button>
          </section>

          <section
            ref={surveySectionRef}
            className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <BarChart3 className="h-5 w-5 text-blue-700" />
                    <h2 className="text-xl font-semibold text-slate-900">
                      Multi-District Policy Pulse Surveys
                    </h2>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Launch one survey for all districts. Citizens see and vote
                    only on their district survey; moderators export results by district.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    surveySectionRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    })
                  }
                  className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700"
                >
                  {policySurveys.length} surveys tracked
                </button>
              </div>
            </div>

            <div className="grid gap-6 p-6 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-lg font-semibold text-slate-900">Survey Builder</h3>
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Survey title
                    </label>
                    <input
                      value={surveyForm.title}
                      onChange={(event) =>
                        setSurveyForm((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      placeholder="Example: District Transit Safety Proposal"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Policy summary
                    </label>
                    <textarea
                      value={surveyForm.summary}
                      onChange={(event) =>
                        setSurveyForm((current) => ({
                          ...current,
                          summary: event.target.value,
                        }))
                      }
                      rows={5}
                      placeholder="Explain the proposal, tradeoffs, and what resident input will decide."
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Survey question
                    </label>
                    <input
                      value={surveyForm.primaryQuestion}
                      onChange={(event) =>
                        setSurveyForm((current) => ({
                          ...current,
                          primaryQuestion: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Voting deadline
                    </label>
                    <input
                      type="date"
                      value={surveyForm.deadline}
                      onChange={(event) =>
                        setSurveyForm((current) => ({
                          ...current,
                          deadline: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label className="block text-sm font-semibold text-slate-700">
                        Attachments <span className="font-normal text-slate-400">(optional)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => surveyFileInputRef.current?.click()}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Add files
                      </button>
                    </div>
                    <input
                      ref={surveyFileInputRef}
                      type="file"
                      multiple
                      onChange={(event) => {
                        const files = Array.from(event.target.files ?? []);
                        if (files.length > 0) {
                          setSurveyFiles((current) => [...current, ...files]);
                        }
                      }}
                      className="hidden"
                    />
                    <p className="text-xs leading-5 text-slate-500">
                      Attach briefs, one-pagers, or slide decks for residents to review
                      before voting. The same files are shared to every district.
                    </p>
                    {surveyFiles.length > 0 ? (
                      <ul className="mt-3 space-y-2">
                        {surveyFiles.map((file, index) => (
                          <li
                            key={`${file.name}-${index}`}
                            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
                          >
                            <span className="min-w-0 truncate text-sm text-slate-700">
                              {file.name}{" "}
                              <span className="text-xs text-slate-400">
                                ({(file.size / 1024).toFixed(1)} KB)
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setSurveyFiles((current) =>
                                  current.filter((_, i) => i !== index)
                                )
                              }
                              className="shrink-0 text-xs font-semibold text-red-600 hover:underline"
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={handleLaunchDistrictSurveys}
                    disabled={surveyPublishing}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {surveyPublishing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                    {surveyPublishing
                      ? "Launching surveys..."
                      : "Launch for All Districts"}
                  </button>

                  {surveyMessage ? (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
                      {surveyMessage}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-4">
                {districtSurveyRows.map((row) => (
                  <div
                    key={row.district}
                    className="rounded-2xl border border-slate-200 bg-white p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                            {row.district}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              row.latestSurvey
                                ? row.votingClosed
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-yellow-100 text-yellow-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {row.latestSurvey
                              ? row.votingClosed
                                ? "Voting finished"
                                : "Voting open"
                              : "No survey yet"}
                          </span>
                        </div>
                        <h3 className="mt-3 text-lg font-semibold text-slate-900">
                          {row.latestSurvey?.title || "No district survey launched"}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {row.latestSurvey
                            ? row.latestSurvey.summary
                            : "Launch a survey to collect district-specific votes and feedback."}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-500">
                          <span>{row.totalVotes} votes</span>
                          <span>{row.responseCount} feedback responses</span>
                          {row.latestSurvey ? (
                            <span>Deadline {formatDate(row.latestSurvey.deadline)}</span>
                          ) : null}
                        </div>

                        {row.latestSurvey && row.totalVotes > 0 && (
                          <div className="mt-4 space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Live Vote Breakdown
                            </p>
                            {voteOptions.map((option) => {
                              const count = row.latestSurvey!.votes[option] ?? 0;
                              const pct = row.totalVotes > 0 ? Math.round((count / row.totalVotes) * 100) : 0;
                              const barColor =
                                option === "Strongly Support" ? "bg-emerald-500"
                                : option === "Support" ? "bg-emerald-300"
                                : option === "Neutral" ? "bg-slate-300"
                                : option === "Oppose" ? "bg-red-300"
                                : "bg-red-500";
                              return (
                                <div key={option} className="flex items-center gap-2 text-sm">
                                  <span className="w-32 shrink-0 text-slate-600">{option}</span>
                                  <div className="flex-1 rounded-full bg-slate-100 h-2">
                                    <div
                                      className={`h-2 rounded-full ${barColor} transition-all`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span className="w-14 text-right text-slate-500">
                                    {count} ({pct}%)
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {row.latestSurvey && row.latestSurvey.uploadedFiles.length > 0 && (
                          <div className="mt-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                              Attached Documents ({row.latestSurvey.uploadedFiles.length})
                            </p>
                            <div className="space-y-2">
                              {row.latestSurvey.uploadedFiles.map((file, i) => (
                                <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
                                  <span className="text-lg">📄</span>
                                  <div className="flex-1 min-w-0">
                                    {file.url ? (
                                      <a
                                        href={file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm font-semibold text-blue-700 hover:underline truncate block"
                                      >
                                        {file.name}
                                      </a>
                                    ) : (
                                      <p className="text-sm font-semibold text-slate-800 truncate">{file.name}</p>
                                    )}
                                    <p className="text-xs text-slate-500">{file.type} · {file.size}</p>
                                  </div>
                                  {file.url && (
                                    <a
                                      href={file.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="shrink-0 rounded-lg bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                                    >
                                      View
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {row.latestSurvey && row.latestSurvey.recentResponses.length > 0 && (
                          <div className="mt-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                              Citizen Responses (latest {row.latestSurvey.recentResponses.length})
                            </p>
                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                              <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-left">
                                  <tr>
                                    <th className="px-3 py-2 text-xs font-semibold text-slate-500">Citizen</th>
                                    <th className="px-3 py-2 text-xs font-semibold text-slate-500">Vote</th>
                                    <th className="px-3 py-2 text-xs font-semibold text-slate-500">Top Concern</th>
                                    <th className="px-3 py-2 text-xs font-semibold text-slate-500">Recommendation</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {row.latestSurvey.recentResponses.map((r, i) => (
                                    <tr key={i} className="bg-white">
                                      <td className="px-3 py-2 text-slate-700">{r.citizenLabel}</td>
                                      <td className="px-3 py-2">
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                          r.supportLevel === "Strongly Support" || r.supportLevel === "Support"
                                            ? "bg-emerald-100 text-emerald-700"
                                            : r.supportLevel === "Neutral"
                                            ? "bg-slate-100 text-slate-600"
                                            : "bg-red-100 text-red-700"
                                        }`}>
                                          {r.supportLevel}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 text-slate-600">{r.topConcern}</td>
                                      <td className="px-3 py-2 text-slate-600">{r.recommendation}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 lg:flex-col">
                        <button
                          type="button"
                          onClick={() =>
                            row.latestSurvey &&
                            handleExportDistrictSurveyPdf(row.latestSurvey)
                          }
                          disabled={!row.latestSurvey || !row.votingClosed}
                          title={
                            row.latestSurvey && !row.votingClosed
                              ? "Export unlocks after district voting finishes"
                              : "Export district survey results to PDF"
                          }
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Export PDF
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            row.latestSurvey && handleShareSurveyResults(row.latestSurvey)
                          }
                          disabled={
                            !row.latestSurvey ||
                            !row.votingClosed ||
                            sharingSurveyDistrict === row.district
                          }
                          title={
                            row.latestSurvey && !row.votingClosed
                              ? "Sharing unlocks after district voting finishes"
                              : "Share district results with representatives"
                          }
                          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {sharingSurveyDistrict === row.district
                            ? "Sharing..."
                            : "Share with reps"}
                        </button>
                        {row.latestSurvey &&
                          broadcastDistricts.some(
                            (d) => d !== row.district
                          ) && (
                            <button
                              type="button"
                              onClick={() =>
                                row.latestSurvey &&
                                handleBroadcastSurvey(row.latestSurvey)
                              }
                              disabled={
                                broadcastingSurveyId === row.latestSurvey?.id
                              }
                              title={`Broadcast this survey to ${broadcastDistricts.filter((d) => d !== row.district).join(", ")}`}
                              className="rounded-xl border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {broadcastingSurveyId === row.latestSurvey?.id
                                ? "Broadcasting..."
                                : `Broadcast to ${broadcastDistricts.filter((d) => d !== row.district).join(", ")}`}
                            </button>
                          )}
                        {row.latestSurvey && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (!row.latestSurvey) return;
                              const next = !row.latestSurvey.isPublished;
                              await toggleSurveyPublished(supabase, row.latestSurvey.id, next);
                              await fetchPolicySurveys();
                            }}
                            className={`rounded-xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
                              row.latestSurvey.isPublished
                                ? "border border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                                : "border border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                            }`}
                          >
                            {row.latestSurvey.isPublished ? "Unpublish" : "Republish"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {broadcastMessage && (
                  <p className="mt-2 text-sm font-medium text-indigo-700">
                    {broadcastMessage}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-slate-950 text-white shadow-sm overflow-hidden">
            <div className="border-b border-white/10 px-6 py-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <ListChecks className="h-5 w-5 text-blue-300" />
                    <h2 className="text-xl font-semibold">Moderator Command Queue</h2>
                  </div>
                  <p className="mt-1 text-sm text-slate-300">
                    Ranked by review status, age, category risk, and urgency language.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {lowRiskQueueIds.length > 0 ? (
                    <button
                      onClick={() => setSelectedQueueIds(lowRiskQueueIds)}
                      className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
                    >
                      Select low-risk
                    </button>
                  ) : null}

                  <button
                    onClick={handleBulkApproveSelected}
                    disabled={
                      selectedQueueIds.length === 0 || actionLoadingId === "bulk-approve"
                    }
                    className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionLoadingId === "bulk-approve"
                      ? "Approving..."
                      : `Bulk approve ${selectedQueueIds.length || ""}`.trim()}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              {triageQueue.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 px-6 py-12 text-center">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-300" />
                  <h3 className="mt-4 text-lg font-semibold">No urgent moderation work</h3>
                  <p className="mt-2 text-sm text-slate-300">
                    Active and under-review posts will appear here automatically.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {triageQueue.map((item) => (
                    <article
                      key={item.issue.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.06] p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-blue-400/15 px-3 py-1 text-xs font-semibold text-blue-200">
                              Priority {item.score}
                            </span>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${item.slaClass}`}
                            >
                              {item.slaLabel}
                            </span>
                            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                              {item.ageHours}h old
                            </span>
                          </div>

                          <h3 className="mt-4 text-lg font-semibold leading-7 text-white">
                            {item.issue.title}
                          </h3>
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-300">
                            {item.issue.description}
                          </p>
                        </div>

                        {item.bulkEligible ? (
                          <label className="flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold text-slate-100">
                            <input
                              type="checkbox"
                              checked={selectedQueueIds.includes(item.issue.id)}
                              onChange={() => toggleQueueSelection(item.issue.id)}
                              className="h-4 w-4"
                            />
                            Bulk
                          </label>
                        ) : null}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {item.reasonChips.map((chip) => (
                          <span
                            key={chip}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200"
                          >
                            {chip}
                          </span>
                        ))}
                      </div>

                      <div className="mt-5 rounded-2xl bg-white/10 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">
                          Suggested action
                        </p>
                        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm font-semibold text-white">
                            {item.suggestedAction}
                          </p>
                          <button
                            onClick={() =>
                              updateIssueStatus(item.issue.id, item.suggestedStatus)
                            }
                            disabled={actionLoadingId === item.issue.id}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-100 disabled:opacity-60"
                          >
                            {actionLoadingId === item.issue.id ? "Updating..." : "Apply"}
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          onClick={() => updateIssueStatus(item.issue.id, "approved")}
                          disabled={actionLoadingId === item.issue.id}
                          className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => updateIssueStatus(item.issue.id, "under_review")}
                          disabled={actionLoadingId === item.issue.id}
                          className="rounded-xl bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-yellow-300 disabled:opacity-60"
                        >
                          Escalate
                        </button>
                        <button
                          onClick={() => updateIssueStatus(item.issue.id, "removed")}
                          disabled={actionLoadingId === item.issue.id}
                          className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400 disabled:opacity-60"
                        >
                          Remove
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <ListChecks className="h-5 w-5 text-blue-700" />
                <h2 className="text-xl font-semibold text-slate-900">
                  Moderator Review Checklist
                </h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Use these checks to make consistent approve, remove, or escalate decisions.
              </p>

              <div className="mt-5 space-y-3">
                {[
                  {
                    title: "Actionable civic issue",
                    detail: "Confirm the post describes a local service, safety, infrastructure, or community concern.",
                    example: "Approve when the issue is clear and relevant to officials.",
                  },
                  {
                    title: "Enough context",
                    detail: "Look for location, timing, affected residents, photos, or repeat patterns.",
                    example: "Escalate if the issue is valid but needs more review.",
                  },
                  {
                    title: "Policy or safety risk",
                    detail: "Check for threats, harassment, private information, spam, or unsupported allegations.",
                    example: "Remove clear violations and escalate uncertain cases.",
                  },
                ].map((tip) => (
                  <div key={tip.title} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <p className="font-semibold text-slate-900">{tip.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{tip.detail}</p>
                    <p className="mt-2 rounded-xl bg-white px-3 py-2 text-xs font-medium text-slate-500">
                      {tip.example}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
              <div className="border-b border-slate-200 px-6 py-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <Video className="h-5 w-5 text-indigo-700" />
                      <h2 className="text-xl font-semibold text-slate-900">
                        Video Meeting Coordination
                      </h2>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      Intake citizen requests, group them by district, and coordinate links with representatives.
                    </p>
                  </div>
                  <span className="rounded-xl bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">
                    {pendingMeetingRequests.length} pending
                  </span>
                </div>
              </div>

              <div className="space-y-5 p-6">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                  {[
                    { key: "all", label: "All", value: meetingCoordination.stats.all, tone: "slate" },
                    { key: "pending", label: "Pending", value: meetingCoordination.stats.pending, tone: "yellow" },
                    { key: "approved", label: "Scheduled", value: meetingCoordination.stats.approved, tone: "indigo" },
                    { key: "completed", label: "Completed", value: meetingCoordination.stats.completed, tone: "emerald" },
                    { key: "rejected", label: "Declined", value: meetingCoordination.stats.rejected, tone: "red" },
                  ].map((item) => {
                    const selected = meetingStatusFilter === item.key;
                    const toneClasses =
                      item.tone === "yellow"
                        ? selected
                          ? "border-yellow-400 bg-yellow-50 text-yellow-800"
                          : "border-yellow-200 bg-white text-slate-700"
                        : item.tone === "indigo"
                        ? selected
                          ? "border-indigo-400 bg-indigo-50 text-indigo-800"
                          : "border-indigo-200 bg-white text-slate-700"
                        : item.tone === "emerald"
                        ? selected
                          ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                          : "border-emerald-200 bg-white text-slate-700"
                        : item.tone === "red"
                        ? selected
                          ? "border-red-400 bg-red-50 text-red-800"
                          : "border-red-200 bg-white text-slate-700"
                        : selected
                        ? "border-slate-400 bg-slate-100 text-slate-900"
                        : "border-slate-200 bg-white text-slate-700";

                    return (
                      <button
                        type="button"
                        key={item.key}
                        onClick={() => setMeetingStatusFilter(item.key as MeetingStatusFilter)}
                        className={`rounded-2xl border-2 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2 ${toneClasses}`}
                      >
                        <p className="text-xs font-semibold uppercase">{item.label}</p>
                        <p className="mt-1 text-2xl font-bold">{item.value}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                    <p className="text-sm font-semibold text-indigo-900">1. Intake</p>
                    <p className="mt-1 text-sm leading-6 text-indigo-800">
                      Multiple citizens submit topics, preferred times, district, and representative.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-sm font-semibold text-blue-900">2. Batch by district</p>
                    <p className="mt-1 text-sm leading-6 text-blue-800">
                      The moderator groups similar requests so one representative can handle a useful agenda.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="text-sm font-semibold text-emerald-900">3. Coordinate</p>
                    <p className="mt-1 text-sm leading-6 text-emerald-800">
                      Approve to generate a meeting link, reject duplicates, then mark completed after the call.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">District request queues</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Click a district to review only requests for that queue.
                      </p>
                    </div>
                    {meetingDistrictFilter ? (
                      <button
                        type="button"
                        onClick={() => setMeetingDistrictFilter(null)}
                        className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                      >
                        Clear district
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                    {meetingCoordination.districtQueues.length === 0 ? (
                      <div className="min-w-full rounded-xl border border-dashed border-slate-300 bg-white px-4 py-5 text-center text-sm text-slate-500">
                        District queues will appear as residents submit meeting requests.
                      </div>
                    ) : (
                      meetingCoordination.districtQueues.map((queue) => {
                        const selected = meetingDistrictFilter === queue.district;
                        return (
                          <button
                            type="button"
                            key={queue.district}
                            onClick={() =>
                              setMeetingDistrictFilter(selected ? null : queue.district)
                            }
                            className={`min-w-48 rounded-2xl border-2 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2 ${
                              selected
                                ? "border-indigo-400 bg-white"
                                : "border-slate-200 bg-white"
                            }`}
                          >
                            <p className="text-sm font-semibold text-slate-900">
                              {queue.district}
                            </p>
                            <p className="mt-2 text-2xl font-bold text-indigo-700">
                              {queue.pending}
                            </p>
                            <p className="text-xs font-medium text-slate-500">
                              pending of {queue.total} requests
                            </p>
                            <p className="mt-2 text-xs text-slate-500">
                              {queue.representativeCount} representative
                              {queue.representativeCount === 1 ? "" : "s"}
                            </p>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {meetingRequests.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
                    <Video className="mx-auto h-8 w-8 text-slate-400" />
                    <h3 className="mt-4 text-lg font-semibold text-slate-800">
                      No meeting requests yet
                    </h3>
                    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                      When residents request time with a district representative, this panel becomes the moderator coordination desk: intake, queue, approve links, and close outcomes.
                    </p>
                  </div>
                ) : meetingCoordination.filteredRequests.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
                    <Video className="mx-auto h-8 w-8 text-slate-400" />
                    <h3 className="mt-4 text-lg font-semibold text-slate-800">
                      No matching requests
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">
                      Try a different status or district queue.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {meetingCoordination.filteredRequests.slice(0, 6).map((request) => (
                      <div
                        key={request.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                {request.status}
                              </span>
                              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                              {request.district || "No district"}
                              </span>
                              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                {request.representative_name || "Representative"}
                              </span>
                            </div>
                            <h3 className="mt-3 font-semibold text-slate-900">
                              {request.topic}
                            </h3>
                            <p className="mt-1 text-sm leading-6 text-slate-600">
                              {request.citizen_name || "Citizen"} with{" "}
                              {request.representative_name || "Representative"}
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-xs text-slate-500">
                              Preferred: {request.preferred_times}
                            </p>
                            {request.notes ? (
                              <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                                Notes: {request.notes}
                              </p>
                            ) : null}
                            {request.meeting_url ? (
                              <a
                                href={request.meeting_url}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 inline-flex text-sm font-semibold text-blue-700 hover:underline"
                              >
                                Open meeting link
                              </a>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap gap-2 lg:justify-end">
                            {request.status === "pending" ? (
                              <>
                                <button
                                  onClick={() => updateMeetingRequestStatus(request, "approved")}
                                  disabled={meetingActionLoadingId === request.id}
                                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => updateMeetingRequestStatus(request, "rejected")}
                                  disabled={meetingActionLoadingId === request.id}
                                  className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
                                >
                                  Reject
                                </button>
                              </>
                            ) : request.status === "approved" ? (
                              <button
                                onClick={() => updateMeetingRequestStatus(request, "completed")}
                                disabled={meetingActionLoadingId === request.id}
                                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                              >
                                Complete
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                    {meetingCoordination.filteredRequests.length > 6 ? (
                      <p className="text-center text-sm text-slate-500">
                        Showing 6 of {meetingCoordination.filteredRequests.length} matching requests.
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <MapPinned className="h-5 w-5 text-slate-700" />
                <h2 className="text-xl font-semibold text-slate-900">
                  District Operations Overview
                </h2>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                A cross-district view of moderation load, meeting demand, and risk.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
              {districtOverview.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500 md:col-span-2 xl:col-span-3">
                  District activity will appear as posts and meeting requests come in.
                </div>
              ) : (
                districtOverview.map((district, index) => {
                  const railClass =
                    ["before:bg-orange-500", "before:bg-blue-500", "before:bg-red-500", "before:bg-emerald-500"][
                      index % 4
                    ];

                  return (
                    <button
                      type="button"
                      key={district.district}
                      onClick={() => handleDistrictCardClick(district.district)}
                      className={`relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 pl-7 text-left shadow-sm transition before:absolute before:inset-y-0 before:left-0 before:w-2 ${railClass} hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2`}
                      aria-label={`Show moderation posts for ${district.district}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm text-slate-500">District</p>
                          <h3 className="mt-1 text-2xl font-bold text-slate-900">
                            {district.district}
                          </h3>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            district.riskScore >= 50
                              ? "bg-red-100 text-red-700"
                              : district.riskScore >= 25
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          Risk {district.riskScore}%
                        </span>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                          <p className="text-slate-500">Posts</p>
                          <p className="mt-1 text-lg font-bold text-slate-900">{district.total}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                          <p className="text-slate-500">Review</p>
                          <p className="mt-1 text-lg font-bold text-yellow-700">{district.underReview}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                          <p className="text-slate-500">Meetings</p>
                          <p className="mt-1 text-lg font-bold text-indigo-700">{district.pendingMeetings}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                          <p className="text-slate-500">Top Theme</p>
                          <p className="mt-1 truncate font-semibold text-slate-900">{district.topCategory}</p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-slate-700" />
                <h2 className="text-xl font-semibold text-slate-900">
                  Moderation Insights
                </h2>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Analytics on moderation outcomes, flagged categories, response time, and moderator activity.
              </p>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedInsight(selectedInsight === "outcomes" ? null : "outcomes")
                  }
                  className={`rounded-2xl border-2 bg-slate-50 p-5 text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2 ${
                    selectedInsight === "outcomes"
                      ? "border-red-400 bg-red-50"
                      : "border-red-200"
                  }`}
                  aria-expanded={selectedInsight === "outcomes"}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">% Removed vs Approved</p>
                    <TrendingUp className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="mt-3 text-2xl font-bold text-slate-900">
                    {moderationInsights.removedPct}% removed
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {moderationInsights.approvedPct}% approved
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedInsight(selectedInsight === "response" ? null : "response")
                  }
                  className={`rounded-2xl border-2 bg-slate-50 p-5 text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 ${
                    selectedInsight === "response"
                      ? "border-blue-400 bg-blue-50"
                      : "border-blue-200"
                  }`}
                  aria-expanded={selectedInsight === "response"}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">Avg Response Time</p>
                    <Timer className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="mt-3 text-2xl font-bold text-slate-900">
                    {formatMinutes(moderationInsights.avgResponseMinutes)}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Based on {moderationInsights.responseSamples} moderated posts
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedInsight(selectedInsight === "escalation" ? null : "escalation")
                  }
                  className={`rounded-2xl border-2 bg-slate-50 p-5 text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-700 focus-visible:ring-offset-2 ${
                    selectedInsight === "escalation"
                      ? "border-yellow-400 bg-yellow-50"
                      : "border-yellow-200"
                  }`}
                  aria-expanded={selectedInsight === "escalation"}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">Escalation Rate</p>
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div className="mt-3 text-2xl font-bold text-slate-900">
                    {moderationInsights.escalatedPct}%
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {moderationInsights.escalatedCount} escalations logged
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedInsight(selectedInsight === "actions" ? null : "actions")
                  }
                  className={`rounded-2xl border-2 bg-slate-50 p-5 text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2 ${
                    selectedInsight === "actions"
                      ? "border-indigo-400 bg-indigo-50"
                      : "border-indigo-200"
                  }`}
                  aria-expanded={selectedInsight === "actions"}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">Moderation Actions</p>
                    <History className="h-5 w-5 text-indigo-500" />
                  </div>
                  <div className="mt-3 text-2xl font-bold text-slate-900">
                    {moderationInsights.totalModerationActions}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Approvals, removals, and escalations
                  </p>
                </button>
              </div>

              {selectedInsight ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase text-slate-500">
                        Metric Details
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-slate-900">
                        {selectedInsight === "outcomes"
                          ? "Removal and approval breakdown"
                          : selectedInsight === "response"
                          ? "Response time distribution"
                          : selectedInsight === "escalation"
                          ? "Escalation breakdown"
                          : "Moderation action totals"}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedInsight(null)}
                      className="self-start rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-200"
                    >
                      Close
                    </button>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                    {selectedInsight === "outcomes" ? (
                      <>
                        <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                          <p className="text-sm text-red-700">Removed</p>
                          <p className="mt-1 text-2xl font-bold text-slate-900">
                            {moderationInsights.removedCount}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {moderationInsights.removedPct}% of logged actions
                          </p>
                        </div>
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                          <p className="text-sm text-emerald-700">Approved</p>
                          <p className="mt-1 text-2xl font-bold text-slate-900">
                            {moderationInsights.approvedCount}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {moderationInsights.approvedPct}% of logged actions
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-sm text-slate-600">Total actions</p>
                          <p className="mt-1 text-2xl font-bold text-slate-900">
                            {moderationInsights.totalModerationActions}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Approvals, removals, and escalations
                          </p>
                        </div>
                      </>
                    ) : null}

                    {selectedInsight === "response" ? (
                      <>
                        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                          <p className="text-sm text-blue-700">Average</p>
                          <p className="mt-1 text-2xl font-bold text-slate-900">
                            {formatMinutes(moderationInsights.avgResponseMinutes)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Across {moderationInsights.responseSamples} first actions
                          </p>
                        </div>
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                          <p className="text-sm text-emerald-700">Fastest</p>
                          <p className="mt-1 text-2xl font-bold text-slate-900">
                            {formatMinutes(moderationInsights.fastestResponseMinutes)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Shortest post-to-action time
                          </p>
                        </div>
                        <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
                          <p className="text-sm text-orange-700">Slowest</p>
                          <p className="mt-1 text-2xl font-bold text-slate-900">
                            {formatMinutes(moderationInsights.slowestResponseMinutes)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Longest post-to-action time
                          </p>
                        </div>
                      </>
                    ) : null}

                    {selectedInsight === "escalation" ? (
                      <>
                        <div className="rounded-xl border border-yellow-100 bg-yellow-50 p-4">
                          <p className="text-sm text-yellow-700">Escalated</p>
                          <p className="mt-1 text-2xl font-bold text-slate-900">
                            {moderationInsights.escalatedCount}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {moderationInsights.escalatedPct}% of logged actions
                          </p>
                        </div>
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                          <p className="text-sm text-emerald-700">Approved</p>
                          <p className="mt-1 text-2xl font-bold text-slate-900">
                            {moderationInsights.approvedCount}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Non-escalation resolution path
                          </p>
                        </div>
                        <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                          <p className="text-sm text-red-700">Removed</p>
                          <p className="mt-1 text-2xl font-bold text-slate-900">
                            {moderationInsights.removedCount}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Enforcement resolution path
                          </p>
                        </div>
                      </>
                    ) : null}

                    {selectedInsight === "actions" ? (
                      <>
                        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                          <p className="text-sm text-indigo-700">Total actions</p>
                          <p className="mt-1 text-2xl font-bold text-slate-900">
                            {moderationInsights.totalModerationActions}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            All logged moderation decisions
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-sm text-slate-600">Top moderator</p>
                          <p className="mt-1 text-lg font-bold text-slate-900">
                            {moderationInsights.leaderboard[0]?.actorName || "No activity yet"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {moderationInsights.leaderboard[0]?.totalActions || 0} actions
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-sm text-slate-600">Action mix</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {moderationInsights.approvedCount} approved,{" "}
                            {moderationInsights.removedCount} removed,{" "}
                            {moderationInsights.escalatedCount} escalated
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Based on audit log entries
                          </p>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-slate-700" />
                    <h3 className="text-lg font-semibold text-slate-900">
                      Top Flagged Categories
                    </h3>
                  </div>

                  <div className="mt-4 space-y-3">
                    {moderationInsights.topFlaggedCategories.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                        No category insights available yet.
                      </div>
                    ) : (
                      moderationInsights.topFlaggedCategories.map((item, index) => {
                        const railClass =
                          ["before:bg-orange-500", "before:bg-blue-500", "before:bg-red-500", "before:bg-emerald-500"][
                            index % 4
                          ];

                        return (
                          <button
                            type="button"
                            key={item.category}
                            onClick={() => handleCategoryInsightClick(item.category)}
                            className={`relative w-full overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 pl-6 text-left shadow-sm transition before:absolute before:inset-y-0 before:left-0 before:w-2 ${railClass} hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-700 focus-visible:ring-offset-2`}
                            aria-label={`Show moderation posts in ${item.category}`}
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <p className="font-semibold text-slate-900">
                                  {item.category}
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                  {item.total} moderation actions
                                </p>
                              </div>

                              <div className="text-right text-sm text-slate-600">
                                <div>Removed: {item.removed}</div>
                                <div>Approved: {item.approved}</div>
                                <div>Escalated: {item.escalated}</div>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-slate-700" />
                    <h3 className="text-lg font-semibold text-slate-900">
                      Moderator Activity Leaderboard
                    </h3>
                  </div>

                  <div className="mt-4 space-y-3">
                    {moderationInsights.leaderboard.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                        No moderator activity logged yet.
                      </div>
                    ) : (
                      moderationInsights.leaderboard.map((item, index) => {
                        const railClass =
                          ["before:bg-orange-500", "before:bg-blue-500", "before:bg-red-500", "before:bg-emerald-500"][
                            index % 4
                          ];

                        return (
                          <button
                            type="button"
                            key={`${item.actorId}-${index}`}
                            onClick={() => handleLeaderboardClick(item)}
                            className={`relative w-full overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 pl-6 text-left shadow-sm transition before:absolute before:inset-y-0 before:left-0 before:w-2 ${railClass} hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2`}
                            aria-label={`Show audit trail entries for ${item.actorName}`}
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <p className="font-semibold text-slate-900">
                                  #{index + 1} {item.actorName}
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                  {item.totalActions} total actions
                                </p>
                              </div>

                              <div className="text-right text-sm text-slate-600">
                                <div>Approved: {item.approved}</div>
                                <div>Removed: {item.removed}</div>
                                <div>Escalated: {item.escalated}</div>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section
            ref={postsSectionRef}
            className="scroll-mt-6 rounded-3xl bg-white border border-slate-200 shadow-sm p-5"
          >
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

          <section
            ref={auditTrailRef}
            className="scroll-mt-6 rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="border-b border-slate-200 px-6 py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
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

                {auditActorFilter ? (
                  <button
                    type="button"
                    onClick={() => setAuditActorFilter(null)}
                    className="rounded-xl bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
                  >
                    Showing {auditActorFilter.actorName}. Clear
                  </button>
                ) : null}
              </div>
            </div>

            <div className="p-6">
              {filteredAuditLogs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
                  <History className="mx-auto h-8 w-8 text-slate-400" />
                  <h3 className="mt-4 text-lg font-semibold text-slate-800">
                    {auditActorFilter ? "No matching audit activity" : "No audit activity yet"}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    {auditActorFilter
                      ? "Clear the moderator filter to see all audit activity."
                      : "Moderator actions will appear here automatically."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAuditLogs.map((log) => (
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
