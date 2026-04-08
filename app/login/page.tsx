"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "email" | "mobile";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const resetStatus = () => {
    setMessage("");
    setError("");
  };

  // EMAIL LOGIN
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetStatus();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message || "Invalid login credentials.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  };

  // MOBILE LOGIN
  const handleMobileLogin = async () => {
    resetStatus();
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });

    if (error) {
      setError(error.message || "Unable to send OTP.");
      setLoading(false);
      return;
    }

    setMessage("OTP sent successfully.");
    setLoading(false);
  };

  // GOOGLE LOGIN
  const handleGoogleLogin = async () => {
    resetStatus();
    setGoogleLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message || "Google login failed.");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-6xl space-y-8">

        {/* HEADER */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-slate-500">Citizen Access</p>
              <h1 className="mt-2 text-4xl font-bold text-slate-900">
                Log in to CivixOS
              </h1>
              <p className="mt-4 text-lg text-slate-600 max-w-3xl">
                Continue to join district conversations, track community issues,
                and participate in policy decisions.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                className="rounded-2xl bg-red-500 px-6 py-3 text-sm font-semibold text-white hover:bg-red-600"
              >
                {googleLoading ? "Redirecting..." : "Google Login"}
              </button>

              <button
                onClick={() => setMode("mobile")}
                className="rounded-2xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Mobile Login
              </button>

              <button
                onClick={() => setMode("email")}
                className="rounded-2xl bg-green-600 px-6 py-3 text-sm font-semibold text-white hover:bg-green-700"
              >
                Email Login
              </button>
            </div>
          </div>
        </section>

        {/* 🔥 LIVE PLATFORM PREVIEW */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm text-slate-500">Live Platform Preview</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">
                What’s happening in your district right now
              </h2>
              <p className="mt-3 max-w-3xl text-base text-slate-600">
                Get a quick view of district activity, issue patterns, and citizen signals
                before you sign in.
              </p>
            </div>

            <Link
              href="/dashboard"
              className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              View Dashboard Preview
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Active Issues</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">12</p>
              <p className="mt-2 text-sm text-slate-500">Last 7 days</p>
            </div>

            <div className="rounded-3xl border bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Top Concern</p>
              <p className="mt-3 text-xl font-bold text-slate-900">
                Drainage & Flooding
              </p>
            </div>

            <div className="rounded-3xl border bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Citizen Sentiment</p>
              <p className="mt-3 text-xl font-bold text-slate-900">
                Generally Supportive
              </p>
            </div>

            <div className="rounded-3xl border bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Trending Issue</p>
              <p className="mt-3 text-xl font-bold text-slate-900">
                Waterlogging in District 12
              </p>
            </div>
          </div>
        </section>

        {/* LOGIN FORM */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm max-w-xl mx-auto">
          {mode === "email" && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                className="w-full rounded-xl border p-3"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <input
                type="password"
                placeholder="Password"
                className="w-full rounded-xl border p-3"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button
                type="submit"
                className="w-full rounded-xl bg-black text-white py-3"
              >
                {loading ? "Logging in..." : "Log In"}
              </button>
            </form>
          )}

          {mode === "mobile" && (
            <div className="space-y-4">
              <input
                type="tel"
                placeholder="Mobile Number"
                className="w-full rounded-xl border p-3"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <button
                onClick={handleMobileLogin}
                className="w-full rounded-xl bg-black text-white py-3"
              >
                Send OTP
              </button>
            </div>
          )}

          {message && <p className="text-green-600 mt-4">{message}</p>}
          {error && <p className="text-red-600 mt-4">{error}</p>}
        </section>

      </div>
    </div>
  );
}