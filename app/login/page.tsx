"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [mode, setMode] = useState<"email" | "mobile">("email");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleEmailLogin = async (e: any) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/dashboard");
  };

  const handleMobileLogin = async (e: any) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });

    if (error) {
      setError(error.message);
      return;
    }

    setMessage("OTP sent successfully.");
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">

        {/* Top Colored Cards */}
        <div className="mb-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border-l-4 border-yellow-500 bg-yellow-50 p-6 shadow-sm">
            <h2 className="font-semibold">Simple Access</h2>
            <p className="text-sm mt-2">Login using multiple methods.</p>
          </div>

          <div className="rounded-2xl border-l-4 border-blue-500 bg-blue-50 p-6 shadow-sm">
            <h2 className="font-semibold">Real-Time Access</h2>
            <p className="text-sm mt-2">Continue your civic activity instantly.</p>
          </div>

          <div className="rounded-2xl border-l-4 border-red-500 bg-red-50 p-6 shadow-sm">
            <h2 className="font-semibold">Secure Identity</h2>
            <p className="text-sm mt-2">Protected authentication system.</p>
          </div>

          <div className="rounded-2xl border-l-4 border-green-500 bg-green-50 p-6 shadow-sm">
            <h2 className="font-semibold">Fast Onboarding</h2>
            <p className="text-sm mt-2">Get started in seconds.</p>
          </div>
        </div>

        {/* Login Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left */}
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <h1 className="text-3xl font-bold">Login</h1>

            {/* Toggle */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setMode("email")}
                className={`px-4 py-2 rounded ${
                  mode === "email"
                    ? "bg-blue-600 text-white"
                    : "border"
                }`}
              >
                Email
              </button>

              <button
                onClick={() => setMode("mobile")}
                className={`px-4 py-2 rounded ${
                  mode === "mobile"
                    ? "bg-blue-600 text-white"
                    : "border"
                }`}
              >
                Mobile
              </button>
            </div>

            {/* Email Login */}
            {mode === "email" && (
              <form onSubmit={handleEmailLogin} className="mt-6 space-y-4">
                <input
                  type="email"
                  placeholder="Email"
                  className="w-full border p-3 rounded"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <input
                  type="password"
                  placeholder="Password"
                  className="w-full border p-3 rounded"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <button className="w-full bg-blue-600 text-white p-3 rounded">
                  Login
                </button>
              </form>
            )}

            {/* Mobile Login */}
            {mode === "mobile" && (
              <form onSubmit={handleMobileLogin} className="mt-6 space-y-4">
                <input
                  type="tel"
                  placeholder="+407..."
                  className="w-full border p-3 rounded"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />

                <button className="w-full bg-blue-600 text-white p-3 rounded">
                  Send OTP
                </button>
              </form>
            )}

            {/* Divider */}
            <div className="my-6 text-center text-sm text-gray-500">
              OR
            </div>

            {/* Google Login */}
            <button
              onClick={handleGoogleLogin}
              className="w-full border p-3 rounded"
            >
              Login with Google
            </button>

            {/* Messages */}
            {message && <p className="mt-4 text-green-600">{message}</p>}
            {error && <p className="mt-4 text-red-600">{error}</p>}

            <div className="mt-6 text-sm">
              <Link href="/signup" className="text-blue-600">
                Create account
              </Link>
            </div>
          </div>

          {/* Right Panel */}
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-bold">Login Overview</h2>

            <div className="mt-6 space-y-4">
              <div className="bg-yellow-50 p-4 rounded">Email Login</div>
              <div className="bg-blue-50 p-4 rounded">Mobile OTP</div>
              <div className="bg-red-50 p-4 rounded">Secure Access</div>
              <div className="bg-green-50 p-4 rounded">Google Login</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}