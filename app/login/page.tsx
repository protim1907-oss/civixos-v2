"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type LoginMode = "email" | "mobile";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loginMode, setLoginMode] = useState<LoginMode>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const clearStatus = () => {
    setMessage("");
    setError("");
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearStatus();
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

  const handleMobileLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearStatus();
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });

    if (error) {
      setError(error.message || "Unable to send OTP to this mobile number.");
      setLoading(false);
      return;
    }

    setMessage("OTP sent successfully to your mobile number.");
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    clearStatus();
    setGoogleLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      setError(error.message || "Google login could not be started.");
      setGoogleLoading(false);
      return;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl gap-6 p-6">
        <div className="hidden w-80 shrink-0 lg:block">
          <div className="sticky top-6 rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
            <h1 className="text-3xl font-bold">CivixOS</h1>
            <p className="mt-3 leading-7 text-slate-300">
              Access your civic workspace, join district conversations, and stay
              connected with policy updates and representative engagement.
            </p>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border-l-4 border-yellow-500 bg-yellow-50 p-4 text-slate-900">
                <h2 className="font-semibold">Quick Access</h2>
                <p className="mt-1 text-sm text-slate-700">
                  Log in securely and continue where you left off.
                </p>
              </div>

              <div className="rounded-2xl border-l-4 border-blue-500 bg-blue-50 p-4 text-slate-900">
                <h2 className="font-semibold">District Updates</h2>
                <p className="mt-1 text-sm text-slate-700">
                  Track issues, responses, and public sentiment in one place.
                </p>
              </div>

              <div className="rounded-2xl border-l-4 border-red-500 bg-red-50 p-4 text-slate-900">
                <h2 className="font-semibold">Citizen Engagement</h2>
                <p className="mt-1 text-sm text-slate-700">
                  Participate in discussions, votes, and representative outreach.
                </p>
              </div>

              <div className="rounded-2xl border-l-4 border-green-500 bg-green-50 p-4 text-slate-900">
                <h2 className="font-semibold">Secure Sign-In</h2>
                <p className="mt-1 text-sm text-slate-700">
                  Use email, mobile OTP, or Google authentication.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1">
          <div className="mb-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border-l-4 border-yellow-500 bg-yellow-50 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Simple Access
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Choose the login method that works best for you.
              </p>
            </div>

            <div className="rounded-2xl border-l-4 border-blue-500 bg-blue-50 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Real-Time Participation
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Rejoin district discussions and policy feedback instantly.
              </p>
            </div>

            <div className="rounded-2xl border-l-4 border-red-500 bg-red-50 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Trusted Identity
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Secure authentication helps protect citizen interactions.
              </p>
            </div>

            <div className="rounded-2xl border-l-4 border-green-500 bg-green-50 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Fast Onboarding
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Sign in and get back to issues, votes, and representative chats.
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl bg-white p-8 shadow-sm">
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-slate-900">Login</h2>
                <p className="mt-2 text-slate-600">
                  Access your CivixOS account using email, mobile number, or
                  Google.
                </p>
              </div>

              <div className="mb-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode("email");
                    clearStatus();
                  }}
                  className={`rounded-lg px-4 py-2 font-semibold transition ${
                    loginMode === "email"
                      ? "bg-blue-600 text-white"
                      : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Login with Email
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLoginMode("mobile");
                    clearStatus();
                  }}
                  className={`rounded-lg px-4 py-2 font-semibold transition ${
                    loginMode === "mobile"
                      ? "bg-blue-600 text-white"
                      : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Login with Mobile
                </button>
              </div>

              {loginMode === "email" ? (
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
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-500"
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
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                  >
                    {loading ? "Logging in..." : "Login"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleMobileLogin} className="space-y-4">
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
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-500"
                    />
                    <p className="mt-2 text-sm text-slate-500">
                      Example: +40712345678 or +919876543210
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                  >
                    {loading ? "Sending OTP..." : "Send OTP"}
                  </button>
                </form>
              )}

              <div className="my-6 flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-sm text-slate-500">or</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {googleLoading ? "Redirecting to Google..." : "Login with Google"}
              </button>

              {message && (
                <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {message}
                </div>
              )}

              {error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
                <Link
                  href="/forgot-password"
                  className="font-medium text-blue-600 hover:text-blue-700"
                >
                  Forgot password?
                </Link>

                <p className="text-slate-600">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/signup"
                    className="font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Sign up
                  </Link>
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900">
                Login Snapshot
              </h2>
              <p className="mt-2 text-slate-600">
                Secure sign-in options for faster access to district engagement.
              </p>

              <div className="mt-6 space-y-4">
                <div className="rounded-xl border-l-4 border-yellow-500 bg-yellow-50 p-4">
                  <p className="text-sm text-slate-500">Login Methods</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">3</p>
                </div>

                <div className="rounded-xl border-l-4 border-blue-500 bg-blue-50 p-4">
                  <p className="text-sm text-slate-500">Access Channels</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    Email / Mobile / Google
                  </p>
                </div>

                <div className="rounded-xl border-l-4 border-red-500 bg-red-50 p-4">
                  <p className="text-sm text-slate-500">Identity Protection</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    Secure Auth
                  </p>
                </div>

                <div className="rounded-xl border-l-4 border-green-500 bg-green-50 p-4">
                  <p className="text-sm text-slate-500">Post Login Destination</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    Dashboard
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-lg font-semibold text-slate-900">
                  Notes
                </h3>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                  <li>• Email login uses password authentication.</li>
                  <li>• Mobile login sends an OTP to the entered number.</li>
                  <li>• Google login requires Google auth to be enabled in Supabase.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}