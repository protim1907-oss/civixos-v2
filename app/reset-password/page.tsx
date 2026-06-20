"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    // Primary check: session cookie set by /auth/callback after PKCE code exchange
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true);
        return;
      }

      // Fallback: listen for PASSWORD_RECOVERY / SIGNED_IN events
      // (fires for implicit flow where token is in the URL hash)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
            setReady(true);
            clearTimeout(timeoutId);
          }
        }
      );

      timeoutId = setTimeout(() => {
        setErrorMessage("Invalid or expired reset link. Please request a new one.");
      }, 5000);

      // Cleanup — returned from inner async, not directly from useEffect
      // so we capture the subscription reference for cleanup via the outer return
      (window as any).__resetPasswordSubscription = subscription;
    });

    return () => {
      clearTimeout(timeoutId);
      (window as any).__resetPasswordSubscription?.unsubscribe();
    };
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

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage("Password updated successfully! Redirecting to login...");
    setTimeout(() => router.push("/login"), 1500);
    setLoading(false);
  };

  if (!ready && !errorMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-slate-500 text-sm">Validating reset link...</p>
      </div>
    );
  }

  if (!ready && errorMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm border text-center">
          <p className="text-red-600 font-semibold mb-4">{errorMessage}</p>
          <a
            href="/forgot-password"
            className="inline-block bg-black text-white px-6 py-3 rounded-2xl text-sm font-semibold hover:bg-slate-800 transition"
          >
            Request New Reset Link
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm border">
        <h1 className="text-3xl font-bold text-slate-900">Reset Password</h1>
        <p className="mt-2 text-sm text-slate-500">Enter your new password below.</p>

        <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-slate-300 rounded-2xl px-4 py-3 text-sm outline-none focus:border-blue-500 transition"
            required
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border border-slate-300 rounded-2xl px-4 py-3 text-sm outline-none focus:border-blue-500 transition"
            required
          />

          {errorMessage && (
            <p className="text-red-600 text-sm">{errorMessage}</p>
          )}
          {message && (
            <p className="text-green-600 text-sm font-medium">{message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-3 rounded-2xl text-sm font-semibold hover:bg-slate-800 transition disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
