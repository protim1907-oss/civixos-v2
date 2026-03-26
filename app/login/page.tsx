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
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
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
        router.refresh();
      }, 1000);
    } catch {
      setErrorMessage("Something went wrong during login.");
    }

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

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: magicEmail,
        options: {
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/dashboard`
              : undefined,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setMagicLoading(false);
        return;
      }

      setSuccessMessage("One-time login link sent.");
    } catch {
      setErrorMessage("Could not send magic link.");
    }

    setMagicLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm border border-slate-200">

        {/* LOGO */}
        <div className="flex flex-col items-center mb-6">
          <Image
            src="/logo.png"
            alt="CivixOS Logo"
            width={60}
            height={60}
          />
          <h2 className="mt-2 text-xl font-semibold text-slate-900">
            CivixOS
          </h2>
        </div>

        <h1 className="text-3xl font-bold text-slate-900">Log In</h1>

        <p className="mt-4 text-sm text-slate-600 leading-6">
          By continuing, you agree to our CivixOS Terms and acknowledge that
          you understand the Privacy Policy.
        </p>

        {/* PHONE BUTTON */}
        <button
          type="button"
          className="mt-6 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          Continue With Phone Number
        </button>

        {/* MAGIC LINK */}
        <div className="mt-6">
          <label className="text-sm font-medium text-slate-700 block mb-2">
            Email me a one-time link
          </label>

          <input
            type="email"
            placeholder="Enter your email"
            value={magicEmail}
            onChange={(e) => setMagicEmail(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-500"
          />

          <button
            type="button"
            onClick={handleMagicLink}
            disabled={magicLoading}
            className="mt-3 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-70"
          >
            {magicLoading ? "Sending..." : "Email me a one-time link"}
          </button>
        </div>

        {/* DIVIDER */}
        <div className="my-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs text-slate-500 font-medium">OR</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        {/* LOGIN FORM */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Email or username *
            </label>

            <input
              type="text"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-500"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Password *
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-500"
              required
            />
          </div>

          <Link
            href="/forgot-password"
            className="text-sm text-blue-600 hover:underline"
          >
            Forgot password?
          </Link>

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-3 rounded-xl">
              {successMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-70"
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        {/* SIGNUP */}
        <p className="mt-6 text-sm text-slate-600">
          New to CivixOS?{" "}
          <Link
            href="/signup"
            className="font-medium text-blue-600 hover:underline"
          >
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}