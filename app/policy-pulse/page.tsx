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

  // Fetch responses
  const fetchResponses = async () => {
    const { data, error } = await supabase
      .from("poll_responses")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setResponses(data);
      setResponseCount(data.length);
    }
  };

  useEffect(() => {
    fetchResponses();
  }, []);

  // Submit Poll
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from("poll_responses").insert([
      {
        support,
        concern,
        recommendation,
      },
    ]);

    if (error) {
      alert(error.message);
      setSubmitError(error.message);
      return;
    }

    setSubmitted(true);
    setRecommendation("");
    fetchResponses();

    setTimeout(() => setSubmitted(false), 3000);
  };

  // Upload File
  const handleUpload = async (e: any) => {
    try {
      setUploading(true);

      const file = e.target.files[0];
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

  // Insights
  const keyInsight = useMemo(() => {
    if (responses.length === 0) return "Awaiting responses...";

    const positive = responses.filter(
      (r) =>
        r.support === "Strongly Support" ||
        r.support === "Support with Modifications"
    ).length;

    if (positive / responses.length > 0.6) {
      return "Majority sentiment supports the proposal, but prefers controlled execution.";
    }

    return "Sentiment is mixed or cautious. Further validation recommended.";
  }, [responses]);

  const topConcern = useMemo(() => {
    if (!responses.length) return "No data yet";

    const counts: any = {};
    responses.forEach((r) => {
      counts[r.concern] = (counts[r.concern] || 0) + 1;
    });

    return Object.entries(counts).sort((a: any, b: any) => b[1] - a[1])[0][0];
  }, [responses]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <main className="flex-1 p-8 space-y-6">
        <h1 className="text-3xl font-bold">Policy Pulse</h1>

        {/* Upload Section */}
        <div>
          <label className="cursor-pointer bg-white border px-5 py-3 rounded-xl">
            {uploading ? "Uploading..." : "Upload Policy Summary"}
            <input type="file" className="hidden" onChange={handleUpload} />
          </label>

          {fileUrl && (
            <p className="mt-2 text-green-600">
              Uploaded:{" "}
              <a href={fileUrl} target="_blank" className="underline">
                View Document
              </a>
            </p>
          )}
        </div>

        {/* Poll Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 rounded-xl space-y-4"
        >
          <select
            value={support}
            onChange={(e) => setSupport(e.target.value)}
            className="w-full p-3 border rounded"
          >
            {supportOptions.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>

          <select
            value={concern}
            onChange={(e) => setConcern(e.target.value)}
            className="w-full p-3 border rounded"
          >
            {concernOptions.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>

          <textarea
            value={recommendation}
            onChange={(e) => setRecommendation(e.target.value)}
            placeholder="Recommendation"
            className="w-full p-3 border rounded"
          />

          <button className="w-full bg-green-600 text-white p-3 rounded">
            Submit Response
          </button>

          {submitted && <p className="text-green-600">Submitted!</p>}
          {submitError && <p className="text-red-500">{submitError}</p>}
        </form>

        {/* Insights */}
        <div className="bg-black text-white p-6 rounded-xl">
          <p>Responses: {responseCount}</p>
          <p className="mt-2 text-sm text-slate-300">
            Based on {responseCount} responses
          </p>

          <p className="mt-4">
            <b>Top Concern:</b> {topConcern}
          </p>

          <p className="mt-2">
            <b>Insight:</b> {keyInsight}
          </p>
        </div>

        {/* Recent Responses */}
        <div className="bg-white p-6 rounded-xl">
          <h3 className="font-bold mb-4">Recent Responses</h3>

          {responses.slice(0, 5).map((r) => (
            <div key={r.id} className="border-b py-2 text-sm">
              <p>
                <b>{r.support}</b> – {r.concern}
              </p>
              {r.recommendation && <p>"{r.recommendation}"</p>}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}