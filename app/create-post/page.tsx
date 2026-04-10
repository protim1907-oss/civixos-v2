"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import Sidebar from "@/components/layout/Sidebar";

type AiReview = {
  severity: "Low" | "Medium" | "High";
  category: string;
  suggestedTitle: string;
  summary: string;
  recommendedAction: "Approve" | "Review" | "Block";
  toxicityScore: number;
  spamScore: number;
  misinformationScore: number;
  overallScore: number;
};

export default function CreateIssuePage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [aiReview, setAiReview] = useState<AiReview | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadAuth() {
      setCheckingAuth(true);

      const { data } = await supabase.auth.getSession();
      const session = data?.session;

      if (!mounted) return;

      setUser(session?.user ?? null);
      setCheckingAuth(false);
    }

    loadAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setCheckingAuth(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const canReview = useMemo(() => {
    return title.trim().length > 0 || description.trim().length > 0;
  }, [title, description]);

  function getSeverityFromOverallScore(score: number): "Low" | "Medium" | "High" {
    if (score >= 70) return "High";
    if (score >= 35) return "Medium";
    return "Low";
  }

  function getRecommendedActionFromScores(
    toxicityScore: number,
    spamScore: number,
    misinformationScore: number,
    overallScore: number
  ): "Approve" | "Review" | "Block" {
    if (
      toxicityScore >= 80 ||
      spamScore >= 80 ||
      misinformationScore >= 85 ||
      overallScore >= 85
    ) {
      return "Block";
    }

    if (
      toxicityScore >= 35 ||
      spamScore >= 35 ||
      misinformationScore >= 40 ||
      overallScore >= 40
    ) {
      return "Review";
    }

    return "Approve";
  }

  function runAiReview() {
    setErrorMessage("");
    setSuccessMessage("");

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle && !trimmedDescription) {
      setErrorMessage("Please add a title or description before using Review with AI.");
      return;
    }

    setIsReviewing(true);

    const combined = `${trimmedTitle} ${trimmedDescription}`.toLowerCase();

    let toxicityScore = 5;
    let spamScore = 4;
    let misinformationScore = 6;
    let category = "General civic issue";
    let summary =
      "This issue appears to describe a civic concern that may require local review and follow-up.";
    let suggestedTitle = trimmedTitle || "Civic issue report";

    if (
      combined.includes("drain") ||
      combined.includes("overflow") ||
      combined.includes("waterlogging") ||
      combined.includes("flood") ||
      combined.includes("sewage")
    ) {
      toxicityScore = 4;
      spamScore = 3;
      misinformationScore = 14;
      category = "Drainage and flooding";
      summary =
        "The report points to recurring drainage overflow and waterlogging, which may present sanitation and public health risks.";
      if (!trimmedTitle) suggestedTitle = "Waterlogging in District 12";
    } else if (
      combined.includes("road") ||
      combined.includes("pothole") ||
      combined.includes("traffic")
    ) {
      toxicityScore = 3;
      spamScore = 2;
      misinformationScore = 10;
      category = "Transportation";
      summary =
        "The issue suggests road or traffic conditions that may require inspection and public works follow-up.";
    } else if (
      combined.includes("garbage") ||
      combined.includes("waste") ||
      combined.includes("trash")
    ) {
      toxicityScore = 3;
      spamScore = 2;
      misinformationScore = 9;
      category = "Environment";
      summary =
        "The issue appears related to sanitation or waste handling and may require cleanup and district monitoring.";
    } else if (
      combined.includes("crime") ||
      combined.includes("unsafe") ||
      combined.includes("assault")
    ) {
      toxicityScore = 6;
      spamScore = 2;
      misinformationScore = 12;
      category = "Safety";
      summary =
        "The issue appears connected to resident safety and may need escalation to the relevant district authority.";
    } else {
      category = "Infrastructure";
    }

    if (
      combined.includes("urgent") ||
      combined.includes("immediately") ||
      combined.includes("danger") ||
      combined.includes("health risk")
    ) {
      misinformationScore += 6;
    }

    if (
      combined.includes("idiot") ||
      combined.includes("stupid") ||
      combined.includes("kill") ||
      combined.includes("hate")
    ) {
      toxicityScore += 45;
    }

    if (
      combined.includes("buy now") ||
      combined.includes("click here") ||
      combined.includes("http://") ||
      combined.includes("https://") ||
      combined.includes("whatsapp group")
    ) {
      spamScore += 55;
    }

    if (
      combined.includes("everyone is dying") ||
      combined.includes("government poisoned") ||
      combined.includes("100% guaranteed coverup")
    ) {
      misinformationScore += 45;
    }

    toxicityScore = Math.min(toxicityScore, 100);
    spamScore = Math.min(spamScore, 100);
    misinformationScore = Math.min(misinformationScore, 100);

    const overallScore = Math.round(
      toxicityScore * 0.35 + spamScore * 0.25 + misinformationScore * 0.4
    );

    const severity = getSeverityFromOverallScore(overallScore);
    const recommendedAction = getRecommendedActionFromScores(
      toxicityScore,
      spamScore,
      misinformationScore,
      overallScore
    );

    setTimeout(() => {
      setAiReview({
        severity,
        category,
        suggestedTitle,
        summary,
        recommendedAction,
        toxicityScore,
        spamScore,
        misinformationScore,
        overallScore,
      });
      setIsReviewing(false);
    }, 400);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle || !trimmedDescription) {
      setErrorMessage("Please complete both the title and description.");
      return;
    }

    setIsSubmitting(true);

    const { data, error: sessionError } = await supabase.auth.getSession();
    const session = data?.session;

    if (sessionError) {
      setErrorMessage("Could not verify your login session. Please refresh and try again.");
      setIsSubmitting(false);
      return;
    }

    const currentUser = session?.user ?? null;

    if (!currentUser) {
      setErrorMessage("You must be logged in to create an issue.");
      setIsSubmitting(false);
      return;
    }

    const payload = {
      title: trimmedTitle,
      description: trimmedDescription,
      user_id: currentUser.id,
      status: aiReview?.recommendedAction === "Approve" ? "open" : "under_review",
      category: aiReview?.category ?? "Infrastructure",
      district:
        currentUser.user_metadata?.district_id ||
        currentUser.user_metadata?.district ||
        currentUser.user_metadata?.district_name ||
        "District 12",
    };

    const { error } = await supabase.from("issues").insert([payload]);

    if (error) {
      console.error("Insert error:", error);
      setErrorMessage(error.message || "Failed to create issue.");
      setIsSubmitting(false);
      return;
    }

    setSuccessMessage("Issue created successfully.");
    setTitle("");
    setDescription("");
    setAiReview(null);
    setIsSubmitting(false);

    setTimeout(() => {
      router.push("/dashboard");
    }, 1000);
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <main className="flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-6 shadow-sm md:px-8 md:py-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Citizen Dashboard</p>
                <h1 className="text-3xl font-bold tracking-tight text-slate-950 md:text-5xl">
                  Create Civic Issue
                </h1>
                <p className="mt-3 text-lg text-slate-600 md:text-2xl">
                  Submit a concern for your district.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                AI moderation and civic issue intake
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-7">
              <div>
                <label
                  htmlFor="title"
                  className="mb-3 block text-lg font-medium text-slate-700"
                >
                  Title
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Waterlogging in District 12"
                  className="w-full rounded-[20px] border border-slate-300 bg-slate-50 px-5 py-4 text-lg text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white md:text-xl"
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="mb-3 block text-lg font-medium text-slate-700"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Residents in District 12 are reporting frequent drain overflows, leading to waterlogging, foul odor, and potential health risks..."
                  className="w-full rounded-[20px] border border-slate-300 bg-slate-50 px-5 py-4 text-lg leading-relaxed text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white md:text-xl"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={runAiReview}
                  disabled={!canReview || isReviewing}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isReviewing ? "Reviewing..." : "Review with AI"}
                </button>

                <button
                  type="submit"
                  disabled={checkingAuth || isSubmitting}
                  className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Submitting..." : "Create Issue"}
                </button>
              </div>

              {checkingAuth && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-base text-slate-600">
                  Checking login status...
                </div>
              )}

              {!checkingAuth && !user && !errorMessage && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-base text-red-700">
                  You must be logged in to create an issue.
                </div>
              )}

              {errorMessage && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-base text-red-700">
                  {errorMessage}
                </div>
              )}

              {successMessage && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-base text-emerald-700">
                  {successMessage}
                </div>
              )}

              {aiReview && (
                <div className="rounded-[20px] border border-blue-200 bg-blue-50 p-5">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                      AI Review
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                      Severity: {aiReview.severity}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                      Category: {aiReview.category}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                      Action: {aiReview.recommendedAction}
                    </span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-xs font-semibold text-slate-500">Toxicity</p>
                      <p className="mt-1 text-lg font-bold text-slate-900">
                        {aiReview.toxicityScore}/100
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-xs font-semibold text-slate-500">Spam</p>
                      <p className="mt-1 text-lg font-bold text-slate-900">
                        {aiReview.spamScore}/100
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-xs font-semibold text-slate-500">Misinformation</p>
                      <p className="mt-1 text-lg font-bold text-slate-900">
                        {aiReview.misinformationScore}/100
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-xs font-semibold text-slate-500">Overall Score</p>
                      <p className="mt-1 text-lg font-bold text-slate-900">
                        {aiReview.overallScore}/100
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3 text-sm text-slate-700">
                    <div>
                      <p className="font-semibold text-slate-900">Suggested title</p>
                      <p>{aiReview.suggestedTitle}</p>
                    </div>

                    <div>
                      <p className="font-semibold text-slate-900">Summary</p>
                      <p>{aiReview.summary}</p>
                    </div>

                    <div>
                      <p className="font-semibold text-slate-900">Recommended action</p>
                      <p>{aiReview.recommendedAction}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (aiReview.suggestedTitle && !title.trim()) {
                          setTitle(aiReview.suggestedTitle);
                        }
                      }}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Use suggested title
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}