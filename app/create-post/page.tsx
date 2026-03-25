"use client";

import { useState } from "react";
import ModerationOverlay from "@/components/ModerationOverlay";
import { ModerationResult } from "@/lib/moderation";
import { supabase } from "@/lib/supabase";

export default function CreateIssuePage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [loadingModeration, setLoadingModeration] = useState(false);
  const [moderationOpen, setModerationOpen] = useState(false);
  const [moderationResult, setModerationResult] = useState<ModerationResult | null>(null);

  async function handleCheckModeration(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      alert("Please enter both title and description.");
      return;
    }

    setLoadingModeration(true);
    setModerationOpen(true);
    setModerationResult(null);

    try {
      const res = await fetch("/api/moderate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error("Moderation API request failed.");
      }

      const data: ModerationResult = await res.json();
      setModerationResult(data);
    } catch (error) {
      console.error("Moderation error:", error);
      setModerationResult({
        toxicityScore: 0,
        spamScore: 0,
        misinformationScore: 0,
        action: "REVIEW",
        reasons: ["Moderation service temporarily unavailable. Manual review recommended."],
      });
    } finally {
      setLoadingModeration(false);
    }
  }

  async function submitPostToDatabase() {
    try {
      if (!moderationResult) {
        alert("Please analyze the post before submitting.");
        return;
      }

      if (moderationResult.action === "BLOCK") {
        alert("This post is blocked. Please edit it before submitting.");
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("User fetch error:", userError);
        alert("Could not verify the logged-in user.");
        return;
      }

      if (!user) {
        alert("You must be logged in to submit an issue.");
        return;
      }

      const status =
        moderationResult.action === "APPROVE" ? "published" : "pending_review";

      const { error } = await supabase.from("issues").insert({
        title: title.trim(),
        description: description.trim(),
        user_id: user.id,
        status,
        moderation_action: moderationResult.action,
        toxicity_score: moderationResult.toxicityScore,
        spam_score: moderationResult.spamScore,
        misinformation_score: moderationResult.misinformationScore,
        moderation_reasons: moderationResult.reasons,
      });

      if (error) {
        console.error("Supabase insert error:", error);
        alert(error.message || "Failed to submit post.");
        return;
      }

      alert(
        status === "published"
          ? "Post submitted and published successfully."
          : "Post submitted successfully and sent for review."
      );

      setModerationOpen(false);
      setModerationResult(null);
      setTitle("");
      setDescription("");
    } catch (error) {
      console.error("Submit failed:", error);
      alert("Failed to submit post.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Create Civic Issue</h1>
        <p className="mt-2 text-sm text-slate-600">
          Submit a concern for your district.
        </p>

        <form onSubmit={handleCheckModeration} className="mt-6 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Title
            </label>
            <input
              type="text"
              placeholder="Enter issue title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
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
              rows={6}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loadingModeration}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingModeration ? "Analyzing..." : "Analyze Before Submit"}
          </button>
        </form>
      </div>

      <ModerationOverlay
        open={moderationOpen}
        loading={loadingModeration}
        result={moderationResult}
        onClose={() => setModerationOpen(false)}
        onEdit={() => setModerationOpen(false)}
        onProceed={submitPostToDatabase}
      />
    </div>
  );
}