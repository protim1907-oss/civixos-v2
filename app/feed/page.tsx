"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type Issue = {
  id: number;
  title: string;
  description: string;
  status: string;
  created_at: string;
  toxicity_score: number | null;
  spam_score: number | null;
  misinformation_score: number | null;
  moderation_action: string | null;
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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    const loadFeed = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("issues")
        .select(
          `
          id,
          title,
          description,
          status,
          created_at,
          toxicity_score,
          spam_score,
          misinformation_score,
          moderation_action
        `
        )
        .neq("status", "Blocked")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Feed error:", error.message);
      } else {
        setIssues((data as Issue[]) || []);
      }

      setLoading(false);
    };

    loadFeed();
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <p className="text-lg text-slate-700">Loading public feed...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900">
                District Feed
              </h1>
              <p className="mt-3 text-lg text-slate-600">
                Browse civic issues raised by citizens in the community.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Back to Dashboard
              </Link>
              <Link
                href="/create-post"
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800"
              >
                Create Civic Issue
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_220px]">
            <input
              type="text"
              placeholder="Search issues by title or description"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
            >
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Under Review">Under Review</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          <div className="mt-8">
            {filteredIssues.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-slate-800">No issues found.</p>
                <p className="mt-1 text-sm text-slate-500">
                  Try changing the search or filter.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {filteredIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex-1">
                        <h2 className="text-xl font-semibold text-slate-900">
                          {issue.title}
                        </h2>
                        <p className="mt-2 text-slate-600">
                          {issue.description}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getStatusBadgeClasses(
                            issue.status
                          )}`}
                        >
                          {issue.status}
                        </span>

                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getModerationBadgeClasses(
                            issue.moderation_action
                          )}`}
                        >
                          {formatModerationAction(issue.moderation_action)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="text-xs text-slate-500">Toxicity</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {issue.toxicity_score !== null &&
                          issue.toxicity_score !== undefined
                            ? `${Math.round(issue.toxicity_score * 100)}%`
                            : "N/A"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="text-xs text-slate-500">Spam Risk</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {issue.spam_score !== null &&
                          issue.spam_score !== undefined
                            ? `${Math.round(issue.spam_score * 100)}%`
                            : "N/A"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="text-xs text-slate-500">Misinformation</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {issue.misinformation_score !== null &&
                          issue.misinformation_score !== undefined
                            ? `${Math.round(issue.misinformation_score * 100)}%`
                            : "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-slate-500">
                        {new Date(issue.created_at).toLocaleString()}
                      </p>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Upvote
                        </button>

                        <button
                          type="button"
                          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Comment
                        </button>

                        <Link
                          href="/chat/Representative"
                          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                        >
                          Chat with Representative
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}