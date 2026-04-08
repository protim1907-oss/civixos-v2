"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupOfficialPage() {
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [officialLevel, setOfficialLevel] = useState("");
  const [officeName, setOfficeName] = useState("");
  const [designation, setDesignation] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleOfficialSignup = async () => {
    setError("");
    setInfo("");

    if (
      !fullName.trim() ||
      !email.trim() ||
      !password.trim() ||
      !officialLevel.trim() ||
      !officeName.trim() ||
      !designation.trim() ||
      !jurisdiction.trim()
    ) {
      setError("Please complete all fields.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          account_type: "official",
          official_level: officialLevel,
          office_name: officeName,
          designation: designation,
          jurisdiction: jurisdiction,
          verified: false,
        },
      },
    });

    console.log("OFFICIAL_SIGNUP_RESULT:", { data, error });

    if (error) {
      const msg = error.message.toLowerCase();

      if (msg.includes("already")) {
        setError("Official account already registered. Redirecting to login...");
        setLoading(false);

        setTimeout(() => {
          window.location.href = "/login";
        }, 1200);

        return;
      }

      setError(error.message);
      setLoading(false);
      return;
    }

    if (!data.session) {
      setInfo(
        "Official account created or already exists. Please check your email or login."
      );
      setLoading(false);

      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);

      return;
    }

    setLoading(false);
    window.location.href = "/login";
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
            CivixOS
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
            Government & Official Registration
          </h1>
          <p className="mt-3 text-lg leading-8 text-slate-600">
            Create an official CivixOS account to publish updates, engage with
            constituents, and monitor district sentiment.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Full name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-green-600"
              placeholder="Enter your full name"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Official email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-green-600"
              placeholder="Enter your government or official email"
            />
            <p className="mt-2 text-xs text-slate-500">
              Use your official government or organization email for faster
              verification.
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-green-600"
              placeholder="Enter your password"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Official level
            </label>
            <select
              value={officialLevel}
              onChange={(e) => setOfficialLevel(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-green-600"
            >
              <option value="">Select level</option>
              <option value="local">Local</option>
              <option value="state">State</option>
              <option value="federal">Federal</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Designation
            </label>
            <input
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-green-600"
              placeholder="e.g. Mayor, Senator, Officer"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Office / Department
            </label>
            <input
              type="text"
              value={officeName}
              onChange={(e) => setOfficeName(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-green-600"
              placeholder="e.g. Office of the Governor, City Council, Congressional Office"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Jurisdiction
            </label>
            <select
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-green-600"
            >
              <option value="">Select jurisdiction</option>
              <option value="District 12">District 12</option>
              <option value="State of Texas">State of Texas</option>
              <option value="New Hampshire">New Hampshire</option>
              <option value="United States Federal">United States Federal</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleOfficialSignup}
          disabled={loading}
          className="mt-8 w-full rounded-2xl bg-green-600 px-6 py-4 text-base font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creating official account..." : "Create official account"}
        </button>

        {error && (
          <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}{" "}
            <Link href="/login" className="font-medium underline">
              Please login
            </Link>
          </div>
        )}

        {info && (
          <div className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
            {info}{" "}
            <Link href="/login" className="font-medium text-blue-600 underline">
              Login
            </Link>
          </div>
        )}

        <div className="mt-6 space-y-2 text-sm text-slate-600">
          <p>
            Already have an official account?{" "}
            <Link href="/login" className="font-medium text-blue-600 underline">
              Login
            </Link>
          </p>
          <p>
            Looking to register as a citizen instead?{" "}
            <Link href="/signup" className="font-medium text-slate-900 underline">
              Citizen signup
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}