"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type DistrictOption = {
  value: string;
  label: string;
};

const addressProofOptions = [
  { value: "voter_registration_screenshot", label: "Voter registration screenshot (recommended)" },
  { value: "drivers_license", label: "Driver's license" },
];

const voterLookupByState: Record<string, { label: string; url: string }> = {
  Texas: {
    label: "Check Texas voter registration",
    url: "https://teamrv-mvp.sos.texas.gov/voter-registration/search",
  },

  California: {
    label: "Check California voter registration",
    url: "https://voterstatus.sos.ca.gov",
  },
  Illinois: {
    label: "Check Illinois voter registration",
    url: "https://ova.elections.il.gov/RegistrationLookup.aspx",
  },
  Maryland: {
    label: "Check Maryland voter registration",
    url: "https://voterservices.elections.maryland.gov/VoterSearch",
  },
  Colorado: {
    label: "Check Colorado voter registration",
    url: "https://www.coloradosos.gov/voter/pages/pub/olvr/findVoterReg.xhtml",
  },
};

const ADDRESS_PROOF_BUCKET = "address-proof-uploads";
const MAX_ADDRESS_PROOF_FILE_SIZE = 10 * 1024 * 1024;
const acceptedAddressProofTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

function normalizeDistrictValue(value: string | null | undefined) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const upper = raw.toUpperCase();

  if (upper === "UNKNOWN" || upper === "UNMAPPED" || upper === "N/A" || upper === "NA") {
    return "";
  }

  if (upper === "DISTRICT 12") return "CA-42";
  if (upper === "DISTRICT 42") return "CA-42";
  if (upper === "CA42") return "CA-42";
  if (upper === "TX35") return "TX-35";
  if (upper === "TX20") return "TX-20";
  if (upper === "TX12") return "TX-12";

  const compactMatch = upper.match(/^([A-Z]{2})(\d{1,2})$/);
  if (compactMatch) {
    return padDistrict(`${compactMatch[1]}-${Number(compactMatch[2])}`);
  }

  const spacedMatch = upper.match(/^([A-Z]{2})[\s-]?(\d{1,2})$/);
  if (spacedMatch) {
    return padDistrict(`${spacedMatch[1]}-${Number(spacedMatch[2])}`);
  }

  return padDistrict(upper);
}

// Maryland and Colorado districts are stored zero-padded (MD-1 -> MD-01,
// CO-1 -> CO-01).
function padDistrict(code: string) {
  const match = code.match(/^(MD|CO)-(\d{1,2})$/);
  return match ? `${match[1]}-${match[2].padStart(2, "0")}` : code;
}

