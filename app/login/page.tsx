"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Phone, Link as LinkIcon } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
);

function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 48 48"
      aria-hidden="true"
      className="h-[18px] w-[18px]"
    >
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.215 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.85 1.154 7.971 3.029l5.657-5.657C34.053 6.053 29.277 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917Z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.85 1.154 7.971 3.029l5.657-5.657C34.053 6.053 29.277 4 24 4c-7.682 0-14.347 4.337-17.694 10.691Z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.177 0 9.86-1.977 13.409-5.193l-6.19-5.238C29.141 35.091 26.715 36 24 36c-5.194 0-9.624-3.33-11.283-7.946l-6.522 5.025C9.5 39.556 16.55 44 24 44Z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.084 5.57l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917Z"
      />
    </svg>
  );
}

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

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/dashboard`
              : undefined,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setGoogleLoading(false);
        return;
      }
    } catch {
      setErrorMessage("Could not continue with Google.");
      setGoogleLoading(false);
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
          <h1 className="mt-8 text-4xl font-bold leading-tight">
            Empowering civic engagement through community action
          </h1>
          <p className="mt-4 text-lg text-white/85">
            Log in to raise issues, engage with your district, and help shape
            better local communities through CivixOS.
          </p>
        </div>
      </div>

      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col items-center mb-6 lg:hidden">
            <Image
              src="/civixos-Logo.png"
              alt="CivixOS Logo"
              width={180}
              height={60}
              className="object-contain"
              priority
            />
          </div>

          <h1 className="text-3xl font-bold text-slate-900">Log In</h1>

          <p className="mt-4 text-sm leading-6 text-slate-600">
            By continuing, you agree to our CivixOS Terms and acknowledge that
            you understand the Privacy Policy.
          </p>

          <button
            type="button"
            className="mt-6 w-full flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            <Phone size={18} />
            Continue With Phone Number
          </button>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-70"
          >
            <GoogleIcon />
            {googleLoading ? "Redirecting..." : "Continue with Google"}
          </button>

          <div className="mt-6">
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
              <LinkIcon size={16} />
              Email me a one-time link
            </label>

            <input
              type="email"
              placeholder="Enter your email"
              value={magicEmail}
              onChange={(e) => setMagicEmail(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-500"
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

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium tracking-wide text-slate-500">
              OR
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Email or username *
              </label>
              <input
                type="text"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-500"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Password *
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-500"
                required
              />
            </div>

            <div className="-mt-2">
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            {errorMessage && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
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
    </div>
  );
}