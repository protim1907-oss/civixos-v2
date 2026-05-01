"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Sidebar from "@/components/layout/Sidebar";
import {
  Search,
  Filter,
  Megaphone,
  AlertTriangle,
  Building2,
  CalendarDays,
  ArrowRight,
  Loader2,
  MapPinned,
  ThumbsUp,
  MessageCircle,
  Share2,
  X,
} from "lucide-react";

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  district: string | null;
  state: string | null;
  city?: string | null;
  zip_code?: string | null;
  street_address?: string | null;
};

type OfficialUpdateCategory =
  | "Public Notice"
  | "Policy Update"
  | "Infrastructure"
  | "Public Safety"
  | "Education"
  | "Community"
  | "Video Meeting";

type OfficialUpdate = {
  id: string;
  district: string;
  state: string;
  title: string;
  summary: string;
  body: string;
  category: OfficialUpdateCategory;
  office: string;
  date: string;
  priority: "High" | "Normal";
  status: "Active" | "New" | "Ongoing";
  upvotes: number;
  comments: number;
  shares: number;
  sourceUrl?: string;
};

type CommentItem = {
  id: string;
  author: string;
  text: string;
  createdAt: string;
};

type VideoMeetingRequestRow = {
  id: string;
  citizen_name: string | null;
  district: string | null;
  representative_name: string | null;
  representative_title: string | null;
  representative_office: string | null;
  topic: string;
  preferred_times: string;
  notes: string | null;
  status: "pending" | "approved" | "rejected" | "completed";
  meeting_url: string | null;
  reviewed_at: string | null;
  created_at: string | null;
};

function normalizeStateCode(state?: string | null): string {
  const value = String(state || "").trim().toLowerCase();

  const map: Record<string, string> = {
    texas: "TX",
    tx: "TX",
    california: "CA",
    ca: "CA",
    "new hampshire": "NH",
    nh: "NH",
    florida: "FL",
    fl: "FL",
    "new york": "NY",
    ny: "NY",
  };

  return map[value] || String(state || "").trim().toUpperCase();
}

function normalizeDistrict(
  rawValue: string | null | undefined,
  state?: string | null
): string {
  const raw = String(rawValue || "").trim().toUpperCase();
  const stateCode = normalizeStateCode(state);

  if (!raw) return stateCode || "N/A";
  if (/^[A-Z]{2}$/.test(raw)) return raw;
  if (/^[A-Z]{2}-\d{1,2}$/.test(raw)) return raw;

  const prefixedMatch = raw.match(/^([A-Z]{2})[\s-]?(\d{1,2})$/);
  if (prefixedMatch?.[1] && prefixedMatch?.[2]) {
    return `${prefixedMatch[1]}-${Number(prefixedMatch[2])}`;
  }

  const numericMatch = raw.match(/(\d{1,2})/);
  if (numericMatch?.[1] && stateCode) {
    return `${stateCode}-${Number(numericMatch[1])}`;
  }

  return raw;
}

function normalizeStateName(state?: string | null): string {
  const value = String(state || "").trim().toLowerCase();

  const map: Record<string, string> = {
    texas: "Texas",
    tx: "Texas",
    california: "California",
    ca: "California",
    "new hampshire": "New Hampshire",
    nh: "New Hampshire",
    florida: "Florida",
    fl: "Florida",
    "new york": "New York",
    ny: "New York",
  };

  return map[value] || String(state || "").trim() || "State";
}

function isStaffRole(role?: string | null) {
  return role === "admin" || role === "moderator" || role === "official";
}

