"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type DistrictOption = {
  value: string;
  label: string;
};

export default function SignupPage() {
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [state, setState] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [zipCode, setZipCode] = useState("");

  const [districtOptions, setDistrictOptions] = useState<DistrictOption[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [matchedAddress, setMatchedAddress] = useState("");

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resolvingDistrict, setResolvingDistrict] = useState(false);

  const showDistrictConfirmation =
    Boolean(state) &&
    Boolean(streetAddress.trim()) &&
    Boolean(city.trim()) &&
    /^\d{5}$/.test(zipCode.trim());

  function resetDistrictState() {
    setDistrictOptions([]);
    setSelectedDistrict("");
    setMatchedAddress("");
  }

  async function handleResolveDistrict() {
    setError("");
    setInfo("");
    resetDistrictState();

    if (!state.trim()) {
      setError("Please select your state.");
      return;
    }

    if (!streetAddress.trim()) {
      setError("Please enter your street address.");
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

    try {
      setResolvingDistrict(true);

      const response = await fetch("/api/resolve-district", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          street: streetAddress.trim(),
          city: city.trim(),
          state: state.trim(),
          zipCode: normalizedZip,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(
          result?.error ||
            "We could not estimate your district from this address."
        );
        return;
      }

      if (!result?.district) {
        setError("We could not estimate your district from this address.");
        return;
      }

      setDistrictOptions([result.district]);
      setSelectedDistrict(result.district.value);
      setMatchedAddress(result.matchedAddress || "");
    } catch (err) {
      console.error("District resolve error:", err);
      setError("Unable to resolve district right now. Please try again.");
    } finally {
      setResolvingDistrict(false);
    }
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

    if (!streetAddress.trim()) {
      setError("Please enter your street address.");
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
      setError("Please resolve and confirm your district before signup.");
      return;
    }

    if (!selectedDistrict) {
      setError("Please confirm your district before creating your account.");
      return;
    }

    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedFullName = fullName.trim();
    const normalizedState = state.trim();
    const normalizedStreetAddress = streetAddress.trim();
    const normalizedCity = city.trim();
    const normalizedDistrict = selectedDistrict.trim();

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: normalizedFullName,
          state: normalizedState,
          street_address: normalizedStreetAddress,
          city: normalizedCity,
          zip_code: normalizedZip,
          district: normalizedDistrict,
          district_id: normalizedDistrict,
          matched_address: matchedAddress || null,
          role: "citizen",
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

    const signedUpUser = data?.user;

    if (signedUpUser?.id) {
      const profilePayload = {
        id: signedUpUser.id,
        full_name: normalizedFullName,
        email: normalizedEmail,
        role: "citizen",
        district: normalizedDistrict,
        state: normalizedState,
      };

      const { error: profileUpsertError } = await supabase
        .from("profiles")
        .upsert(profilePayload, { onConflict: "id" });

      if (profileUpsertError) {
        console.error("Profile upsert error after signup:", profileUpsertError);
      }
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
      <h1 className="text-3xl font-bold mb-2">CivicPulse Onboarding</h1>
      <p className="text-gray-600 mb-6">
        Create your citizen account and automatically resolve your district from
        your address.
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
            setStreetAddress("");
            setCity("");
            setZipCode("");
            setError("");
            setInfo("");
            resetDistrictState();
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
        <label className="block mb-1 text-sm font-medium">Street address</label>
        <input
          type="text"
          value={streetAddress}
          onChange={(e) => {
            setStreetAddress(e.target.value);
            setError("");
            setInfo("");
            resetDistrictState();
          }}
          className="w-full border rounded-lg px-3 py-2"
          placeholder={state ? "Enter your street address" : "Select state first"}
          disabled={!state}
        />
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
            resetDistrictState();
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
            setError("");
            setInfo("");
            resetDistrictState();
          }}
          className="w-full border rounded-lg px-3 py-2"
          placeholder={state ? "Enter your ZIP code" : "Select state first"}
          disabled={!state}
        />
        <p className="mt-2 text-xs text-gray-500">
          We’ll estimate your district from your street address, city, state,
          and ZIP code.
        </p>
      </div>

      {showDistrictConfirmation ? (
        <div className="mb-4 rounded-lg border bg-slate-50 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <label className="block text-sm font-medium">
              Confirm your district
            </label>
            <button
              type="button"
              onClick={handleResolveDistrict}
              disabled={resolvingDistrict}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-60"
            >
              {resolvingDistrict ? "Resolving..." : "Resolve district"}
            </button>
          </div>

          {districtOptions.length > 0 ? (
            <div className="mt-3">
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

              {matchedAddress ? (
                <p className="mt-2 text-xs text-gray-500">
                  Matched address: {matchedAddress}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              Resolve your district to continue.
            </div>
          )}
        </div>
      ) : null}

      <button
        onClick={handleSignup}
        disabled={loading}
        className="w-full bg-black text-white py-3 rounded-lg disabled:opacity-60"
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