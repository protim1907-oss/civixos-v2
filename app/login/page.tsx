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
      <div className="mx-auto max-w-5xl space-y-6">

        {/* HEADER */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Citizen Access</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
            Log in to CivixOS
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-slate-600">
            Access your district dashboard, community issues, representatives,
            and policy engagement tools.
          </p>
        </section>

        {/* LOGIN CARD */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

          {/* LOGIN OPTIONS */}
          <div className="flex flex-wrap gap-3 mb-6">

            <button
              onClick={() => {
                setMode("email");
                resetStatus();
              }}
              className={`rounded-2xl px-5 py-3 text-sm font-semibold transition ${
                mode === "email"
                  ? "bg-red-500 text-white"
                  : "bg-red-100 text-red-700 hover:bg-red-200"
              }`}
            >
              Email Login
            </button>

            <button
              onClick={() => {
                setMode("mobile");
                resetStatus();
              }}
              className={`rounded-2xl px-5 py-3 text-sm font-semibold transition ${
                mode === "mobile"
                  ? "bg-green-600 text-white"
                  : "bg-green-100 text-green-700 hover:bg-green-200"
              }`}
            >
              Mobile Login
            </button>

            <button
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="rounded-2xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60"
            >
              {googleLoading ? "Redirecting..." : "Google Login"}
            </button>

            <button
              className="rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-semibold text-slate-900"
            >
              Secure Access
            </button>

          </div>

          {/* 🔥 REPLACEMENT BLOCK */}
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 mb-6">
            <h3 className="text-lg font-bold text-slate-900 mb-3">
              🌍 Trusted Civic Engagement Platform
            </h3>

            <div className="space-y-2 text-sm text-slate-700">
              <p>✔ AI-powered issue moderation</p>
              <p>✔ Real-time district insights</p>
              <p>✔ Direct access to representatives</p>
              <p>✔ Transparent citizen feedback loop</p>
            </div>

            <p className="mt-4 text-sm italic text-slate-500">
              “Making governance more responsive and data-driven.”
            </p>
          </div>

          {/* EMAIL FORM */}
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

              <button className="w-full rounded-xl bg-red-500 text-white py-3 hover:bg-red-600">
                {loading ? "Logging in..." : "Log In"}
              </button>
            </form>
          )}

          {/* MOBILE FORM */}
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
                className="w-full rounded-xl bg-green-600 text-white py-3 hover:bg-green-700"
              >
                Send OTP
              </button>
            </div>
          )}

          {/* STATUS */}
          {message && <p className="text-green-600 mt-4">{message}</p>}
          {error && <p className="text-red-600 mt-4">{error}</p>}

          {/* FOOTER */}
          <div className="mt-6 text-sm text-slate-600">
            New to CivixOS?{" "}
            <Link href="/signup" className="text-blue-600 font-semibold">
              Sign Up
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}