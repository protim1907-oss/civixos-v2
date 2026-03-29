"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type TabType = "All Posts" | "Official Updates" | "Community Issues" | "Resolved";

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  district_id: string | null;
  role: string | null;
  districts?: {
    id: string;
    name: string | null;
  }[] | null;
};

type IssueRow = {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  category: string | null;
  created_at: string | null;
  district_id: string | null;
  user_id: string | null;
  profiles?: {
    full_name: string | null;
    role: string | null;
  }[] | null;
};

type AiModerationRow = {
  issue_id: string;
  toxicity_score: number | null;
  spam_score: number | null;
  misinformation_score: number | null;
  recommended_action: string | null;
};

type DashboardPost = {
  id: string;
  title: string;
  author: string;
  type: "Official" | "Citizen" | "Community";
  status: "Open" | "Under Review" | "Resolved" | "Escalated";
  category: string;
  urgency: "Low" | "Medium" | "High";
  description: string;
  date: string;
  supports: number;
  comments: number;
  userHasSupported: boolean;
  aiModeration?: {
    toxicity: number;
    spam: number;
    misinformation: number;
    recommendedAction: string;
  };
};

function normalizeStatus(status?: string | null): DashboardPost["status"] {
  const value = (status || "").toLowerCase();

  if (value.includes("review")) return "Under Review";
  if (value.includes("resolve")) return "Resolved";
  if (value.includes("escalat")) return "Escalated";
  return "Open";
}

function deriveType(role?: string | null): DashboardPost["type"] {
  const value = (role || "").toLowerCase();

  if (
    value.includes("admin") ||
    value.includes("official") ||
    value.includes("representative")
  ) {
    return "Official";
  }

  if (value.includes("community") || value.includes("moderator")) {
    return "Community";
  }

  return "Citizen";
}

function deriveUrgency(category?: string | null): DashboardPost["urgency"] {
  const value = (category || "").toLowerCase();

  if (value.includes("safety") || value.includes("emergency")) return "High";
  if (value.includes("transport") || value.includes("infrastructure")) return "Medium";
  return "Low";
}

function getStatusBorder(status: DashboardPost["status"]) {
  switch (status) {
    case "Open":
      return "border-l-4 border-red-500";
    case "Under Review":
      return "border-l-4 border-amber-500";
    case "Resolved":
      return "border-l-4 border-emerald-500";
    case "Escalated":
      return "border-l-4 border-blue-500";
    default:
      return "border-l-4 border-slate-300";
  }
}

