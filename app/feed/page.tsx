"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type Issue = {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  toxicity_score: number | null;
  spam_score: number | null;
  misinformation_score: number | null;
  moderation_action: string | null;
};

type IssueVote = {
  id: number;
  issue_id: string;
  user_id: string;
};

type IssueDownvote = {
  id: number;
  issue_id: string;
  user_id: string;
};

type IssueComment = {
  id: number;
  issue_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
);

function getStatusBadgeClasses(status: string) {
  if (status === "Open") {
    return "bg-green-100 text-green-700 border-green-200";
  }
  if (status === "Under Review") {
    return "bg-amber-100 text-amber-700 border-amber-200";
  }
  if (status === "Resolved") {
    return "bg-blue-100 text-blue-700 border-blue-200";
  }
  if (status === "Blocked") {
    return "bg-red-100 text-red-700 border-red-200";
  }
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function getModerationBadgeClasses(action: string | null) {
  if (action === "Approve") {
    return "bg-green-50 text-green-700 border-green-200";
  }
  if (action === "Review") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  if (action === "Block") {
    return "bg-red-50 text-red-700 border-red-200";
  }
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function formatModerationAction(action: string | null) {
  if (!action) return "Not Reviewed";
  if (action === "Approve") return "AI Approved";
  if (action === "Review") return "AI Flagged";
  if (action === "Block") return "AI Blocked";
  return action;
}

export default function FeedPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [votes, setVotes] = useState<IssueVote[]>([]);
  const [downvotes, setDownvotes] = useState<IssueDownvote[]>([]);
  const [comments, setComments] = useState<IssueComment[]>([]);
  const [userId, setUserId] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [loadingVote, setLoadingVote] = useState<string | null>(null);
  const [loadingDownvote, setLoadingDownvote] = useState<string | null>(null);
  const [loadingComment, setLoadingComment] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState("");

  useEffect(() => {
    const loadData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);

      const { data: issuesData } = await supabase
        .from("issues")
        .select("*")
        .neq("status", "Blocked")
        .order("created_at", { ascending: false });

      const { data: votesData } = await supabase
        .from("issue_votes")
        .select("*");

      const { data: downvotesData } = await supabase
        .from("issue_downvotes")
        .select("*");

      const { data: commentsData } = await supabase
        .from("issue_comments")
        .select("*")
        .order("created_at", { ascending: true });

      setIssues((issuesData as Issue[]) || []);
      setVotes((votesData as IssueVote[]) || []);
      setDownvotes((downvotesData as IssueDownvote[]) || []);
      setComments((commentsData as IssueComment[]) || []);

      setLoading(false);
    };

    loadData();
  }, [router]);

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      const matchesSearch =
        issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "All" ? true : issue.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [issues, searchTerm, statusFilter]);

  const getVoteCount = (issueId: string) =>
    votes.filter((vote) => vote.issue_id === issueId).length;

  const getDownvoteCount = (issueId: string) =>
    downvotes.filter((vote) => vote.issue_id === issueId).length;

  const hasUserUpvoted = (issueId: string) =>
    votes.some((vote) => vote.issue_id === issueId && vote.user_id === userId);

  const hasUserDownvoted = (issueId: string) =>
    downvotes.some(
      (vote) => vote.issue_id === issueId && vote.user_id === userId
    );

  const getComments = (issueId: string) =>
    comments.filter((comment) => comment.issue_id === issueId);

  const toggleVote = async (issueId: string) => {
    setLoadingVote(issueId);

    try {
      const existingUpvote = votes.find(
        (vote) => vote.issue_id === issueId && vote.user_id === userId
      );

      const existingDownvote = downvotes.find(
        (vote) => vote.issue_id === issueId && vote.user_id === userId
      );

      if (existingUpvote) {
        await supabase.from("issue_votes").delete().eq("id", existingUpvote.id);
        setVotes((prev) => prev.filter((vote) => vote.id !== existingUpvote.id));
        setLoadingVote(null);
        return;
      }

      if (existingDownvote) {
        await supabase
          .from("issue_downvotes")
          .delete()
          .eq("id", existingDownvote.id);
        setDownvotes((prev) =>
          prev.filter((vote) => vote.id !== existingDownvote.id)
        );
      }

      const { data } = await supabase
        .from("issue_votes")
        .insert([{ issue_id: issueId, user_id: userId }])
        .select()
        .single();

      if (data) {
        setVotes((prev) => [...prev, data as IssueVote]);
      }
    } finally {
      setLoadingVote(null);
    }
  };

  const toggleDownvote = async (issueId: string) => {
    setLoadingDownvote(issueId);

    try {
      const existingDownvote = downvotes.find(
        (vote) => vote.issue_id === issueId && vote.user_id === userId
      );

      const existingUpvote = votes.find(
        (vote) => vote.issue_id === issueId && vote.user_id === userId
      );

      if (existingDownvote) {
        await supabase
          .from("issue_downvotes")
          .delete()
          .eq("id", existingDownvote.id);
        setDownvotes((prev) =>
          prev.filter((vote) => vote.id !== existingDownvote.id)
        );
        setLoadingDownvote(null);
        return;
      }

      if (existingUpvote) {
        await supabase.from("issue_votes").delete().eq("id", existingUpvote.id);
        setVotes((prev) => prev.filter((vote) => vote.id !== existingUpvote.id));
      }

      const { data } = await supabase
        .from("issue_downvotes")
        .insert([{ issue_id: issueId, user_id: userId }])
        .select()
        .single();

      if (data) {
        setDownvotes((prev) => [...prev, data as IssueDownvote]);
      }
    } finally {
      setLoadingDownvote(null);
    }
  };

  const submitComment = async (e: FormEvent, issueId: string) => {
    e.preventDefault();

    const content = (commentInputs[issueId] || "").trim();
    if (!content) return;

    setLoadingComment(issueId);

    try {
      const { data } = await supabase
        .from("issue_comments")
        .insert([{ issue_id: issueId, user_id: userId, content }])
        .select()
        .single();

      if (data) {
        setComments((prev) => [...prev, data as IssueComment]);
        setCommentInputs((prev) => ({ ...prev, [issueId]: "" }));
      }
    } finally {
      setLoadingComment(null);
    }
  };

  const handleShare = async (issue: Issue) => {
    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/feed`
        : "/feed";

    const shareText = `Check out this civic issue on CivixOS: ${issue.title}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: issue.title,
          text: shareText,
          url: shareUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      setShareMessage("Link copied to clipboard.");
      setTimeout(() => setShareMessage(""), 2000);
    } catch {
      setShareMessage("Could not share right now.");
      setTimeout(() => setShareMessage(""), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading feed...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="text-3xl font-bold">District Feed</h1>

        <div className="flex gap-3">
          <input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 border p-2 rounded"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border p-2 rounded"
          >
            <option>All</option>
            <option>Open</option>
            <option>Under Review</option>
            <option>Resolved</option>
          </select>
        </div>

        {shareMessage && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {shareMessage}
          </div>
        )}

        {filteredIssues.map((issue) => (
          <div key={issue.id} className="bg-white p-4 rounded shadow">
            <h2 className="font-semibold">{issue.title}</h2>
            <p className="text-sm text-gray-600">{issue.description}</p>

            <div className="flex gap-2 mt-2 flex-wrap">
              <span
                className={`px-2 py-1 text-xs border rounded ${getStatusBadgeClasses(
                  issue.status
                )}`}
              >
                {issue.status}
              </span>
              <span
                className={`px-2 py-1 text-xs border rounded ${getModerationBadgeClasses(
                  issue.moderation_action
                )}`}
              >
                {formatModerationAction(issue.moderation_action)}
              </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Toxicity</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {issue.toxicity_score != null
                    ? `${Math.round(issue.toxicity_score * 100)}%`
                    : "N/A"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Spam Risk</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {issue.spam_score != null
                    ? `${Math.round(issue.spam_score * 100)}%`
                    : "N/A"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Misinformation</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {issue.misinformation_score != null
                    ? `${Math.round(issue.misinformation_score * 100)}%`
                    : "N/A"}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-4 flex-wrap">
              <button
                onClick={() => toggleVote(issue.id)}
                disabled={loadingVote === issue.id}
                className={`rounded-xl border px-4 py-2 text-sm font-medium ${
                  hasUserUpvoted(issue.id)
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-slate-300 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {loadingVote === issue.id
                  ? "Saving..."
                  : `👍 Upvote (${getVoteCount(issue.id)})`}
              </button>

              <button
                onClick={() => toggleDownvote(issue.id)}
                disabled={loadingDownvote === issue.id}
                className={`rounded-xl border px-4 py-2 text-sm font-medium ${
                  hasUserDownvoted(issue.id)
                    ? "border-red-300 bg-red-50 text-red-700"
                    : "border-slate-300 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {loadingDownvote === issue.id
                  ? "Saving..."
                  : `👎 Downvote (${getDownvoteCount(issue.id)})`}
              </button>

              <button
                onClick={() =>
                  setOpenComments((prev) => ({
                    ...prev,
                    [issue.id]: !prev[issue.id],
                  }))
                }
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                💬 Comments ({getComments(issue.id).length})
              </button>

              <button
                onClick={() => handleShare(issue)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                🔗 Share
              </button>

              <Link
                href="/chat/Representative"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Chat with Representative
              </Link>
            </div>

            {openComments[issue.id] && (
              <div className="mt-3">
                {getComments(issue.id).map((comment) => (
                  <div
                    key={comment.id}
                    className="text-sm border p-2 rounded mt-2"
                  >
                    {comment.content}
                  </div>
                ))}

                <form onSubmit={(e) => submitComment(e, issue.id)}>
                  <textarea
                    value={commentInputs[issue.id] || ""}
                    onChange={(e) =>
                      setCommentInputs((prev) => ({
                        ...prev,
                        [issue.id]: e.target.value,
                      }))
                    }
                    className="w-full border mt-2 p-2 rounded"
                    placeholder="Write a comment..."
                  />
                  <button className="mt-2 bg-black text-white px-3 py-1 rounded">
                    {loadingComment === issue.id ? "Posting..." : "Post"}
                  </button>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}