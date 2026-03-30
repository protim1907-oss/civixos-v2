"use client";

import Link from "next/link";

const pollQuestions = [
  "Do you support this approach?",
  "What concerns you most?",
  "What would you recommend instead?",
  "Which best describes you?",
];

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

const insightData = [
  { label: "Support with Modifications", value: 62, width: "62%", barClass: "bg-green-500" },
  { label: "Strongly Support", value: 39, width: "39%", barClass: "bg-blue-400" },
  { label: "Oppose", value: 23, width: "23%", barClass: "bg-red-400" },
];

export default function PolicyPulsePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-72 shrink-0 bg-slate-950 text-white lg:flex lg:flex-col">
          <div className="border-b border-slate-800 px-7 py-8">
            <h1 className="text-3xl font-bold tracking-tight">CivixOS</h1>
            <p className="mt-2 text-sm text-slate-400">Citizen decision intelligence</p>
          </div>

          <nav className="flex-1 px-4 py-6">
            <div className="space-y-2">
              <Link
                href="/dashboard"
                className="block rounded-xl px-4 py-3 text-sm text-slate-300 transition hover:bg-slate-900 hover:text-white"
              >
                Dashboard
              </Link>
              <Link
                href="/feed"
                className="block rounded-xl px-4 py-3 text-sm text-slate-300 transition hover:bg-slate-900 hover:text-white"
              >
                District Feed
              </Link>
              <Link
                href="/my-representatives"
                className="block rounded-xl px-4 py-3 text-sm text-slate-300 transition hover:bg-slate-900 hover:text-white"
              >
                Representatives
              </Link>
              <Link
                href="/moderation"
                className="block rounded-xl px-4 py-3 text-sm text-slate-300 transition hover:bg-slate-900 hover:text-white"
              >
                Moderation
              </Link>
              <Link
                href="/reports"
                className="block rounded-xl px-4 py-3 text-sm text-slate-300 transition hover:bg-slate-900 hover:text-white"
              >
                Reports
              </Link>
              <Link
                href="/policy-pulse"
                className="block rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white"
              >
                Policy Pulse
              </Link>
            </div>
          </nav>

          <div className="m-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm font-semibold">Prototype Goal</p>
            <p className="mt-3 text-sm text-slate-300">Run a targeted civic poll</p>
            <p className="mt-1 text-sm text-slate-400">
              Collect fast policy sentiment before full platform launch.
            </p>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">
          {/* Top bar */}
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

          {/* Hero */}
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
                comments, and produce a rapid civic insight brief for stakeholders like Costa Brown.
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

          {/* Main two-column content */}
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {/* Left */}
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

            {/* Right */}
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900">Poll Questions</h3>
                <div className="mt-5 space-y-3">
                  {pollQuestions.map((question, index) => (
                    <div
                      key={question}
                      className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700"
                    >
                      <span className="mr-2 font-semibold text-slate-900">{index + 1}.</span>
                      {question}
                    </div>
                  ))}
                </div>

                <div className="mt-5 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  2 min survey
                </div>
              </div>

              <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
                <h3 className="text-xl font-bold">Insight Snapshot</h3>
                <p className="mt-2 text-sm text-slate-300">Responses: 128</p>

                <div className="mt-6 space-y-5">
                  {insightData.map((item) => (
                    <div key={item.label}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-slate-200">{item.label}</span>
                        <span className="font-semibold text-white">{item.value}%</span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-slate-800">
                        <div
                          className={`h-3 rounded-full ${item.barClass}`}
                          style={{ width: item.width }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-sm font-semibold text-white">Key Insight</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Most respondents support the objective, but prefer a more measured version of
                    the proposal rather than a highly escalatory posture.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}