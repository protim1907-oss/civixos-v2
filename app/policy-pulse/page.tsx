"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/layout/Sidebar";

type UploadedFile = {
  name: string;
  size: string;
  type: string;
};

type VoteOption =
  | "Strongly Support"
  | "Support"
  | "Neutral"
  | "Oppose"
  | "Strongly Oppose";

type TrendPoint = {
  concern: string;
  supportScore: number;
};

const voteOptions: VoteOption[] = [
  "Strongly Support",
  "Support",
  "Neutral",
  "Oppose",
  "Strongly Oppose",
];

const initialVotes: Record<VoteOption, number> = {
  "Strongly Support": 24,
  Support: 18,
  Neutral: 9,
  Oppose: 6,
  "Strongly Oppose": 3,
};

const trendData: TrendPoint[] = [
  { concern: "Budget Clarity", supportScore: 78 },
  { concern: "Access & Fairness", supportScore: 64 },
  { concern: "Implementation Timeline", supportScore: 58 },
  { concern: "Data Privacy", supportScore: 71 },
  { concern: "Service Quality", supportScore: 83 },
];

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getSentimentSummary(votes: Record<VoteOption, number>) {
  const positive = votes["Strongly Support"] + votes["Support"];
  const neutral = votes["Neutral"];
  const negative = votes["Oppose"] + votes["Strongly Oppose"];

  if (positive > negative && positive > neutral) {
    return "Generally Supportive";
  }
  if (negative > positive && negative > neutral) {
    return "Generally Negative";
  }
  return "Mixed / Neutral";
}

export default function PolicyPulsePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadMessage, setUploadMessage] = useState("");
  const [selectedVote, setSelectedVote] = useState<VoteOption>("Neutral");
  const [voteSubmittedMessage, setVoteSubmittedMessage] = useState("");
  const [votes, setVotes] = useState<Record<VoteOption, number>>(initialVotes);

  const totalVotes = useMemo(
    () => Object.values(votes).reduce((sum, count) => sum + count, 0),
    [votes]
  );

  const generalSentiment = useMemo(() => getSentimentSummary(votes), [votes]);

  const chartData = useMemo(() => {
    return voteOptions.map((option) => {
      const value = votes[option];
      const percentage = totalVotes > 0 ? (value / totalVotes) * 100 : 0;
      return {
        label: option,
        value,
        percentage,
        barClass:
          option === "Strongly Support"
            ? "bg-green-600"
            : option === "Support"
            ? "bg-green-400"
            : option === "Neutral"
            ? "bg-yellow-400"
            : option === "Oppose"
            ? "bg-red-400"
            : "bg-red-600",
      };
    });
  }, [votes, totalVotes]);

  const linePoints = useMemo(() => {
    if (trendData.length === 0) return "";

    const maxX = trendData.length - 1;
    const points = trendData.map((item, index) => {
      const x = maxX === 0 ? 0 : (index / maxX) * 100;
      const y = 100 - item.supportScore;
      return `${x},${y}`;
    });

    return points.join(" ");
  }, []);

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
      `${mappedFiles.length} file${mappedFiles.length > 1 ? "s" : ""} uploaded Successfully.`
    );
  };

  const handleVoteSubmit = () => {
    setVotes((prev) => ({
      ...prev,
      [selectedVote]: prev[selectedVote] + 1,
    }));
    setVoteSubmittedMessage(`Your vote has been recorded as "${selectedVote}".`);
  };

  const handleViewUploadedDocument = (fileName: string) => {
    alert(`Preview for "${fileName}" can be connected here.`);
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
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {file.name}
                            </p>
                            <p className="text-sm text-slate-600">
                              {file.type}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-slate-700">
                              {file.size}
                            </span>

                            <button
                              onClick={() => handleViewUploadedDocument(file.name)}
                              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                              View Uploaded Document
                            </button>
                          </div>
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
                  <p className="text-sm text-slate-500">Total Votes Received</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {totalVotes}
                  </p>
                </div>

                <div className="rounded-xl border-l-4 border-blue-500 bg-blue-50 p-4">
                  <p className="text-sm text-slate-500">General Sentiment</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {generalSentiment}
                  </p>
                </div>

                <div className="rounded-xl border-l-4 border-red-500 bg-red-50 p-4">
                  <p className="text-sm text-slate-500">Top Concern</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    Budget / Access
                  </p>
                </div>

                <div className="rounded-xl border-l-4 border-green-500 bg-green-50 p-4">
                  <p className="text-sm text-slate-500">Recommended Action</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    Continue Consultation
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                Cast Your Vote
              </h2>
              <p className="mt-2 text-slate-600">
                Select your position on this policy and submit your response.
              </p>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Voting Option
                </label>
                <select
                  value={selectedVote}
                  onChange={(e) => setSelectedVote(e.target.value as VoteOption)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-500"
                >
                  {voteOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleVoteSubmit}
                  className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700"
                >
                  Submit Vote
                </button>

                {voteSubmittedMessage && (
                  <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {voteSubmittedMessage}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                Citizen Sentiment Chart
              </h2>
              <p className="mt-2 text-slate-600">
                View how citizens are voting across all response categories.
              </p>

              <div className="mt-6 space-y-5">
                {chartData.map((item) => (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">
                        {item.label}
                      </span>
                      <span className="text-slate-600">
                        {item.value} votes ({item.percentage.toFixed(1)}%)
                      </span>
                    </div>

                    <div className="h-4 w-full rounded-full bg-slate-200">
                      <div
                        className={`h-4 rounded-full ${item.barClass} transition-all duration-500`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
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

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="overflow-x-auto">
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

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-lg font-semibold text-slate-900">
                  Top Concerns vs Support Levels
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  This trendline shows how citizen support changes across the
                  main concerns raised in the survey.
                </p>

                <div className="mt-6">
                  <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
                    <span>Lower Support</span>
                    <span>Higher Support</span>
                  </div>

                  <div className="rounded-xl bg-white p-4 shadow-sm">
                    <svg viewBox="0 0 100 100" className="h-64 w-full">
                      <line
                        x1="0"
                        y1="100"
                        x2="100"
                        y2="100"
                        stroke="#cbd5e1"
                        strokeWidth="0.8"
                      />
                      <line
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="100"
                        stroke="#cbd5e1"
                        strokeWidth="0.8"
                      />

                      <polyline
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="2"
                        points={linePoints}
                      />

                      {trendData.map((item, index) => {
                        const maxX = trendData.length - 1;
                        const x = maxX === 0 ? 0 : (index / maxX) * 100;
                        const y = 100 - item.supportScore;

                        return (
                          <g key={item.concern}>
                            <circle cx={x} cy={y} r="2.2" fill="#2563eb" />
                          </g>
                        );
                      })}
                    </svg>

                    <div className="mt-4 space-y-2">
                      {trendData.map((item, index) => (
                        <div
                          key={item.concern}
                          className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-blue-600" />
                            <span className="text-slate-700">
                              {index + 1}. {item.concern}
                            </span>
                          </div>
                          <span className="font-semibold text-slate-900">
                            {item.supportScore}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}