function isValidResolvedDistrict(value: string | null | undefined) {
  return Boolean(normalizeDistrictValue(value));
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${(size / 1024).toFixed(1)} KB`;
}

function getSafeStorageFileName(fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
  return safeName || "address-proof";
}

export default function SignupPage() {
  const supabase = createClient();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) {
      localStorage.setItem("civix_referral", ref);
    }
  }, []);

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
  const [addressProof, setAddressProof] = useState("");
  const [addressProofFile, setAddressProofFile] = useState<File | null>(null);
  const [isAddressProofCertified, setIsAddressProofCertified] = useState(false);
  const [isVoterCertified, setIsVoterCertified] = useState(false);

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resolvingDistrict, setResolvingDistrict] = useState(false);
  const [districtResolved, setDistrictResolved] = useState(false);

  const showDistrictConfirmation = useMemo(() => {
    return (
      Boolean(state.trim()) &&
      Boolean(streetAddress.trim()) &&
      Boolean(city.trim()) &&
      /^\d{5}$/.test(zipCode.trim())
    );
  }, [state, streetAddress, city, zipCode]);

  function clearMessages() {
    setError("");
    setInfo("");
  }

  function resetDistrictState() {
    setDistrictOptions([]);
    setSelectedDistrict("");
    setMatchedAddress("");
    setDistrictResolved(false);
  }

  function handleAddressChange(updater: () => void) {
    updater();
    clearMessages();
    resetDistrictState();
  }

  function handleAddressProofFileChange(file: File | null) {
    clearMessages();

    if (!file) {
      setAddressProofFile(null);
      return;
    }

    if (!acceptedAddressProofTypes.includes(file.type)) {
      setAddressProofFile(null);
      setError("Please upload a PDF, JPG, PNG, or WebP address proof file.");
      return;
    }

    if (file.size > MAX_ADDRESS_PROOF_FILE_SIZE) {
      setAddressProofFile(null);
      setError("Please upload an address proof file smaller than 10 MB.");
      return;
    }

    setAddressProofFile(file);
  }

  async function uploadAddressProofFile(userId: string, file: File) {
    const safeName = getSafeStorageFileName(file.name);
    const path = `${userId}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(ADDRESS_PROOF_BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    return {
      name: file.name,
      size: file.size,
      type: file.type || "Unknown file type",
      path,
    };
  }

  async function handleResolveDistrict() {
    clearMessages();
    resetDistrictState();

    const normalizedState = state.trim();
    const normalizedStreet = streetAddress.trim();
    const normalizedCity = city.trim();
    const normalizedZip = zipCode.trim();

    if (!normalizedState) {
      setError("Please select your state.");
      return;
    }

    if (!normalizedStreet) {
      setError("Please enter your street address.");
      return;
    }

    if (!normalizedCity) {
      setError("Please enter your city.");
      return;
    }

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
          street: normalizedStreet,
          city: normalizedCity,
          state: normalizedState,
          zipCode: normalizedZip,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(
          result?.error ||
            "We could not confirm your district from this address. Please verify your address and try again."
        );
        return;
      }

      const resolvedDistrict = normalizeDistrictValue(result?.district?.value);
      const resolvedLabel = String(result?.district?.label || "").trim();

      if (!resolvedDistrict || !resolvedLabel) {
        setError(
          "We could not confirm your district from this address. Please verify your address and try again."
        );
        return;
      }

      setDistrictOptions([
        {
          value: resolvedDistrict,
          label: resolvedLabel,
        },
      ]);
      setSelectedDistrict(resolvedDistrict);
      setMatchedAddress(String(result?.matchedAddress || "").trim());
      setDistrictResolved(true);
      setInfo(`District confirmed: ${resolvedLabel}`);
    } catch (err) {
      console.error("District resolve error:", err);
      setError("Unable to resolve district right now. Please try again.");
    } finally {
      setResolvingDistrict(false);
    }
  }

  async function handleSignup() {
    clearMessages();

    const normalizedFullName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password;
    const normalizedState = state.trim();
    const normalizedStreetAddress = streetAddress.trim();
    const normalizedCity = city.trim();
    const normalizedZip = zipCode.trim();
    const normalizedDistrict = normalizeDistrictValue(selectedDistrict);

    if (!normalizedFullName) {
      setError("Please enter your full name.");
      return;
    }

    if (!normalizedEmail) {
      setError("Please enter your email.");
      return;
    }

    if (!normalizedPassword.trim()) {
      setError("Please enter your password.");
      return;
    }

    if (!normalizedState) {
      setError("Please select your state.");
      return;
    }

    if (!normalizedStreetAddress) {
      setError("Please enter your street address.");
      return;
    }

    if (!normalizedCity) {
      setError("Please enter your city.");
      return;
    }

    if (!/^\d{5}$/.test(normalizedZip)) {
      setError("Please enter a valid 5-digit ZIP code.");
      return;
    }

    if (!districtResolved || districtOptions.length === 0) {
      setError("Please resolve and confirm your district before signup.");
      return;
    }

    if (!isValidResolvedDistrict(normalizedDistrict)) {
      setError("Your district could not be confirmed. Please resolve it again before signup.");
      return;
    }


    if (!isVoterCertified) {
      setError("Please certify that you are at least 18 years of age and legally eligible to vote in your jurisdiction.");
      return;
    }

    setLoading(true);

    const referredBy =
      typeof window !== "undefined" ? localStorage.getItem("civix_referral") : null;

    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: normalizedPassword,
        options: {
          data: {
            full_name: normalizedFullName,
            state: normalizedState,
            street_address: normalizedStreetAddress,
            city: normalizedCity,
            zip_code: normalizedZip,
            district: normalizedDistrict,
            matched_address: matchedAddress || null,
            address_proof_type: addressProof,
            address_proof_file_name: addressProofFile?.name || null,
            address_proof_file_size: addressProofFile?.size || null,
            address_proof_file_mime_type: addressProofFile?.type || null,
            address_proof_current_certified: isAddressProofCertified,
            role: "citizen",
            referred_by: referredBy || null,
          },
        },
      });

      if (signupError) {
        const msg = signupError.message.toLowerCase();

        if (msg.includes("already")) {
          setError("User already registered. Redirecting to login...");
          setLoading(false);

          setTimeout(() => {
            window.location.href = "/login";
          }, 1200);

          return;
        }

        setError(signupError.message);
        setLoading(false);
        return;
      }

      const signedUpUser = data?.user;
      let uploadedAddressProof:
        | Awaited<ReturnType<typeof uploadAddressProofFile>>
        | null = null;

      if (signedUpUser?.id && addressProofFile && data.session) {
        uploadedAddressProof = await uploadAddressProofFile(signedUpUser.id, addressProofFile);

        const { error: metadataError } = await supabase.auth.updateUser({
          data: {
            full_name: normalizedFullName,
            state: normalizedState,
            street_address: normalizedStreetAddress,
            city: normalizedCity,
            zip_code: normalizedZip,
            district: normalizedDistrict,
            matched_address: matchedAddress || null,
            address_proof_type: addressProof,
            address_proof_file_name: uploadedAddressProof.name,
            address_proof_file_size: uploadedAddressProof.size,
            address_proof_file_mime_type: uploadedAddressProof.type,
            address_proof_file_path: uploadedAddressProof.path,
            address_proof_current_certified: isAddressProofCertified,
            role: "citizen",
          },
        });

        if (metadataError) {
          console.error("Address proof metadata update error:", metadataError);
          setError(
            `Account created, but address proof metadata failed to save: ${metadataError.message}`
          );
          setLoading(false);
          return;
        }
      }

      if (signedUpUser?.id) {
        const profilePayload = {
          id: signedUpUser.id,
          full_name: normalizedFullName,
          email: normalizedEmail,
          role: "citizen",
          district: normalizedDistrict,
          state: normalizedState,
          street_address: normalizedStreetAddress,
          city: normalizedCity,
          zip_code: normalizedZip,
        };

        const { error: profileUpsertError } = await supabase
          .from("profiles")
          .upsert(profilePayload, { onConflict: "id" });

        if (profileUpsertError) {
          console.error("Profile upsert error after signup:", profileUpsertError);
          setError(
            `Account created, but profile save failed: ${profileUpsertError.message}`
          );
          setLoading(false);
          return;
        }
      }

      fetch("/api/send-welcome-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, fullName: normalizedFullName }),
      }).catch((err) => console.error("Welcome email request failed:", err));

      if (typeof window !== "undefined") {
        localStorage.removeItem("civix_referral");
      }

      if (!data.session) {
        setInfo(
          addressProofFile
            ? `Account created. Your district was confirmed as ${normalizedDistrict}. Please check your email or login, then upload your address proof.`
            : `Account created. Your district was confirmed as ${normalizedDistrict}. Please check your email or login.`
        );
        setLoading(false);

        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);

        return;
      }

      setLoading(false);
      window.location.href = "/login";
    } catch (err) {
      console.error("Unexpected signup error:", err);
      setError("Something went wrong while creating your account.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto mt-10 max-w-md rounded-2xl border bg-white p-6 shadow">
      <h1 className="mb-2 text-3xl font-bold">CivicPulse Onboarding</h1>
      <p className="mb-6 text-gray-600">
        Create your citizen account and confirm your district from your address.
      </p>

      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium">Full name</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => {
            setFullName(e.target.value);
            clearMessages();
          }}
          className="w-full rounded-lg border px-3 py-2"
          placeholder="Enter your full name"
        />
      </div>

      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            clearMessages();
          }}
          className="w-full rounded-lg border px-3 py-2"
          placeholder="Enter your email"
        />
      </div>

      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            clearMessages();
          }}
          className="w-full rounded-lg border px-3 py-2"
          placeholder="Enter your password"
        />
      </div>

      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium">State</label>
        <select
          value={state}
          onChange={(e) =>
            handleAddressChange(() => {
              setState(e.target.value);
              setStreetAddress("");
              setCity("");
              setZipCode("");
            })
          }
          className="w-full rounded-lg border px-3 py-2"
        >
          <option value="">Select State</option>
          <option value="Texas">Texas</option>
          <option value="California">California</option>
          <option value="Illinois">Illinois</option>
          <option value="Maryland">Maryland</option>
          <option value="Colorado">Colorado</option>
        </select>
      </div>

      {state && voterLookupByState[state] ? (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <span className="mt-0.5">🗳</span>
          <span>
            Not sure if you&apos;re registered to vote?{" "}
            <a
              href={voterLookupByState[state].url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline"
            >
              {voterLookupByState[state].label} →
            </a>{" "}
            A voter registration card or screenshot is the best address proof you can provide.
          </span>
        </div>
      ) : null}

      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium">Street address</label>
        <input
          type="text"
          value={streetAddress}
          onChange={(e) =>
            handleAddressChange(() => {
              setStreetAddress(e.target.value);
            })
          }
          className="w-full rounded-lg border px-3 py-2"
          placeholder={state ? "Enter your street address" : "Select state first"}
          disabled={!state}
        />
      </div>

      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium">City</label>
        <input
          type="text"
          value={city}
          onChange={(e) =>
            handleAddressChange(() => {
              setCity(e.target.value);
            })
          }
          className="w-full rounded-lg border px-3 py-2"
          placeholder={state ? "Enter your city" : "Select state first"}
          disabled={!state}
        />
      </div>

      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium">ZIP code</label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={5}
          value={zipCode}
          onChange={(e) =>
            handleAddressChange(() => {
              setZipCode(e.target.value.replace(/\D/g, ""));
            })
          }
          className="w-full rounded-lg border px-3 py-2"
          placeholder={state ? "Enter your ZIP code" : "Select state first"}
          disabled={!state}
        />
        <p className="mt-2 text-xs text-gray-500">
          We’ll confirm your district from your street address, city, state, and ZIP code.
        </p>
      </div>

      {showDistrictConfirmation ? (
        <div className="mb-4 rounded-lg border bg-slate-50 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <label className="block text-sm font-medium">Confirm your district</label>
            <button
              type="button"
              onClick={handleResolveDistrict}
              disabled={resolvingDistrict}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-60"
            >
              {resolvingDistrict ? "Resolving..." : "Confirm your District"}
            </button>
          </div>

          {districtOptions.length > 0 ? (
            <div className="mt-3">
              <select
                value={selectedDistrict}
                onChange={(e) => {
                  setSelectedDistrict(normalizeDistrictValue(e.target.value));
                  clearMessages();
                }}
                className="w-full rounded-lg border bg-white px-3 py-2"
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
            <div className="mt-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Resolve your district to continue. We do not create accounts with an unknown district.
            </div>
          )}
        </div>
      ) : null}


      <label className="mb-4 flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={isVoterCertified}
          onChange={(e) => {
            setIsVoterCertified(e.target.checked);
            clearMessages();
          }}
          className="mt-0.5 h-4 w-4 rounded border-slate-300"
        />
        <span>
          I certify that I am at least 18 years of age and legally eligible to vote in my
          jurisdiction.{" "}
          <span className="text-slate-500">
            Providing false certification is a violation of Civix250 Terms of Service and may
            constitute a legal offense under applicable state and federal law.
          </span>
        </span>
      </label>

      <button
        onClick={handleSignup}
        disabled={loading}
        className="w-full rounded-lg bg-black py-3 text-white disabled:opacity-60"
      >
        {loading ? "Creating..." : "Create account"}
      </button>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}{" "}
          <Link href="/login" className="font-medium underline">
            Please login
          </Link>
        </div>
      )}

      {info && (
        <div className="mt-4 rounded-lg bg-gray-100 px-4 py-3 text-sm text-gray-700">
          {info}{" "}
          <Link href="/login" className="font-medium text-blue-600 underline">
            Login
          </Link>
        </div>
      )}

      <p className="mt-4 text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/login" className="text-blue-600 underline">
          Login
        </Link>
      </p>

      <p className="mt-2 text-sm text-gray-500">
        Are you a government official?{" "}
        <Link href="/signup-official" className="text-green-600 underline">
          Register here
        </Link>
      </p>

      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 leading-5">
        🔒 <strong>Your data is safe with us.</strong> We use industry-standard encryption to protect your personal information. Your address is used solely to confirm your congressional district — it is never shared with campaigns, candidates, or third parties.
      </div>
    </div>
  );
}
