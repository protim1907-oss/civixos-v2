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

const supabase = createClient();

const steps = [
  {
    number: "1",
    title: "Create a neutral policy summary",
    description:
      "Turn the source letter into plain-language context for citizens before asking them to respond.",
    badgeClass: "bg-green-100 text-green-800",
  },
  {
    number: "2",
    title: "Launch a targeted 3–4 question poll",
    description:
      "Ask support level, top concern, and an open-ended recommendation to generate usable insight.",
    badgeClass: "bg-blue-100 text-blue-800",
  },
  {
    number: "3",
    title: "Distribute to a curated audience",
    description:
      "Use LinkedIn, direct outreach, veterans groups, and policy-aware communities for quality responses.",
    badgeClass: "bg-amber-100 text-amber-800",
  },
  {
    number: "4",
    title: "Generate an insight snapshot",
    description:
      "Summarize sentiment, leading concerns, and recommended next actions in a shareable civic brief.",
    badgeClass: "bg-pink-100 text-pink-800",
  },
];

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
  const [support, setSupport] = useState("Support with Modifications");
  const [concern, setConcern] = useState("Military escalation");
  const [recommendation, setRecommendation] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [responseCount, setResponseCount] = useState(0);
  const [responses, setResponses] = useState<PollResponseRow[]>([]);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");

  const fetchResponses = async () => {
    const { data, error } = await supabase
      .from("poll_responses")
      .select("id, support, concern, recommendation, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching poll responses:", error);
      setLoadError("Unable to load live response data.");
      return;
    }

    const rows = (data ?? []) as PollResponseRow[];
    setResponses(rows);
    setResponseCount(rows.length);
    setLoadError("");
  };

  useEffect(() => {
    fetchResponses();
  }, []);

  const supportBreakdown = useMemo(() => {
    const total = responses.length;

    return supportOptions.map((label) => {
      const count = responses.filter((item) => item.support === label).length;
      const percent = total > 0 ? Math.round((count / total) * 100) : 0;

      return {
        label,
        count,
        percent,
        width: `${percent}%`,
        barClass:
          label === "Support with Modifications"
            ? "bg-green-500"
            : label === "Strongly Support"
              ? "bg-blue-400"
              : label === "Neutral"
                ? "bg-amber-400"
                : "bg-red-400",
      };
    });
  }, [responses]);

  const topConcern = useMemo(() => {
    if (responses.length === 0) return "No responses yet";

    const concernCounts = responses.reduce<Record<string, number>>((acc, item) => {
      acc[item.concern] = (acc[item.concern] || 0) + 1;
      return acc;
    }, {});

    const sorted = Object.entries(concernCounts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || "No responses yet";
  }, [responses]);

  const keyInsight = useMemo(() => {
    if (responses.length === 0) {
      return "No responses have been submitted yet. Once citizens begin voting, CivixOS will summarize live sentiment here.";
    }

    const mod = responses.filter(
      (item) => item.support === "Support with Modifications"
    ).length;
    const strong = responses.filter(
      (item) => item.support === "Strongly Support"
    ).length;
    const oppose = responses.filter((item) => item.support === "Oppose").length;
    const neutral = responses.filter((item) => item.support === "Neutral").length;

    if (mod >= strong && mod >= oppose && mod >= neutral) {
      return "Most respondents support the objective, but prefer a more measured version of the proposal rather than a highly escalatory posture.";
    }

    if (strong >= mod && strong >= oppose && strong >= neutral) {
      return "Respondents are showing strong support for the proposal’s core direction, suggesting a favorable reception among current participants.";
    }

    if (oppose >= mod && oppose >= strong && oppose >= neutral) {
      return "Current sentiment shows significant resistance to the proposal, indicating concerns around risk, escalation, or overall policy direction.";
    }

    return "Respondents are still split, and more participation will help clarify the dominant sentiment and recommended path forward.";
  }, [responses]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");
    setSubmitted(false);

    const trimmedRecommendation = recommendation.trim();

    const { error } = await supabase.from("poll_responses").insert([
      {
        support,
        concern,
        recommendation: trimmedRecommendation || null,
      },
    ]);

    if (error) {
      console.error("Error saving poll response:", error);
      setSubmitError("Unable to submit response. Please try again.");
      setIsSubmitting(false);
      return;
    }

    setSubmitted(true);
    setSupport("Support with Modifications");
    setConcern("Military escalation");
    setRecommendation("");
    setIsSubmitting(false);

    await fetchResponses();

    window.setTimeout(() => {
      setSubmitted(false);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <Sidebar />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">
          <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">Prototype / Policy Testing</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Policy Pulse Prototype
              </h2>
              <p className="mt-2 max-w-3xl text-sm text-slate-600 sm:text-base">
                A rapid-response page for testing citizen sentiment on timely policy issues and
                generating a civic insight brief before full CivixOS launch.
              </p>
            </div>

            <button className="rounded-2xl bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700">
              Publish Poll
            </button>
          </div>

          <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
              <div className="inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-green-700">
                Live Policy Test
              </div>

              <h3 className="mt-4 text-2xl font-bold text-slate-900 sm:text-3xl">
                Freedom of Navigation and Economic Stability Act of 2026
              </h3>

              <p className="mt-4 text-sm leading-6 text-slate-600 sm:text-base">
                Use this screen to test citizen sentiment on a time-sensitive policy issue, gather
                comments, and produce a rapid civic insight brief for stakeholders like Costa
                Brown.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                  View Poll Questions
                </button>
                <button className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                  Upload Policy Summary
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Audience Target</p>
              <h4 className="mt-3 text-xl font-bold text-slate-900">
                Veterans, policy professionals, and citizens
              </h4>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Focus on high-signal respondents instead of broad random traffic to collect faster,
                more credible civic insight.
              </p>

              <div className="mt-5 space-y-3">
                <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                  LinkedIn outreach
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                  Direct messages
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                  Veterans & policy circles
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-slate-900">Run the Civic Poll</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Step-by-step prototype flow for time-sensitive policy testing.
                </p>
              </div>

              <div className="space-y-6">
                {steps.map((step) => (
                  <div
                    key={step.number}
                    className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${step.badgeClass}`}
                    >
                      {step.number}
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-slate-900">{step.title}</h4>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-5">
                <p className="text-sm font-semibold text-slate-900">Prototype Use</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Share this page internally with Costa Brown as a working CivixOS concept for
                  rapid-response civic polling, even before full production launch.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900">Civic Poll</h3>

                <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Do you support this approach?
                    </label>
                    <select
                      name="support"
                      value={support}
                      onChange={(e) => setSupport(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-700 focus:border-green-500 focus:outline-none"
                    >
                      {supportOptions.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      What concerns you most?
                    </label>
                    <select
                      name="concern"
                      value={concern}
                      onChange={(e) => setConcern(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-700 focus:border-green-500 focus:outline-none"
                    >
                      {concernOptions.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      What would you recommend instead?
                    </label>
                    <textarea
                      name="recommendation"
                      value={recommendation}
                      onChange={(e) => setRecommendation(e.target.value)}
                      rows={5}
                      placeholder="Share your recommendation..."
                      className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-700 focus:border-green-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-xl bg-green-600 p-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Response"}
                  </button>
                </form>

                {submitted && (
                  <div className="mt-4 rounded-2xl bg-green-50 p-3 text-sm font-medium text-green-700">
                    Response submitted successfully.
                  </div>
                )}

                {submitError && (
                  <div className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-medium text-red-700">
                    {submitError}
                  </div>
                )}

                <div className="mt-5 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  2 min survey
                </div>
              </div>

              <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
                <h3 className="text-xl font-bold">Insight Snapshot</h3>
                <p className="mt-2 text-sm text-slate-300">Responses: {responseCount}</p>

                {loadError && (
                  <div className="mt-4 rounded-2xl bg-red-500/10 p-3 text-sm text-red-200">
                    {loadError}
                  </div>
                )}

                <div className="mt-6 space-y-5">
                  {supportBreakdown.map((item) => (
                    <div key={item.label}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-slate-200">{item.label}</span>
                        <span className="font-semibold text-white">{item.percent}%</span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-slate-800">
                        <div
                          className={`h-3 rounded-full ${item.barClass}`}
                          style={{ width: item.width }}
                        />
                      </div>
                      <div className="mt-1 text-xs text-slate-400">{item.count} responses</div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-sm font-semibold text-white">Top Concern</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{topConcern}</p>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-sm font-semibold text-white">Key Insight</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{keyInsight}</p>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}