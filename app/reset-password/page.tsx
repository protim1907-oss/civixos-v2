"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
);

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [message, setMessage] = useState("");

  // 🔥 CRITICAL FIX: Extract session from hash
  useEffect(() => {
    const init = async () => {
      try {
        const hash = window.location.hash;

        if (!hash || !hash.includes("access_token")) {
          setErrorMessage("Invalid or expired reset link.");
          return;
        }

        const params = new URLSearchParams(hash.substring(1));

        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (!access_token || !refresh_token) {
          setErrorMessage("Missing authentication tokens.");
          return;
        }

        // 🔥 Set session manually
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (error) {
          setErrorMessage("Session setup failed.");
          return;
        }

        setReady(true);
      } catch {
        setErrorMessage("Something went wrong.");
      }
    };

    init();
  }, []);

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setErrorMessage("");
    setMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage("Password updated successfully!");

    setTimeout(() => {
      router.push("/login");
    }, 1500);

    setLoading(false);
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Validating reset link...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm border">
        <h1 className="text-3xl font-bold">Reset Password</h1>

        <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-2xl px-4 py-3"
            required
          />

          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border rounded-2xl px-4 py-3"
            required
          />

          {errorMessage && (
            <div className="text-red-600 text-sm">{errorMessage}</div>
          )}

          {message && (
            <div className="text-green-600 text-sm">{message}</div>
          )}

          <button className="w-full bg-black text-white py-3 rounded-2xl">
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}