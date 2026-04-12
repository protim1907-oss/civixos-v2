"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Sidebar from "@/components/layout/Sidebar";
import { ShieldCheck, CheckCircle2, XCircle, Clock3 } from "lucide-react";

type Profile = {
  id: string;
  full_name: string | null;
  role: string;
};

type Post = {
  id: string;
  content: string;
  status: string;
  created_at: string;
  author_id: string | null;
};

type ModerationQueue = {
  id: string;
  post_id: string;
  flagged_reason: string | null;
  ai_recommended_action: string | null;
  reviewer_decision: string | null;
};

type Issue = {
  id: string;
  title: string;
  description: string;
  created_at: string;
};

type IssueAI = {
  issue_id: string;
  toxicity_score: number;
  spam_score: number;
  misinformation_score: number;
  recommended_action: string;
};

export default function ModeratorDashboard() {
  const supabase = createClient();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [queue, setQueue] = useState<ModerationQueue[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [issueAI, setIssueAI] = useState<IssueAI[]>([]);
  const [tab, setTab] = useState<"all" | "posts" | "issues">("all");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (!profile || !["moderator", "admin"].includes(profile.role)) {
      router.push("/dashboard");
      return;
    }

    setProfile(profile);

    const { data: posts } = await supabase.from("posts").select("*");
    const { data: queue } = await supabase.from("moderation_queue").select("*");
    const { data: issues } = await supabase.from("issues").select("*");
    const { data: issueAI } = await supabase.from("issue_ai_moderation").select("*");

    setPosts(posts || []);
    setQueue(queue || []);
    setIssues(issues || []);
    setIssueAI(issueAI || []);
  }

  // 🔹 Derived Data
  const pendingPosts = queue.filter(q => !q.reviewer_decision);
  const highRiskIssues = issueAI.filter(i => i.toxicity_score > 0.6);

  async function handlePostAction(postId: string, action: "approve" | "remove" | "escalate") {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    await supabase.from("moderation_queue")
      .update({
        reviewer_decision: action,
        reviewed_by: session?.user.id,
        reviewed_at: new Date().toISOString()
      })
      .eq("post_id", postId);

    await supabase.from("moderation_actions").insert({
      post_id: postId,
      moderator_id: session?.user.id,
      action: action
    });

    await supabase.from("posts")
      .update({
        status: action === "remove" ? "removed" : "active"
      })
      .eq("id", postId);

    loadData();
  }

  return (
    <div className="flex">
      <Sidebar />

      <main className="flex-1 p-8 bg-slate-50 min-h-screen">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShieldCheck /> Moderator Dashboard
          </h1>
          <p className="text-gray-600">Manage posts and civic issues</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-white rounded-xl shadow">
            <p>Pending Posts</p>
            <h2 className="text-2xl font-bold">{pendingPosts.length}</h2>
          </div>

          <div className="p-4 bg-white rounded-xl shadow">
            <p>High Risk Issues</p>
            <h2 className="text-2xl font-bold">{highRiskIssues.length}</h2>
          </div>

          <div className="p-4 bg-white rounded-xl shadow">
            <p>Total Issues</p>
            <h2 className="text-2xl font-bold">{issues.length}</h2>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-6">
          {["all", "posts", "issues"].map(t => (
            <button
              key={t}
              onClick={() => setTab(t as any)}
              className={`px-4 py-2 rounded-xl ${
                tab === t ? "bg-indigo-600 text-white" : "bg-white"
              }`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {/* POSTS */}
        {(tab === "all" || tab === "posts") && (
          <div className="mb-10">
            <h2 className="text-xl font-semibold mb-3">Post Moderation Queue</h2>

            {pendingPosts.map(q => {
              const post = posts.find(p => p.id === q.post_id);
              if (!post) return null;

              return (
                <div key={q.id} className="bg-white p-4 rounded-xl shadow mb-3">
                  <p className="text-sm text-gray-500">{q.flagged_reason}</p>
                  <p className="font-medium mt-2">{post.content}</p>

                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handlePostAction(post.id, "approve")}
                      className="bg-green-600 text-white px-3 py-1 rounded">
                      Approve
                    </button>

                    <button onClick={() => handlePostAction(post.id, "remove")}
                      className="bg-red-600 text-white px-3 py-1 rounded">
                      Remove
                    </button>

                    <button onClick={() => handlePostAction(post.id, "escalate")}
                      className="bg-yellow-500 text-white px-3 py-1 rounded">
                      Escalate
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ISSUES */}
        {(tab === "all" || tab === "issues") && (
          <div>
            <h2 className="text-xl font-semibold mb-3">Issue Risk Monitoring</h2>

            {issues.map(issue => {
              const ai = issueAI.find(i => i.issue_id === issue.id);

              return (
                <div key={issue.id} className="bg-white p-4 rounded-xl shadow mb-3">
                  <p className="font-semibold">{issue.title}</p>
                  <p className="text-sm text-gray-600">{issue.description}</p>

                  {ai && (
                    <div className="mt-3 text-sm">
                      <p>Toxicity: {ai.toxicity_score}</p>
                      <p>Spam: {ai.spam_score}</p>
                      <p>Misinformation: {ai.misinformation_score}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </main>
    </div>
  );
}