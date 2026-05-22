"use client";

import { CheckCircle2, Circle, Clock3 } from "lucide-react";

type IssueLifecycleProps = {
  status?: string | null;
  compact?: boolean;
};

const lifecycleSteps = [
  {
    key: "submitted",
    label: "Submitted",
    description: "Resident issue received",
  },
  {
    key: "under_review",
    label: "Under Review",
    description: "Moderation or staff review",
  },
  {
    key: "sent_to_official",
    label: "Sent to Official",
    description: "Visible for official action",
  },
  {
    key: "response_received",
    label: "Response Received",
    description: "Official update posted",
  },
  {
    key: "resolved",
    label: "Resolved",
    description: "Closed or approved",
  },
] as const;

function getLifecycleIndex(status?: string | null) {
  const normalized = String(status || "active").trim().toLowerCase();

  if (["resolved", "approved", "completed", "closed"].includes(normalized)) return 4;
  if (["acknowledged", "needs_info", "needs info"].includes(normalized)) return 3;
  if (["under_review", "under review", "escalated"].includes(normalized)) return 2;
  if (["active", "open", "new"].includes(normalized)) return 0;
  if (normalized === "removed") return 1;
  return 0;
}

function getCurrentLabel(status?: string | null) {
  const normalized = String(status || "active").trim().toLowerCase();

  if (normalized === "needs_info" || normalized === "needs info") {
    return "Official requested more information";
  }
  if (normalized === "acknowledged") return "Official response received";
  if (normalized === "under_review" || normalized === "under review") return "Under review";
  if (normalized === "escalated") return "Sent to official review";
  if (normalized === "approved") return "Resolved";
  if (normalized === "removed") return "Removed after review";
  return "Submitted";
}

export default function IssueLifecycle({ status, compact = false }: IssueLifecycleProps) {
  const currentIndex = getLifecycleIndex(status);
  const currentLabel = getCurrentLabel(status);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-slate-900">Issue lifecycle</p>
        <p className="text-xs font-medium text-slate-500">{currentLabel}</p>
      </div>

      <div className={`mt-4 grid gap-3 ${compact ? "sm:grid-cols-5" : "md:grid-cols-5"}`}>
        {lifecycleSteps.map((step, index) => {
          const complete = index < currentIndex;
          const active = index === currentIndex;
          const Icon = complete ? CheckCircle2 : active ? Clock3 : Circle;

          return (
            <div key={step.key} className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                    complete
                      ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                      : active
                      ? "border-blue-200 bg-blue-100 text-blue-700"
                      : "border-slate-200 bg-white text-slate-400"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p
                    className={`truncate text-xs font-bold ${
                      complete || active ? "text-slate-900" : "text-slate-400"
                    }`}
                  >
                    {step.label}
                  </p>
                  {!compact && (
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-slate-500">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>

              {index < lifecycleSteps.length - 1 && (
                <div
                  className={`ml-4 mt-2 hidden h-1 rounded-full md:block ${
                    index < currentIndex ? "bg-emerald-300" : "bg-slate-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
