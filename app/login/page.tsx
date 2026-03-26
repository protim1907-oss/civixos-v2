"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
);

export default function LoginPage() {
  const router = useRouter();

  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [magicEmail, setMagicEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailOrUsername,
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setErrorMessage("Login failed.");
      setLoading(false);
      return;
    }

    setSuccessMessage("Login successful. Redirecting...");

    setTimeout(() => {
      router.push("/dashboard");
    }, 1000);

    setLoading(false);
  };

  const handleMagicLink = async () => {
    setMagicLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    if (!magicEmail.trim()) {
      setErrorMessage("Please enter your email.");
      setMagicLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: magicEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setMagicLoading(false);
      return;
    }

    setSuccessMessage("One-time login link sent.");
    setMagicLoading(false);
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setErrorMessage("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setGoogleLoading(false);
      return;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 lg:grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-center bg-gradient-to-br from-blue-700 via-indigo-700 to-red-600 px-12 text-white">
        <div className="max-w-lg">
          <Image
            src="/civixos-Logo.png"
            alt="CivixOS Logo"
            width={260}
            height={90}
            className="object-contain"
            priority
          />
          <h1 className="mt-8 text-4xl font-bold">
            Empowering civic engagement
          </h1>
          <p className="mt-4 text-lg text-white/80">
            Raise issues. Engage your district. Drive real impact.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm border">
          <div className="flex justify-center mb-6 lg:hidden">
            <Image
              src="/civixos-Logo.png"
              alt="CivixOS Logo"
              width={180}
              height={60}
            />
          </div>

          <h1 className="text-3xl font-bold">Log In</h1>

          <p className="mt-4 text-sm text-slate-600">
            By continuing, you agree to CivixOS Terms and Privacy Policy.
          </p>

          <button
            type="button"
            className="mt-6 w-full flex items-center justify-center gap-2 border rounded-2xl px-4 py-3 hover:bg-slate-50"
          >
            <span aria-hidden="true">📱</span>
            Continue With Phone Number
          </button>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="mt-3 w-full flex items-center justify-center border rounded-2xl px-4 py-3 hover:bg-slate-50"
          >
            {googleLoading ? "Redirecting..." : "Continue with Google"}
          </button>

          <div className="mt-6">
            <label className="text-sm font-medium flex items-center gap-2 mb-2">
              <span aria-hidden="true">🔗</span>
              Email me a one-time link
            </label>

            <input
              type="email"
              value={magicEmail}
              onChange={(e) => setMagicEmail(e.target.value)}
              className="w-full border rounded-2xl px-4 py-3"
              placeholder="Enter email"
            />

            <button
              type="button"
              onClick={handleMagicLink}
              className="mt-3 w-full bg-black text-white rounded-2xl py-3"
            >
              {magicLoading ? "Sending..." : "Send Link"}
            </button>
          </div>

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs">OR</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="text"
              placeholder="Email or username"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              className="w-full border rounded-2xl px-4 py-3"
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-2xl px-4 py-3"
            />

            <Link href="/forgot-password" className="text-sm text-blue-600">
              Forgot password?
            </Link>

            {errorMessage && (
              <div className="text-red-600 text-sm">{errorMessage}</div>
            )}

            {successMessage && (
              <div className="text-green-600 text-sm">{successMessage}</div>
            )}

            <button className="w-full bg-black text-white rounded-2xl py-3">
              {loading ? "Logging in..." : "Log In"}
            </button>
          </form>

          <p className="mt-6 text-sm">
            New to CivixOS?{" "}
            <Link href="/signup" className="text-blue-600">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}