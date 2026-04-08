"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [loginMode, setLoginMode] = useState<"email" | "mobile">("email");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleEmailLogin(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message || "Invalid login credentials");
      setLoading(false);
      return;
    }

    setMessage("Login successful. Redirecting...");
    setLoading(false);
    router.push("/dashboard");
    router.refresh();
  }

  async function handleMobileLogin(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    if (!mobile.trim()) {
      setMessage("Please enter your mobile number.");
      setLoading(false);
      return;
    }

    if (!password.trim()) {
      setMessage("Please enter your password.");
      setLoading(false);
      return;
    }

    setTimeout(() => {
      setMessage("Mobile login is a demo flow. Redirecting...");
      setLoading(false);
      router.push("/dashboard");
      router.refresh();
    }, 800);
  }

  async function handleGoogleLogin() {
    try {
      setMessage("");
      setGoogleLoading(true);

      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback`
          : undefined;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        setMessage(error.message || "Google login failed.");
        setGoogleLoading(false);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      setMessage("Google login could not start. Check your Supabase Google OAuth settings.");
      setGoogleLoading(false);
    } catch (error) {
      console.error("Google login error:", error);
      setMessage("Something went wrong while starting Google login.");
      setGoogleLoading(false);
    }
  }

  async function handleGuestLogin() {
    try {
      setMessage("");
      setGuestLoading(true);

      localStorage.setItem(
        "guest_user",
        JSON.stringify({
          name: "Guest Citizen",
          role: "guest",
        })
      );

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("Guest login error:", error);
      setMessage("Unable to continue as guest.");
      setGuestLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 md:px-6">
      <div className="mx-auto grid max-w-6xl items-start gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-blue-50" />

          <div className="relative p-8 md:p-10">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500 text-lg font-bold text-white shadow-sm">
                C
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  CivixOS
                </p>
                <h1 className="text-2xl font-bold text-slate-900">Citizen Login</h1>
              </div>
            </div>

            <div className="mt-8 max-w-xl">
              <h2 className="text-4xl font-bold leading-tight text-slate-900 md:text-5xl">
                Join the conversation in your district.
              </h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                Log in to view local issues, explore district discussions, track policy activity,
                and take part in civic conversations that matter to your community.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
  <div className="rounded-3xl border-l-4 border-yellow-500 border border-slate-200 bg-yellow-50/60 p-5 shadow-sm">
    <h3 className="text-xl font-bold text-slate-900">Quick Policy Testing</h3>
    <p className="mt-3 text-sm leading-6 text-slate-600">
      Run focused surveys to validate public sentiment before policy rollout.
    </p>
  </div>

  <div className="rounded-3xl border-l-4 border-red-500 border border-slate-200 bg-red-50/60 p-5 shadow-sm">
    <h3 className="text-xl font-bold text-slate-900">Citizen Sentiment</h3>
    <p className="mt-3 text-sm leading-6 text-slate-600">
      Capture support levels, concerns, and recommendations in one place.
    </p>
  </div>

  <div className="rounded-3xl border-l-4 border-blue-500 border border-slate-200 bg-blue-50/60 p-5 shadow-sm">
    <h3 className="text-xl font-bold text-slate-900">Risk Visibility</h3>
    <p className="mt-3 text-sm leading-6 text-slate-600">
      Surface public concerns early so teams can respond before issues escalate.
    </p>
  </div>

  <div className="rounded-3xl border-l-4 border-green-500 border border-slate-200 bg-green-50/60 p-5 shadow-sm">
    <h3 className="text-xl font-bold text-slate-900">Actionable Insights</h3>
    <p className="mt-3 text-sm leading-6 text-slate-600">
      Turn feedback into decisions, communication plans, and next-step actions.
    </p>
  </div>
</div>
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="mx-auto max-w-md">
            <div className="mb-6">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Welcome back
              </p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">Log in to CivixOS</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Choose your preferred login option below. The layout is inspired by modern
                community platforms, with bright color-coded sign-in actions.
              </p>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setLoginMode("email")}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  loginMode === "email"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Email Login
              </button>

              <button
                type="button"
                onClick={() => setLoginMode("mobile")}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  loginMode === "mobile"
                    ? "bg-yellow-400 text-slate-900 shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Mobile Login
              </button>
            </div>

            {loginMode === "email" ? (
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500"
                    required
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
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Logging in..." : "Login with Email"}
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
                    placeholder="Enter your mobile number"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-yellow-500"
                    required
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
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-yellow-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Logging in..." : "Login with Mobile"}
                </button>
              </form>
            )}

            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Or continue with
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="grid gap-3">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                className="w-full rounded-2xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {googleLoading ? "Connecting..." : "Continue with Google"}
              </button>

              <button
                type="button"
                onClick={handleGuestLogin}
                disabled={guestLoading}
                className="w-full rounded-2xl bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {guestLoading ? "Redirecting..." : "Continue as Guest"}
              </button>
            </div>

            {message ? (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {message}
              </div>
            ) : null}

            <div className="mt-6 flex items-center justify-between gap-4 text-sm text-slate-600">
              <Link href="/forgot-password" className="font-medium text-blue-600 hover:underline">
                Forgot password?
              </Link>

              <Link href="/signup" className="font-medium text-slate-900 hover:underline">
                Create account
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}