"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "../../components/layout/Sidebar";
import {
  initialVotes,
  loadPolicyPulseSurveys,
  PolicyPulseResponse,
  PolicyPulseSurvey,
  savePolicyPulseSurveys,
  VoteOption,
  voteOptions,
} from "@/lib/policy-pulse";

type TrendPoint = {
  concern: string;
  supportScore: number;
};

const trendData: TrendPoint[] = [
  { concern: "Budget Clarity", supportScore: 78 },
  { concern: "Access & Fairness", supportScore: 64 },
  { concern: "Implementation Timeline", supportScore: 58 },
  { concern: "Data Privacy", supportScore: 71 },
  { concern: "Service Quality", supportScore: 83 },
];

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

function getSupportDescriptor(vote: VoteOption) {
  if (vote === "Strongly Support" || vote === "Support") return "Supportive";
  if (vote === "Neutral") return "Neutral";
  return "Concerned";
}

function formatDisplayDate(value: string) {
  if (!value) return "No deadline";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function PolicyPulsePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const responsesRef = useRef<HTMLDivElement | null>(null);

  const [surveys, setSurveys] = useState<PolicyPulseSurvey[]>([]);
  const [activeSurveyId, setActiveSurveyId] = useState<string>("");
  const [createdMessage, setCreatedMessage] = useState("");

  const [selectedVote, setSelectedVote] = useState<VoteOption>("Neutral");
  const [respondentName, setRespondentName] = useState("");
  const [topConcern, setTopConcern] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [voteSubmittedMessage, setVoteSubmittedMessage] = useState("");

  useEffect(() => {
    const stored = loadPolicyPulseSurveys();
    setSurveys(stored);

    const requestedSurveyId = searchParams.get("survey");
    const created = searchParams.get("created");

    const selectedSurvey =
      stored.find((survey) => survey.id === requestedSurveyId) || stored[0] || null;

    if (selectedSurvey) {
      setActiveSurveyId(selectedSurvey.id);
    }

    if (created === "1" && selectedSurvey) {
      setCreatedMessage(`Survey "${selectedSurvey.title}" was published successfully.`);
    }
  }, [searchParams]);

  const activeSurvey = useMemo(() => {
    return surveys.find((survey) => survey.id === activeSurveyId) || null;
  }, [surveys, activeSurveyId]);

  const canExportActiveSurvey = Boolean(activeSurvey);

  const surveyVotes = activeSurvey?.votes || initialVotes;

  const totalVotes = useMemo(
    () => Object.values(surveyVotes).reduce((sum, count) => sum + count, 0),
    [surveyVotes]
  );

  const generalSentiment = useMemo(
    () => getSentimentSummary(surveyVotes),
    [surveyVotes]
  );

  const topConcernLabel = useMemo(() => {
    if (activeSurvey?.recentResponses?.length) {
      return activeSurvey.recentResponses[0]?.topConcern || "No concern yet";
    }
    return "Budget / Access";
  }, [activeSurvey]);

  const recommendedActionLabel = useMemo(() => {
    if (activeSurvey?.recentResponses?.length) {
      return activeSurvey.recentResponses[0]?.recommendation || "No recommendation yet";
    }
    return activeSurvey ? "Review Survey Feedback" : "Launch A Survey";
  }, [activeSurvey]);

  const chartData = useMemo(() => {
    return voteOptions.map((option) => {
      const value = surveyVotes[option];
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
  }, [surveyVotes, totalVotes]);

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

  const handleViewResponses = () => {
    responsesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleExportPdf = () => {
    if (!activeSurvey) return;

    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=960,height=720");
    if (!printWindow) return;

    const responsesMarkup =
      activeSurvey.recentResponses.length > 0
        ? activeSurvey.recentResponses
            .map(
              (response) => `
                <tr>
                  <td>${escapeHtml(response.citizenLabel)}</td>
                  <td>${escapeHtml(response.supportLevel)}</td>
                  <td>${escapeHtml(response.topConcern)}</td>
                  <td>${escapeHtml(response.recommendation)}</td>
                </tr>
              `
            )
            .join("")
        : `
          <tr>
            <td colspan="4">No responses submitted yet.</td>
          </tr>
        `;

    const voteRows = voteOptions
      .map((option) => {
        const value = activeSurvey.votes[option];
        const total = Object.values(activeSurvey.votes).reduce((sum, count) => sum + count, 0);
        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
        return `
          <tr>
            <td>${escapeHtml(option)}</td>
            <td>${value}</td>
            <td>${percentage}%</td>
          </tr>
        `;
      })
      .join("");

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${escapeHtml(activeSurvey.title)} - Survey Results</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 32px; color: #0f172a; }
            h1, h2 { margin-bottom: 8px; }
            p { line-height: 1.6; }
            .meta { margin: 20px 0; padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; vertical-align: top; }
            th { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(activeSurvey.title)}</h1>
          <p>${escapeHtml(activeSurvey.summary)}</p>
          <div class="meta">
            <p><strong>District:</strong> ${escapeHtml(activeSurvey.district)}</p>
            <p><strong>Question:</strong> ${escapeHtml(activeSurvey.primaryQuestion)}</p>
            <p><strong>Deadline:</strong> ${escapeHtml(formatDisplayDate(activeSurvey.deadline))}</p>
            <p><strong>Created By:</strong> ${escapeHtml(activeSurvey.createdByName || "Survey Creator")}</p>
          </div>

          <h2>Vote Breakdown</h2>
          <table>
            <thead>
              <tr>
                <th>Option</th>
                <th>Votes</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>${voteRows}</tbody>
          </table>

          <h2>Recent Responses</h2>
          <table>
            <thead>
              <tr>
                <th>Citizen</th>
                <th>Support Level</th>
                <th>Top Concern</th>
                <th>Recommendation</th>
              </tr>
            </thead>
            <tbody>${responsesMarkup}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleVoteSubmit = () => {
    setVoteSubmittedMessage("");

    if (!activeSurvey) {
      setVoteSubmittedMessage("Launch a survey first before collecting responses.");
      return;
    }

    const response: PolicyPulseResponse = {
      id: `response-${Date.now()}`,
      citizenLabel: respondentName.trim() || `Citizen ${activeSurvey.recentResponses.length + 1}`,
      supportLevel: selectedVote,
      topConcern: topConcern.trim() || "No concern submitted",
      recommendation: recommendation.trim() || "No recommendation submitted",
      createdAt: new Date().toISOString(),
    };

    const nextSurvey: PolicyPulseSurvey = {
      ...activeSurvey,
      votes: {
        ...activeSurvey.votes,
        [selectedVote]: activeSurvey.votes[selectedVote] + 1,
      },
      recentResponses: [response, ...activeSurvey.recentResponses].slice(0, 8),
    };

    const nextSurveys = surveys.map((survey) =>
      survey.id === nextSurvey.id ? nextSurvey : survey
    );

    setSurveys(nextSurveys);
    savePolicyPulseSurveys(nextSurveys);

    setVoteSubmittedMessage(`Your response has been recorded for "${activeSurvey.title}".`);
    setRespondentName("");
    setTopConcern("");
    setRecommendation("");
    setSelectedVote("Neutral");
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <main className="flex-1 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
            <h1 className="text-3xl font-bold text-slate-900">Policy Pulse</h1>
            <p className="mt-3 max-w-4xl leading-7 text-slate-600">
              {activeSurvey
                ? `${activeSurvey.title} is live for ${activeSurvey.district}. ${activeSurvey.summary}`
                : "Test policies before they become decisions. Policy Pulse lets you run quick surveys, capture citizen sentiment, and identify key concerns. Get instant insights on support levels, risks, and recommendations. Make smarter, faster policy decisions."}
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() => router.push("/policy-pulse/new")}
                className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
              >
                Launch Survey
              </button>

              <button
                onClick={handleViewResponses}
                className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                View Responses
              </button>

              <button
                onClick={handleExportPdf}
                disabled={!canExportActiveSurvey}
                title={
                  canExportActiveSurvey
                    ? "Export survey results to PDF"
                    : "Launch a survey before exporting results"
                }
                className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
              >
                Export to PDF
              </button>
            </div>

            {createdMessage ? (
              <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {createdMessage}
              </div>
            ) : null}
          </div>

          <div className="mb-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border-l-4 border-yellow-500 bg-yellow-50 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Quick Policy Testing
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Run focused surveys to validate public sentiment before policy rollout.
              </p>
            </div>

            <div className="rounded-2xl border-l-4 border-blue-500 bg-blue-50 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Citizen Sentiment
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Capture support levels, concerns, and recommendations in one place.
              </p>
            </div>

            <div className="rounded-2xl border-l-4 border-red-500 bg-red-50 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Risk Visibility
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Surface public concerns early so teams can respond before issues escalate.
              </p>
            </div>

            <div className="rounded-2xl border-l-4 border-green-500 bg-green-50 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Actionable Insights
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Turn feedback into decisions, communication plans, and next-step actions.
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Live Policy Brief</h2>
              <p className="mt-2 text-slate-600">
                {activeSurvey
                  ? `Survey question: ${activeSurvey.primaryQuestion}`
                  : "Launch a survey to publish a policy summary and supporting files for residents."}
              </p>

              {activeSurvey ? (
                <div className="mt-6 space-y-5">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                        {activeSurvey.district}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        Deadline: {formatDisplayDate(activeSurvey.deadline)}
                      </span>
                    </div>
                    <h3 className="mt-4 text-2xl font-bold text-slate-900">
                      {activeSurvey.title}
                    </h3>
                    <p className="mt-3 leading-7 text-slate-700">{activeSurvey.summary}</p>
                  </div>

                  {activeSurvey.uploadedFiles.length > 0 ? (
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        Attached Policy Files
                      </h3>

                      <div className="mt-4 space-y-3">
                        {activeSurvey.uploadedFiles.map((file, index) => (
                          <div
                            key={`${file.name}-${index}`}
                            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                          >
                            <p className="font-semibold text-slate-900">{file.name}</p>
                            <p className="text-sm text-slate-600">
                              {file.type} • {file.size}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 p-8 text-center">
                  <p className="text-lg font-semibold text-slate-900">
                    No live survey yet
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Start by launching a new Policy Pulse survey with a district, summary,
                    and question.
                  </p>
                  <button
                    onClick={() => router.push("/policy-pulse/new")}
                    className="mt-4 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
                  >
                    Create Survey
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Survey Snapshot</h2>

              <div className="mt-5 space-y-4">
                <div className="rounded-xl border-l-4 border-yellow-500 bg-yellow-50 p-4">
                  <p className="text-sm text-slate-500">Total Votes Received</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{totalVotes}</p>
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
                    {topConcernLabel}
                  </p>
                </div>

                <div className="rounded-xl border-l-4 border-green-500 bg-green-50 p-4">
                  <p className="text-sm text-slate-500">Recommended Action</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {recommendedActionLabel}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Cast Your Vote</h2>
              <p className="mt-2 text-slate-600">
                {activeSurvey
                  ? "Submit your support level, top concern, and recommendation for the live policy survey."
                  : "Launch a survey first, then residents can submit structured responses here."}
              </p>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Your name or label
                  </label>
                  <input
                    value={respondentName}
                    onChange={(e) => setRespondentName(e.target.value)}
                    placeholder="Citizen A"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
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
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Top concern
                  </label>
                  <input
                    value={topConcern}
                    onChange={(e) => setTopConcern(e.target.value)}
                    placeholder="Budget clarity"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Recommendation
                  </label>
                  <textarea
                    value={recommendation}
                    onChange={(e) => setRecommendation(e.target.value)}
                    rows={4}
                    placeholder="Share the best next step or safeguard to add before rollout."
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  onClick={handleVoteSubmit}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700"
                >
                  Submit Response
                </button>

                {voteSubmittedMessage ? (
                  <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {voteSubmittedMessage}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Citizen Sentiment Chart</h2>
              <p className="mt-2 text-slate-600">
                View how residents are responding across all support categories.
              </p>

              <div className="mt-6 space-y-5">
                {chartData.map((item) => (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{item.label}</span>
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

          <div ref={responsesRef} className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Recent Survey Responses</h2>
            <p className="mt-2 text-slate-600">
              Review incoming sentiment, major concerns, and recommended next steps.
            </p>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="overflow-x-auto">
                {activeSurvey?.recentResponses?.length ? (
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
                      {activeSurvey.recentResponses.map((response) => (
                        <tr key={response.id} className="border-b border-slate-100">
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {response.citizenLabel}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {getSupportDescriptor(response.supportLevel)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {response.topConcern}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {response.recommendation}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-12 text-center text-slate-600">
                    No responses yet. Launch a survey and collect the first resident responses.
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-lg font-semibold text-slate-900">
                  Top Concerns vs Support Levels
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  This trendline shows how support shifts across the main themes raised in
                  the survey.
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

export default function PolicyPulsePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen bg-slate-100">
          <Sidebar />
          <main className="flex-1 p-6">
            <div className="mx-auto max-w-7xl">
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h1 className="text-3xl font-bold text-slate-900">Policy Pulse</h1>
                <p className="mt-3 text-slate-600">Loading survey workspace...</p>
              </div>
            </div>
          </main>
        </div>
      }
    >
      <PolicyPulsePageContent />
    </Suspense>
  );
}
