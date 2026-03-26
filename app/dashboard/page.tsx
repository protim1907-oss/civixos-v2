"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type District = {
  name: string | null;
};

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  districts: District[] | null;
};

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

  if (status === "Blocked") {
    return "bg-red-100 text-red-700 border-red-200";
  }

  if (status === "Resolved") {
    return "bg-blue-100 text-blue-700 border-blue-200";
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

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [issues, setIssues] = useState<Issue[]>([]);

  useEffect(() => {
    const loadDashboard = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.push("/login");
        return;
      }

      setUserEmail(user.email || "");

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(
          `
          id,
          full_name,
          email,
          role,
          districts (
            name
          )
        `
        )
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Profile error:", profileError.message);
      } else if (profileData) {
        setProfile({
          id: profileData.id,
          full_name: profileData.full_name,
          email: profileData.email,
          role: profileData.role,
          districts: Array.isArray(profileData.districts)
            ? profileData.districts
            : [],
        });
      }

      const { data: issuesData, error: issuesError } = await supabase
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
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (issuesError) {
        console.error("Issues error:", issuesError.message);
      } else {
        setIssues((issuesData as Issue[]) || []);
      }

      setLoading(false);
    };

    loadDashboard();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-700 text-lg">Loading dashboard...</p>
      </div>
    );
  }

  const fullName = profile?.full_name || "Citizen";
  const email = profile?.email || userEmail || "No email found";
  const role = profile?.role || "citizen";
  const district = profile?.districts?.[0]?.name || "District not selected";

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900">
            Citizen Dashboard
          </h1>
          <p className="mt-2 text-slate-600">Welcome back to CivixOS.</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Name</p>
              <p className="mt-1 font-semibold text-slate-900">{fullName}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Email</p>
              <p className="mt-1 font-semibold text-slate-900">{email}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Role</p>
              <p className="mt-1 font-semibold capitalize text-slate-900">
                {role}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">District</p>
              <p className="mt-1 font-semibold text-slate-900">{district}</p>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-semibold text-slate-900">
              Quick Actions
            </h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/create-post"
                className="rounded-xl bg-slate-900 px-4 py-3 text-center font-medium text-white hover:bg-slate-800"
              >
                Create Civic Issue
              </Link>

              <Link
                href="/feed"
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-center font-medium text-slate-700 hover:bg-slate-50"
              >
                View District Feed
              </Link>

              <Link
                href="/profile"
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-center font-medium text-slate-700 hover:bg-slate-50"
              >
                View Profile
              </Link>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-semibold text-slate-900">
              Recent Activity
            </h2>

            {issues.length === 0 ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-slate-700">No recent activity yet.</p>
                <p className="mt-1 text-sm text-slate-500">
                  Once you create civic issues, they will appear here.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900">
                          {issue.title}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {issue.description}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 sm:justify-end">
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

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border border-slate-200 bg-white p-3">
                        <p className="text-xs text-slate-500">Toxicity</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {issue.toxicity_score !== null &&
                          issue.toxicity_score !== undefined
                            ? `${Math.round(issue.toxicity_score * 100)}%`
                            : "N/A"}
                        </p>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-white p-3">
                        <p className="text-xs text-slate-500">Spam Risk</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {issue.spam_score !== null &&
                          issue.spam_score !== undefined
                            ? `${Math.round(issue.spam_score * 100)}%`
                            : "N/A"}
                        </p>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-white p-3">
                        <p className="text-xs text-slate-500">
                          Misinformation
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {issue.misinformation_score !== null &&
                          issue.misinformation_score !== undefined
                            ? `${Math.round(issue.misinformation_score * 100)}%`
                            : "N/A"}
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 text-xs text-slate-500">
                      {new Date(issue.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8">
            <button
              onClick={handleLogout}
              className="rounded-xl bg-red-600 px-4 py-3 font-medium text-white hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}