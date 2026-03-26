"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type ModerationResponse = {
  toxicity: number;
  spam: number;
  misinformation: number;
  recommendedAction: "Approve" | "Review" | "Block" | "Warn";
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
);

function getActionLabel(action: string) {
  if (action === "Approve") return "SAFE";
  if (action === "Review") return "WARN";
  if (action === "Warn") return "WARN";
  if (action === "Block") return "BLOCK";
  return action.toUpperCase();
}

function getActionClasses(action: string) {
  if (action === "Approve") {
    return "bg-green-100 text-green-700";
  }
  if (action === "Review" || action === "Warn") {
    return "bg-amber-100 text-amber-700";
  }
  if (action === "Block") {
    return "bg-red-100 text-red-700";
  }
  return "bg-slate-100 text-slate-700";
}

function getProgressBarClasses(value: number) {
  if (value >= 0.75) return "bg-red-600";
  if (value >= 0.35) return "bg-amber-500";
  return "bg-slate-700";
}

function buildReasons(result: ModerationResponse) {
  const reasons: string[] = [];

  if (result.toxicity >= 0.35) {
    reasons.push("Potential abusive or hostile language detected.");
  }

  if (result.spam >= 0.35) {
    reasons.push("This content may look promotional or repetitive.");
  }

  if (result.misinformation >= 0.35) {
    reasons.push("This content may contain misleading or unverified claims.");
  }

  if (reasons.length === 0) {
    reasons.push("No major moderation risks were detected.");
  }

  return reasons;
}

export default function CreatePostPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [finalSubmitting, setFinalSubmitting] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [moderationOpen, setModerationOpen] = useState(false);
  const [moderationResult, setModerationResult] =
    useState<ModerationResponse | null>(null);

  const runModeration = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    setModerationResult(null);

    try {
      const moderationResponse = await fetch("/api/moderate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
        }),
      });

      const moderationData = await moderationResponse.json();

      if (!moderationResponse.ok) {
        setErrorMessage(moderationData.error || "Moderation failed.");
        setLoading(false);
        return;
      }

      setModerationResult(moderationData);
      setModerationOpen(true);
    } catch (error) {
      setErrorMessage("Something went wrong while analyzing the issue.");
    }

    setLoading(false);
  };

  const saveIssue = async (forced: boolean = false) => {
    if (!moderationResult) return;

    setFinalSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be logged in to create an issue.");
      setFinalSubmitting(false);
      return;
    }

    const action = moderationResult.recommendedAction;

    if (action === "Block" && !forced) {
      setErrorMessage(
        "This post was blocked by AI moderation and was not submitted."
      );
      setFinalSubmitting(false);
      return;
    }

    const savedStatus =
      action === "Approve"
        ? "Open"
        : action === "Review" || action === "Warn"
        ? "Under Review"
        : forced
        ? "Under Review"
        : "Blocked";

    const savedModerationAction =
      action === "Warn" ? "Review" : action;

    const { error: insertError } = await supabase.from("issues").insert([
      {
        user_id: user.id,
        title,
        description,
        status: savedStatus,
        toxicity_score: moderationResult.toxicity,
        spam_score: moderationResult.spam,
        misinformation_score: moderationResult.misinformation,
        moderation_action: savedModerationAction,
      },
    ]);

    if (insertError) {
      setErrorMessage(insertError.message);
      setFinalSubmitting(false);
      return;
    }

    setModerationOpen(false);
    setSuccessMessage("Issue submitted successfully.");

    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1200);

    setFinalSubmitting(false);
  };

  const closeOverlay = () => {
    setModerationOpen(false);
  };

  const reasons = moderationResult ? buildReasons(moderationResult) : [];

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          Create Civic Issue
        </h1>
        <p className="mt-3 text-lg text-slate-600">
          Submit a concern for your district.
        </p>

        <form onSubmit={runModeration} className="mt-8 space-y-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Title
            </label>
            <input
              type="text"
              placeholder="Enter issue title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              placeholder="Describe the civic issue"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={7}
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
              required
            />
          </div>

          {errorMessage && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {successMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-slate-900 px-4 py-4 text-lg font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Analyzing..." : "Review with AI"}
          </button>
        </form>
      </div>

      {moderationOpen && moderationResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-6">
          <div className="w-full max-w-5xl rounded-[28px] bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">
                  AI Moderation Review
                </h2>
                <p className="mt-2 text-xl text-slate-600">
                  We analyzed this post before submission.
                </p>
              </div>

              <button
                type="button"
                onClick={closeOverlay}
                className="text-xl text-slate-500 hover:text-slate-700"
              >
                Close
              </button>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <span className="text-2xl text-slate-700">
                Recommended action:
              </span>
              <span
                className={`inline-flex rounded-full px-5 py-2 text-2xl font-bold ${getActionClasses(
                  moderationResult.recommendedAction
                )}`}
              >
                {getActionLabel(moderationResult.recommendedAction)}
              </span>
            </div>

            <div className="mt-8 rounded-3xl border border-slate-200 p-6">
              <div className="space-y-8">
                <div>
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <span className="text-2xl text-slate-700">
                      Toxicity Score
                    </span>
                    <span className="text-2xl text-slate-600">
                      {Math.round(moderationResult.toxicity * 100)}%
                    </span>
                  </div>
                  <div className="h-4 w-full rounded-full bg-slate-200">
                    <div
                      className={`h-4 rounded-full ${getProgressBarClasses(
                        moderationResult.toxicity
                      )}`}
                      style={{
                        width: `${Math.round(moderationResult.toxicity * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <span className="text-2xl text-slate-700">Spam Risk</span>
                    <span className="text-2xl text-slate-600">
                      {Math.round(moderationResult.spam * 100)}%
                    </span>
                  </div>
                  <div className="h-4 w-full rounded-full bg-slate-200">
                    <div
                      className={`h-4 rounded-full ${getProgressBarClasses(
                        moderationResult.spam
                      )}`}
                      style={{
                        width: `${Math.round(moderationResult.spam * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <span className="text-2xl text-slate-700">
                      Misinformation Risk
                    </span>
                    <span className="text-2xl text-slate-600">
                      {Math.round(moderationResult.misinformation * 100)}%
                    </span>
                  </div>
                  <div className="h-4 w-full rounded-full bg-slate-200">
                    <div
                      className={`h-4 rounded-full ${getProgressBarClasses(
                        moderationResult.misinformation
                      )}`}
                      style={{
                        width: `${Math.round(
                          moderationResult.misinformation * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-3xl bg-slate-50 p-6">
              <h3 className="text-2xl font-bold text-slate-900">
                Why this was flagged
              </h3>
              <ul className="mt-4 list-disc space-y-2 pl-6 text-xl text-slate-700">
                {reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setModerationOpen(false);
                }}
                className="rounded-2xl border border-slate-300 px-5 py-3 text-base font-medium text-slate-700 hover:bg-slate-50"
              >
                Edit Post
              </button>

              <button
                type="button"
                onClick={() => {
                  setModerationOpen(false);
                  setErrorMessage("Submission cancelled.");
                }}
                className="rounded-2xl border border-red-300 px-5 py-3 text-base font-medium text-red-700 hover:bg-red-50"
              >
                Cancel
              </button>

              {moderationResult.recommendedAction === "Block" ? (
                <button
                  type="button"
                  disabled
                  className="rounded-2xl bg-slate-300 px-5 py-3 text-base font-medium text-white cursor-not-allowed"
                >
                  Blocked by AI
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => saveIssue()}
                  disabled={finalSubmitting}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-base font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {finalSubmitting ? "Submitting..." : "Submit Anyway"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}