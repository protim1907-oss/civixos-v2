"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type UserProfile = {
  email: string | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.push("/login");
        return;
      }

      setUser({
        email: user.email ?? null,
      });
      setLoading(false);
    };

    checkUser();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Citizen Dashboard
        </h1>
        <p className="text-slate-600 mb-6">
          Welcome to CivixOS.
        </p>

        <div className="rounded-xl border border-slate-200 p-4 mb-6">
          <p className="text-sm text-slate-500">Logged in as</p>
          <p className="text-lg font-medium text-slate-900">{user?.email}</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => router.push("/create-post")}
            className="rounded-lg bg-slate-900 text-white px-4 py-2 hover:bg-slate-800"
          >
            Create Post
          </button>

          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-100"
          >
            Logout
          </button>
        </div>
      </div>
    </main>
  );
}