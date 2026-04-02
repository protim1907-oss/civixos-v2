"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/layout/Sidebar";

type UploadedFile = {
  name: string;
  size: string;
  type: string;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PolicyPulsePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadMessage, setUploadMessage] = useState("");

  const handleOpenFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      setUploadMessage("");
      return;
    }

    const mappedFiles: UploadedFile[] = Array.from(files).map((file) => ({
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type || "Unknown file type",
    }));

    setUploadedFiles(mappedFiles);
    setUploadMessage(
      `${mappedFiles.length} file${mappedFiles.length > 1 ? "s" : ""} selected successfully.`
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <main className="flex-1 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
            <h1 className="text-3xl font-bold text-slate-900">Policy Pulse</h1>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              Test policies before they become decisions. Policy Pulse lets you
              run quick surveys, capture citizen sentiment, and identify key
              concerns. Get instant insights on support levels, risks, and
              recommendations. Make smarter, faster policy decisions.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() => router.push("/create-post")}
                className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
              >
                Launch Survey
              </button>

              <button
                onClick={() => router.push("/feed")}
                className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                View Responses
              </button>
            </div>
          </div>

          <div className="mb-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border-l-4 border-yellow-500 bg-yellow-50 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Quick Policy Testing
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Run focused surveys to validate public sentiment before policy
                rollout.
              </p>
            </div>

            <div className="rounded-2xl border-l-4 border-blue-500 bg-blue-50 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Citizen Sentiment
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Capture support levels, concerns, and recommendations in one
                place.
              </p>
            </div>

            <div className="rounded-2xl border-l-4 border-red-500 bg-red-50 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Risk Visibility
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Surface public concerns early so teams can respond before issues
                escalate.
              </p>
            </div>

            <div className="rounded-2xl border-l-4 border-green-500 bg-green-50 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Actionable Insights
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Turn feedback into decisions, communication plans, and next-step
                actions.
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                Upload Policy Summary
              </h2>
              <p className="mt-2 text-slate-600">
                Add a short and clear overview of the policy so citizens can
                understand the issue before responding.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                onClick={handleOpenFilePicker}
                className="mt-6 w-full rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 p-8 text-center transition hover:border-blue-500 hover:bg-blue-100"
              >
                <div className="mx-auto max-w-md">
                  <p className="text-lg font-semibold text-slate-900">
                    Upload Policy Summary
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Click here to choose one or more files from your computer.
                  </p>
                  <div className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white">
                    Select Files
                  </div>
                </div>
              </button>

              {uploadMessage && (
                <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {uploadMessage}
                </div>
              )}

              {uploadedFiles.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Uploaded Files
                  </h3>

                  <div className="mt-4 space-y-3">
                    {uploadedFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                      >
                        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {file.name}
                            </p>
                            <p className="text-sm text-slate-600">
                              {file.type}
                            </p>
                          </div>
                          <span className="text-sm font-medium text-slate-700">
                            {file.size}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                Survey Snapshot
              </h2>

              <div className="mt-5 space-y-4">
                <div className="rounded-xl border-l-4 border-yellow-500 bg-yellow-50 p-4">
                  <p className="text-sm text-slate-500">Questions</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">3–4</p>
                </div>

                <div className="rounded-xl border-l-4 border-blue-500 bg-blue-50 p-4">
                  <p className="text-sm text-slate-500">Sentiment Tracking</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    Real-time
                  </p>
                </div>

                <div className="rounded-xl border-l-4 border-red-500 bg-red-50 p-4">
                  <p className="text-sm text-slate-500">Risk Monitoring</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    Concerns
                  </p>
                </div>

                <div className="rounded-xl border-l-4 border-green-500 bg-green-50 p-4">
                  <p className="text-sm text-slate-500">Outcome</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    Insights
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              Recent Survey Responses
            </h2>
            <p className="mt-2 text-slate-600">
              View citizen feedback, key concerns, and overall support levels as
              survey responses come in.
            </p>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700">
                      Citizen
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700">
                      Support Level
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700">
                      Top Concern
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700">
                      Recommendation
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-3 text-sm text-slate-600">
                      Citizen A
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      Supportive
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      Budget clarity
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      Share more cost details
                    </td>
                  </tr>

                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-3 text-sm text-slate-600">
                      Citizen B
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      Neutral
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      Implementation timeline
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      Run a phased rollout
                    </td>
                  </tr>

                  <tr>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      Citizen C
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      Concerned
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      Access and fairness
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      Add safeguards for vulnerable groups
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}