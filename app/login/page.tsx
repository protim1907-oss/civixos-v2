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

    setMessage("Login successful. Redirecting...");
    setLoading(false);
    router.push("/dashboard");
  };

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
    <div className="relative min-h-screen overflow-hidden bg-[#f6f7f8]">

      {/* HEADER */}
      <div className="relative z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-500 text-lg font-bold text-white">
            C
          </div>
          <div className="text-3xl font-bold text-orange-600">CivixOS</div>
        </div>
      </div>

      {/* CENTER CARD */}
      <div className="relative z-10 flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white/95 p-8 shadow-xl backdrop-blur">

          <div className="mb-6 text-center">
            <h1 className="text-4xl font-bold text-slate-900">Log In</h1>
            <p className="mx-auto mt-4 max-w-md text-base leading-7 text-slate-600">
              Continue to CivixOS to join district conversations, track civic
              issues, and participate in policy decisions.
            </p>
          </div>

          {/* ✅ PREMIUM TRUST BLOCK (REPLACED SECTION ONLY) */}
          <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">

            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🌍</span>
              <p className="font-semibold text-slate-900">
                Trusted Civic Engagement Platform
              </p>
            </div>

            <div className="space-y-2 text-sm text-slate-700">
              <div className="flex items-center gap-2">
                <span className="text-green-600">✔</span>
                <span>AI-powered issue moderation</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-blue-600">✔</span>
                <span>Real-time district insights</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-yellow-600">✔</span>
                <span>Direct access to representatives</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-red-600">✔</span>
                <span>Transparent citizen feedback loop</span>
              </div>
            </div>

            <p className="mt-4 text-xs italic text-slate-500">
              “Making governance more responsive and data-driven.”
            </p>
          </div>

          {/* LOGIN BUTTONS */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full rounded-full bg-red-500 px-5 py-4 text-base font-semibold text-white hover:bg-red-600"
            >
              {googleLoading ? "Redirecting..." : "Continue with Google"}
            </button>

            <button
              type="button"
              onClick={() => setMode("mobile")}
              className="w-full rounded-full border border-slate-300 px-5 py-4 text-base font-semibold text-slate-800 hover:bg-slate-50"
            >
              Continue with Mobile
            </button>

            <button
              type="button"
              onClick={() => setMode("email")}
              className="w-full rounded-full bg-green-600 px-5 py-4 text-base font-semibold text-white hover:bg-green-700"
            >
              Email Login
            </button>
          </div>

          {/* EMAIL FORM */}
          {mode === "email" && (
            <form onSubmit={handleEmailLogin} className="mt-6 space-y-4">
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

              <button className="w-full rounded-xl bg-blue-600 text-white py-3 hover:bg-blue-700">
                {loading ? "Logging in..." : "Log In"}
              </button>
            </form>
          )}

          {/* MOBILE */}
          {mode === "mobile" && (
            <div className="mt-6 space-y-4">
              <input
                type="tel"
                placeholder="Mobile Number"
                className="w-full rounded-xl border p-3"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <button
                onClick={handleMobileLogin}
                className="w-full rounded-xl bg-green-600 text-white py-3"
              >
                Send OTP
              </button>
            </div>
          )}

          {message && <p className="text-green-600 mt-4">{message}</p>}
          {error && <p className="text-red-600 mt-4">{error}</p>}

          <div className="mt-6 text-sm text-slate-600">
            New to CivixOS?{" "}
            <Link href="/signup" className="text-blue-600 font-semibold">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}