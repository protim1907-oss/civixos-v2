"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type DistrictOption = {
  value: string;
  label: string;
};

const texasZipCityToDistricts: Record<string, DistrictOption[]> = {
  "San Antonio|78207": [{ value: "TX-20", label: "Texas 20th District (TX-20)" }],
  "San Antonio|78228": [{ value: "TX-20", label: "Texas 20th District (TX-20)" }],
  "San Antonio|78237": [{ value: "TX-20", label: "Texas 20th District (TX-20)" }],
  "San Antonio|78201": [{ value: "TX-20", label: "Texas 20th District (TX-20)" }],
  "San Antonio|78202": [{ value: "TX-20", label: "Texas 20th District (TX-20)" }],

  "Austin|78701": [{ value: "TX-35", label: "Texas 35th District (TX-35)" }],
  "Austin|78702": [{ value: "TX-35", label: "Texas 35th District (TX-35)" }],
  "Austin|78703": [{ value: "TX-35", label: "Texas 35th District (TX-35)" }],
  "Austin|78704": [{ value: "TX-35", label: "Texas 35th District (TX-35)" }],
  "Austin|78705": [{ value: "TX-35", label: "Texas 35th District (TX-35)" }],
  "Austin|78721": [{ value: "TX-35", label: "Texas 35th District (TX-35)" }],
  "Austin|78722": [{ value: "TX-35", label: "Texas 35th District (TX-35)" }],
  "Austin|78723": [{ value: "TX-35", label: "Texas 35th District (TX-35)" }],
  "Austin|78724": [{ value: "TX-35", label: "Texas 35th District (TX-35)" }],
  "Austin|78725": [{ value: "TX-35", label: "Texas 35th District (TX-35)" }],
  "Austin|78741": [{ value: "TX-35", label: "Texas 35th District (TX-35)" }],
  "Austin|78742": [{ value: "TX-35", label: "Texas 35th District (TX-35)" }],
  "Austin|78744": [{ value: "TX-35", label: "Texas 35th District (TX-35)" }],
  "Austin|78745": [{ value: "TX-35", label: "Texas 35th District (TX-35)" }],
  "Austin|78747": [{ value: "TX-35", label: "Texas 35th District (TX-35)" }],
  "Austin|78748": [{ value: "TX-35", label: "Texas 35th District (TX-35)" }],
  "Austin|78749": [{ value: "TX-35", label: "Texas 35th District (TX-35)" }],
  "Austin|78751": [{ value: "TX-35", label: "Texas 35th District (TX-35)" }],

  "Fort Worth|76102": [{ value: "TX-12", label: "Texas 12th District (TX-12)" }],
  "Fort Worth|76107": [{ value: "TX-12", label: "Texas 12th District (TX-12)" }],
  "Fort Worth|76114": [{ value: "TX-12", label: "Texas 12th District (TX-12)" }],
  "Fort Worth|76116": [{ value: "TX-12", label: "Texas 12th District (TX-12)" }],
  "Fort Worth|76135": [{ value: "TX-12", label: "Texas 12th District (TX-12)" }],
};

const newHampshireZipCityToDistricts: Record<string, DistrictOption[]> = {
  "Manchester|03101": [{ value: "NH", label: "New Hampshire" }],
  "Concord|03301": [{ value: "NH", label: "New Hampshire" }],
  "Nashua|03060": [{ value: "NH", label: "New Hampshire" }],
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

function resolveDistrictOptions(state: string, city: string, zipCode: string): DistrictOption[] {
  const normalizedCity = toTitleCase(city);
  const normalizedZip = zipCode.trim();
  const key = `${normalizedCity}|${normalizedZip}`;

  if (state === "Texas") {
    return texasZipCityToDistricts[key] || [];
  }

  if (state === "New Hampshire") {
    return newHampshireZipCityToDistricts[key] || [];
  }

  return [];
}

export default function SignupOfficialPage() {
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [officialLevel, setOfficialLevel] = useState("");
  const [officeName, setOfficeName] = useState("");
  const [designation, setDesignation] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const districtOptions = useMemo(() => {
    if (!state || !city || !zipCode || !/^\d{5}$/.test(zipCode.trim())) {
      return [];
    }

    if (officialLevel === "state" || officialLevel === "federal") {
      if (state === "Texas") {
        return [{ value: "TX", label: "State of Texas" }];
      }
      if (state === "New Hampshire") {
        return [{ value: "NH", label: "New Hampshire" }];
      }
    }

    return resolveDistrictOptions(state, city, zipCode);
  }, [state, city, zipCode, officialLevel]);

  const showDistrictConfirmation =
    Boolean(state) &&
    Boolean(city.trim()) &&
    /^\d{5}$/.test(zipCode.trim()) &&
    Boolean(officialLevel);

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
      !state.trim() ||
      !city.trim() ||
      !zipCode.trim()
    ) {
      setError("Please complete all fields.");
      return;
    }

    const normalizedZip = zipCode.trim();

    if (!/^\d{5}$/.test(normalizedZip)) {
      setError("Please enter a valid 5-digit ZIP code.");
      return;
    }

    if (districtOptions.length === 0) {
      setError(
        "We could not estimate a district or jurisdiction from this city and ZIP code yet. Please review your details."
      );
      return;
    }

    if (!selectedDistrict) {
      setError("Please confirm your district or jurisdiction before creating the account.");
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
          state: state,
          city: toTitleCase(city),
          zip_code: normalizedZip,
          district_id: selectedDistrict,
          jurisdiction: selectedDistrict,
          verified: false,
        },
      },
    });

    console.log("OFFICIAL_SIGNUP_RESULT:", { data, error, selectedDistrict });

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
        `Official account created or already exists. Jurisdiction confirmed as ${selectedDistrict}. Please check your email or login.`
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
            Create an official CivixOS account to publish updates, engage with constituents,
            and monitor district sentiment.
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
              Use your official government or organization email for faster verification.
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
              onChange={(e) => {
                setOfficialLevel(e.target.value);
                setSelectedDistrict("");
                setError("");
                setInfo("");
              }}
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

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              State
            </label>
            <select
              value={state}
              onChange={(e) => {
                setState(e.target.value);
                setCity("");
                setZipCode("");
                setSelectedDistrict("");
                setError("");
                setInfo("");
              }}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-green-600"
            >
              <option value="">Select state</option>
              <option value="Texas">Texas</option>
              <option value="New Hampshire">New Hampshire</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              City
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setSelectedDistrict("");
                setError("");
                setInfo("");
              }}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-green-600"
              placeholder={state ? "Enter your city" : "Select state first"}
              disabled={!state}
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              ZIP code
            </label>
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
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-green-600"
              placeholder={state ? "Enter your ZIP code" : "Select state first"}
              disabled={!state}
            />
            <p className="mt-2 text-xs text-slate-500">
              We’ll estimate the relevant district or jurisdiction from your state, city, and ZIP code.
            </p>
          </div>

          {showDistrictConfirmation ? (
            <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Confirm district / jurisdiction
              </label>

              {districtOptions.length > 0 ? (
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-green-600"
                >
                  <option value="">Select district / jurisdiction</option>
                  {districtOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  We could not estimate a district or jurisdiction from this city and ZIP code yet.
                </div>
              )}
            </div>
          ) : null}
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