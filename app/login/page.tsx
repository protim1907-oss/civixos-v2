"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message || "Invalid login credentials");
      setLoading(false);
      return;
    }

    setSuccess("Login successful. Redirecting...");
    setLoading(false);
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-5xl grid md:grid-cols-2 rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-[#111111]">
        <div className="hidden md:flex flex-col justify-between bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 p-10">
          <div>
            <div className="w-14 h-14 rounded-full bg-white text-orange-600 flex items-center justify-center text-2xl font-bold shadow-lg">
              C
            </div>
            <h1 className="mt-8 text-4xl font-bold leading-tight">
              Welcome back to CivixOS
            </h1>
            <p className="mt-4 text-white/90 text-base leading-7">
              Join district conversations, raise civic issues, and connect with
              representatives through a familiar community-driven experience.
            </p>
          </div>

          <div className="space-y-3 text-sm text-white/90">
            <div>• Participate in district discussions</div>
            <div>• Track civic issues and resolutions</div>
            <div>• Chat with representatives</div>
          </div>
        </div>

        <div className="bg-[#181818] p-8 md:p-12 flex items-center">
          <div className="w-full max-w-md mx-auto">
            <div className="md:hidden flex justify-center mb-6">
              <div className="w-14 h-14 rounded-full bg-orange-500 text-white flex items-center justify-center text-2xl font-bold">
                C
              </div>
            </div>

            <h2 className="text-3xl font-bold text-white text-center md:text-left">
              Log in
            </h2>
            <p className="mt-2 text-sm text-gray-400 text-center md:text-left">
              Access your CivixOS account
            </p>

            <form onSubmit={handleLogin} className="mt-8 space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl bg-[#272729] border border-white/10 px-4 py-3 text-white placeholder:text-gray-500 outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Password</label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl bg-[#272729] border border-white/10 px-4 py-3 text-white placeholder:text-gray-500 outline-none focus:border-orange-500"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-orange-500 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
              >
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>

            <div className="mt-4 text-center md:text-left">
              <Link
                href="/forgot-password"
                className="text-sm text-orange-400 hover:text-orange-300"
              >
                Forgot password?
              </Link>
            </div>

            <p className="mt-6 text-sm text-gray-400 text-center md:text-left">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="font-medium text-orange-400 hover:text-orange-300"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}