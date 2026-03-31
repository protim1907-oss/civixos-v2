"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import { createClient } from "@/lib/supabase/client";

type PollResponseRow = {
  id: string;
  support: string;
  concern: string;
  recommendation: string | null;
  created_at: string;
};

const supportOptions = [
  "Strongly Support",
  "Support with Modifications",
  "Neutral",
  "Oppose",
];

const concernOptions = [
  "Military escalation",
  "Economic impact",
  "Diplomatic risk",
  "Effectiveness",
];

export default function PolicyPulsePage() {
  const supabase = createClient();

  const [support, setSupport] = useState("Support with Modifications");
  const [concern, setConcern] = useState("Military escalation");
  const [recommendation, setRecommendation] = useState("");
  const [responses, setResponses] = useState<PollResponseRow[]>([]);
  const [responseCount, setResponseCount] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState("");
  const [loadingResponses, setLoadingResponses] = useState(true);

  const fetchResponses = async () => {
    setLoadingResponses(true);

    const { data, error } = await supabase
      .from("poll_responses")
      .select("id, support, concern, recommendation, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch error:", error);
      setLoadingResponses(false);
      return;
    }

    const rows = (data ?? []) as PollResponseRow[];
    setResponses(rows);
    setResponseCount(rows.length);
    setLoadingResponses(false);
  };

  useEffect(() => {
    fetchResponses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitted(false);

    const { error } = await supabase
      .from("poll_responses")
      .insert([
        {
          support,
          concern,
          recommendation: recommendation.trim() || null,
        },
      ])
      .select();

    if (error) {
      console.error("Insert error:", error);
      alert(error.message);
      setSubmitError(error.message);
      return;
    }

    setSubmitted(true);
    setRecommendation("");

    await fetchResponses();

    setTimeout(() => setSubmitted(false), 3000);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      const file = e.target.files?.[0];
      if (!file) return;

      const fileName = `${Date.now()}-${file.name}`;

      const { error } = await supabase.storage
        .from("policy-documents")
        .upload(fileName, file);

      if (error) {
        alert(error.message);
        return;
      }

      const { data } = supabase.storage
        .from("policy-documents")
        .getPublicUrl(fileName);

      setFileUrl(data.publicUrl);
    } finally {
      setUploading(false);
    }
  };

  const topConcern = useMemo(() => {
    if (!responses.length) return "No data yet";

    const counts: Record<string, number> = {};
    responses.forEach((r) => {
      counts[r.concern] = (counts[r.concern] || 0) + 1;
    });

    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }, [responses]);

  const keyInsight = useMemo(() => {
    if (responses.length === 0) return "Awaiting responses...";

    const positive = responses.filter(
      (r) =>
        r.support === "Strongly Support" ||
        r.support === "Support with Modifications"
    ).length;

    if (positive / responses.length > 0.6) {
      return "Majority sentiment supports the proposal, but prefers controlled or moderated execution.";
    }

    return "Sentiment is mixed or cautious. More responses will improve confidence in the policy signal.";
  }, [responses]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <main className="flex-1 p-8 space-y-6">
        <h1 className="text-3xl font-bold">Policy Pulse</h1>

        <div>
          <label className="inline-block cursor-pointer rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            {uploading ? "Uploading..." : "Upload Policy Summary"}
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={handleUpload}
            />
          </label>

          {fileUrl && (
            <p className="mt-2 text-green-600">
              Uploaded:{" "}
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                View Document
              </a>
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl bg-white p-6 space-y-4">
          <select
            value={support}
            onChange={(e) => setSupport(e.target.value)}
            className="w-full rounded border p-3"
          >
            {supportOptions.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>

          <select
            value={concern}
            onChange={(e) => setConcern(e.target.value)}
            className="w-full rounded border p-3"
          >
            {concernOptions.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>

          <textarea
            value={recommendation}
            onChange={(e) => setRecommendation(e.target.value)}
            placeholder="Recommendation"
            className="w-full rounded border p-3"
            rows={4}
          />

          <button className="w-full rounded bg-green-600 p-3 text-white">
            Submit Response
          </button>

          {submitted && <p className="text-green-600">Submitted successfully.</p>}
          {submitError && <p className="text-red-500">{submitError}</p>}
        </form>

        <div className="rounded-xl bg-black p-6 text-white">
          <p>Responses: {responseCount}</p>
          <p className="mt-2 text-sm text-slate-300">
            {loadingResponses ? "Loading live data..." : `Based on ${responseCount} responses`}
          </p>

          <p className="mt-4">
            <b>Top Concern:</b> {topConcern}
          </p>

          <p className="mt-2">
            <b>Insight:</b> {keyInsight}
          </p>
        </div>

        <div className="rounded-xl bg-white p-6">
          <h3 className="mb-4 font-bold">Recent Responses</h3>

          {responses.length === 0 ? (
            <p className="text-sm text-slate-500">No responses yet.</p>
          ) : (
            responses.slice(0, 5).map((r) => (
              <div key={r.id} className="border-b py-3 text-sm last:border-b-0">
                <p>
                  <b>{r.support}</b> — {r.concern}
                </p>
                {r.recommendation && (
                  <p className="mt-1 text-slate-600">"{r.recommendation}"</p>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}