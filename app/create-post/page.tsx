"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type ModerationResponse = {
  toxicity: number;
  spam: number;
  misinformation: number;
  recommendedAction: "Approve" | "Review" | "Block";
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
);

export default function CreatePostPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [moderationResult, setModerationResult] =
    useState<ModerationResponse | null>(null);

  const handleReview = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    setModerationResult(null);

    try {
      const response = await fetch("/api/moderate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, description }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || "Moderation failed.");
        setLoading(false);
        return;
      }

      setModerationResult(data);
      setShowOverlay(true);
    } catch (error) {
      setErrorMessage("Could not run AI moderation.");
    }

    setLoading(false);
  };

  const handleSubmitIssue = async () => {
    if (!moderationResult) return;

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMessage("You must be logged in to create an issue.");
        setLoading(false);
        return;
      }

      if (moderationResult.recommendedAction === "Block") {
        setErrorMessage("This issue was blocked by AI moderation.");
        setLoading(false);
        return;
      }

      const status =
        moderationResult.recommendedAction === "Approve"
          ? "Open"
          : "Under Review";

      const { error } = await supabase.from("issues").insert([
        {
          user_id: user.id,
          title,
          description,
          status,
          toxicity_score: moderationResult.toxicity,
          spam_score: moderationResult.spam,
          misinformation_score: moderationResult.misinformation,
          moderation_action: moderationResult.recommendedAction,
        },
      ]);

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      setSuccessMessage("Issue submitted successfully.");
      setShowOverlay(false);

      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1000);
    } catch (error) {
      setErrorMessage("Something went wrong while saving the issue.");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          Create Civic Issue
        </h1>
        <p className="mt-3 text-lg text-slate-600">
          Submit a concern for your district.
        </p>

        <form onSubmit={handleReview} className="mt-8 space-y-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter issue title"
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the civic issue"
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
            {loading ? "Reviewing..." : "Review with AI"}
          </button>
        </form>
      </div>

      {showOverlay && moderationResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
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
                onClick={() => setShowOverlay(false)}
                className="text-xl text-slate-500 hover:text-slate-700"
              >
                Close
              </button>
            </div>

            <div className="mt-8 rounded-3xl border border-slate-200 p-6">
              <div className="space-y-6 text-xl text-slate-700">
                <div className="flex items-center justify-between">
                  <span>Toxicity Score</span>
                  <span className="font-medium text-slate-900">
                    {Math.round(moderationResult.toxicity * 100)}%
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span>Spam Risk</span>
                  <span className="font-medium text-slate-900">
                    {Math.round(moderationResult.spam * 100)}%
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span>Misinformation Risk</span>
                  <span className="font-medium text-slate-900">
                    {Math.round(moderationResult.misinformation * 100)}%
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                  <span>Recommended action</span>
                  <span className="font-semibold text-slate-900">
                    {moderationResult.recommendedAction}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowOverlay(false)}
                className="rounded-2xl border border-slate-300 px-5 py-3 text-base font-medium text-slate-700 hover:bg-slate-50"
              >
                Edit Post
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowOverlay(false);
                  setErrorMessage("Submission cancelled.");
                }}
                className="rounded-2xl border border-red-300 px-5 py-3 text-base font-medium text-red-700 hover:bg-red-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmitIssue}
                disabled={loading || moderationResult.recommendedAction === "Block"}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-base font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {moderationResult.recommendedAction === "Block"
                  ? "Blocked by AI"
                  : moderationResult.recommendedAction === "Approve"
                  ? "Submit Issue"
                  : "Submit Anyway"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}