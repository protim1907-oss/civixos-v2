"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  | "Community";

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
  href?: string;
};

type CommentItem = {
  id: string;
  author: string;
  text: string;
  createdAt: string;
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
    href: "/feed?issue=Road%20resurfacing%20scheduled%20for%20Main%20Street%20corridor",
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
    href: "/feed?issue=Weekend%20public%20safety%20advisory%20for%20downtown%20events",
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
    href: "/feed?issue=Port-area%20cleanup%20and%20traffic%20control%20plan%20announced",
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
    href: "/feed?issue=District%20education%20office%20opens%20community%20school%20grant%20cycle",
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
    href: "/feed?issue=Water%20system%20maintenance%20notice%20for%20selected%20neighborhoods",
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
    href: "/feed?issue=Community%20feedback%20sessions%20scheduled%20across%20the%20district",
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
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [district, setDistrict] = useState("N/A");
  const [stateName, setStateName] = useState("State");
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    "All" | OfficialUpdateCategory
  >("All");
  const [activeItem, setActiveItem] = useState<OfficialUpdate | null>(null);

  const [voteState, setVoteState] = useState<Record<string, number>>({});
  const [commentState, setCommentState] = useState<Record<string, number>>({});
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

    async function loadPage() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.push("/login");
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
          "";

        const effectiveState = mergedProfile?.state || metadataState || "";
        const effectiveDistrict =
          mergedProfile?.district || metadataDistrict || effectiveState || "N/A";

        const normalizedDistrict = normalizeDistrict(
          effectiveDistrict,
          effectiveState
        );
        const derivedStateCode = normalizedDistrict.includes("-")
          ? normalizedDistrict.split("-")[0]
          : normalizeStateCode(effectiveState || normalizedDistrict);

        setDistrict(normalizedDistrict);
        setStateName(normalizeStateName(derivedStateCode));
      } catch (error) {
        console.error("Failed to load official updates page:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadPage();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  const districtUpdates = useMemo(() => {
    return OFFICIAL_UPDATES.filter((item) => item.district === district);
  }, [district]);

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
  const reportingOffices = new Set(filteredUpdates.map((item) => item.office))
    .size;

  function getTotalComments(itemId: string, baseComments: number) {
    const extra = commentsByItem[itemId]?.length || 0;
    return Math.max(baseComments, extra);
  }

  function handleUpvote(itemId: string) {
    setVoteState((prev) => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
  }

  function handleOpenComments(item: OfficialUpdate) {
    setActiveItem(item);
    setCommentState((prev) => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }));
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
    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}${item.href || "/feed"}`
        : item.href || "/feed";

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
    }
  }

  function openWhatsAppShare(item: OfficialUpdate) {
    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}${item.href || "/feed"}`
        : item.href || "/feed";

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
      if (mode === "whatsapp") {
        openWhatsAppShare(item);
        return;
      }

      if (navigator.share) {
        const shareUrl =
          typeof window !== "undefined"
            ? `${window.location.origin}${item.href || "/feed"}`
            : item.href || "/feed";

        await navigator.share({
          title: item.title,
          text: item.summary,
          url: shareUrl,
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
                    Official Updates for {district}
                  </h1>
                  <p className="mt-3 max-w-3xl text-base leading-8 text-blue-100/90">
                    View verified announcements, public notices, policy changes,
                    and official communications for {district} in {stateName}.
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

                            <h3 className="mt-5 text-[2.2rem] font-bold leading-tight tracking-tight text-slate-900">
                              {item.title}
                            </h3>

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
                            <button
                              onClick={() => router.push(item.href || "/feed")}
                              className="inline-flex items-center justify-center gap-2 rounded-[22px] bg-slate-950 px-5 py-4 text-base font-semibold text-white transition hover:bg-slate-800"
                            >
                              View details
                              <ArrowRight className="h-4 w-4" />
                            </button>
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
                    No official updates were found for {district} with the
                    current filters.
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

                <div className="mt-7">
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

                <Link
                  href={activeItem.href || "/feed"}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Open related page
                  <ArrowRight className="h-4 w-4" />
                </Link>
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