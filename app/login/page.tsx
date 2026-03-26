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
      setErrorMessage("Enter your email.");
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

    setSuccessMessage("Magic link sent.");
    setMagicLoading(false);
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
    <div className="min-h-screen bg-slate-100 lg:grid lg:grid-cols-2">

      {/* LEFT PANEL */}
      <div className="hidden lg:flex flex-col justify-center bg-gradient-to-br from-blue-700 via-indigo-700 to-red-600 px-12 text-white">
        <div className="max-w-lg">
          <Image
            src="/civixos-Logo.png"
            alt="CivixOS Logo"
            width={260}
            height={90}
          />
          <h1 className="mt-8 text-4xl font-bold">
            Empowering civic engagement
          </h1>
          <p className="mt-4 text-lg text-white/80">
            Raise issues. Engage your district. Drive real impact.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm border">

          {/* MOBILE LOGO */}
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

          {/* PHONE BUTTON */}
          <button className="mt-6 w-full flex items-center justify-center gap-2 border rounded-2xl px-4 py-3 hover:bg-slate-50">
            <Phone size={18} />
            Continue With Phone Number
          </button>

          {/* GOOGLE BUTTON */}
          <button
            onClick={handleGoogleLogin}
            className="mt-3 w-full flex items-center justify-center gap-2 border rounded-2xl px-4 py-3 hover:bg-slate-50"
          >
            <Image
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              alt="Google"
              width={18}
              height={18}
            />
            Continue with Google
          </button>

          {/* MAGIC LINK */}
          <div className="mt-6">
            <label className="text-sm font-medium flex items-center gap-2 mb-2">
              <LinkIcon size={16} />
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
              onClick={handleMagicLink}
              className="mt-3 w-full bg-black text-white rounded-2xl py-3"
            >
              {magicLoading ? "Sending..." : "Send Link"}
            </button>
          </div>

          {/* DIVIDER */}
          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs">OR</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {/* LOGIN FORM */}
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

            <Link
              href="/forgot-password"
              className="text-sm text-blue-600"
            >
              Forgot password?
            </Link>

            {errorMessage && (
              <div className="text-red-600 text-sm">{errorMessage}</div>
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