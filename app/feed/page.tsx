"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/layout/Sidebar";
import { createClient } from "@/lib/supabase/client";

type FeedPost = {
  id: string;
  title: string;
  description: string;
  district: string;
  category: string;
  urgency: "High" | "Medium" | "Low";
  status: "Open" | "Under Review" | "Resolved" | "Escalated";
  upvotes: number;
  comments: number;
  representative: string;
  hasUpvoted: boolean;
};

type IssueRow = {
  id: string;
  title: string | null;
  description: string | null;
  user_id: string | null;
};

type VoteRow = {
  issue_id: string | null;
  user_id?: string | null;
};

type CommentRow = {
  id?: string;
  issue_id: string | null;
  user_id?: string | null;
  content?: string | null;
  created_at?: string | null;
};

type CommentMap = Record<string, CommentRow[]>;

function getStatusStyles(status: FeedPost["status"]) {
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

function getUrgencyBadge(urgency: FeedPost["urgency"]) {
  switch (urgency) {
    case "High":
      return "bg-red-100 text-red-700";
    case "Medium":
      return "bg-amber-100 text-amber-700";
    case "Low":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getStatusBadge(status: FeedPost["status"]) {
  switch (status) {
    case "Open":
      return "bg-red-100 text-red-700";
    case "Under Review":
      return "bg-amber-100 text-amber-700";
    case "Resolved":
      return "bg-emerald-100 text-emerald-700";
    case "Escalated":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function inferUrgency(title: string, description: string): FeedPost["urgency"] {
  const text = `${title} ${description}`.toLowerCase();

  if (
    text.includes("flood") ||
    text.includes("waterlogging") ||
    text.includes("danger") ||
    text.includes("unsafe") ||
    text.includes("pothole") ||
    text.includes("overflow") ||
    text.includes("manhole")
  ) {
    return "High";
  }

  if (
    text.includes("streetlight") ||
    text.includes("garbage") ||
    text.includes("drain") ||
    text.includes("traffic") ||
    text.includes("bus")
  ) {
    return "Medium";
  }

  return "Low";
}

function inferCategory(title: string, description: string) {
  const text = `${title} ${description}`.toLowerCase();

  if (
    text.includes("road") ||
    text.includes("pothole") ||
    text.includes("drain") ||
    text.includes("waterlogging") ||
    text.includes("pipeline") ||
    text.includes("manhole")
  ) {
    return "Infrastructure";
  }

  if (
    text.includes("school") ||
    text.includes("crime") ||
    text.includes("police") ||
    text.includes("safety")
  ) {
    return "Public Safety";
  }

  if (
    text.includes("bus") ||
    text.includes("traffic") ||
    text.includes("crossing")
  ) {
    return "Transportation";
  }

  if (
    text.includes("garbage") ||
    text.includes("trash") ||
    text.includes("waste")
  ) {
    return "Sanitation";
  }

  return "General";
}

export default function FeedPage() {
  const router = useRouter();
  const supabase = createClient();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [urgencyFilter, setUrgencyFilter] = useState("All");

  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [currentDistrict, setCurrentDistrict] = useState("District 12");
  const [currentRepresentative, setCurrentRepresentative] = useState("Representative");
  const [loading, setLoading] = useState(true);
  const [debugMessage, setDebugMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [commentsByIssue, setCommentsByIssue] = useState<CommentMap>({});
  const [openCommentsFor, setOpenCommentsFor] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [sharingIssueId, setSharingIssueId] = useState<string | null>(null);
  const [submittingCommentFor, setSubmittingCommentFor] = useState<string | null>(null);
  const [togglingVoteFor, setTogglingVoteFor] = useState<string | null>(null);

  useEffect(() => {
    async function loadFeed() {
      try {
        setLoading(true);
        setDebugMessage("");

        const { data } = await supabase.auth.getSession();
        const session = data?.session;

        const guestUser =
          typeof window !== "undefined"
            ? localStorage.getItem("guest_user")
            : null;

        let district = "District 12";
        let signedInUserId: string | null = null;

        if (!session?.user && guestUser) {
          try {
            const parsedGuest = JSON.parse(guestUser);
            district =
              parsedGuest?.district ||
              parsedGuest?.district_name ||
              "District 12";
          } catch (error) {
            console.error("Guest parse error:", error);
          }
        }

        if (session?.user) {
          signedInUserId = session.user.id;
          district =
            session.user.user_metadata?.district ||
            session.user.user_metadata?.district_name ||
            session.user.user_metadata?.district_id ||
            "District 12";
        }

        setCurrentUserId(signedInUserId);
        setCurrentDistrict(district);

        const { data: repsData, error: repsError } = await supabase
          .from("representatives")
          .select("*")
          .limit(100);

        if (repsError) {
          console.error("Representative load error:", repsError);
        }

        const representativeName =
          repsData?.[0]?.name ||
          repsData?.[0]?.representative_name ||
          repsData?.[0]?.full_name ||
          "Representative";

        setCurrentRepresentative(representativeName);

        const { data: issuesData, error: issuesError } = await supabase
          .from("issues")
          .select("id, title, description, user_id")
          .limit(100)
          .order("id", { ascending: false });

        if (issuesError) {
          console.error("Issues load error:", issuesError);
          setFeedPosts([]);
          setDebugMessage(`Could not load issues: ${issuesError.message}`);
          return;
        }

        const issues = ((issuesData as IssueRow[]) || []).filter(
          (issue) => issue?.id
        );

        if (issues.length === 0) {
          setFeedPosts([]);
          setDebugMessage("Issues table loaded successfully, but no rows were returned.");
          return;
        }

        const issueIds = issues.map((issue) => issue.id);

        const [
          { data: votesData, error: votesError },
          { data: commentsData, error: commentsError },
        ] = await Promise.all([
          supabase.from("issue_votes").select("issue_id, user_id").in("issue_id", issueIds),
          supabase
            .from("issue_comments")
            .select("id, issue_id, user_id, content, created_at")
            .in("issue_id", issueIds)
            .order("created_at", { ascending: false }),
        ]);

        if (votesError) {
          console.error("Votes load error:", votesError);
        }

        if (commentsError) {
          console.error("Comments load error:", commentsError);
        }

        const voteCounts: Record<string, number> = {};
        const userVoteMap: Record<string, boolean> = {};

        ((votesData as VoteRow[]) || []).forEach((row) => {
          if (!row.issue_id) return;
          voteCounts[row.issue_id] = (voteCounts[row.issue_id] || 0) + 1;

          if (signedInUserId && row.user_id === signedInUserId) {
            userVoteMap[row.issue_id] = true;
          }
        });

        const groupedComments: CommentMap = {};
        ((commentsData as CommentRow[]) || []).forEach((row) => {
          if (!row.issue_id) return;
          if (!groupedComments[row.issue_id]) groupedComments[row.issue_id] = [];
          groupedComments[row.issue_id].push(row);
        });

        setCommentsByIssue(groupedComments);

        const mappedPosts: FeedPost[] = issues.map((issue, index) => ({
          id: issue.id ?? String(index),
          title: issue.title || "Untitled issue",
          description: issue.description || "No description provided.",
          district,
          category: inferCategory(issue.title || "", issue.description || ""),
          urgency: inferUrgency(issue.title || "", issue.description || ""),
          status: "Open",
          upvotes: voteCounts[issue.id] || 0,
          comments: groupedComments[issue.id]?.length || 0,
          representative: representativeName,
          hasUpvoted: !!userVoteMap[issue.id],
        }));

        setFeedPosts(mappedPosts);
      } catch (error) {
        console.error("Feed load error:", error);
        setFeedPosts([]);
        setDebugMessage("Something went wrong while loading the feed.");
      } finally {
        setLoading(false);
      }
    }

    loadFeed();
  }, [supabase]);

  const filteredPosts = useMemo(() => {
    return feedPosts.filter((post) => {
      const q = search.toLowerCase().trim();

      const matchesSearch =
        !q ||
        post.title.toLowerCase().includes(q) ||
        post.description.toLowerCase().includes(q) ||
        post.district.toLowerCase().includes(q) ||
        post.representative.toLowerCase().includes(q) ||
        post.category.toLowerCase().includes(q);

      const matchesType =
        typeFilter === "All" || post.category === typeFilter;

      const matchesStatus =
        statusFilter === "All" || post.status === statusFilter;

      const matchesUrgency =
        urgencyFilter === "All" || post.urgency === urgencyFilter;

      return matchesSearch && matchesType && matchesStatus && matchesUrgency;
    });
  }, [feedPosts, search, typeFilter, statusFilter, urgencyFilter]);

  const availableCategories = useMemo(() => {
    const categories = Array.from(
      new Set(feedPosts.map((post) => post.category).filter(Boolean))
    );
    return ["All", ...categories];
  }, [feedPosts]);

  async function handleShare(post: FeedPost) {
    const issueUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/feed?issue=${encodeURIComponent(post.id)}`
        : "";

    const shareText = `${post.title}\n\n${post.description}\n\nDistrict: ${post.district}\nRepresentative: ${post.representative}`;

    try {
      setSharingIssueId(post.id);

      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: post.title,
          text: shareText,
          url: issueUrl,
        });
        return;
      }

      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(issueUrl || shareText);
        alert("Issue link copied to clipboard.");
        return;
      }

      alert("Sharing is not supported on this device.");
    } catch (error) {
      console.error("Share error:", error);
    } finally {
      setSharingIssueId(null);
    }
  }

  async function handleToggleUpvote(issueId: string) {
    if (!currentUserId) {
      alert("Please sign in to upvote issues.");
      return;
    }

    try {
      setTogglingVoteFor(issueId);

      const targetPost = feedPosts.find((post) => post.id === issueId);
      if (!targetPost) return;

      if (targetPost.hasUpvoted) {
        const { error } = await supabase
          .from("issue_votes")
          .delete()
          .eq("issue_id", issueId)
          .eq("user_id", currentUserId);

        if (error) {
          console.error("Remove vote error:", error);
          alert("Could not remove upvote.");
          return;
        }

        setFeedPosts((prev) =>
          prev.map((post) =>
            post.id === issueId
              ? {
                  ...post,
                  hasUpvoted: false,
                  upvotes: Math.max(0, post.upvotes - 1),
                }
              : post
          )
        );
      } else {
        const { error } = await supabase.from("issue_votes").insert({
          issue_id: issueId,
          user_id: currentUserId,
        });

        if (error) {
          console.error("Add vote error:", error);
          alert("Could not add upvote.");
          return;
        }

        setFeedPosts((prev) =>
          prev.map((post) =>
            post.id === issueId
              ? {
                  ...post,
                  hasUpvoted: true,
                  upvotes: post.upvotes + 1,
                }
              : post
          )
        );
      }
    } catch (error) {
      console.error("Toggle vote error:", error);
    } finally {
      setTogglingVoteFor(null);
    }
  }

  function handleToggleComments(issueId: string) {
    setOpenCommentsFor((prev) => ({
      ...prev,
      [issueId]: !prev[issueId],
    }));
  }

  async function handleSubmitComment(issueId: string) {
    const draft = (commentDrafts[issueId] || "").trim();

    if (!draft) return;

    if (!currentUserId) {
      alert("Please sign in to comment.");
      return;
    }

    try {
      setSubmittingCommentFor(issueId);

      const { data, error } = await supabase
  .from("issue_comments")
  .insert({
  issue_id: issueId,
  user_id: currentUserId,
  content: draft,
})
  .select("id, issue_id, user_id, comment, created_at")
  .single();

if (error) {
  console.error("Add comment error:", error);
  alert(`Could not add comment: ${error.message}`);
  return;
}

      setCommentDrafts((prev) => ({
        ...prev,
        [issueId]: "",
      }));

      setCommentsByIssue((prev) => ({
        ...prev,
        [issueId]: [data as CommentRow, ...(prev[issueId] || [])],
      }));

      setFeedPosts((prev) =>
        prev.map((post) =>
          post.id === issueId
            ? { ...post, comments: post.comments + 1 }
            : post
        )
      );

      setOpenCommentsFor((prev) => ({
        ...prev,
        [issueId]: true,
      }));
    } catch (error) {
      console.error("Submit comment error:", error);
    } finally {
      setSubmittingCommentFor(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
      <Sidebar />

      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
            <h1 className="text-3xl font-bold text-slate-900">District Feed</h1>
            <p className="mt-2 text-slate-600">
              Browse civic issues, track status, and connect with your representative
              in <span className="font-semibold text-slate-900">{currentDistrict}</span>.
            </p>
            {debugMessage ? (
              <p className="mt-3 text-sm text-amber-600">{debugMessage}</p>
            ) : null}
          </div>

          <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <input
                type="text"
                placeholder="Search issues..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              />

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              >
                {availableCategories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              >
                <option>All</option>
                <option>Open</option>
                <option>Under Review</option>
                <option>Resolved</option>
                <option>Escalated</option>
              </select>

              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              >
                <option>All</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
          </div>

          <div className="space-y-5">
            {loading ? (
              <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
                <p className="text-slate-600">Loading district feed...</p>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
                <p className="text-slate-600">No issues matched your filters.</p>
              </div>
            ) : (
              filteredPosts.map((post) => {
                const issueId = String(post.id);
                const issueComments = commentsByIssue[issueId] || [];
                const commentsOpen = !!openCommentsFor[issueId];
                const draft = commentDrafts[issueId] || "";

                return (
                  <div
                    key={post.id}
                    className={`rounded-2xl bg-white p-6 shadow-sm ${getStatusStyles(
                      post.status
                    )}`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex-1">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getUrgencyBadge(
                              post.urgency
                            )}`}
                          >
                            {post.urgency} Urgency
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(
                              post.status
                            )}`}
                          >
                            {post.status}
                          </span>

                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {post.category}
                          </span>

                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {currentDistrict}
                          </span>
                        </div>

                        <h2 className="text-xl font-bold text-slate-900">
                          {post.title}
                        </h2>

                        <p className="mt-3 text-slate-600">{post.description}</p>

                        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                          <button
                            type="button"
                            onClick={() => handleToggleUpvote(issueId)}
                            disabled={togglingVoteFor === issueId}
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-2 transition ${
                              post.hasUpvoted
                                ? "bg-blue-50 text-blue-700"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            } disabled:opacity-60`}
                          >
                            <span className="text-base">⬆</span>
                            <span>{post.upvotes} upvotes</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleComments(issueId)}
                            className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-slate-700 transition hover:bg-slate-200"
                          >
                            <span className="text-base">💬</span>
                            <span>{post.comments} comments</span>
                          </button>

                          <span>Representative: {post.representative}</span>
                        </div>

                        {commentsOpen && (
                          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <h3 className="text-sm font-semibold text-slate-900">
                              Comments
                            </h3>

                            <div className="mt-3 flex gap-3">
                              <input
                                type="text"
                                value={draft}
                                onChange={(e) =>
                                  setCommentDrafts((prev) => ({
                                    ...prev,
                                    [issueId]: e.target.value,
                                  }))
                                }
                                placeholder="Write a comment..."
                                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                              />

                              <button
                                type="button"
                                onClick={() => handleSubmitComment(issueId)}
                                disabled={submittingCommentFor === issueId || !draft.trim()}
                                className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {submittingCommentFor === issueId ? "Posting..." : "Post"}
                              </button>
                            </div>

                            <div className="mt-4 space-y-3">
                              {issueComments.length === 0 ? (
                                <p className="text-sm text-slate-500">
                                  No comments yet.
                                </p>
                              ) : (
                                issueComments.map((comment, idx) => (
                                  <div
                                    key={comment.id || `${issueId}-${idx}`}
                                    className="rounded-xl bg-white px-4 py-3 text-sm text-slate-700"
                                  >
                                    {comment.comment || "No comment text"}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex w-full flex-col gap-3 lg:w-64">
                        <button
                          onClick={() =>
                            router.push(
                              `/chat/${encodeURIComponent(post.representative)}`
                            )
                          }
                          className="rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700"
                        >
                          Chat with my representative
                        </button>

                        <button
                          onClick={() =>
                            router.push(
                              `/chat/${encodeURIComponent(post.representative)}`
                            )
                          }
                          className="rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          View representative thread
                        </button>

                        <button
                          type="button"
                          onClick={() => handleShare(post)}
                          disabled={sharingIssueId === issueId}
                          className="flex items-center justify-center rounded-xl border border-slate-300 px-4 py-3 text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                          aria-label="Share issue"
                          title="Share issue"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="h-6 w-6"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M7 17V7a2 2 0 0 1 2-2h4" />
                            <path d="M14 3l7 7-7 7" />
                            <path d="M21 10H9a2 2 0 0 0-2 2v9" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {!loading && filteredPosts.length > 0 && (
            <div className="mt-6 rounded-2xl bg-white p-4 text-sm text-slate-500 shadow-sm">
              Showing {filteredPosts.length} issue
              {filteredPosts.length === 1 ? "" : "s"} for{" "}
              <span className="font-semibold text-slate-700">{currentDistrict}</span>.
              {" "}Primary representative:{" "}
              <span className="font-semibold text-slate-700">
                {currentRepresentative}
              </span>
              .
            </div>
          )}
        </div>
      </main>
    </div>
  );
}