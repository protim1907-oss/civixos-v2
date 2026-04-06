"use client";

import { useEffect, useState } from "react";
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
  const [checkingSession, setCheckingSession] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const resetStatus = () => {
    setMessage("");
    setError("");
  };

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (session?.user) {
        router.replace("/dashboard");
        return;
      }

      setCheckingSession(false);
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      if (session?.user) {
        router.replace("/dashboard");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router, supabase]);

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
    router.replace("/dashboard");
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

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
              Checking session...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 md:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-slate-500">Citizen Access</p>
              <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
                Log in to CivixOS
              </h1>
              <p className="mt-4 max-w-3xl text-lg text-slate-600">
                Continue to join district conversations, track community issues,
                and participate in policy decisions.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                className="rounded-2xl bg-red-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-600 disabled:opacity-60"
              >
                {googleLoading ? "Redirecting to Google..." : "Continue with Google"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("mobile");
                  resetStatus();
                }}
                className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Continue with Phone
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("email");
                  resetStatus();
                }}
                className="rounded-2xl bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
              >
                Email Login
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-1">
            <h2 className="text-xl font-semibold text-slate-900">Login Options</h2>
            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={() => {
                  setMode("email");
                  resetStatus();
                }}
                className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                  mode === "email"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Email and Password
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("mobile");
                  resetStatus();
                }}
                className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                  mode === "mobile"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Mobile Number
              </button>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                className="w-full rounded-2xl bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 border border-slate-300 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {googleLoading ? "Redirecting to Google..." : "Continue with Google"}
              </button>
            </div>

            <div className="mt-8 rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Need an account?</p>
              <p className="mt-2 text-sm text-slate-600">
                Create a new account to post issues, track updates, and engage with your district.
              </p>
              <Link
                href="/signup"
                className="mt-4 inline-block text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                Sign Up
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="text-2xl font-bold text-slate-900">
              {mode === "email" ? "Email Login" : "Mobile Login"}
            </h2>
            <p className="mt-2 text-base text-slate-600">
              {mode === "email"
                ? "Sign in with your email and password."
                : "Use your mobile number to receive a one-time passcode."}
            </p>

            <div className="mt-6">
              {mode === "email" && (
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Email
                    </label>
                    <input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Password
                    </label>
                    <input
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
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
                    className="rounded-2xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 disabled:opacity-60"
                  >
                    {loading ? "Logging in..." : "Log In"}
                  </button>
                </form>
              )}

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
                      className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                    />
                    <p className="mt-2 text-sm text-slate-500">
                      Example: +40712345678 or +919876543210
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleMobileLogin}
                    disabled={loading}
                    className="rounded-2xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 disabled:opacity-60"
                  >
                    {loading ? "Sending OTP..." : "Send OTP"}
                  </button>
                </div>
              )}
            </div>

            {message && (
              <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {message}
              </div>
            )}

            {error && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}