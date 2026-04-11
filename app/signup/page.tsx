"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type DistrictOption = {
  value: string;
  label: string;
};

const texasZipToDistricts: Record<string, DistrictOption[]> = {
  "78207": [{ value: "TX-20", label: "Texas 20th District (TX-20)" }],
  "78228": [{ value: "TX-20", label: "Texas 20th District (TX-20)" }],
  "78237": [{ value: "TX-20", label: "Texas 20th District (TX-20)" }],
  "78201": [{ value: "TX-20", label: "Texas 20th District (TX-20)" }],
  "78202": [{ value: "TX-20", label: "Texas 20th District (TX-20)" }],
  "78701": [{ value: "TX-35", label: "Texas 35th District (TX-35)" }],
  "78702": [{ value: "TX-35", label: "Texas 35th District (TX-35)" }],
  "78703": [{ value: "TX-35", label: "Texas 35th District (TX-35)" }],
  "78704": [{ value: "TX-35", label: "Texas 35th District (TX-35)" }],
  "78705": [{ value: "TX-35", label: "Texas 35th District (TX-35)" }],
  "78721": [{ value: "TX-35", label: "Texas 35th District (TX-35)" }],
  "78722": [{ value: "TX-35", label: "Texas 35th District (TX-35)" }],
  "78723": [{ value: "TX-35", label: "Texas 35th District (TX-35)" }],
  "78724": [{ value: "TX-35", label: "Texas 35th District (TX-35)" }],
  "78725": [{ value: "TX-35", label: "Texas 35th District (TX-35)" }],
  "78741": [{ value: "TX-35", label: "Texas 35th District (TX-35)" }],
  "78742": [{ value: "TX-35", label: "Texas 35th District (TX-35)" }],
  "78744": [{ value: "TX-35", label: "Texas 35th District (TX-35)" }],
  "78745": [{ value: "TX-35", label: "Texas 35th District (TX-35)" }],
  "78747": [{ value: "TX-35", label: "Texas 35th District (TX-35)" }],
  "78748": [{ value: "TX-35", label: "Texas 35th District (TX-35)" }],
  "78749": [{ value: "TX-35", label: "Texas 35th District (TX-35)" }],
  "78751": [{ value: "TX-35", label: "Texas 35th District (TX-35)" }],
  "76102": [{ value: "TX-12", label: "Texas 12th District (TX-12)" }],
  "76107": [{ value: "TX-12", label: "Texas 12th District (TX-12)" }],
  "76114": [{ value: "TX-12", label: "Texas 12th District (TX-12)" }],
  "76116": [{ value: "TX-12", label: "Texas 12th District (TX-12)" }],
  "76135": [{ value: "TX-12", label: "Texas 12th District (TX-12)" }],
};

const newHampshireZipToDistricts: Record<string, DistrictOption[]> = {
  "03101": [{ value: "NH", label: "New Hampshire" }],
  "03301": [{ value: "NH", label: "New Hampshire" }],
  "03060": [{ value: "NH", label: "New Hampshire" }],
};

const californiaZipToDistricts: Record<string, DistrictOption[]> = {
  "94102": [{ value: "CA-11", label: "California 11th District (CA-11)" }],
  "94103": [{ value: "CA-11", label: "California 11th District (CA-11)" }],
  "94107": [{ value: "CA-11", label: "California 11th District (CA-11)" }],
  "90012": [{ value: "CA-34", label: "California 34th District (CA-34)" }],
  "90013": [{ value: "CA-34", label: "California 34th District (CA-34)" }],
  "90017": [{ value: "CA-34", label: "California 34th District (CA-34)" }],
  "92101": [{ value: "CA-51", label: "California 51st District (CA-51)" }],
  "92102": [{ value: "CA-51", label: "California 51st District (CA-51)" }],
  "92113": [{ value: "CA-51", label: "California 51st District (CA-51)" }],
};

function toTitleCase(value: string) {
  return value
    .trim()
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function resolveDistrictOptions(state: string, zipCode: string): DistrictOption[] {
  const normalizedZip = zipCode.trim();

  if (state === "Texas") {
    return texasZipToDistricts[normalizedZip] || [];
  }

  if (state === "New Hampshire") {
    return newHampshireZipToDistricts[normalizedZip] || [];
  }

  if (state === "California") {
    return californiaZipToDistricts[normalizedZip] || [];
  }

  return [];
}

export default function SignupPage() {
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const districtOptions = useMemo(() => {
    if (!state || !zipCode || !/^\d{5}$/.test(zipCode.trim())) {
      return [];
    }
    return resolveDistrictOptions(state, zipCode);
  }, [state, zipCode]);

  const showDistrictConfirmation =
    Boolean(state) && /^\d{5}$/.test(zipCode.trim());

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

    if (!city.trim()) {
      setError("Please enter your city.");
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

    if (districtOptions.length === 0) {
      setError(
        "We could not estimate your district from that ZIP code yet. Please review your entry or try another ZIP."
      );
      return;
    }

    if (!selectedDistrict) {
      setError("Please confirm your district before creating your account.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          state,
          city: toTitleCase(city),
          zip_code: normalizedZip,
          district_id: selectedDistrict,
          account_type: "citizen",
        },
      },
    });

    console.log("SIGNUP_RESULT:", { data, error, selectedDistrict });

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
        `Account created or already exists. Your district was confirmed as ${selectedDistrict}. Please check your email or login.`
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
    <div className="max-w-md mx-auto mt-10 p-6 border rounded-2xl shadow bg-white">
      <h1 className="text-3xl font-bold mb-2">CivixOS Onboarding</h1>
      <p className="text-gray-600 mb-6">
        Create your citizen account and confirm your district using your state and ZIP code.
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
            setSelectedDistrict("");
            setError("");
            setInfo("");
          }}
          className="w-full border rounded-lg px-3 py-2"
        >
          <option value="">Select State</option>
          <option value="Texas">Texas</option>
          <option value="New Hampshire">New Hampshire</option>
          <option value="California">California</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block mb-1 text-sm font-medium">City</label>
        <input
          type="text"
          value={city}
          onChange={(e) => {
            setCity(e.target.value);
            setError("");
            setInfo("");
          }}
          className="w-full border rounded-lg px-3 py-2"
          placeholder={state ? "Enter your city" : "Select state first"}
          disabled={!state}
        />
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
            setSelectedDistrict("");
            setError("");
            setInfo("");
          }}
          className="w-full border rounded-lg px-3 py-2"
          placeholder={state ? "Enter your ZIP code" : "Select state first"}
          disabled={!state}
        />
        <p className="mt-2 text-xs text-gray-500">
          We’ll estimate your district from your state and ZIP code, and you’ll confirm it before signup.
        </p>
      </div>

      {showDistrictConfirmation ? (
        <div className="mb-4 rounded-lg border bg-slate-50 px-4 py-4">
          <label className="block mb-2 text-sm font-medium">Confirm your district</label>

          {districtOptions.length > 0 ? (
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 bg-white"
            >
              <option value="">Select your district</option>
              {districtOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              We could not estimate a district from this ZIP code yet.
            </div>
          )}
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