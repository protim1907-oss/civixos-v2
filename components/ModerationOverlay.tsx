// components/ModerationOverlay.tsx

"use client";

import { ModerationResult } from "@/lib/moderation";

type Props = {
  open: boolean;
  loading?: boolean;
  result: ModerationResult | null;
  onClose: () => void;
  onProceed: () => void;
  onEdit: () => void;
};

function getBadgeClass(action?: string) {
  switch (action) {
    case "APPROVE":
      return "bg-green-100 text-green-700";
    case "REVIEW":
      return "bg-yellow-100 text-yellow-700";
    case "WARN":
      return "bg-orange-100 text-orange-700";
    case "BLOCK":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function RiskBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-600">{value}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-200">
        <div
          className="h-2 rounded-full bg-slate-700 transition-all"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default function ModerationOverlay({
  open,
  loading = false,
  result,
  onClose,
  onProceed,
  onEdit,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">AI Moderation Review</h2>
            <p className="mt-1 text-sm text-slate-600">
              We analyzed this post before submission.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-sm text-slate-500 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        {loading && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            Analyzing post content...
          </div>
        )}

        {!loading && result && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-700">Recommended action:</span>
              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold ${getBadgeClass(
                  result.action
                )}`}
              >
                {result.action}
              </span>
            </div>

            <div className="space-y-4 rounded-xl border border-slate-200 p-4">
              <RiskBar label="Toxicity Score" value={result.toxicityScore} />
              <RiskBar label="Spam Risk" value={result.spamScore} />
              <RiskBar label="Misinformation Risk" value={result.misinformationScore} />
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-800">Why this was flagged</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                {result.reasons.map((reason, index) => (
                  <li key={index}>{reason}</li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={onEdit}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Edit Post
              </button>

              {result.action !== "BLOCK" && (
                <button
                  onClick={onProceed}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Submit Anyway
                </button>
              )}

              {result.action === "BLOCK" && (
                <div className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">
                  Submission blocked. Please revise your post.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}