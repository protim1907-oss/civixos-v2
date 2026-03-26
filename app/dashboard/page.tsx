"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type Issue = {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
);

function getStatusColor(status: string) {
  if (status === "Open") return "bg-green-100 text-green-700";
  if (status === "Under Review") return "bg-amber-100 text-amber-700";
  if (status === "Resolved") return "bg-blue-100 text-blue-700";
  return "bg-slate-100 text-slate-700";
}

export default function DashboardPage() {
  const router = useRouter();

  const [issues, setIssues] = useState<Issue[]>([]);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUserEmail(user.email || "");

      const { data } = await supabase
        .from("issues")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setIssues(data || []);
    };

    load();
  }, [router]);

  const total = issues.length;
  const open = issues.filter((i) => i.status === "Open").length;
  const review = issues.filter((i) => i.status === "Under Review").length;
  const resolved = issues.filter((i) => i.status === "Resolved").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-6">

      {/* HEADER */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="rounded-3xl bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white shadow-lg">
          <h1 className="text-3xl font-bold">Citizen Dashboard</h1>
          <p className="mt-2 text-white/80">
            Welcome back — manage your civic activity
          </p>
          <p className="mt-2 text-sm text-white/70">{userEmail}</p>
        </div>
      </div>

      {/* STATS */}
      <div className="max-w-6xl mx-auto grid gap-4 md:grid-cols-4 mb-6">
        <div className="bg-white rounded-2xl p-4 shadow">
          <p className="text-sm text-slate-500">Total Issues</p>
          <p className="text-2xl font-bold">{total}</p>
        </div>

        <div className="bg-green-100 rounded-2xl p-4 shadow">
          <p className="text-sm text-green-700">Open</p>
          <p className="text-2xl font-bold text-green-800">{open}</p>
        </div>

        <div className="bg-amber-100 rounded-2xl p-4 shadow">
          <p className="text-sm text-amber-700">Under Review</p>
          <p className="text-2xl font-bold text-amber-800">{review}</p>
        </div>

        <div className="bg-blue-100 rounded-2xl p-4 shadow">
          <p className="text-sm text-blue-700">Resolved</p>
          <p className="text-2xl font-bold text-blue-800">{resolved}</p>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="max-w-6xl mx-auto flex gap-3 mb-6">
        <Link
          href="/create-post"
          className="bg-black text-white px-4 py-2 rounded-xl"
        >
          + Create Issue
        </Link>

        <Link
          href="/feed"
          className="bg-white border px-4 py-2 rounded-xl"
        >
          View Feed
        </Link>
      </div>

      {/* ISSUES LIST */}
      <div className="max-w-6xl mx-auto space-y-4">
        {issues.map((issue) => (
          <div
            key={issue.id}
            className="bg-white rounded-2xl p-5 shadow hover:shadow-lg transition"
          >
            <div className="flex justify-between items-start">
              <div>
                <h2 className="font-semibold text-lg">{issue.title}</h2>
                <p className="text-sm text-slate-600 mt-1">
                  {issue.description}
                </p>
              </div>

              <span
                className={`px-3 py-1 text-xs rounded-full ${getStatusColor(
                  issue.status
                )}`}
              >
                {issue.status}
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-3">
              {new Date(issue.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* LOGOUT */}
      <div className="max-w-6xl mx-auto mt-6">
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/login");
          }}
          className="text-red-600"
        >
          Logout
        </button>
      </div>
    </div>
  );
}