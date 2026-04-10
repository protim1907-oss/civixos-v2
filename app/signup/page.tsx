"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const texasZipToDistrict: Record<string, string> = {
  "78207": "TX-20",
  "78228": "TX-20",
  "78237": "TX-20",
  "78201": "TX-20",
  "78202": "TX-20",
  "76102": "TX-12",
  "76107": "TX-12",
  "76114": "TX-12",
  "76116": "TX-12",
  "76135": "TX-12",
};

export default function SignupPage() {
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  function resolveDistrict(stateValue: string, zipValue: string) {
    if (stateValue === "Texas") {
      return texasZipToDistrict[zipValue] || "";
    }

    if (stateValue === "New Hampshire") {
      return "NH";
    }

    return "";
  }

  const handleSignup = async () => {
    setError("");
    setInfo("");

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }

    if (!state.trim()) {
      setError("Please select your state.");
      return;
    }

    if (!zipCode.trim()) {
      setError("Please enter your ZIP code.");
      return;
    }

    const normalizedZip = zipCode.trim();

    if (!/^\d{5}$/.test(normalizedZip)) {
      setError("Please enter a valid 5-digit ZIP code.");
      return;
    }

    const districtId = resolveDistrict(state, normalizedZip);

    if (!districtId) {
      setError(
        "We could not map that ZIP code to a district yet. Please try another Texas ZIP code."
      );
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          state: state,
          zip_code: normalizedZip,
          district_id: districtId,
          account_type: "citizen",
        },
      },
    });

    console.log("SIGNUP_RESULT:", { data, error, districtId });

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

    if (!data.session) {
      setInfo(
        `Account created or already exists. Your district was identified as ${districtId}. Please check your email or login.`
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

  const resolvedPreviewDistrict =
    state && zipCode && /^\d{5}$/.test(zipCode.trim())
      ? resolveDistrict(state, zipCode.trim())
      : "";

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded-2xl shadow bg-white">
      <h1 className="text-3xl font-bold mb-2">CivixOS Onboarding</h1>
      <p className="text-gray-600 mb-6">
        Create your citizen account and identify your district using your state and ZIP code.
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
        <label className="block mb-1 text-sm font-medium">State</label>
        <select
          value={state}
          onChange={(e) => {
            setState(e.target.value);
            setZipCode("");
            setError("");
            setInfo("");
          }}
          className="w-full border rounded-lg px-3 py-2"
        >
          <option value="">Select State</option>
          <option value="Texas">Texas</option>
          <option value="New Hampshire">New Hampshire</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block mb-1 text-sm font-medium">ZIP code</label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={5}
          value={zipCode}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, "");
            setZipCode(value);
            setError("");
            setInfo("");
          }}
          className="w-full border rounded-lg px-3 py-2"
          placeholder={state === "Texas" ? "Enter your Texas ZIP code" : "Enter your ZIP code"}
          disabled={!state}
        />
        <p className="mt-2 text-xs text-gray-500">
          We’ll automatically identify your district from your ZIP code.
        </p>
      </div>

      {resolvedPreviewDistrict ? (
        <div className="mb-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
          District identified: <span className="font-semibold">{resolvedPreviewDistrict}</span>
        </div>
      ) : null}

      <button
        onClick={handleSignup}
        disabled={loading}
        className="w-full bg-black text-white py-3 rounded-lg"
      >
        {loading ? "Creating..." : "Create account"}
      </button>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}{" "}
          <Link href="/login" className="underline font-medium">
            Please login
          </Link>
        </div>
      )}

      {info && (
        <div className="mt-4 rounded-lg bg-gray-100 px-4 py-3 text-sm text-gray-700">
          {info}{" "}
          <Link href="/login" className="underline font-medium text-blue-600">
            Login
          </Link>
        </div>
      )}

      <p className="text-sm mt-4 text-gray-500">
        Already have an account?{" "}
        <Link href="/login" className="text-blue-600 underline">
          Login
        </Link>
      </p>

      <p className="text-sm mt-2 text-gray-500">
        Are you a government official?{" "}
        <Link href="/signup-official" className="text-green-600 underline">
          Register here
        </Link>
      </p>
    </div>
  );
}