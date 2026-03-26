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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
);

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.push("/login");
        return;
      }

      setUserEmail(user.email || "");

      const { data, error: profileError } = await supabase
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
      } else if (data) {
        setProfile({
          id: data.id,
          full_name: data.full_name,
          email: data.email,
          role: data.role,
          districts: Array.isArray(data.districts) ? data.districts : [],
        });
      }

      setLoading(false);
    };

    loadUser();
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
                href="/create-issue"
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

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-slate-700">No recent activity yet.</p>
              <p className="mt-1 text-sm text-slate-500">
                Once you create posts or civic issues, they will appear here.
              </p>
            </div>
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