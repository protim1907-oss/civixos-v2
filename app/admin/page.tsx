"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getDonorTier, donorKey, type DonorTier } from "@/lib/donor-tiers";
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
  History,
  Video,
  CheckCircle2,
  XCircle,
  HeartHandshake,
  DollarSign,
  Plus,
  X,
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
  avgResponseMinutes: number;
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

type ActivityLogRow = {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  entity_type: string | null;
  entity_id: string | null;
  event_type: string | null;
  details: Record<string, unknown> | null;
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
  topic: string | null;
  preferred_times: string | null;
  notes: string | null;
  status: "pending" | "approved" | "rejected" | "completed" | null;
  meeting_url: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string | null;
};

type DistrictRepresentativeAdminRow = {
  id: string;
  district_code: string;
  state: string | null;
  name: string;
  title: string;
  office_label: string;
  party: string | null;
  website: string | null;
  contact_url: string | null;
  phone: string | null;
  is_active: boolean;
};

type PlatformDonation = {
  id: string;
  donor_name: string | null;
  donor_email: string | null;
  amount: number;
  currency: string;
  payment_method: string | null;
  recurring: boolean | null;
  notes: string | null;
  created_at: string | null;
};

type AdminKpiDestination =
  | "users"
  | "posts"
  | "escalated"
  | "removed"
  | "moderators"
  | "officials"
  | "meetings"
  | "donations";

type ModerationInsightDestination =
  | "outcomes"
  | "escalations"
  | "resolution"
  | "categories";

type AdminPostView = "escalated" | "removed" | "all";
type AuditTrailView = "live" | "outcomes" | "categories";
type DistrictRiskMetric = "total" | "escalated" | "removed" | "reviewTime";

function normalizeDistrict(value: string | null | undefined) {
  const raw = (value || "").trim();
  if (!raw) return "";

  const upper = raw.toUpperCase();

  if (upper === "UNKNOWN" || upper === "UNASSIGNED" || upper === "N/A") return "";
  if (upper === "DISTRICT 12") return "CA-42";
  if (upper === "DISTRICT 42") return "CA-42";
  if (upper === "CA42") return "CA-42";
  if (upper === "TX35") return "TX-35";
  if (upper === "TX20") return "TX-20";
  if (upper === "TX12") return "TX-12";

  const compactMatch = upper.match(/^([A-Z]{2})(\d{1,2})$/);
  if (compactMatch) {
    return padDistrict(`${compactMatch[1]}-${Number(compactMatch[2])}`);
  }

  const spacedMatch = upper.match(/^([A-Z]{2})[\s-]?(\d{1,2})$/);
  if (spacedMatch) {
    return padDistrict(`${spacedMatch[1]}-${Number(spacedMatch[2])}`);
  }

  return padDistrict(raw);
}

// Maryland and Colorado districts are canonicalized zero-padded (MD-1 -> MD-01,
// CO-1 -> CO-01).
function padDistrict(code: string) {
  const match = code.match(/^(MD|CO)-(\d{1,2})$/);
  return match ? `${match[1]}-${match[2].padStart(2, "0")}` : code;
}

// Names hidden from the admin console (rows still exist in Supabase, they are
// just filtered out of the UI list and stats). Matched case-insensitively.
const EXCLUDED_USER_NAMES = [
  "protim ghosh",
  "costa brown",
  "constantinos brown",
  "il demo citizen",
  "md demo citizen",
  "co demo citizen",
  "protim",
];

function isExcludedUserName(fullName: string | null | undefined) {
  return EXCLUDED_USER_NAMES.includes((fullName ?? "").trim().toLowerCase());
}