function getUrgencyBadge(urgency: DashboardPost["urgency"]) {
  switch (urgency) {
    case "High":
      return "bg-red-100 text-red-700";
    case "Medium":
      return "bg-amber-100 text-amber-700";
    case "Low":
      return "bg-green-100 text-green-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function CitizenDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [posts, setPosts] = useState<DashboardPost[]>([]);

  const [activeTab, setActiveTab] = useState<TabType>("All Posts");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [urgencyFilter, setUrgencyFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Newest");

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        router.replace("/login");
        return;
      }

      setAuthChecked(true);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(
          `
            id,
            full_name,
            email,
            district_id,
            role,
            districts (
              id,
              name
            )
          `
        )
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      const typedProfile = profileData as unknown as ProfileRow;
      setProfile(typedProfile);

      if (!typedProfile?.district_id) {
        setPosts([]);
        return;
      }

      const { data: issuesData, error: issuesError } = await supabase
        .from("issues")
        .select(
          `
            id,
            title,
            description,
            status,
            category,
            created_at,
            district_id,
            user_id,
            profiles:user_id (
              full_name,
              role
            )
          `
        )
        .eq("district_id", typedProfile.district_id)
        .order("created_at", { ascending: false });

      if (issuesError) throw issuesError;

      const typedIssues = (issuesData as unknown as IssueRow[]) || [];
      const issueIds = typedIssues.map((issue) => issue.id);

      if (issueIds.length === 0) {
        setPosts([]);
        return;
      }

      const [{ data: supportsData }, { data: commentsData }, { data: aiData }] = await Promise.all([
        supabase.from("issue_supports").select("issue_id,user_id").in("issue_id", issueIds),
        supabase.from("issue_comments").select("id,issue_id").in("issue_id", issueIds),
        supabase
          .from("issue_ai_moderation")
          .select(
            "issue_id,toxicity_score,spam_score,misinformation_score,recommended_action"
          )
          .in("issue_id", issueIds),
      ]);

      const supportMap = new Map<string, number>();
      const mySupportSet = new Set<string>();
      const commentMap = new Map<string, number>();
      const aiMap = new Map<string, AiModerationRow>();

      (supportsData || []).forEach((row: any) => {
        supportMap.set(row.issue_id, (supportMap.get(row.issue_id) || 0) + 1);
        if (row.user_id === user.id) {
          mySupportSet.add(row.issue_id);
        }
      });

      (commentsData || []).forEach((row: any) => {
        commentMap.set(row.issue_id, (commentMap.get(row.issue_id) || 0) + 1);
      });

      (aiData || []).forEach((row: any) => {
        aiMap.set(row.issue_id, row as AiModerationRow);
      });

      const mappedPosts: DashboardPost[] = typedIssues.map((item) => {
        const ai = aiMap.get(item.id);

        return {
          id: item.id,
          title: item.title || "Untitled Issue",
          author: item.profiles?.[0]?.full_name || "Anonymous Citizen",
          type: deriveType(item.profiles?.[0]?.role),
          status: normalizeStatus(item.status),
          category: item.category || "General",
          urgency: deriveUrgency(item.category),
          description: item.description || "No description provided.",
          date: item.created_at || new Date().toISOString(),
          supports: supportMap.get(item.id) || 0,
          comments: commentMap.get(item.id) || 0,
          userHasSupported: mySupportSet.has(item.id),
          aiModeration: ai
            ? {
                toxicity: Number(ai.toxicity_score || 0),
                spam: Number(ai.spam_score || 0),
                misinformation: Number(ai.misinformation_score || 0),
                recommendedAction: ai.recommended_action || "Approve",
              }
            : undefined,
        };
      });

      setPosts(mappedPosts);
    } catch (err: any) {
      console.error("Dashboard load error:", err);
      setError(err.message || "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("dashboard-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "issues" },
        () => {
          loadDashboard();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "issue_supports" },
        () => {
          loadDashboard();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "issue_comments" },
        () => {
          loadDashboard();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "issue_ai_moderation" },
        () => {
          loadDashboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDashboard]);

  const handleToggleSupport = async (issueId: string, userHasSupported: boolean) => {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    if (userHasSupported) {
      const { error } = await supabase
        .from("issue_supports")
        .delete()
        .eq("issue_id", issueId)
        .eq("user_id", user.id);

      if (!error) {
        setPosts((prev) =>
          prev.map((post) =>
            post.id === issueId
              ? {
                  ...post,
                  supports: Math.max(0, post.supports - 1),
                  userHasSupported: false,
                }
              : post
          )
        );
      }
    } else {
      const { error } = await supabase.from("issue_supports").insert({
        issue_id: issueId,
        user_id: user.id,
      });

      if (!error) {
        setPosts((prev) =>
          prev.map((post) =>
            post.id === issueId
              ? {
                  ...post,
                  supports: post.supports + 1,
                  userHasSupported: true,
                }
              : post
          )
        );
      }
    }
  };

  const filteredPosts = useMemo(() => {
    let result = [...posts];

    if (activeTab === "Official Updates") {
      result = result.filter((post) => post.type === "Official");
    }

    if (activeTab === "Community Issues") {
      result = result.filter(
        (post) => post.type === "Community" || post.type === "Citizen"
      );
    }

    if (activeTab === "Resolved") {
      result = result.filter((post) => post.status === "Resolved");
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (post) =>
          post.title.toLowerCase().includes(q) ||
          post.description.toLowerCase().includes(q) ||
          post.author.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "All") {
      result = result.filter((post) => post.status === statusFilter);
    }

    if (categoryFilter !== "All") {
      result = result.filter((post) => post.category === categoryFilter);
    }

    if (urgencyFilter !== "All") {
      result = result.filter((post) => post.urgency === urgencyFilter);
    }

    if (sortBy === "Newest") {
      result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (sortBy === "Most Supported") {
      result.sort((a, b) => b.supports - a.supports);
    } else if (sortBy === "Most Commented") {
      result.sort((a, b) => b.comments - a.comments);
    }

    return result;
  }, [posts, activeTab, search, statusFilter, categoryFilter, urgencyFilter, sortBy]);

  const tabs: TabType[] = [
    "All Posts",
    "Official Updates",
    "Community Issues",
    "Resolved",
  ];

  const districtName = profile?.districts?.[0]?.name || "Your District";

  if (loading || !authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h1 className="text-xl font-bold text-slate-900">Citizen Dashboard</h1>
            <p className="mt-3 text-sm text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Citizen Dashboard</p>
              <h1 className="text-2xl font-bold text-slate-900">
                Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Explore district activity, official announcements, community issues, and
                progress updates in {districtName}.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/create-post"
                className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-600"
              >
                Create Post +
              </Link>
              <Link
                href="/feed"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                View District Feed
              </Link>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "bg-red-500 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="mb-5">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Search
              </label>
              <input
                type="text"
                placeholder="Search posts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
              />
            </div>

            <div className="space-y-5">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-800">Status</h3>
                <div className="space-y-2 text-sm text-slate-700">
                  {["All", "Open", "Under Review", "Resolved", "Escalated"].map((item) => (
                    <label key={item} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="status"
                        checked={statusFilter === item}
                        onChange={() => setStatusFilter(item)}
                      />
                      {item}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-800">Category</h3>
                <div className="space-y-2 text-sm text-slate-700">
                  {[
                    "All",
                    "General",
                    "Infrastructure",
                    "Safety",
                    "Sanitation",
                    "Transportation",
                    "Education",
                  ].map((item) => (
                    <label key={item} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="category"
                        checked={categoryFilter === item}
                        onChange={() => setCategoryFilter(item)}
                      />
                      {item}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-800">Urgency</h3>
                <div className="space-y-2 text-sm text-slate-700">
                  {["All", "High", "Medium", "Low"].map((item) => (
                    <label key={item} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="urgency"
                        checked={urgencyFilter === item}
                        onChange={() => setUrgencyFilter(item)}
                      />
                      {item}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <section>
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <p className="text-sm text-slate-500">Open Issues</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {posts.filter((p) => p.status === "Open").length}
                </p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <p className="text-sm text-slate-500">Under Review</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {posts.filter((p) => p.status === "Under Review").length}
                </p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <p className="text-sm text-slate-500">Resolved</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {posts.filter((p) => p.status === "Resolved").length}
                </p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <p className="text-sm text-slate-500">Total Posts</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{posts.length}</p>
              </div>
            </div>

            <div className="mb-4 flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">{filteredPosts.length}</span>{" "}
                posts found
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-slate-700">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                >
                  <option>Newest</option>
                  <option>Most Supported</option>
                  <option>Most Commented</option>
                </select>
              </div>
            </div>

            {filteredPosts.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">No posts found</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Try changing filters or create the first issue for this district.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                {filteredPosts.map((post) => (
                  <div
                    key={post.id}
                    className={`rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 ${getStatusBorder(
                      post.status
                    )}`}
                  >
                    <div className="p-5">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {post.type}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getUrgencyBadge(
                            post.urgency
                          )}`}
                        >
                          {post.urgency} Urgency
                        </span>
                        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                          {post.category}
                        </span>
                      </div>

                      <h2 className="text-lg font-bold text-slate-900">{post.title}</h2>

                      <p className="mt-1 text-sm text-slate-500">
                        By {post.author} · {new Date(post.date).toLocaleDateString()}
                      </p>

                      <p className="mt-4 text-sm leading-6 text-slate-700">{post.description}</p>

                      <div className="mt-4 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        Status: {post.status}
                      </div>

                      {post.aiModeration && (
                        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            AI Moderation
                          </p>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-slate-700">
                            <p>Toxicity: {post.aiModeration.toxicity}%</p>
                            <p>Spam: {post.aiModeration.spam}%</p>
                            <p>Misinformation: {post.aiModeration.misinformation}%</p>
                            <p>Action: {post.aiModeration.recommendedAction}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 border-t border-slate-200 text-sm text-slate-600">
                      <div className="flex items-center justify-center px-4 py-3">
                        👍 {post.supports}
                      </div>
                      <div className="flex items-center justify-center border-x border-slate-200 px-4 py-3">
                        💬 {post.comments}
                      </div>
                      <div className="flex items-center justify-center px-4 py-3">
                        📍 {districtName}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
                      <Link
                        href={`/feed/${post.id}`}
                        className="text-sm font-semibold text-slate-700 hover:text-red-600"
                      >
                        View Details
                      </Link>

                      <button
                        onClick={() => handleToggleSupport(post.id, post.userHasSupported)}
                        className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${
                          post.userHasSupported
                            ? "bg-slate-700 hover:bg-slate-800"
                            : "bg-red-500 hover:bg-red-600"
                        }`}
                      >
                        {post.userHasSupported ? "Supported" : "Support"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}