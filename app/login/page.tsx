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

    setMessage("OTP sent successfully to your mobile number.");
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
      setError(error.message || "Google login could not be started.");
      setGoogleLoading(false);
      return;
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f6f7f8]">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-60">
        <div className="grid h-full grid-cols-4 gap-6 p-6 md:grid-cols-6">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[28px] border border-white/60 bg-white/50"
              style={{
                minHeight: i % 3 === 0 ? "150px" : i % 3 === 1 ? "80px" : "110px",
              }}
            />
          ))}
        </div>
      </div>

      {/* Top brand bar */}
      <div className="relative z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-500 text-lg font-bold text-white">
            C
          </div>
          <div className="text-3xl font-bold text-orange-600">CivixOS</div>
        </div>
      </div>

      {/* Center card */}
      <div className="relative z-10 flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white/95 p-8 shadow-xl backdrop-blur">
          <div className="mb-6 text-center">
            <h1 className="text-4xl font-bold text-slate-900">Log In</h1>
            <p className="mx-auto mt-4 max-w-md text-base leading-7 text-slate-600">
              Continue to CivixOS to join district conversations, track civic
              issues, and participate in policy decisions.
            </p>
          </div>

          {/* Color cards */}
          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border-l-4 border-yellow-500 bg-yellow-50 p-4">
              <p className="font-semibold text-slate-900">Quick Access</p>
              <p className="mt-1 text-sm text-slate-700">Fast and simple sign in</p>
            </div>
            <div className="rounded-2xl border-l-4 border-blue-500 bg-blue-50 p-4">
              <p className="font-semibold text-slate-900">Stay Connected</p>
              <p className="mt-1 text-sm text-slate-700">Track your district updates</p>
            </div>
            <div className="rounded-2xl border-l-4 border-red-500 bg-red-50 p-4">
              <p className="font-semibold text-slate-900">Secure Identity</p>
              <p className="mt-1 text-sm text-slate-700">Protected login options</p>
            </div>
            <div className="rounded-2xl border-l-4 border-green-500 bg-green-50 p-4">
              <p className="font-semibold text-slate-900">Multiple Methods</p>
              <p className="mt-1 text-sm text-slate-700">Email, mobile, or Google</p>
            </div>
          </div>

          {/* Auth buttons */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                setMode("mobile");
                resetStatus();
              }}
              className="flex w-full items-center justify-center gap-3 rounded-full border border-slate-300 bg-white px-5 py-4 text-base font-medium text-slate-800 transition hover:bg-slate-50"
            >
              <span className="text-lg">📱</span>
              <span>Continue with Phone Number</span>
            </button>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="flex w-full items-center justify-center gap-3 rounded-full border border-slate-300 bg-white px-5 py-4 text-base font-medium text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <span className="text-lg">G</span>
              <span>
                {googleLoading ? "Redirecting to Google..." : "Continue with Google"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("email");
                resetStatus();
              }}
              className="flex w-full items-center justify-center gap-3 rounded-full border border-slate-300 bg-white px-5 py-4 text-base font-medium text-slate-800 transition hover:bg-slate-50"
            >
              <span className="text-lg">✉️</span>
              <span>Email and Password</span>
            </button>
          </div>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-300" />
            <span className="text-sm font-medium text-slate-500">OR</span>
            <div className="h-px flex-1 bg-slate-300" />
          </div>

          {/* Email mode */}
          {mode === "email" && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="Email or username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-[20px] border border-slate-300 bg-slate-100 px-5 py-4 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-[20px] border border-slate-300 bg-slate-100 px-5 py-4 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="pt-1">
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-orange-500 px-5 py-4 text-base font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
              >
                {loading ? "Logging in..." : "Log In"}
              </button>
            </form>
          )}

          {/* Mobile mode */}
          {mode === "mobile" && (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  placeholder="Enter mobile number with country code"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full rounded-[20px] border border-slate-300 bg-slate-100 px-5 py-4 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                />
                <p className="mt-2 text-sm text-slate-500">
                  Example: +40712345678 or +919876543210
                </p>
              </div>

              <button
                type="button"
                onClick={handleMobileLogin}
                disabled={loading}
                className="w-full rounded-full bg-orange-500 px-5 py-4 text-base font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
              >
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>
            </div>
          )}

          {/* Status */}
          {message && (
            <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {message}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-6 text-sm text-slate-600">
            New to CivixOS?{" "}
            <Link href="/signup" className="font-semibold text-blue-600 hover:text-blue-700">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}