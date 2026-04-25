"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import {
  initialVotes,
  PolicyPulseSurvey,
  PolicyPulseUploadedFile,
  upsertPolicyPulseSurvey,
} from "@/lib/policy-pulse";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function NewPolicyPulseSurveyPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState("");
  const [district, setDistrict] = useState("");
  const [summary, setSummary] = useState("");
  const [primaryQuestion, setPrimaryQuestion] = useState(
    "Do you support this policy proposal for your district?"
  );
  const [deadline, setDeadline] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<PolicyPulseUploadedFile[]>([]);
  const [error, setError] = useState("");

  const isReady = useMemo(() => {
    return (
      Boolean(title.trim()) &&
      Boolean(district.trim()) &&
      Boolean(summary.trim()) &&
      Boolean(primaryQuestion.trim()) &&
      Boolean(deadline.trim())
    );
  }, [title, district, summary, primaryQuestion, deadline]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;

    if (!files || files.length === 0) {
      setUploadedFiles([]);
      return;
    }

    setUploadedFiles(
      Array.from(files).map((file) => ({
        name: file.name,
        size: formatFileSize(file.size),
        type: file.type || "Unknown file type",
      }))
    );
  }

  function handleLaunchSurvey() {
    setError("");

    if (!isReady) {
      setError("Please complete the survey title, district, summary, question, and deadline.");
      return;
    }

    const survey: PolicyPulseSurvey = {
      id: `survey-${Date.now()}`,
      title: title.trim(),
      district: district.trim().toUpperCase(),
      summary: summary.trim(),
      primaryQuestion: primaryQuestion.trim(),
      deadline,
      uploadedFiles,
      createdAt: new Date().toISOString(),
      votes: { ...initialVotes },
      recentResponses: [],
    };

    upsertPolicyPulseSurvey(survey);
    router.push(`/policy-pulse?survey=${encodeURIComponent(survey.id)}&created=1`);
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <main className="flex-1 p-6">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              Policy Pulse
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Launch A New Survey
            </h1>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              Create a focused policy survey for a district, attach the summary materials,
              and publish it so residents can respond with support levels, concerns, and
              recommendations.
            </p>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Survey Builder</h2>

              <div className="mt-6 grid gap-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Survey title
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Example: Downtown Transit Safety Plan"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Target district
                    </label>
                    <input
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="TX-35 or CA-42"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Response deadline
                    </label>
                    <input
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Policy summary
                  </label>
                  <textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    rows={7}
                    placeholder="Summarize the proposal, why it matters, who it affects, and what decision is being considered."
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Primary survey question
                  </label>
                  <input
                    value={primaryQuestion}
                    onChange={(e) => setPrimaryQuestion(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block text-sm font-semibold text-slate-700">
                      Policy attachments
                    </label>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Add Files
                    </button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                    Upload briefs, slide decks, one-pagers, or draft policy summaries for
                    residents to reference before voting.
                  </div>

                  {uploadedFiles.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {uploadedFiles.map((file) => (
                        <div
                          key={`${file.name}-${file.size}`}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-3"
                        >
                          <p className="font-semibold text-slate-900">{file.name}</p>
                          <p className="text-sm text-slate-600">
                            {file.type} • {file.size}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                {error ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleLaunchSurvey}
                    className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
                  >
                    Publish Survey
                  </button>

                  <button
                    onClick={() => router.push("/policy-pulse")}
                    className="rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </section>

            <aside className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">What Happens Next</h2>

              <div className="mt-5 space-y-4 text-sm leading-7 text-slate-700">
                <div className="rounded-xl border-l-4 border-blue-500 bg-blue-50 p-4">
                  Publish a district survey with a clear policy summary and a response
                  deadline.
                </div>
                <div className="rounded-xl border-l-4 border-yellow-500 bg-yellow-50 p-4">
                  Residents will be able to vote, flag top concerns, and recommend next
                  steps.
                </div>
                <div className="rounded-xl border-l-4 border-green-500 bg-green-50 p-4">
                  Policy Pulse will aggregate support levels, trendlines, and recent
                  feedback on the main page.
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
