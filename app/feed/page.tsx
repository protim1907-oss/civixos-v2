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
  if (status === "Open")
    return "bg-green-100 text-green-700 border-green-200";
  if (status === "Under Review")
    return "bg-amber-100 text-amber-700 border-amber-200";
  if (status === "Resolved")
    return "bg-blue-100 text-blue-700 border-blue-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function getModerationBadgeClasses(action: string | null) {
  if (action === "Approve")
    return "bg-green-50 text-green-700 border-green-200";
  if (action === "Review")
    return "bg-amber-50 text-amber-700 border-amber-200";
  if (action === "Block")
    return "bg-red-50 text-red-700 border-red-200";
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
  const [comments, setComments] = useState<IssueComment[]>([]);
  const [userId, setUserId] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [loadingVote, setLoadingVote] = useState<string | null>(null);
  const [loadingComment, setLoadingComment] = useState<string | null>(null);

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

      const { data: commentsData } = await supabase
        .from("issue_comments")
        .select("*")
        .order("created_at", { ascending: true });

      setIssues((issuesData as Issue[]) || []);
      setVotes((votesData as IssueVote[]) || []);
      setComments((commentsData as IssueComment[]) || []);

      setLoading(false);
    };

    loadData();
  }, [router]);

  const filteredIssues = useMemo(() => {
    return issues.filter((i) => {
      const search =
        i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.description.toLowerCase().includes(searchTerm.toLowerCase());

      const status =
        statusFilter === "All" ? true : i.status === statusFilter;

      return search && status;
    });
  }, [issues, searchTerm, statusFilter]);

  const getVoteCount = (id: string) =>
    votes.filter((v) => v.issue_id === id).length;

  const hasUserUpvoted = (id: string) =>
    votes.some((v) => v.issue_id === id && v.user_id === userId);

  const getComments = (id: string) =>
    comments.filter((c) => c.issue_id === id);

  const toggleVote = async (issueId: string) => {
    setLoadingVote(issueId);

    const existing = votes.find(
      (v) => v.issue_id === issueId && v.user_id === userId
    );

    if (existing) {
      await supabase.from("issue_votes").delete().eq("id", existing.id);
      setVotes((prev) => prev.filter((v) => v.id !== existing.id));
    } else {
      const { data } = await supabase
        .from("issue_votes")
        .insert([{ issue_id: issueId, user_id: userId }])
        .select()
        .single();

      if (data) setVotes((prev) => [...prev, data]);
    }

    setLoadingVote(null);
  };

  const submitComment = async (
    e: FormEvent,
    issueId: string
  ) => {
    e.preventDefault();

    const content = (commentInputs[issueId] || "").trim();
    if (!content) return;

    setLoadingComment(issueId);

    const { data } = await supabase
      .from("issue_comments")
      .insert([{ issue_id: issueId, user_id: userId, content }])
      .select()
      .single();

    if (data) {
      setComments((prev) => [...prev, data]);
      setCommentInputs((prev) => ({ ...prev, [issueId]: "" }));
    }

    setLoadingComment(null);
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

        {filteredIssues.map((issue) => (
          <div key={issue.id} className="bg-white p-4 rounded shadow">

            <h2 className="font-semibold">{issue.title}</h2>
            <p className="text-sm text-gray-600">{issue.description}</p>

            <div className="flex gap-2 mt-2">
              <span className={`px-2 py-1 text-xs border rounded ${getStatusBadgeClasses(issue.status)}`}>
                {issue.status}
              </span>
              <span className={`px-2 py-1 text-xs border rounded ${getModerationBadgeClasses(issue.moderation_action)}`}>
                {formatModerationAction(issue.moderation_action)}
              </span>
            </div>

            <div className="flex gap-3 mt-4">
              <button onClick={() => toggleVote(issue.id)}>
                👍 {getVoteCount(issue.id)}
              </button>

              <button
                onClick={() =>
                  setOpenComments((prev) => ({
                    ...prev,
                    [issue.id]: !prev[issue.id],
                  }))
                }
              >
                💬 {getComments(issue.id).length}
              </button>

              <Link href="/chat/Representative">
                Chat
              </Link>
            </div>

            {openComments[issue.id] && (
              <div className="mt-3">
                {getComments(issue.id).map((c) => (
                  <div key={c.id} className="text-sm border p-2 rounded mt-2">
                    {c.content}
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
                  />
                  <button className="mt-2 bg-black text-white px-3 py-1 rounded">
                    Post
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