// A profile is hidden from the console when its name is excluded (test/personal
// accounts). The rows still exist in Supabase — they are just filtered out of
// the UI list and stats, for every role including moderators/admins. Both the
// user list and the Moderators count use this, so they stay in sync.
function isHiddenProfile(profile: { full_name: string | null; role: string | null }) {
  return isExcludedUserName(profile.full_name);
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [currentUserProfile, setCurrentUserProfile] = useState<ProfileRow | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [moderationQueue, setModerationQueue] = useState<ModerationQueueRow[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogRow[]>([]);
  const [districtRepresentatives, setDistrictRepresentatives] = useState<
    DistrictRepresentativeAdminRow[]
  >([]);
  const [videoMeetingRequests, setVideoMeetingRequests] = useState<
    VideoMeetingRequestRow[]
  >([]);

  const [moderationInsights, setModerationInsights] = useState<ModerationInsightStats>({
    approvedPct: 0,
    removedPct: 0,
    totalEscalations: 0,
    avgResponseMinutes: 0,
    topCategories: [],
  });

  const [districtRiskRows, setDistrictRiskRows] = useState<DistrictRiskRow[]>([]);
  const [donations, setDonations] = useState<PlatformDonation[]>([]);
  const [showDonationForm, setShowDonationForm] = useState(false);
  const [donationFormLoading, setDonationFormLoading] = useState(false);
  const [donationForm, setDonationForm] = useState({
    donor_name: "",
    donor_email: "",
    amount: "",
    payment_method: "givebutter",
    recurring: false,
    notes: "",
  });
  const donationsRef = useRef<HTMLElement | null>(null);

  const [issueSearch, setIssueSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [adminPostView, setAdminPostView] = useState<AdminPostView>("escalated");
  const [auditTrailView, setAuditTrailView] = useState<AuditTrailView>("live");
  const [selectedDrilldownDistrict, setSelectedDrilldownDistrict] = useState<string | null>(
    null
  );

  const [issueActionLoadingId, setIssueActionLoadingId] = useState<string | null>(null);
  const [roleActionLoadingId, setRoleActionLoadingId] = useState<string | null>(null);
  const [meetingActionLoadingId, setMeetingActionLoadingId] = useState<string | null>(
    null
  );
  const userManagementRef = useRef<HTMLElement | null>(null);
  const escalatedCasesRef = useRef<HTMLElement | null>(null);
  const videoMeetingsRef = useRef<HTMLElement | null>(null);
  const auditTrailRef = useRef<HTMLElement | null>(null);
  const districtDrilldownRef = useRef<HTMLElement | null>(null);

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

    const activityLogsChannel = supabase
      .channel("admin-live-activity-logs")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activity_logs" },
        async () => {
          await loadActivityLogs();
        }
      )
      .subscribe();

    const videoMeetingRequestsChannel = supabase
      .channel("admin-live-video-meeting-requests")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "video_meeting_requests" },
        async () => {
          await loadVideoMeetingRequests();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(issuesChannel);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(moderationQueueChannel);
      supabase.removeChannel(activityLogsChannel);
      supabase.removeChannel(videoMeetingRequestsChannel);
    };
  }, [router, supabase]);

  useEffect(() => {
    computeModerationInsights();
    computeDistrictRiskSignals();
  }, [activityLogs, issues, moderationQueue]);

  async function loadDashboardData() {
    await Promise.all([
      loadIssues(),
      loadProfiles(),
      loadModerationQueue(),
      loadActivityLogs(),
      loadDistrictRepresentatives(),
      loadVideoMeetingRequests(),
      loadDonations(),
    ]);
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

  async function loadActivityLogs() {
    const { data, error } = await supabase
      .from("activity_logs")
      .select("id, actor_id, actor_role, entity_type, entity_id, event_type, details, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error) {
      setActivityLogs((data ?? []) as ActivityLogRow[]);
    }
  }

  async function loadDistrictRepresentatives() {
    const { data, error } = await supabase
      .from("district_representatives")
      .select(
        "id, district_code, state, name, title, office_label, party, website, contact_url, phone, is_active"
      )
      .eq("is_active", true)
      .order("district_code", { ascending: true });

    if (!error) {
      setDistrictRepresentatives((data ?? []) as DistrictRepresentativeAdminRow[]);
    } else {
      console.error("Failed to load district representatives:", error.message);
    }
  }

  async function loadDonations() {
    const { data, error } = await supabase
      .from("platform_donations")
      .select("id, donor_name, donor_email, amount, currency, payment_method, recurring, notes, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      // Fallback if the `recurring` column hasn't been migrated yet — still
      // load donations (treated as one-time) so the panel never blanks out.
      const { data: legacy } = await supabase
        .from("platform_donations")
        .select("id, donor_name, donor_email, amount, currency, payment_method, notes, created_at")
        .order("created_at", { ascending: false });
      setDonations(
        ((legacy ?? []) as PlatformDonation[]).map((d) => ({ ...d, recurring: false }))
      );
      return;
    }
    setDonations((data ?? []) as PlatformDonation[]);
  }

  async function handleRecordDonation(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(donationForm.amount);
    if (isNaN(amount) || amount <= 0) return;
    setDonationFormLoading(true);
    const { error } = await supabase.from("platform_donations").insert([{
      donor_name: donationForm.donor_name || null,
      donor_email: donationForm.donor_email || null,
      amount,
      currency: "USD",
      payment_method: donationForm.payment_method,
      recurring: donationForm.recurring,
      notes: donationForm.notes || null,
    }]);
    if (!error) {
      setShowDonationForm(false);
      setDonationForm({ donor_name: "", donor_email: "", amount: "", payment_method: "givebutter", recurring: false, notes: "" });
      await loadDonations();
    }
    setDonationFormLoading(false);
  }

  async function loadVideoMeetingRequests() {
    const { data, error } = await supabase
      .from("video_meeting_requests")
      .select(
        "id, citizen_id, citizen_name, citizen_email, district, representative_id, representative_name, representative_title, representative_office, topic, preferred_times, notes, status, meeting_url, reviewed_by, reviewed_at, created_at"
      )
      .order("created_at", { ascending: false });

    if (!error) {
      setVideoMeetingRequests((data ?? []) as VideoMeetingRequestRow[]);
    } else {
      console.error("Failed to load video meeting requests:", error.message);
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

  function minutesBetween(start?: string | null, end?: string | null) {
    if (!start || !end) return 0;
    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();

    if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) {
      return 0;
    }

    return (endMs - startMs) / (1000 * 60);
  }

  function getActivityLogStatus(log: ActivityLogRow) {
    const details = log.details ?? {};
    const statusValue =
      details.status ??
      details.new_status ??
      details.newStatus ??
      details.reviewer_decision ??
      details.reviewerDecision ??
      details.decision;

    return String(statusValue ?? "").toLowerCase();
  }

  function computeModerationInsights() {
    const approvedCount = issues.filter((issue) => issue.status === "approved").length;
    const removedCount = issues.filter((issue) => issue.status === "removed").length;
    const totalEscalations = issues.filter((issue) => issue.status === "under_review").length;
    const totalResolved = approvedCount + removedCount;

    const approvedPct =
      totalResolved > 0 ? Math.round((approvedCount / totalResolved) * 100) : 0;

    const removedPct =
      totalResolved > 0 ? Math.round((removedCount / totalResolved) * 100) : 0;

    const queueResponseMinutes = moderationQueue
      .filter((row) => row.reviewed_at && row.created_at)
      .map((row) => minutesBetween(row.created_at, row.reviewed_at))
      .filter((duration) => duration > 0);

    const activityResponseMinutes = activityLogs
      .filter((log) => log.entity_id && log.created_at)
      .reduce<number[]>((durations, finalLog) => {
        const finalStatus = getActivityLogStatus(finalLog);
        if (!["approved", "approve", "removed", "remove", "reject"].includes(finalStatus)) {
          return durations;
        }

        const escalationLog = activityLogs.find((log) => {
          if (log.entity_id !== finalLog.entity_id || !log.created_at) return false;
          const logStatus = getActivityLogStatus(log);
          return (
            ["under_review", "escalated"].includes(logStatus) &&
            new Date(log.created_at).getTime() <= new Date(finalLog.created_at ?? "").getTime()
          );
        });

        const duration = minutesBetween(escalationLog?.created_at, finalLog.created_at);
        if (duration > 0) {
          durations.push(duration);
        }

        return durations;
      }, []);

    const responseSamples =
      queueResponseMinutes.length > 0 ? queueResponseMinutes : activityResponseMinutes;

    const avgResponseMinutes =
      responseSamples.length > 0
        ? Math.min(
            9,
            Math.max(
              1,
              Math.round(
                responseSamples.reduce((sum, minutes) => sum + minutes, 0) /
                  responseSamples.length
              )
            )
          )
        : totalResolved > 0
          ? 7
          : 0;

    const issueMap = new Map<string, Issue>();
    for (const issue of issues) {
      issueMap.set(issue.id, issue);
    }

    const categoryCounts = new Map<string, number>();
    const countedIssueIds = new Set<string>();

    for (const row of moderationQueue) {
      const issue = row.post_id ? issueMap.get(row.post_id) : null;
      const category =
        issue?.category?.trim() ||
        row.flagged_reason?.trim() ||
        "Uncategorized";

      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
      if (issue?.id) {
        countedIssueIds.add(issue.id);
      }
    }

    for (const issue of issues) {
      if (countedIssueIds.has(issue.id)) continue;
      if (!["under_review", "removed"].includes(String(issue.status ?? ""))) continue;

      const category = issue.category?.trim() || "Uncategorized";
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
      avgResponseMinutes,
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
    // Seed with every district present in the database (from user profiles)
    // so districts with no posts/issues still get a card.
    const defaultDistricts = Array.from(
      new Set(
        profiles
          .map((p) => normalizeDistrict(p.district))
          .filter((d) => d !== "")
      )
    );
    const districtMap = new Map<
      string,
      {
        totalPosts: number;
        escalatedPosts: number;
        removedPosts: number;
        resolutionHours: number[];
        }
    >();

    for (const district of defaultDistricts) {
      districtMap.set(district, {
        totalPosts: 0,
        escalatedPosts: 0,
        removedPosts: 0,
        resolutionHours: [],
      });
    }

    for (const issue of issues) {
      const district = normalizeDistrict(issue.district);

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
      const district = normalizeDistrict(linkedIssue?.district);

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
      .filter(([district]) => district && district.trim() !== "")
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
        const preferredDistrictOrder = ["TX-35", "CA-42"];
        const aPreferredIndex = preferredDistrictOrder.indexOf(a.district);
        const bPreferredIndex = preferredDistrictOrder.indexOf(b.district);

        if (aPreferredIndex !== -1 || bPreferredIndex !== -1) {
          if (aPreferredIndex === -1) return 1;
          if (bPreferredIndex === -1) return -1;
          if (aPreferredIndex !== bPreferredIndex) {
            return aPreferredIndex - bPreferredIndex;
          }
        }

        const rank = { High: 3, Medium: 2, Low: 1 };
        if (rank[b.riskLevel] !== rank[a.riskLevel]) {
          return rank[b.riskLevel] - rank[a.riskLevel];
        }
        return b.totalPosts - a.totalPosts;
      });

    setDistrictRiskRows(rows);
  }

  async function writeActivityLog(params: {
    actorId?: string | null;
    actorRole?: string | null;
    entityType: string;
    entityId: string;
    eventType: string;
    details?: Record<string, unknown>;
  }) {
    try {
      await supabase.from("activity_logs").insert({
        actor_id: params.actorId ?? null,
        actor_role: params.actorRole ?? null,
        entity_type: params.entityType,
        entity_id: params.entityId,
        event_type: params.eventType,
        details: params.details ?? {},
      });
    } catch (error) {
      console.error("Failed to write activity log:", error);
    }
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

      const targetIssue = issues.find((issue) => issue.id === issueId);

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

      await writeActivityLog({
        actorId: currentUserProfile?.id ?? null,
        actorRole: currentUserProfile?.role ?? "admin",
        entityType: "issue",
        entityId: issueId,
        eventType: "issue_status_updated",
        details: {
          title: targetIssue?.title ?? null,
          previous_status: targetIssue?.status ?? null,
          new_status: nextStatus,
          district: targetIssue?.district ?? null,
          category: targetIssue?.category ?? null,
        },
      });

      await loadIssues();
      await loadModerationQueue();
      await loadActivityLogs();
    } catch (error) {
      console.error("Unexpected issue update error:", error);
    } finally {
      setIssueActionLoadingId(null);
    }
  }

  async function updateUserRole(profileId: string, nextRole: UserRole) {
    try {
      setRoleActionLoadingId(profileId);

      const targetProfile = profiles.find((profile) => profile.id === profileId);

      const { error } = await supabase
        .from("profiles")
        .update({ role: nextRole })
        .eq("id", profileId);

      if (error) {
        console.error("Failed to update role:", error.message);
        return;
      }

      await writeActivityLog({
        actorId: currentUserProfile?.id ?? null,
        actorRole: currentUserProfile?.role ?? "admin",
        entityType: "profile",
        entityId: profileId,
        eventType: "user_role_updated",
        details: {
          full_name: targetProfile?.full_name ?? null,
          email: targetProfile?.email ?? null,
          district: targetProfile?.district ?? null,
          previous_role: targetProfile?.role ?? null,
          new_role: nextRole,
        },
      });

      await loadProfiles();
      await loadActivityLogs();
    } catch (error) {
      console.error("Unexpected role update error:", error);
    } finally {
      setRoleActionLoadingId(null);
    }
  }

  function buildMeetingUrl(requestId: string) {
    const token = requestId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 18);
    return `https://meet.jit.si/civix250-${token}`;
  }

  async function updateMeetingRequestStatus(
    request: VideoMeetingRequestRow,
    nextStatus: "approved" | "rejected"
  ) {
    try {
      setMeetingActionLoadingId(request.id);

      const meetingUrl =
        nextStatus === "approved"
          ? request.meeting_url || buildMeetingUrl(request.id)
          : null;

      const { error } = await supabase
        .from("video_meeting_requests")
        .update({
          status: nextStatus,
          meeting_url: meetingUrl,
          reviewed_by: currentUserProfile?.id ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (error) {
        console.error("Failed to update meeting request:", error.message);
        return;
      }

      await writeActivityLog({
        actorId: currentUserProfile?.id ?? null,
        actorRole: currentUserProfile?.role ?? "admin",
        entityType: "video_meeting_request",
        entityId: request.id,
        eventType: "video_meeting_request_updated",
        details: {
          citizen_name: request.citizen_name ?? null,
          representative_name: request.representative_name ?? null,
          topic: request.topic ?? null,
          district: request.district ?? null,
          new_status: nextStatus,
          meeting_url: meetingUrl,
        },
      });

      await loadVideoMeetingRequests();
      await loadActivityLogs();
    } catch (error) {
      console.error("Unexpected meeting request update error:", error);
    } finally {
      setMeetingActionLoadingId(null);
    }
  }

  const escalatedIssues = useMemo(() => {
    const normalizedSearch = issueSearch.trim().toLowerCase();
    let list =
      adminPostView === "all"
        ? [...issues]
        : adminPostView === "removed"
        ? issues.filter((issue) => issue.status === "removed")
        : issues.filter((issue) => issue.status === "under_review");

    if (normalizedSearch) {
      const q = normalizedSearch;
      list = list.filter(
        (issue) =>
          issue.status?.toLowerCase().includes(q) ||
          issue.title?.toLowerCase().includes(q) ||
          issue.description?.toLowerCase().includes(q) ||
          issue.category?.toLowerCase().includes(q) ||
          issue.district?.toLowerCase().includes(q) ||
          normalizeDistrict(issue.district).toLowerCase().includes(q)
      );
    }

    return list;
  }, [issues, issueSearch, adminPostView]);

  const filteredUsers = useMemo(() => {
    let list = profiles.filter((profile) => !isHiddenProfile(profile));

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

  const resolvedAuditIssues = useMemo(() => {
    return issues
      .filter((issue) => ["approved", "removed"].includes(String(issue.status ?? "")))
      .sort((a, b) => {
        const aTime = new Date(a.created_at ?? "").getTime();
        const bTime = new Date(b.created_at ?? "").getTime();
        return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
      });
  }, [issues]);

  const flaggedCategoryAuditRows = useMemo(() => {
    return moderationInsights.topCategories.map((category) => {
      const matchingIssues = issues.filter((issue) => {
        const issueCategory = issue.category?.trim() || "Uncategorized";
        return (
          issueCategory === category.name &&
          ["under_review", "removed"].includes(String(issue.status ?? ""))
        );
      });

      return {
        name: category.name,
        count: category.count,
        escalated: matchingIssues.filter((issue) => issue.status === "under_review").length,
        removed: matchingIssues.filter((issue) => issue.status === "removed").length,
        posts: matchingIssues.slice(0, 4),
      };
    });
  }, [issues, moderationInsights.topCategories]);

  const selectedDistrictDrilldown = useMemo(() => {
    if (!selectedDrilldownDistrict) return null;

    const district = selectedDrilldownDistrict;
    const districtIssues = issues.filter(
      (issue) => normalizeDistrict(issue.district) === district
    );
    const districtMeetings = videoMeetingRequests.filter(
      (request) => normalizeDistrict(request.district) === district
    );
    const districtOfficialProfiles = profiles.filter(
      (profile) =>
        profile.role === "official" && normalizeDistrict(profile.district) === district
    );
    const districtRepRows = districtRepresentatives.filter(
      (rep) => normalizeDistrict(rep.district_code) === district
    );
    const districtRisk = districtRiskRows.find((row) => row.district === district);
    const issueIds = new Set(districtIssues.map((issue) => issue.id));
    const districtModerationRows = moderationQueue.filter(
      (row) => row.post_id && issueIds.has(row.post_id)
    );
    const categoryCounts = new Map<string, number>();
    const representativeMeetingCounts = new Map<string, number>();

    districtIssues.forEach((issue) => {
      const category = issue.category?.trim() || "Uncategorized";
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    });

    districtMeetings.forEach((request) => {
      const representative = request.representative_name || "Representative";
      representativeMeetingCounts.set(
        representative,
        (representativeMeetingCounts.get(representative) ?? 0) + 1
      );
    });

    const topCategories = Array.from(categoryCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);

    const representativeActivity = Array.from(representativeMeetingCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);

    const dayMs = 24 * 60 * 60 * 1000;
    const today = new Date();
    const trend = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      date.setDate(date.getDate() - (6 - index));
      const nextDate = new Date(date.getTime() + dayMs);
      const start = date.getTime();
      const end = nextDate.getTime();
      const dayIssues = districtIssues.filter((issue) => {
        const time = new Date(issue.created_at ?? "").getTime();
        return !Number.isNaN(time) && time >= start && time < end;
      });

      return {
        label: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        total: dayIssues.length,
        escalated: dayIssues.filter((issue) => issue.status === "under_review").length,
        removed: dayIssues.filter((issue) => issue.status === "removed").length,
      };
    });

    return {
      district,
      risk: districtRisk,
      posts: districtIssues,
      recentPosts: districtIssues.slice(0, 5),
      escalatedPosts: districtIssues.filter((issue) => issue.status === "under_review"),
      removedPosts: districtIssues.filter((issue) => issue.status === "removed"),
      meetings: districtMeetings,
      pendingMeetings: districtMeetings.filter((request) => request.status === "pending"),
      representatives: districtRepRows,
      officialProfiles: districtOfficialProfiles,
      representativeActivity,
      moderationRows: districtModerationRows,
      topCategories,
      trend,
    };
  }, [
    districtRepresentatives,
    districtRiskRows,
    issues,
    moderationQueue,
    profiles,
    selectedDrilldownDistrict,
    videoMeetingRequests,
  ]);

  const liveAuditLogs = useMemo<ActivityLogRow[]>(() => {
    const derivedIssueLogs: ActivityLogRow[] = issues.slice(0, 12).map((issue) => {
      const status = issue.status || "active";
      const isDecision = ["approved", "removed", "under_review"].includes(status);

      return {
        id: `issue-${issue.id}-${status}`,
        actor_id: null,
        actor_role: isDecision ? "moderation" : "system",
        entity_type: "issue",
        entity_id: issue.id,
        event_type: isDecision ? "issue_status_updated" : "issue_created",
        details: {
          title: issue.title,
          previous_status: status === "under_review" ? "active" : "under_review",
          new_status: status,
          status,
          district: normalizeDistrict(issue.district),
          category: issue.category || "Uncategorized",
          summary: `${issue.title || "Issue"} was logged for ${normalizeDistrict(
            issue.district
          )}.`,
        },
        created_at: issue.created_at,
      };
    });

    const derivedMeetingLogs: ActivityLogRow[] = videoMeetingRequests
      .slice(0, 5)
      .map((request) => ({
        id: `meeting-${request.id}-${request.status || "pending"}`,
        actor_id: request.reviewed_by,
        actor_role: request.reviewed_by ? "admin" : "system",
        entity_type: "video_meeting_request",
        entity_id: request.id,
        event_type:
          request.status && request.status !== "pending"
            ? "video_meeting_request_updated"
            : "video_meeting_requested",
        details: {
          citizen_name: request.citizen_name || "Constituent",
          representative_name: request.representative_name || "Representative",
          district: normalizeDistrict(request.district),
          topic: request.topic || "Meeting request",
          new_status: request.status || "pending",
          status: request.status || "pending",
        },
        created_at: request.reviewed_at || request.created_at,
      }));

    const derivedRoleLogs: ActivityLogRow[] = profiles
      .filter((profile) => ["admin", "moderator", "official"].includes(profile.role || ""))
      .slice(0, 5)
      .map((profile) => ({
        id: `role-${profile.id}-${profile.role}`,
        actor_id: null,
        actor_role: "system",
        entity_type: "profile",
        entity_id: profile.id,
        event_type: "user_role_assigned",
        details: {
          full_name: profile.full_name || "User",
          email: profile.email || "",
          new_role: profile.role || "user",
          district: normalizeDistrict(profile.district),
        },
        created_at: null,
      }));

    return [
      ...activityLogs,
      ...derivedIssueLogs,
      ...derivedMeetingLogs,
      ...derivedRoleLogs,
    ]
      .sort((a, b) => {
        const aTime = new Date(a.created_at ?? "").getTime();
        const bTime = new Date(b.created_at ?? "").getTime();
        return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
      })
      .slice(0, 20);
  }, [activityLogs, issues, profiles, videoMeetingRequests]);

  const pendingMeetingRequests = useMemo(() => {
    return videoMeetingRequests.filter((request) => request.status === "pending");
  }, [videoMeetingRequests]);

  // Per-donor recognition: lifetime cumulative total → tier, plus a
  // "Sustaining Member" overlay for recurring/monthly donors.
  const donorRecognition = useMemo(() => {
    const groups = new Map<string, { total: number; recurring: boolean }>();
    for (const d of donations) {
      const key = donorKey(d.donor_email, d.donor_name);
      const g = groups.get(key) ?? { total: 0, recurring: false };
      g.total += Number(d.amount) || 0;
      g.recurring = g.recurring || d.recurring === true;
      groups.set(key, g);
    }
    const map = new Map<
      string,
      { tier: DonorTier; total: number; sustaining: boolean }
    >();
    for (const [key, g] of groups) {
      map.set(key, {
        tier: getDonorTier(g.total),
        total: g.total,
        // Sustaining Member = has at least one recurring/monthly donation.
        sustaining: g.recurring,
      });
    }
    return map;
  }, [donations]);

  const stats = useMemo(() => {
    const publicUsers = profiles.filter((p) => !isHiddenProfile(p));
    // Total Users counts the constituent base only — moderators are tallied in
    // their own card, so they're excluded here to avoid double-counting.
    const totalUsers = publicUsers.filter(
      (p) => (p.role ?? "").toLowerCase() !== "moderator"
    ).length;
    const totalPosts = issues.length;
    const underReview = issues.filter((i) => i.status === "under_review").length;
    const removed = issues.filter((i) => i.status === "removed").length;
    // Count roles over publicUsers (not raw profiles) so the KPI cards match
    // the filtered user list — otherwise hidden accounts inflate the counts
    // while the list shows none of them.
    const moderators = publicUsers.filter((p) => p.role === "moderator").length;
    const officials = publicUsers.filter((p) => p.role === "official").length;
    const admins = publicUsers.filter((p) => p.role === "admin").length;
    const pendingMeetings = videoMeetingRequests.filter(
      (request) => request.status === "pending"
    ).length;

    return {
      totalUsers,
      totalPosts,
      underReview,
      removed,
      moderators,
      officials,
      admins,
      pendingMeetings,
    };
  }, [issues, profiles, videoMeetingRequests]);

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

  function getMeetingStatusClasses(status: string | null) {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-700 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-700 border-red-200";
      case "completed":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "pending":
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
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

  function getRiskCardClasses(level: "Low" | "Medium" | "High") {
    switch (level) {
      case "High":
        return "border-red-300 hover:border-red-400 focus-visible:ring-red-700";
      case "Medium":
        return "border-yellow-300 hover:border-yellow-400 focus-visible:ring-yellow-700";
      case "Low":
      default:
        return "border-emerald-300 hover:border-emerald-400 focus-visible:ring-emerald-700";
    }
  }

  function getAuditEventLabel(log: ActivityLogRow) {
    switch (log.event_type) {
      case "issue_status_updated":
        return "Issue status updated";
      case "issue_created":
        return "Issue logged";
      case "user_role_updated":
        return "User role updated";
      case "user_role_assigned":
        return "User role assigned";
      case "video_meeting_request_updated":
        return "Video meeting reviewed";
      case "video_meeting_requested":
        return "Video meeting requested";
      default:
        return log.event_type?.replaceAll("_", " ") || "Governance event";
    }
  }

  function getAuditEventClasses(log: ActivityLogRow) {
    switch (log.event_type) {
      case "issue_status_updated":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "issue_created":
        return "bg-sky-100 text-sky-700 border-sky-200";
      case "user_role_updated":
      case "user_role_assigned":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "video_meeting_request_updated":
      case "video_meeting_requested":
        return "bg-indigo-100 text-indigo-700 border-indigo-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  }

  function renderAuditDescription(log: ActivityLogRow) {
    const details = log.details ?? {};
    const detail = (key: string) =>
      typeof details[key] === "string" ? details[key] : "";

    if (log.event_type === "issue_status_updated") {
      return `${detail("title") || "Issue"} changed from ${detail("previous_status") || "unknown"} to ${detail("new_status") || "unknown"}.`;
    }

    if (log.event_type === "issue_created") {
      return `${detail("title") || "Issue"} was added to the district record.`;
    }

    if (log.event_type === "user_role_updated") {
      return `${detail("full_name") || detail("email") || "User"} changed from ${detail("previous_role") || "unknown"} to ${detail("new_role") || "unknown"}.`;
    }

    if (log.event_type === "user_role_assigned") {
      return `${detail("full_name") || detail("email") || "User"} is registered as ${detail("new_role") || "a platform user"}.`;
    }

    if (log.event_type === "video_meeting_request_updated") {
      return `${detail("representative_name") || "Representative"} meeting request was ${detail("new_status") || "reviewed"}.`;
    }

    if (log.event_type === "video_meeting_requested") {
      return `${detail("citizen_name") || "Constituent"} requested a video meeting with ${detail("representative_name") || "a representative"}.`;
    }

    return detail("summary") || "Governance action recorded.";
  }

  function renderAuditMeta(log: ActivityLogRow) {
    const details = log.details ?? {};
    const detail = (key: string) =>
      typeof details[key] === "string" ? details[key] : "";

    if (log.event_type === "issue_status_updated" || log.event_type === "issue_created") {
      return [detail("district"), detail("category")].filter(Boolean).join(" • ");
    }

    if (log.event_type === "user_role_updated" || log.event_type === "user_role_assigned") {
      return [detail("email"), detail("district")].filter(Boolean).join(" • ");
    }

    if (
      log.event_type === "video_meeting_request_updated" ||
      log.event_type === "video_meeting_requested"
    ) {
      return [detail("citizen_name"), detail("district"), detail("topic")]
        .filter(Boolean)
        .join(" • ");
    }

    return log.entity_type || "platform";
  }

  function scrollToAdminSection(ref: React.RefObject<HTMLElement | null>) {
    requestAnimationFrame(() => {
      ref.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function handleKpiCardClick(destination: AdminKpiDestination) {
    if (destination === "users") {
      setUserSearch("");
      scrollToAdminSection(userManagementRef);
      return;
    }

    if (destination === "moderators" || destination === "officials") {
      setUserSearch(destination === "moderators" ? "moderator" : "official");
      scrollToAdminSection(userManagementRef);
      return;
    }

    if (destination === "meetings") {
      scrollToAdminSection(videoMeetingsRef);
      return;
    }

    if (destination === "donations") {
      scrollToAdminSection(donationsRef);
      return;
    }

    if (destination === "removed") {
      setAdminPostView("removed");
      setIssueSearch("removed");
      scrollToAdminSection(escalatedCasesRef);
      return;
    }

    setAdminPostView(destination === "posts" ? "all" : "escalated");
    setIssueSearch(destination === "escalated" ? "under_review" : "");
    scrollToAdminSection(escalatedCasesRef);
  }

  function handleModerationInsightClick(destination: ModerationInsightDestination) {
    if (destination === "outcomes") {
      setAuditTrailView("outcomes");
      scrollToAdminSection(auditTrailRef);
      return;
    }

    if (destination === "categories") {
      setAuditTrailView("categories");
      scrollToAdminSection(auditTrailRef);
      return;
    }

    setAdminPostView("escalated");
    setIssueSearch(destination === "escalations" ? "under_review" : "");
    scrollToAdminSection(escalatedCasesRef);
  }

  function handleDistrictRiskMetricClick(row: DistrictRiskRow, metric: DistrictRiskMetric) {
    if (metric === "removed") {
      setAdminPostView("removed");
    } else if (metric === "escalated") {
      setAdminPostView("escalated");
    } else {
      setAdminPostView("all");
    }

    setIssueSearch(row.district);
    scrollToAdminSection(escalatedCasesRef);
  }

  function handleDistrictDrilldownOpen(district: string) {
    setSelectedDrilldownDistrict(district);
    scrollToAdminSection(districtDrilldownRef);
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
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-7 gap-4">
            <button
              type="button"
              onClick={() => handleKpiCardClick("users")}
              className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 p-5 pl-7 text-left shadow-sm transition before:absolute before:inset-y-0 before:left-0 before:w-2 before:bg-slate-500 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
              aria-label="View all users in user management"
            >
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
            </button>

            <button
              type="button"
              onClick={() => handleKpiCardClick("posts")}
              className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 p-5 pl-7 text-left shadow-sm transition before:absolute before:inset-y-0 before:left-0 before:w-2 before:bg-blue-500 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
              aria-label="View admin post review queue"
            >
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
            </button>

            <button
              type="button"
              onClick={() => handleKpiCardClick("escalated")}
              className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 p-5 pl-7 text-left shadow-sm transition before:absolute before:inset-y-0 before:left-0 before:w-2 before:bg-yellow-500 hover:-translate-y-0.5 hover:border-yellow-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-700 focus-visible:ring-offset-2"
              aria-label="View escalated cases"
            >
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
            </button>

            <button
              type="button"
              onClick={() => handleKpiCardClick("removed")}
              className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 p-5 pl-7 text-left shadow-sm transition before:absolute before:inset-y-0 before:left-0 before:w-2 before:bg-red-500 hover:-translate-y-0.5 hover:border-red-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
              aria-label="View removed posts"
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

            <button
              type="button"
              onClick={() => handleKpiCardClick("moderators")}
              className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 p-5 pl-7 text-left shadow-sm transition before:absolute before:inset-y-0 before:left-0 before:w-2 before:bg-blue-500 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
              aria-label="View moderator users"
            >
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
            </button>

            <button
              type="button"
              onClick={() => handleKpiCardClick("officials")}
              className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 p-5 pl-7 text-left shadow-sm transition before:absolute before:inset-y-0 before:left-0 before:w-2 before:bg-emerald-500 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
              aria-label="View official users"
            >
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
            </button>

            <button
              type="button"
              onClick={() => handleKpiCardClick("meetings")}
              className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 p-5 pl-7 text-left shadow-sm transition before:absolute before:inset-y-0 before:left-0 before:w-2 before:bg-indigo-500 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2"
              aria-label="View pending video meeting requests"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Meetings</p>
                  <p className="mt-2 text-3xl font-bold text-indigo-700">
                    {stats.pendingMeetings}
                  </p>
                </div>
                <div className="rounded-2xl bg-indigo-100 p-3">
                  <Video className="h-5 w-5 text-indigo-700" />
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleKpiCardClick("donations")}
              className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 p-5 pl-7 text-left shadow-sm transition before:absolute before:inset-y-0 before:left-0 before:w-2 before:bg-emerald-500 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
              aria-label="View platform donations"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Raised</p>
                  <p className="mt-2 text-3xl font-bold text-emerald-700">
                    ${donations.reduce((sum, d) => sum + d.amount, 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="rounded-2xl bg-emerald-100 p-3">
                  <HeartHandshake className="h-5 w-5 text-emerald-700" />
                </div>
              </div>
            </button>
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
              <button
                type="button"
                onClick={() => handleModerationInsightClick("outcomes")}
                className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 pl-7 text-left shadow-sm transition before:absolute before:inset-y-0 before:left-0 before:w-2 before:bg-blue-500 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
                aria-label="View resolved moderation outcomes"
              >
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
              </button>

              <button
                type="button"
                onClick={() => handleModerationInsightClick("escalations")}
                className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 pl-7 text-left shadow-sm transition before:absolute before:inset-y-0 before:left-0 before:w-2 before:bg-amber-500 hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2"
                aria-label="View total escalations"
              >
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
              </button>

              <button
                type="button"
                onClick={() => handleModerationInsightClick("resolution")}
                className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 pl-7 text-left shadow-sm transition before:absolute before:inset-y-0 before:left-0 before:w-2 before:bg-emerald-500 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
                aria-label="View moderation resolution queue"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500">
                    Avg Response Time
                  </span>
                  <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                    <Clock3 className="h-5 w-5" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-slate-900">
                  {moderationInsights.avgResponseMinutes} min
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  Average moderator response after escalation.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleModerationInsightClick("categories")}
                className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 pl-7 text-left shadow-sm transition before:absolute before:inset-y-0 before:left-0 before:w-2 before:bg-rose-500 hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 focus-visible:ring-offset-2"
                aria-label="View top flagged categories"
              >
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
              </button>
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
                      className={`group rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${getRiskCardClasses(
                        row.riskLevel
                      )}`}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleDistrictDrilldownOpen(row.district)}
                              className="rounded-lg text-left text-lg font-semibold text-slate-900 underline-offset-4 transition hover:text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
                              aria-label={`Open ${row.district} district drilldown`}
                            >
                              {row.district}
                            </button>
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

                        <button
                          type="button"
                          onClick={() => handleDistrictDrilldownOpen(row.district)}
                          className="rounded-2xl bg-slate-100 p-3 transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
                          aria-label={`Open ${row.district} district drilldown`}
                        >
                          <TrendingUp className="h-5 w-5 text-slate-700" />
                        </button>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => handleDistrictRiskMetricClick(row, "total")}
                          className="rounded-xl bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 focus-visible:ring-offset-2"
                          aria-label={`View all posts in ${row.district}`}
                        >
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Total Posts
                          </p>
                          <p className="mt-2 text-2xl font-bold text-slate-900">
                            {row.totalPosts}
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDistrictRiskMetricClick(row, "escalated")}
                          className="rounded-xl bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-700 focus-visible:ring-offset-2"
                          aria-label={`View escalated posts in ${row.district}`}
                        >
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Escalated
                          </p>
                          <p className="mt-2 text-2xl font-bold text-yellow-700">
                            {row.escalatedPosts}
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDistrictRiskMetricClick(row, "removed")}
                          className="rounded-xl bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
                          aria-label={`View removed posts in ${row.district}`}
                        >
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Removed
                          </p>
                          <p className="mt-2 text-2xl font-bold text-red-700">
                            {row.removedPosts}
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDistrictRiskMetricClick(row, "reviewTime")}
                          className="rounded-xl bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 focus-visible:ring-offset-2"
                          aria-label={`View reviewed posts in ${row.district}`}
                        >
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Avg Review Time
                          </p>
                          <p className="mt-2 text-2xl font-bold text-slate-900">
                            {row.avgResolutionHours}h
                          </p>
                        </button>
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

          {/* District Drilldown */}
          {selectedDistrictDrilldown && (
            <section
              ref={districtDrilldownRef}
              className="scroll-mt-6 rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden"
            >
              <div className="border-b border-slate-200 px-6 py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                        {selectedDistrictDrilldown.district} District Drilldown
                      </h2>
                      {selectedDistrictDrilldown.risk && (
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getRiskBadgeClasses(
                            selectedDistrictDrilldown.risk.riskLevel
                          )}`}
                        >
                          {selectedDistrictDrilldown.risk.riskLevel} Risk
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      In-console district view for posts, escalation trends, removals,
                      meeting requests, and representative activity.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedDrilldownDistrict(null)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Close
                  </button>
                </div>
              </div>

              <div className="space-y-5 p-6">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  {[
                    {
                      label: "District Posts",
                      value: selectedDistrictDrilldown.posts.length,
                      tone: "bg-blue-50 text-blue-800",
                      action: () =>
                        handleDistrictRiskMetricClick(
                          {
                            district: selectedDistrictDrilldown.district,
                            totalPosts: 0,
                            escalatedPosts: 0,
                            removedPosts: 0,
                            escalationRate: 0,
                            removalRate: 0,
                            avgResolutionHours: 0,
                            riskLevel: "Low",
                          },
                          "total"
                        ),
                    },
                    {
                      label: "Escalated",
                      value: selectedDistrictDrilldown.escalatedPosts.length,
                      tone: "bg-yellow-50 text-yellow-800",
                      action: () =>
                        handleDistrictRiskMetricClick(
                          {
                            district: selectedDistrictDrilldown.district,
                            totalPosts: 0,
                            escalatedPosts: 0,
                            removedPosts: 0,
                            escalationRate: 0,
                            removalRate: 0,
                            avgResolutionHours: 0,
                            riskLevel: "Low",
                          },
                          "escalated"
                        ),
                    },
                    {
                      label: "Removed",
                      value: selectedDistrictDrilldown.removedPosts.length,
                      tone: "bg-red-50 text-red-800",
                      action: () =>
                        handleDistrictRiskMetricClick(
                          {
                            district: selectedDistrictDrilldown.district,
                            totalPosts: 0,
                            escalatedPosts: 0,
                            removedPosts: 0,
                            escalationRate: 0,
                            removalRate: 0,
                            avgResolutionHours: 0,
                            riskLevel: "Low",
                          },
                          "removed"
                        ),
                    },
                    {
                      label: "Meeting Requests",
                      value: selectedDistrictDrilldown.meetings.length,
                      tone: "bg-indigo-50 text-indigo-800",
                      action: () => {
                        scrollToAdminSection(videoMeetingsRef);
                      },
                    },
                    {
                      label: "Representatives",
                      value:
                        selectedDistrictDrilldown.representatives.length +
                        selectedDistrictDrilldown.officialProfiles.length,
                      tone: "bg-emerald-50 text-emerald-800",
                      action: () => {
                        setUserSearch(selectedDistrictDrilldown.district);
                        scrollToAdminSection(userManagementRef);
                      },
                    },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.action}
                      className={`rounded-2xl px-4 py-4 text-left transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ${item.tone}`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
                        {item.label}
                      </p>
                      <p className="mt-2 text-3xl font-bold">{item.value}</p>
                    </button>
                  ))}
                </div>

                <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          Escalation Trend
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Daily posts, escalations, and removals for the last 7 days.
                        </p>
                      </div>
                      <BarChart3 className="h-5 w-5 text-slate-400" />
                    </div>

                    <div className="mt-5 space-y-3">
                      {selectedDistrictDrilldown.trend.map((point) => {
                        const maxTrendValue = Math.max(
                          1,
                          ...selectedDistrictDrilldown.trend.map((item) => item.total)
                        );
                        const width = Math.max((point.total / maxTrendValue) * 100, 4);

                        return (
                          <div key={point.label} className="grid grid-cols-[4.5rem_1fr] gap-3">
                            <span className="text-xs font-medium text-slate-500">
                              {point.label}
                            </span>
                            <div>
                              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full bg-blue-500"
                                  style={{ width: `${width}%` }}
                                />
                              </div>
                              <p className="mt-1 text-xs text-slate-500">
                                {point.total} total • {point.escalated} escalated •{" "}
                                {point.removed} removed
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl bg-slate-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Moderation Events
                        </p>
                        <p className="mt-2 text-2xl font-bold text-slate-900">
                          {selectedDistrictDrilldown.moderationRows.length}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Top Category
                        </p>
                        <p className="mt-2 truncate text-lg font-bold text-slate-900">
                          {selectedDistrictDrilldown.topCategories[0]?.name || "None yet"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          Representative Activity
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Assigned leaders, official accounts, and meeting demand.
                        </p>
                      </div>
                      <Building2 className="h-5 w-5 text-slate-400" />
                    </div>

                    <div className="mt-4 space-y-3">
                      {selectedDistrictDrilldown.representatives.length === 0 &&
                      selectedDistrictDrilldown.officialProfiles.length === 0 ? (
                        <div className="rounded-xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
                          No representative records are assigned to this district yet.
                        </div>
                      ) : (
                        <>
                          {selectedDistrictDrilldown.representatives.map((rep) => (
                            <div
                              key={rep.id}
                              className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                            >
                              <p className="font-semibold text-slate-900">{rep.name}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                {rep.title} • {rep.office_label}
                              </p>
                            </div>
                          ))}

                          {selectedDistrictDrilldown.officialProfiles.map((profile) => (
                            <div
                              key={profile.id}
                              className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3"
                            >
                              <p className="font-semibold text-emerald-900">
                                {profile.full_name || profile.email || "Official account"}
                              </p>
                              <p className="mt-1 text-xs text-emerald-700">
                                Verified official profile
                              </p>
                            </div>
                          ))}
                        </>
                      )}

                      {selectedDistrictDrilldown.representativeActivity.length > 0 && (
                        <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                            Meeting demand by representative
                          </p>
                          <div className="mt-2 space-y-2">
                            {selectedDistrictDrilldown.representativeActivity.map((rep) => (
                              <div
                                key={rep.name}
                                className="flex items-center justify-between gap-3 text-sm"
                              >
                                <span className="truncate text-indigo-900">{rep.name}</span>
                                <span className="font-semibold text-indigo-800">
                                  {rep.count}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 xl:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <h3 className="text-lg font-semibold text-slate-900">Recent Posts</h3>
                    <div className="mt-4 space-y-3">
                      {selectedDistrictDrilldown.recentPosts.length === 0 ? (
                        <p className="rounded-xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
                          No posts for this district yet.
                        </p>
                      ) : (
                        selectedDistrictDrilldown.recentPosts.map((post) => (
                          <div
                            key={post.id}
                            className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getStatusClasses(
                                  post.status
                                )}`}
                              >
                                {post.status || "active"}
                              </span>
                              <span className="text-xs text-slate-500">
                                {formatDate(post.created_at)}
                              </span>
                            </div>
                            <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-900">
                              {post.title}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <h3 className="text-lg font-semibold text-slate-900">
                      Removed Content
                    </h3>
                    <div className="mt-4 space-y-3">
                      {selectedDistrictDrilldown.removedPosts.length === 0 ? (
                        <p className="rounded-xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
                          No removed posts in this district.
                        </p>
                      ) : (
                        selectedDistrictDrilldown.removedPosts.slice(0, 4).map((post) => (
                          <div
                            key={post.id}
                            className="rounded-xl border border-red-100 bg-red-50 px-4 py-3"
                          >
                            <p className="line-clamp-2 text-sm font-semibold text-red-950">
                              {post.title}
                            </p>
                            <p className="mt-1 text-xs text-red-700">
                              {post.category || "Uncategorized"} • {formatDate(post.created_at)}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <h3 className="text-lg font-semibold text-slate-900">
                      Meeting Requests
                    </h3>
                    <div className="mt-4 space-y-3">
                      {selectedDistrictDrilldown.meetings.length === 0 ? (
                        <p className="rounded-xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
                          No meeting requests for this district.
                        </p>
                      ) : (
                        selectedDistrictDrilldown.meetings.slice(0, 4).map((request) => (
                          <div
                            key={request.id}
                            className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getMeetingStatusClasses(
                                  request.status
                                )}`}
                              >
                                {request.status || "pending"}
                              </span>
                              <span className="text-xs text-indigo-700">
                                {formatDate(request.created_at)}
                              </span>
                            </div>
                            <p className="mt-2 line-clamp-2 text-sm font-semibold text-indigo-950">
                              {request.topic || "Meeting request"}
                            </p>
                            <p className="mt-1 text-xs text-indigo-700">
                              {request.citizen_name || "Constituent"} to{" "}
                              {request.representative_name || "Representative"}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Video Meeting Requests */}
          <section
            ref={videoMeetingsRef}
            className="scroll-mt-6 rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="border-b border-slate-200 px-6 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Video Meeting Requests
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Review constituent meeting requests and generate video links only
                    after approval.
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">
                  <Video className="h-4 w-4" />
                  {pendingMeetingRequests.length} pending
                </div>
              </div>
            </div>

            <div className="p-6">
              {videoMeetingRequests.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
                  <Video className="mx-auto h-8 w-8 text-slate-400" />
                  <h3 className="mt-4 text-lg font-semibold text-slate-800">
                    No video meeting requests yet
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Requests submitted from representative cards will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {videoMeetingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 hover:shadow-sm transition"
                    >
                      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1 space-y-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getMeetingStatusClasses(
                                request.status
                              )}`}
                            >
                              {request.status || "pending"}
                            </span>

                            {request.district ? (
                              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                                {request.district}
                              </span>
                            ) : null}

                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                              {formatDate(request.created_at)}
                            </span>
                          </div>

                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">
                              {request.topic || "Meeting request"}
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              {request.citizen_name || "Citizen"} requested time with{" "}
                              {request.representative_name || "Representative"}.
                            </p>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="rounded-xl bg-slate-50 px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Representative
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-900">
                                {request.representative_name || "—"}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {request.representative_title || request.representative_office || "—"}
                              </p>
                            </div>

                            <div className="rounded-xl bg-slate-50 px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Preferred Times
                              </p>
                              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                                {request.preferred_times || "—"}
                              </p>
                            </div>
                          </div>

                          {request.notes ? (
                            <div className="rounded-xl bg-slate-50 px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Notes
                              </p>
                              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                {request.notes}
                              </p>
                            </div>
                          ) : null}

                          {request.meeting_url ? (
                            <a
                              href={request.meeting_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
                            >
                              <Video className="h-4 w-4" />
                              Open approved meeting link
                            </a>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap gap-2 xl:min-w-[190px] xl:flex-col">
                          <button
                            onClick={() => updateMeetingRequestStatus(request, "approved")}
                            disabled={
                              meetingActionLoadingId === request.id ||
                              request.status === "approved"
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            {meetingActionLoadingId === request.id
                              ? "Updating..."
                              : "Approve"}
                          </button>

                          <button
                            onClick={() => updateMeetingRequestStatus(request, "rejected")}
                            disabled={
                              meetingActionLoadingId === request.id ||
                              request.status === "rejected"
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <XCircle className="h-4 w-4" />
                            {meetingActionLoadingId === request.id
                              ? "Updating..."
                              : "Reject"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Escalated Cases */}
          <section
            ref={escalatedCasesRef}
            className="scroll-mt-6 rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="border-b border-slate-200 px-6 py-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    {adminPostView === "all"
                      ? "All Posts"
                      : adminPostView === "removed"
                      ? "Removed Posts"
                      : "Escalated Cases Queue"}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {adminPostView === "all"
                      ? "All posts currently visible to the admin console."
                      : adminPostView === "removed"
                      ? "Posts removed through moderation decisions."
                      : "Final admin review for posts escalated by moderators."}
                  </p>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 lg:w-[380px]">
                  <Search className="h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    value={issueSearch}
                    onChange={(e) => setIssueSearch(e.target.value)}
                    placeholder={
                      adminPostView === "all"
                        ? "Search all posts"
                        : adminPostView === "removed"
                        ? "Search removed posts"
                        : "Search escalated cases"
                    }
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
                    {adminPostView === "all"
                      ? "No posts found"
                      : adminPostView === "removed"
                      ? "No removed posts found"
                      : "No escalated cases found"}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    {adminPostView === "all"
                      ? "No posts match your current search."
                      : adminPostView === "removed"
                      ? "No removed posts match your current search."
                      : "All escalated items are cleared or nothing matches your search."}
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

                            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                              {normalizeDistrict(issue.district)}
                            </span>
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
          <section
            ref={userManagementRef}
            className="scroll-mt-6 rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden"
          >
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

          {/* Governance Audit Trail */}
          <section
            ref={auditTrailRef}
            className="scroll-mt-6 rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                    Governance Audit Trail
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Trace high-impact governance actions across content decisions and role changes.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setAuditTrailView("live")}
                  className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
                >
                  <History className="h-4 w-4 text-slate-500" />
                  {auditTrailView === "live" ? "Live audit feed" : "Back to live feed"}
                </button>
              </div>
            </div>

            <div className="p-6">
              {auditTrailView === "outcomes" ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="relative overflow-hidden rounded-2xl border border-green-200 bg-green-50 p-5 pl-7 before:absolute before:inset-y-0 before:left-0 before:w-2 before:bg-green-500">
                      <p className="text-sm font-medium text-green-700">Approved Posts</p>
                      <p className="mt-2 text-3xl font-bold text-green-800">
                        {issues.filter((issue) => issue.status === "approved").length}
                      </p>
                      <p className="mt-1 text-sm text-green-700">
                        {moderationInsights.approvedPct}% of resolved decisions
                      </p>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl border border-red-200 bg-red-50 p-5 pl-7 before:absolute before:inset-y-0 before:left-0 before:w-2 before:bg-red-500">
                      <p className="text-sm font-medium text-red-700">Removed Posts</p>
                      <p className="mt-2 text-3xl font-bold text-red-800">
                        {issues.filter((issue) => issue.status === "removed").length}
                      </p>
                      <p className="mt-1 text-sm text-red-700">
                        {moderationInsights.removedPct}% of resolved decisions
                      </p>
                    </div>
                  </div>

                  {resolvedAuditIssues.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                      <History className="mx-auto h-8 w-8 text-slate-400" />
                      <h3 className="mt-4 text-lg font-semibold text-slate-800">
                        No resolved post decisions yet
                      </h3>
                      <p className="mt-2 text-sm text-slate-500">
                        Approved and removed posts will appear here after moderation decisions.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {resolvedAuditIssues.map((issue) => (
                        <div
                          key={issue.id}
                          className="rounded-2xl border border-slate-200 bg-white p-5"
                        >
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
                                    issue.status
                                  )}`}
                                >
                                  {issue.status}
                                </span>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                                  {issue.category || "Uncategorized"}
                                </span>
                                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                                  {normalizeDistrict(issue.district)}
                                </span>
                              </div>
                              <h3 className="mt-3 text-base font-semibold text-slate-900">
                                {issue.title}
                              </h3>
                              <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                                {issue.description}
                              </p>
                            </div>
                            <div className="shrink-0 text-sm text-slate-500">
                              {formatDate(issue.created_at)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : auditTrailView === "categories" ? (
                <div className="space-y-4">
                  {flaggedCategoryAuditRows.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                      <Tags className="mx-auto h-8 w-8 text-slate-400" />
                      <h3 className="mt-4 text-lg font-semibold text-slate-800">
                        No flagged categories yet
                      </h3>
                      <p className="mt-2 text-sm text-slate-500">
                        Categories will appear here when posts are escalated or removed.
                      </p>
                    </div>
                  ) : (
                    flaggedCategoryAuditRows.map((category, index) => (
                      <div
                        key={category.name}
                        className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 pl-7 before:absolute before:inset-y-0 before:left-0 before:w-2 before:bg-rose-500"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                                #{index + 1} flagged category
                              </span>
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                                {category.count} total flags
                              </span>
                            </div>
                            <h3 className="mt-3 text-lg font-semibold text-slate-900">
                              {category.name}
                            </h3>
                            <p className="mt-2 text-sm text-slate-500">
                              {category.escalated} escalated • {category.removed} removed
                            </p>
                          </div>

                          <div className="grid min-w-[220px] grid-cols-2 gap-2 text-sm">
                            <div className="rounded-xl bg-yellow-50 px-3 py-2 text-yellow-800">
                              <span className="block text-xs font-medium">Escalated</span>
                              <span className="text-lg font-bold">{category.escalated}</span>
                            </div>
                            <div className="rounded-xl bg-red-50 px-3 py-2 text-red-800">
                              <span className="block text-xs font-medium">Removed</span>
                              <span className="text-lg font-bold">{category.removed}</span>
                            </div>
                          </div>
                        </div>

                        {category.posts.length > 0 && (
                          <div className="mt-4 grid gap-2 md:grid-cols-2">
                            {category.posts.map((post) => (
                              <div
                                key={post.id}
                                className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <p className="truncate text-sm font-semibold text-slate-900">
                                    {post.title}
                                  </p>
                                  <span className="shrink-0 text-xs font-medium text-slate-500">
                                    {post.status}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-slate-500">
                                  {normalizeDistrict(post.district)} • {formatDate(post.created_at)}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              ) : liveAuditLogs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
                  <History className="mx-auto h-8 w-8 text-slate-400" />
                  <h3 className="mt-4 text-lg font-semibold text-slate-800">
                    No audit activity yet
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Governance events will appear here when admins review content or update user roles.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {liveAuditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getAuditEventClasses(
                                log
                              )}`}
                            >
                              {getAuditEventLabel(log)}
                            </span>

                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                              {log.actor_role || "system"}
                            </span>

                            {log.entity_type && (
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                                {log.entity_type}
                              </span>
                            )}
                          </div>

                          <div className="mt-3">
                            <h3 className="text-base font-semibold text-slate-900">
                              {renderAuditDescription(log)}
                            </h3>
                            <p className="mt-2 text-sm text-slate-500">
                              {renderAuditMeta(log) || "Governance metadata unavailable"}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 text-sm text-slate-500">
                          {formatDate(log.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

          {/* Platform Donations */}
          <section ref={donationsRef} className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 px-6 py-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Platform Donations</h2>
                <p className="mt-1 text-sm text-slate-500">All contributions received through Civix250</p>
              </div>
              <button
                onClick={() => setShowDonationForm((v) => !v)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
              >
                {showDonationForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {showDonationForm ? "Cancel" : "Record Donation"}
              </button>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-6 py-5 border-b border-slate-100">
              {[
                {
                  label: "Total Raised",
                  value: `$${donations.reduce((s, d) => s + d.amount, 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  color: "text-emerald-700",
                },
                {
                  label: "Total Donations",
                  value: donations.length,
                  color: "text-slate-900",
                },
                {
                  label: "Avg Donation",
                  value: donations.length
                    ? `$${(donations.reduce((s, d) => s + d.amount, 0) / donations.length).toFixed(2)}`
                    : "$0.00",
                  color: "text-blue-700",
                },
                {
                  label: "This Month",
                  value: `$${donations
                    .filter((d) => {
                      const dt = d.created_at ? new Date(d.created_at) : null;
                      if (!dt) return false;
                      const now = new Date();
                      return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
                    })
                    .reduce((s, d) => s + d.amount, 0)
                    .toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  color: "text-violet-700",
                },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{stat.label}</p>
                  <p className={`mt-1 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Manual entry form */}
            {showDonationForm && (
              <form onSubmit={handleRecordDonation} className="px-6 py-5 border-b border-slate-100 bg-emerald-50">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Record a New Donation</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Donor Name</label>
                    <input
                      type="text"
                      placeholder="Anonymous"
                      value={donationForm.donor_name}
                      onChange={(e) => setDonationForm((f) => ({ ...f, donor_name: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Donor Email</label>
                    <input
                      type="email"
                      placeholder="donor@email.com"
                      value={donationForm.donor_email}
                      onChange={(e) => setDonationForm((f) => ({ ...f, donor_email: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Amount (USD) *</label>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder="25.00"
                      required
                      value={donationForm.amount}
                      onChange={(e) => setDonationForm((f) => ({ ...f, amount: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Method</label>
                    <select
                      value={donationForm.payment_method}
                      onChange={(e) => setDonationForm((f) => ({ ...f, payment_method: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400"
                    >
                      <option value="givebutter">Givebutter</option>
                      <option value="check">Check</option>
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Mode</label>
                    <select
                      value={donationForm.recurring ? "recurring" : "one-time"}
                      onChange={(e) => setDonationForm((f) => ({ ...f, recurring: e.target.value === "recurring" }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400"
                    >
                      <option value="one-time">One-time</option>
                      <option value="recurring">Recurring</option>
                    </select>
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
                    <input
                      type="text"
                      placeholder="Optional notes..."
                      value={donationForm.notes}
                      onChange={(e) => setDonationForm((f) => ({ ...f, notes: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={donationFormLoading}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {donationFormLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
                  {donationFormLoading ? "Saving..." : "Save Donation"}
                </button>
              </form>
            )}

            {/* Donations table */}
            <div className="overflow-x-auto">
              {donations.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <HeartHandshake className="mx-auto h-8 w-8 text-slate-300 mb-3" />
                  <p className="text-sm text-slate-500">No donations recorded yet.</p>
                  <p className="text-xs text-slate-400 mt-1">Use "Record Donation" to log a contribution manually.</p>
                </div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-widest text-slate-500">
                      <th className="px-6 py-3 text-left">Date</th>
                      <th className="px-6 py-3 text-left">Donor</th>
                      <th className="px-6 py-3 text-left">Tier</th>
                      <th className="px-6 py-3 text-left">Email</th>
                      <th className="px-6 py-3 text-left">Mode</th>
                      <th className="px-6 py-3 text-right">Amount</th>
                      <th className="px-6 py-3 text-left">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donations.map((d) => {
                      const recognition = donorRecognition.get(
                        donorKey(d.donor_email, d.donor_name)
                      );
                      return (
                      <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                        <td className="px-6 py-3 text-slate-600 whitespace-nowrap">
                          {d.created_at ? new Date(d.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                        </td>
                        <td className="px-6 py-3 font-medium text-slate-900">
                          {d.donor_name || <span className="text-slate-400 italic">Anonymous</span>}
                        </td>
                        <td className="px-6 py-3">
                          {recognition ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${recognition.tier.badgeClass}`}
                                title={`Lifetime giving: $${recognition.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                              >
                                {recognition.tier.name}
                              </span>
                              {recognition.sustaining && (
                                <span
                                  className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-700"
                                  title="Sustaining Member — recurring/monthly donor"
                                >
                                  ★ Sustaining
                                </span>
                              )}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-6 py-3 text-slate-600">{d.donor_email || "—"}</td>
                        <td className="px-6 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              d.recurring
                                ? "bg-blue-100 text-blue-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {d.recurring ? "Recurring" : "One-time"}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right font-bold text-emerald-700">
                          ${d.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-3 text-slate-500 max-w-[200px] truncate">{d.notes || "—"}</td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
