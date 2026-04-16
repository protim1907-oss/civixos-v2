"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { createClient } from "@/lib/supabase/client";

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  district: string | null;
  state: string | null;
};

type CategoryOption =
  | "Infrastructure"
  | "Public Safety"
  | "Healthcare"
  | "Education"
  | "Transportation"
  | "Environment"
  | "Housing"
  | "Community";

function prettifyDistrictLabel(district: string | null, state: string | null) {
  if (!district && !state) return "Your district";
  if (!district) return `${state ?? "Your state"} district`;

  const normalized = district.trim().toUpperCase();

  if (/^[A-Z]{2}-\d+$/.test(normalized)) {
    const [stateCode, districtNumber] = normalized.split("-");
    return `${state ?? stateCode} Congressional District ${districtNumber} (${normalized})`;
  }

  return district;
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function inferCategory(title: string, description: string): CategoryOption {
  const text = `${title} ${description}`.toLowerCase();

  if (
    text.includes("road") ||
    text.includes("pothole") ||
    text.includes("drain") ||
    text.includes("waterlogging") ||
    text.includes("bridge") ||
    text.includes("sidewalk") ||
    text.includes("flood") ||
    text.includes("pipeline") ||
    text.includes("manhole")
  ) {
    return "Infrastructure";
  }

  if (
    text.includes("crime") ||
    text.includes("police") ||
    text.includes("unsafe") ||
    text.includes("violence") ||
    text.includes("harassment")
  ) {
    return "Public Safety";
  }

  if (
    text.includes("hospital") ||
    text.includes("clinic") ||
    text.includes("health") ||
    text.includes("mental health")
  ) {
    return "Healthcare";
  }

  if (
    text.includes("school") ||
    text.includes("teacher") ||
    text.includes("student") ||
    text.includes("education")
  ) {
    return "Education";
  }

  if (
    text.includes("bus") ||
    text.includes("traffic") ||
    text.includes("train") ||
    text.includes("transit")
  ) {
    return "Transportation";
  }

  if (
    text.includes("pollution") ||
    text.includes("waste") ||
    text.includes("garbage") ||
    text.includes("air quality") ||
    text.includes("park")
  ) {
    return "Environment";
  }

  if (
    text.includes("rent") ||
    text.includes("housing") ||
    text.includes("shelter") ||
    text.includes("homeless")
  ) {
    return "Housing";
  }

  return "Community";
}

function improveTitle(title: string) {
  const cleaned = normalizeWhitespace(title);
  if (!cleaned) return "";

  const withoutDistrictNoise = cleaned
    .replace(/\btexas district \d+\b/i, "")
    .replace(/\bcalifornia district \d+\b/i, "")
    .replace(/\bnew hampshire district \d+\b/i, "")
    .replace(/\bdistrict \d+\b/i, "")
    .replace(/\s+-\s+/g, " ")
    .trim();

  const normalized = withoutDistrictNoise.length > 0 ? withoutDistrictNoise : cleaned;

  return normalized.length <= 120 ? normalized : normalized.slice(0, 120).trim();
}

function improveDescription(description: string) {
  const cleaned = normalizeWhitespace(description);
  if (!cleaned) return "";

  const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}

export default function CreatePostPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<CategoryOption>("Community");

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [aiNote, setAiNote] = useState("");

  const districtLabel = prettifyDistrictLabel(profile?.district ?? null, profile?.state ?? null);

  useEffect(() => {
    let mounted = true;

    async function loadUserAndProfile() {
      try {
        setLoading(true);
        setError("");

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace("/login");
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, email, role, district, state")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Profile load error:", profileError);
          if (mounted) {
            setError("We could not load your profile. Please try again.");
          }
          return;
        }

        if (!mounted) return;

        setProfile((profileData as ProfileRow | null) ?? null);

        if (!profileData?.district) {
          setError("Your account does not have a district assigned yet. Please update your profile before posting.");
        }
      } catch (err) {
        console.error("Create Post page load error:", err);
        if (mounted) {
          setError("Something went wrong while loading the page.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadUserAndProfile();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  async function handleReviewWithAi() {
    try {
      setReviewing(true);
      setError("");
      setSuccess("");
      setAiNote("");

      const cleanTitle = improveTitle(title);
      const cleanDescription = improveDescription(description);

      if (!cleanTitle && !cleanDescription) {
        setError("Add a title or description before reviewing with AI.");
        return;
      }

      const inferredCategory = inferCategory(cleanTitle, cleanDescription);

      setTitle(cleanTitle);
      setDescription(cleanDescription);
      setCategory(inferredCategory);
      setAiNote("AI review applied: clarified wording and suggested a category.");
    } catch (err) {
      console.error("AI review error:", err);
      setError("AI review could not be completed right now.");
    } finally {
      setReviewing(false);
    }
  }

  async function handleCreatePost() {
    try {
      setSubmitting(true);
      setError("");
      setSuccess("");
      setAiNote("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      const cleanTitle = normalizeWhitespace(title);
      const cleanDescription = normalizeWhitespace(description);

      if (!cleanTitle) {
        setError("Please enter a title.");
        return;
      }

      if (!cleanDescription) {
        setError("Please enter a description.");
        return;
      }

      if (!profile?.district) {
        setError("Your district could not be found. Please update your profile and try again.");
        return;
      }

      const normalizedDistrict = profile.district.trim().toUpperCase();

      const issuePayload = {
        user_id: user.id,
        title: cleanTitle,
        description: cleanDescription,
        district: normalizedDistrict,
        category,
        status: "active",
      };

      const { error: insertError } = await supabase.from("issues").insert([issuePayload]);

      if (insertError) {
        console.error("Insert issue error:", insertError);
        setError(insertError.message || "We could not create your post.");
        return;
      }

      setSuccess("Post created successfully.");

      setTimeout(() => {
        router.push("/feed");
      }, 700);
    } catch (err) {
      console.error("Create post submit error:", err);
      setError("Something went wrong while creating your post.");
    } finally {
      setSubmitting(false);
    }
  }

  const disableReason = loading
    ? "Loading your profile..."
    : submitting
    ? "Creating your post..."
    : !profile?.district
    ? "Your district is missing from your profile."
    : !normalizeWhitespace(title)
    ? "Please enter a title."
    : !normalizeWhitespace(description)
    ? "Please enter a description."
    : "";

  const isDisabled = Boolean(disableReason);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <Sidebar />

        <main className="flex-1 px-4 py-6 md:px-8 lg:px-12">
          <div className="mx-auto max-w-6xl">
            <div className="rounded-[32px] border border-slate-200 bg-white px-6 py-8 shadow-sm md:px-10 md:py-10">
              {loading ? (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-slate-500">Citizen Dashboard</p>
                  <div className="h-12 w-72 animate-pulse rounded-xl bg-slate-100" />
                  <div className="h-8 w-[32rem] max-w-full animate-pulse rounded-xl bg-slate-100" />
                  <div className="mt-8 h-14 animate-pulse rounded-2xl bg-slate-100" />
                  <div className="h-64 animate-pulse rounded-3xl bg-slate-100" />
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Citizen Dashboard</p>
                      <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-slate-950 md:text-6xl">
                        Create Post
                      </h1>
                      <p className="mt-4 max-w-3xl text-xl text-slate-600 md:text-2xl">
                        Start a civic discussion for your district.
                      </p>
                    </div>

                    <div className="inline-flex h-fit rounded-full border border-slate-200 bg-slate-50 px-6 py-4 text-sm font-medium text-slate-500">
                      AI moderation and community discussion intake
                    </div>
                  </div>

                  <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                    <p className="text-sm text-slate-500">Posting in</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">{districtLabel}</p>
                    {profile?.state ? (
                      <p className="mt-1 text-sm text-slate-500">State: {profile.state}</p>
                    ) : null}
                  </div>

                  <div className="mt-8 space-y-8">
                    <div>
                      <label htmlFor="title" className="mb-3 block text-lg font-medium text-slate-800">
                        Title
                      </label>
                      <input
                        id="title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={`Example: Waterlogging issues affecting residents in ${profile?.district ?? "your district"}`}
                        maxLength={120}
                        className="w-full rounded-[28px] border border-slate-300 bg-slate-50 px-7 py-6 text-xl text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
                      />
                      <div className="mt-2 flex items-center justify-between text-sm text-slate-500">
                        <span>Use a specific title so others understand the issue quickly.</span>
                        <span>{title.length}/120</span>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="category" className="mb-3 block text-lg font-medium text-slate-800">
                        Category
                      </label>
                      <select
                        id="category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value as CategoryOption)}
                        className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-5 py-4 text-lg text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                      >
                        <option value="Infrastructure">Infrastructure</option>
                        <option value="Public Safety">Public Safety</option>
                        <option value="Healthcare">Healthcare</option>
                        <option value="Education">Education</option>
                        <option value="Transportation">Transportation</option>
                        <option value="Environment">Environment</option>
                        <option value="Housing">Housing</option>
                        <option value="Community">Community</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="description" className="mb-3 block text-lg font-medium text-slate-800">
                        Description
                      </label>
                      <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe the issue clearly. Include where it is happening, how often it happens, who it affects, and what action residents would like local officials to consider."
                        rows={8}
                        maxLength={1500}
                        className="w-full rounded-[32px] border border-slate-300 bg-slate-50 px-7 py-6 text-xl text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
                      />
                      <div className="mt-2 flex items-center justify-between text-sm text-slate-500">
                        <span>Be clear and specific. This helps community members and officials respond faster.</span>
                        <span>{description.length}/1500</span>
                      </div>
                    </div>

                    {(disableReason || error || success || aiNote) && (
                      <div className="space-y-3">
                        {disableReason && !error ? (
                          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                            {disableReason}
                          </div>
                        ) : null}

                        {error ? (
                          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {error}
                          </div>
                        ) : null}

                        {success ? (
                          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                            {success}
                          </div>
                        ) : null}

                        {aiNote ? (
                          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                            {aiNote}
                          </div>
                        ) : null}
                      </div>
                    )}

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <button
                        type="button"
                        onClick={handleReviewWithAi}
                        disabled={reviewing || submitting}
                        className="inline-flex h-14 items-center justify-center rounded-2xl border border-slate-200 bg-white px-7 text-lg font-semibold text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {reviewing ? "Reviewing..." : "Review with AI"}
                      </button>

                      <button
                        type="button"
                        onClick={handleCreatePost}
                        disabled={isDisabled}
                        className="inline-flex h-14 items-center justify-center rounded-2xl bg-slate-950 px-7 text-lg font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {submitting ? "Creating..." : "Create Post"}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}