"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [district, setDistrict] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setError("");
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

    if (error) {
      if (error.message.toLowerCase().includes("already")) {
        setError("User already registered");
      } else {
        setError(error.message);
      }
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push("/login"); // redirect after signup
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-4">CivixOS Onboarding</h1>

      <input
        type="text"
        placeholder="Full Name"
        className="w-full mb-3 p-2 border rounded"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
      />

      <input
        type="email"
        placeholder="Email"
        className="w-full mb-3 p-2 border rounded"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        className="w-full mb-3 p-2 border rounded"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <select
        className="w-full mb-3 p-2 border rounded"
        value={district}
        onChange={(e) => setDistrict(e.target.value)}
      >
        <option value="">Select District</option>
        <option value="NY-10">New York District 10 (NY-10)</option>
        <option value="CA-12">California District 12 (CA-12)</option>
      </select>

      <button
        onClick={handleSignup}
        disabled={loading}
        className="w-full bg-black text-white py-2 rounded"
      >
        {loading ? "Creating..." : "Create account"}
      </button>

      {/* 🔴 Error with clickable login */}
      {error && (
        <div className="text-red-500 mt-3">
          {error === "User already registered" ? (
            <>
              User already registered.{" "}
              <a href="/login" className="text-blue-600 underline">
                Please login
              </a>
            </>
          ) : (
            error
          )}
        </div>
      )}

      {/* ✅ Always show login option */}
      <p className="text-sm mt-4 text-gray-500">
        Already have an account?{" "}
        <a href="/login" className="text-blue-600 underline">
          Login
        </a>
      </p>
    </div>
  );
}