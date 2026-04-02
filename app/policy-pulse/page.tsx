"use client";

import { useRouter } from "next/navigation";
import Sidebar from "../../components/layout/Sidebar";

export default function PolicyPulsePage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <main className="flex-1 p-6">
        <div className="mx-auto max-w-7xl space-y-8">
          {/* Hero Section */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-blue-900 to-slate-800 px-8 py-12 text-white shadow-xl">
            <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />

            <div className="relative z-10 grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
              <div>
                <div className="mb-4 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1 text-sm font-medium text-blue-100">
                  CivixOS • Policy Pulse
                </div>

                <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
                  Test policies before they become decisions.
                </h1>

                <p className="mt-5 max-w-3xl text-base leading-7 text-slate-200 md:text-lg">
                  Policy Pulse lets you run quick surveys, capture citizen
                  sentiment, and identify key concerns. Get instant insights on
                  support levels, risks, and recommendations. Make smarter,
                  faster policy decisions.
                </p>

                <div className="mt-8 flex flex-wrap gap-4">
                  <button
                    onClick={() => router.push("/create-post")}
                    className="rounded-xl bg-blue-500 px-6 py-3 font-semibold text-white transition hover:bg-blue-600"
                  >
                    Launch New Survey
                  </button>

                  <button
                    onClick={() => router.push("/feed")}
                    className="rounded-xl border border-white/20 bg-white/10 px-6 py-3 font-semibold text-white transition hover:bg-white/20"
                  >
                    View Public Responses
                  </button>
                </div>
              </div>

              <div className="relative z-10">
                <div className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-md">
                  <h2 className="text-lg font-semibold text-white">
                    Policy Pulse at a glance
                  </h2>

                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-white/10 p-4">
                      <p className="text-3xl font-bold">3–4</p>
                      <p className="mt-1 text-sm text-slate-200">
                        Focused survey questions
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/10 p-4">
                      <p className="text-3xl font-bold">Real-time</p>
                      <p className="mt-1 text-sm text-slate-200">
                        Sentiment insights
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/10 p-4">
                      <p className="text-3xl font-bold">Citizen</p>
                      <p className="mt-1 text-sm text-slate-200">
                        Feedback collection
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/10 p-4">
                      <p className="text-3xl font-bold">Actionable</p>
                      <p className="mt-1 text-sm text-slate-200">
                        Recommendations
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* How it works */}
          <section className="rounded-3xl bg-white p-8 shadow-sm">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900">
                How Policy Pulse works
              </h2>
              <p className="mt-2 text-slate-600">
                From policy summary to citizen insight in a simple, guided flow.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                  1
                </div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Upload policy summary
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Add a concise overview of the policy so citizens can
                  understand the context before responding.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                  2
                </div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Launch a targeted survey
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Ask support level, top concerns, and recommendations through a
                  focused set of high-value questions.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                  3
                </div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Gather citizen sentiment
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Capture structured public input and surface themes, risks, and
                  emerging concerns in one place.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                  4
                </div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Turn insight into action
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Use survey findings to shape communication, adjust policy
                  direction, and support better decisions.
                </p>
              </div>
            </div>
          </section>

          {/* CTA / Preview Section */}
          <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <div className="rounded-3xl bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900">
                Why teams use Policy Pulse
              </h2>

              <div className="mt-6 space-y-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <h3 className="font-semibold text-slate-900">
                    Faster validation
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Test assumptions early and understand whether a proposal has
                    support before it moves forward.
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <h3 className="font-semibold text-slate-900">
                    Clearer communication
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Present policy ideas in plain language so feedback is based
                    on understanding, not confusion.
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <h3 className="font-semibold text-slate-900">
                    Better decision-making
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Combine quantitative response patterns with qualitative
                    recommendations to guide next steps.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-slate-900 p-8 text-white shadow-sm">
              <h2 className="text-2xl font-bold">Ready to start a pulse?</h2>
              <p className="mt-3 leading-7 text-slate-300">
                Launch a short, focused consultation flow and capture meaningful
                public feedback in minutes.
              </p>

              <div className="mt-6 space-y-3">
                <button
                  onClick={() => router.push("/create-post")}
                  className="w-full rounded-xl bg-blue-500 px-5 py-3 font-semibold text-white transition hover:bg-blue-600"
                >
                  Start Policy Survey
                </button>

                <button
                  onClick={() => router.push("/dashboard")}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
                >
                  Back to Dashboard
                </button>
              </div>

              <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-300">
                  Best for policy testing, community consultation, pilot
                  feedback, and issue-based public sentiment tracking.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}