function formatDisplayDate(dateString?: string | null) {
  if (!dateString) return new Date().toLocaleDateString();
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function buildMeetingAnnouncement(request: VideoMeetingRequestRow): OfficialUpdate {
  const district = request.district?.trim().toUpperCase() || "N/A";
  const representativeName = request.representative_name || "Representative";
  const citizenLabel = request.citizen_name || "district residents";
  const office =
    request.representative_office ||
    request.representative_title ||
    "Representative Office";

  return {
    id: `meeting-${request.id}`,
    district,
    state: normalizeStateName(district.includes("-") ? district.split("-")[0] : district),
    title: `Video meeting scheduled with ${representativeName}`,
    summary: `${citizenLabel} will meet with ${representativeName} about ${request.topic}.`,
    body: [
      `A video meeting has been approved for ${district}.`,
      `Topic: ${request.topic}.`,
      `Preferred timing: ${request.preferred_times}.`,
      request.notes ? `Notes: ${request.notes}.` : "",
    ]
      .filter(Boolean)
      .join(" "),
    category: "Video Meeting",
    office,
    date: formatDisplayDate(request.reviewed_at || request.created_at),
    priority: "High",
    status: "Active",
    upvotes: 0,
    comments: 0,
    shares: 0,
    sourceUrl: request.meeting_url || undefined,
  };
}

const OFFICIAL_UPDATES: OfficialUpdate[] = [
  {
    id: "tx35-road-resurfacing",
    district: "TX-35",
    state: "Texas",
    title: "Road resurfacing scheduled for Main Street corridor",
    summary:
      "District transportation teams will begin resurfacing work next week. Temporary lane closures and posted detours will be in effect during work hours.",
    body:
      "The District Transportation Office has announced a resurfacing schedule for the Main Street corridor. Construction teams will work in phased segments to reduce congestion. Residents are encouraged to follow posted detour signage and allow extra travel time during peak hours.",
    category: "Infrastructure",
    office: "District Transportation Office",
    date: "Apr 13, 2026",
    priority: "High",
    status: "Active",
    upvotes: 42,
    comments: 8,
    shares: 5,
    sourceUrl: "https://example.com/tx35-road-resurfacing",
  },
  {
    id: "tx35-public-safety-advisory",
    district: "TX-35",
    state: "Texas",
    title: "Weekend public safety advisory for downtown events",
    summary:
      "Officials have issued temporary traffic and parking guidance due to multiple scheduled public gatherings this weekend.",
    body:
      "Public Safety officials have coordinated with transportation and city services to manage expected higher downtown traffic. Parking restrictions will apply on select streets and officers will be deployed to key intersections.",
    category: "Public Safety",
    office: "District Public Safety Office",
    date: "Apr 15, 2026",
    priority: "Normal",
    status: "New",
    upvotes: 25,
    comments: 4,
    shares: 3,
    sourceUrl: "https://example.com/tx35-public-safety-advisory",
  },
  {
    id: "ca42-port-cleanup",
    district: "CA-42",
    state: "California",
    title: "Port-area cleanup and traffic control plan announced",
    summary:
      "District operations teams will begin a cleanup and logistics improvement initiative near key freight corridors.",
    body:
      "The district has announced a cleanup and traffic-control effort focused on freight mobility and neighborhood access near the port area. Officials said the initiative will improve roadway conditions, pedestrian access, and loading coordination over the next two weeks.",
    category: "Infrastructure",
    office: "District Operations Office",
    date: "Apr 16, 2026",
    priority: "High",
    status: "Active",
    upvotes: 51,
    comments: 11,
    shares: 7,
    sourceUrl: "https://example.com/ca42-port-cleanup",
  },
  {
    id: "ca42-school-grants",
    district: "CA-42",
    state: "California",
    title: "District education office opens community school grant cycle",
    summary:
      "Applications are now open for district-supported community learning and after-school improvement grants.",
    body:
      "The District Education Office has opened a new application round for community schools and after-school enrichment programs. Eligible organizations may apply for support focused on tutoring, technology access, and youth engagement.",
    category: "Education",
    office: "District Education Office",
    date: "Apr 12, 2026",
    priority: "Normal",
    status: "New",
    upvotes: 33,
    comments: 6,
    shares: 4,
    sourceUrl: "https://example.com/ca42-school-grants",
  },
  {
    id: "nh-water-maintenance",
    district: "NH",
    state: "New Hampshire",
    title: "Water system maintenance notice for selected neighborhoods",
    summary:
      "Utility officials have scheduled routine maintenance that may affect water pressure in limited service areas.",
    body:
      "Residents in selected neighborhoods may experience temporary pressure reductions during scheduled maintenance windows. Emergency services and schools have been notified, and utility teams will provide updated completion timing as needed.",
    category: "Public Notice",
    office: "State Utility Coordination Office",
    date: "Apr 14, 2026",
    priority: "High",
    status: "Active",
    upvotes: 19,
    comments: 3,
    shares: 2,
    sourceUrl: "https://example.com/nh-water-maintenance",
  },
  {
    id: "nh-community-feedback",
    district: "NH",
    state: "New Hampshire",
    title: "Community feedback sessions scheduled across the district",
    summary:
      "Officials are hosting listening sessions on transportation, public services, and neighborhood priorities.",
    body:
      "A series of community listening sessions will be held across the district to gather resident input on service delivery, transportation safety, and local priorities. Residents are encouraged to attend and submit recommendations.",
    category: "Community",
    office: "District Engagement Office",
    date: "Apr 10, 2026",
    priority: "Normal",
    status: "Ongoing",
    upvotes: 27,
    comments: 9,
    shares: 6,
    sourceUrl: "https://example.com/nh-community-feedback",
  },
];

function getCategoryBadgeClasses(category: OfficialUpdateCategory) {
  switch (category) {
    case "Infrastructure":
      return "bg-slate-100 text-slate-700";
    case "Policy Update":
      return "bg-blue-50 text-blue-700";
    case "Public Notice":
      return "bg-amber-50 text-amber-700";
    case "Public Safety":
      return "bg-red-50 text-red-700";
    case "Education":
      return "bg-emerald-50 text-emerald-700";
    case "Video Meeting":
      return "bg-indigo-50 text-indigo-700";
    default:
      return "bg-violet-50 text-violet-700";
  }
}

function getPriorityBadgeClasses(priority: OfficialUpdate["priority"]) {
  return priority === "High"
    ? "bg-red-50 text-red-600 ring-red-200"
    : "bg-slate-100 text-slate-600 ring-slate-200";
}

function getStatusBadgeClasses(status: OfficialUpdate["status"]) {
  switch (status) {
    case "New":
      return "bg-blue-50 text-blue-700";
    case "Ongoing":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-indigo-50 text-indigo-700";
  }
}

export default function OfficialUpdatesPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [meetingRequests, setMeetingRequests] = useState<VideoMeetingRequestRow[]>([]);
  const [district, setDistrict] = useState("N/A");
  const [stateName, setStateName] = useState("State");
  const [canViewAllDistricts, setCanViewAllDistricts] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    "All" | OfficialUpdateCategory
  >("All");
  const [activeItem, setActiveItem] = useState<OfficialUpdate | null>(null);

  const [voteState, setVoteState] = useState<Record<string, number>>({});
  const [shareState, setShareState] = useState<Record<string, number>>({});

  const [commentsByItem, setCommentsByItem] = useState<
    Record<string, CommentItem[]>
  >({
    "tx35-road-resurfacing": [
      {
        id: "c1",
        author: "Maria",
        text: "Please publish the lane-closure timing too.",
        createdAt: "2h ago",
      },
    ],
    "ca42-school-grants": [
      {
        id: "c2",
        author: "David",
        text: "Can nonprofits apply jointly with schools?",
        createdAt: "5h ago",
      },
    ],
  });
  const [commentInput, setCommentInput] = useState("");
  const [shareMenuOpenFor, setShareMenuOpenFor] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadMeetingRequests() {
      const { data, error } = await supabase
        .from("video_meeting_requests")
        .select(
          "id, citizen_name, district, representative_name, representative_title, representative_office, topic, preferred_times, notes, status, meeting_url, reviewed_at, created_at"
        )
        .in("status", ["approved", "completed"])
        .order("reviewed_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load meeting announcements:", error.message);
        return;
      }

      if (mounted) {
        setMeetingRequests((data as VideoMeetingRequestRow[]) ?? []);
      }
    }

    async function loadPage() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          window.location.href = "/login";
          return;
        }

        const { data: profileRow } = await supabase
          .from("profiles")
          .select(
            "id, full_name, email, role, district, state, city, zip_code, street_address"
          )
          .eq("id", user.id)
          .single();

        if (!mounted) return;

        const mergedProfile = profileRow ?? null;
        setProfile(mergedProfile);

        const metadataState =
          (user.user_metadata?.state as string | undefined) || "";
        const metadataDistrict =
          (user.user_metadata?.district as string | undefined) ||
          (user.user_metadata?.district_name as string | undefined) ||
          (user.user_metadata?.district_id as string | undefined) ||
          "";

        const requestedDistrict =
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.search).get("district")
            : null;
        const userCanViewAllDistricts = isStaffRole(mergedProfile?.role);
        const effectiveState = mergedProfile?.state || metadataState || "";
        const effectiveDistrict =
          requestedDistrict ||
          (userCanViewAllDistricts
            ? "All"
            : mergedProfile?.district || metadataDistrict || effectiveState || "N/A");

        const normalizedDistrict =
          effectiveDistrict === "All"
            ? "All"
            : normalizeDistrict(effectiveDistrict, effectiveState);
        const derivedStateCode = normalizedDistrict.includes("-")
          ? normalizedDistrict.split("-")[0]
          : normalizeStateCode(effectiveState || normalizedDistrict);

        setCanViewAllDistricts(userCanViewAllDistricts);
        setDistrict(normalizedDistrict);
        setStateName(
          normalizedDistrict === "All"
            ? "all tracked states"
            : normalizeStateName(derivedStateCode)
        );

        await loadMeetingRequests();
      } catch (error) {
        console.error("Failed to load official updates page:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadPage();

    const meetingsChannel = supabase
      .channel("official-updates-video-meetings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "video_meeting_requests" },
        async () => {
          await loadMeetingRequests();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(meetingsChannel);
    };
  }, [supabase]);

  const meetingAnnouncements = useMemo(() => {
    return meetingRequests.map(buildMeetingAnnouncement);
  }, [meetingRequests]);

  const officialUpdates = useMemo(() => {
    return [...meetingAnnouncements, ...OFFICIAL_UPDATES];
  }, [meetingAnnouncements]);

  const districtUpdates = useMemo(() => {
    if (district === "All") return officialUpdates;
    return officialUpdates.filter((item) => item.district === district);
  }, [district, officialUpdates]);

  const displayStateName = useMemo(() => {
    if (district === "All") return "all tracked states";
    const stateCode = district.includes("-")
      ? district.split("-")[0]
      : normalizeStateCode(stateName || district);
    return normalizeStateName(stateCode);
  }, [district, stateName]);

  const availableDistricts = useMemo(() => {
    return Array.from(new Set(officialUpdates.map((item) => item.district))).sort();
  }, [officialUpdates]);

  const filteredUpdates = useMemo(() => {
    return districtUpdates.filter((item) => {
      const matchesCategory =
        selectedCategory === "All" || item.category === selectedCategory;

      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.office.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);

      return matchesCategory && matchesQuery;
    });
  }, [districtUpdates, query, selectedCategory]);

  const activeNotices = filteredUpdates.length;
  const highPriorityCount = filteredUpdates.filter(
    (item) => item.priority === "High"
  ).length;
  const reportingOffices = new Set(filteredUpdates.map((item) => item.office)).size;

  function getTotalComments(itemId: string, baseComments: number) {
    const extra = commentsByItem[itemId]?.length || 0;
    return Math.max(baseComments, extra);
  }

  function handleUpvote(itemId: string) {
    setVoteState((prev) => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
  }

  function handleOpenComments(item: OfficialUpdate) {
    setActiveItem(item);
  }

  function handleAddComment() {
    if (!activeItem || !commentInput.trim()) return;

    const author = profile?.full_name?.trim() || "Citizen";

    const newComment: CommentItem = {
      id: `comment-${Date.now()}`,
      author,
      text: commentInput.trim(),
      createdAt: "Just now",
    };

    setCommentsByItem((prev) => ({
      ...prev,
      [activeItem.id]: [...(prev[activeItem.id] || []), newComment],
    }));

    setCommentInput("");
  }

  async function copyShareUrl(item: OfficialUpdate) {
    const shareUrl = item.sourceUrl || "";

    if (!shareUrl) return;

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
    }
  }

  function openWhatsAppShare(item: OfficialUpdate) {
    const shareUrl = item.sourceUrl || "";
    if (!shareUrl) return;

    const text = `${item.title} — ${shareUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;

    if (typeof window !== "undefined") {
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    }
  }

  async function handleShare(
    item: OfficialUpdate,
    mode: "copy" | "whatsapp" = "copy"
  ) {
    setShareState((prev) => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }));
    setShareMenuOpenFor(null);

    try {
      if (!item.sourceUrl) return;

      if (mode === "whatsapp") {
        openWhatsAppShare(item);
        return;
      }

      if (navigator.share) {
        await navigator.share({
          title: item.title,
          text: item.summary,
          url: item.sourceUrl,
        });
      } else {
        await copyShareUrl(item);
      }
    } catch (error) {
      console.error("Share failed:", error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto flex max-w-[1700px]">
          <Sidebar />
          <main className="flex-1 p-6 md:p-8">
            <div className="flex h-[70vh] items-center justify-center">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                <span className="text-sm font-medium text-slate-600">
                  Loading official district updates...
                </span>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-[1700px]">
        <Sidebar />

        <main className="flex-1 p-6 md:p-8">
          <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
            <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-800 px-8 py-8 text-white">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-4xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.32em] text-blue-100/90">
                    Verified Communication Feed
                  </p>
                  <h1 className="mt-3 text-3xl font-bold tracking-tight">
                    Official Updates for{" "}
                    {district === "All" ? "All Districts" : district}
                  </h1>
                  <p className="mt-3 max-w-3xl text-base leading-8 text-blue-100/90">
                    View verified announcements, public notices, policy changes,
                    and official communications for{" "}
                    {district === "All" ? "all tracked districts" : district} in{" "}
                    {displayStateName}.
                    Each update can be opened, upvoted, commented on, and shared.
                  </p>
                </div>

                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 px-8 py-7 lg:grid-cols-3">
              <StatCard
                title="Active Notices"
                value={activeNotices}
                icon={<Megaphone className="h-6 w-6 text-white/90" />}
                cardClassName="bg-gradient-to-r from-sky-500 to-cyan-500"
              />
              <StatCard
                title="High Priority"
                value={highPriorityCount}
                icon={<AlertTriangle className="h-6 w-6 text-white/90" />}
                cardClassName="bg-gradient-to-r from-rose-500 to-pink-500"
              />
              <StatCard
                title="Reporting Offices"
                value={reportingOffices}
                icon={<Building2 className="h-6 w-6 text-white/90" />}
                cardClassName="bg-gradient-to-r from-emerald-500 to-green-500"
              />
            </div>
          </div>

          <div className="mt-7 grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_0.72fr]">
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    District-specific communication feed
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                    Latest Official Announcements
                  </h2>
                </div>
                <div className="text-sm text-slate-500">
                  {filteredUpdates.length} update
                  {filteredUpdates.length === 1 ? "" : "s"} found
                </div>
              </div>

              <div className="space-y-5">
                {filteredUpdates.length > 0 ? (
                  filteredUpdates.map((item) => {
                    const totalUpvotes = item.upvotes + (voteState[item.id] || 0);
                    const totalComments = getTotalComments(item.id, item.comments);
                    const totalShares = item.shares + (shareState[item.id] || 0);

                    return (
                      <div
                        key={item.id}
                        className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-200 hover:shadow-md"
                      >
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-3">
                              <span
                                className={`rounded-full px-4 py-2 text-sm font-semibold ${getCategoryBadgeClasses(
                                  item.category
                                )}`}
                              >
                                {item.category}
                              </span>
                              <span
                                className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 ${getPriorityBadgeClasses(
                                  item.priority
                                )}`}
                              >
                                {item.priority} Priority
                              </span>
                              <span
                                className={`rounded-full px-4 py-2 text-sm font-semibold ${getStatusBadgeClasses(
                                  item.status
                                )}`}
                              >
                                {item.status}
                              </span>
                            </div>

                            {item.sourceUrl ? (
                              <a
                                href={item.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                              >
                                <h3 className="mt-5 text-[2.2rem] font-bold leading-tight tracking-tight text-slate-900 hover:underline">
                                  {item.title}
                                </h3>
                              </a>
                            ) : (
                              <h3 className="mt-5 text-[2.2rem] font-bold leading-tight tracking-tight text-slate-900">
                                {item.title}
                              </h3>
                            )}

                            <p className="mt-4 max-w-3xl text-lg leading-9 text-slate-600">
                              {item.summary}
                            </p>

                            <div className="mt-6 flex flex-wrap items-center gap-5 text-sm text-slate-500">
                              <div className="inline-flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                {item.office}
                              </div>
                              <div className="inline-flex items-center gap-2">
                                <CalendarDays className="h-4 w-4" />
                                {item.date}
                              </div>
                              <div className="inline-flex items-center gap-2">
                                <MapPinned className="h-4 w-4" />
                                {item.district}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-3 lg:w-[170px]">
                            {item.sourceUrl ? (
                              <a
                                href={item.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 rounded-[22px] bg-slate-950 px-5 py-4 text-base font-semibold text-white transition hover:bg-slate-800"
                              >
                                View details
                                <ArrowRight className="h-4 w-4" />
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setActiveItem(item)}
                                className="inline-flex items-center justify-center gap-2 rounded-[22px] bg-slate-950 px-5 py-4 text-base font-semibold text-white transition hover:bg-slate-800"
                              >
                                View details
                                <ArrowRight className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
                          <button
                            onClick={() => handleUpvote(item.id)}
                            className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                          >
                            <ThumbsUp className="h-4 w-4" />
                            Upvote ({totalUpvotes})
                          </button>

                          <button
                            onClick={() => handleOpenComments(item)}
                            className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                          >
                            <MessageCircle className="h-4 w-4" />
                            Comment ({totalComments})
                          </button>

                          <div className="relative">
                            <button
                              onClick={() =>
                                setShareMenuOpenFor((prev) =>
                                  prev === item.id ? null : item.id
                                )
                              }
                              className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                            >
                              <Share2 className="h-4 w-4" />
                              Share ({totalShares})
                            </button>

                            {shareMenuOpenFor === item.id ? (
                              <div className="absolute left-0 z-20 mt-2 w-44 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                                <button
                                  onClick={() => handleShare(item, "copy")}
                                  className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                                >
                                  Copy link
                                </button>
                                <button
                                  onClick={() => handleShare(item, "whatsapp")}
                                  className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                                >
                                  Share on WhatsApp
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-[26px] border border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center text-slate-500">
                    No official updates were found for{" "}
                    {district === "All" ? "the selected districts" : district} with the current filters.
                  </div>
                )}
              </div>
            </section>

            <aside className="space-y-6">
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <Search className="h-6 w-6 text-slate-400" />
                  <h3 className="text-2xl font-bold text-slate-900">Search</h3>
                </div>

                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search official updates..."
                  className="mt-6 w-full rounded-2xl border border-slate-200 px-4 py-4 text-base outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <Filter className="h-6 w-6 text-slate-400" />
                  <h3 className="text-2xl font-bold text-slate-900">Filters</h3>
                </div>

                {canViewAllDistricts ? (
                  <div className="mt-7">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                      District
                    </p>
                    <select
                      value={district}
                      onChange={(event) => setDistrict(event.target.value)}
                      className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="All">All Districts</option>
                      {availableDistricts.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <div className={canViewAllDistricts ? "mt-8" : "mt-7"}>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Category
                  </p>

                  <div className="mt-5 space-y-4">
                    {(
                      [
                        "All",
                        "Public Notice",
                        "Policy Update",
                        "Infrastructure",
                        "Public Safety",
                        "Education",
                        "Community",
                        "Video Meeting",
                      ] as const
                    ).map((category) => (
                      <label
                        key={category}
                        className="flex items-center gap-3 text-lg text-slate-700"
                      >
                        <input
                          type="radio"
                          name="category"
                          value={category}
                          checked={selectedCategory === category}
                          onChange={() => setSelectedCategory(category)}
                          className="h-5 w-5"
                        />
                        {category}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>

      {activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-[30px] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Official Update Detail
                </p>
                <h3 className="mt-2 text-2xl font-bold text-slate-900">
                  {activeItem.title}
                </h3>
              </div>

              <button
                onClick={() => {
                  setActiveItem(null);
                  setShareMenuOpenFor(null);
                  setCommentInput("");
                }}
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-6">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${getCategoryBadgeClasses(
                    activeItem.category
                  )}`}
                >
                  {activeItem.category}
                </span>
                <span
                  className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 ${getPriorityBadgeClasses(
                    activeItem.priority
                  )}`}
                >
                  {activeItem.priority} Priority
                </span>
                <span
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${getStatusBadgeClasses(
                    activeItem.status
                  )}`}
                >
                  {activeItem.status}
                </span>
              </div>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                {activeItem.body}
              </p>

              <div className="mt-8 grid grid-cols-1 gap-4 rounded-2xl bg-slate-50 p-5 sm:grid-cols-2">
                <div className="text-sm text-slate-600">
                  <div className="font-semibold text-slate-900">
                    Reporting Office
                  </div>
                  <div className="mt-1">{activeItem.office}</div>
                </div>
                <div className="text-sm text-slate-600">
                  <div className="font-semibold text-slate-900">Date</div>
                  <div className="mt-1">{activeItem.date}</div>
                </div>
                <div className="text-sm text-slate-600">
                  <div className="font-semibold text-slate-900">District</div>
                  <div className="mt-1">{activeItem.district}</div>
                </div>
                <div className="text-sm text-slate-600">
                  <div className="font-semibold text-slate-900">State</div>
                  <div className="mt-1">{activeItem.state}</div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => handleUpvote(activeItem.id)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                >
                  <ThumbsUp className="h-4 w-4" />
                  Upvote
                </button>
                <button
                  onClick={() => handleOpenComments(activeItem)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                >
                  <MessageCircle className="h-4 w-4" />
                  Comment
                </button>

                <div className="relative">
                  <button
                    onClick={() =>
                      setShareMenuOpenFor((prev) =>
                        prev === activeItem.id ? null : activeItem.id
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </button>

                  {shareMenuOpenFor === activeItem.id ? (
                    <div className="absolute left-0 z-20 mt-2 w-44 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                      <button
                        onClick={() => handleShare(activeItem, "copy")}
                        className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                      >
                        Copy link
                      </button>
                      <button
                        onClick={() => handleShare(activeItem, "whatsapp")}
                        className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                      >
                        Share on WhatsApp
                      </button>
                    </div>
                  ) : null}
                </div>

                {activeItem.sourceUrl ? (
                  <a
                    href={activeItem.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Open source page
                    <ArrowRight className="h-4 w-4" />
                  </a>
                ) : null}
              </div>

              <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-lg font-bold text-slate-900">
                    Comments ({getTotalComments(activeItem.id, activeItem.comments)})
                  </h4>
                </div>

                <div className="mt-4 flex gap-3">
                  <textarea
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    rows={3}
                    placeholder="Write your comment on this official update..."
                    className="flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!commentInput.trim()}
                    className="self-end rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Post
                  </button>
                </div>

                <div className="mt-5 space-y-3">
                  {(commentsByItem[activeItem.id] || []).length > 0 ? (
                    (commentsByItem[activeItem.id] || []).map((comment) => (
                      <div
                        key={comment.id}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-slate-900">
                            {comment.author}
                          </div>
                          <div className="text-xs text-slate-500">
                            {comment.createdAt}
                          </div>
                        </div>
                        <p className="mt-2 text-sm leading-7 text-slate-700">
                          {comment.text}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                      No comments yet. Start the conversation.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  cardClassName,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  cardClassName: string;
}) {
  return (
    <div className={`rounded-[28px] p-6 text-white shadow-sm ${cardClassName}`}>
      <div className="flex items-start justify-between">
        <p className="text-xl text-white/90">{title}</p>
        {icon}
      </div>
      <div className="mt-6 text-5xl font-bold tracking-tight">{value}</div>
    </div>
  );
}
