"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [district, setDistrict] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setError("");
    setInfo("");
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          district_id: district,
        },
      },
    });

    // ✅ DEBUG LOG (VERY IMPORTANT)
    console.log("SIGNUP_RESULT:", { data, error });

    // ❌ Case 1: Explicit error (duplicate user etc.)
    if (error) {
      const msg = error.message.toLowerCase();

      if (msg.includes("already")) {
        setError("User already registered. Redirecting to login...");
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

    // ⚠️ Case 2: No session returned (Supabase hides duplicate users sometimes)
    if (!data.session) {
      setInfo(
        "Account created or already exists. Please check your email or login."
      );
      setLoading(false);

      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);

      return;
    }

    // ✅ Case 3: Successful signup
    setLoading(false);
    window.location.href = "/login";
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded-2xl shadow bg-white">
      <h1 className="text-3xl font-bold mb-2">CivixOS Onboarding</h1>
      <p className="text-gray-600 mb-6">
        Create your citizen account and select your district.
      </p>

      <div className="mb-4">
        <label className="block mb-1 text-sm font-medium">Full name</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
          placeholder="Enter your full name"
        />
      </div>

      <div className="mb-4">
        <label className="block mb-1 text-sm font-medium">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
          placeholder="Enter your email"
        />
      </div>

      <div className="mb-4">
        <label className="block mb-1 text-sm font-medium">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
          placeholder="Enter your password"
        />
      </div>

      <div className="mb-4">
        <label className="block mb-1 text-sm font-medium">District</label>
        <select
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
        >
          <option value="">Select District</option>
          <option value="NY-10">New York District 10 (NY-10)</option>
          <option value="CA-12">California District 12 (CA-12)</option>
        </select>
      </div>

      <button
        onClick={handleSignup}
        disabled={loading}
        className="w-full bg-black text-white py-3 rounded-lg"
      >
        {loading ? "Creating..." : "Create account"}
      </button>

      {/* ❌ Error message */}
      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}{" "}
          <Link href="/login" className="underline font-medium">
            Please login
          </Link>
        </div>
      )}

      {/* ℹ️ Info message */}
      {info && (
        <div className="mt-4 rounded-lg bg-gray-100 px-4 py-3 text-sm text-gray-700">
          {info}{" "}
          <Link href="/login" className="underline font-medium text-blue-600">
            Login
          </Link>
        </div>
      )}

      {/* Always show login option */}
      <p className="text-sm mt-4 text-gray-500">
        Already have an account?{" "}
        <Link href="/login" className="text-blue-600 underline">
          Login
        </Link>
      </p>
    </div>
  );
}