"use client";

import { useRouter } from "next/navigation";
import Sidebar from "../../components/layout/Sidebar";

export default function PolicyPulsePage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <main className="flex-1 p-6">
        <div className="mx-auto max-w-7xl">
          {/* Intro Section */}
          <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">Policy Pulse</h1>

            <p className="mt-3 max-w-3xl text-slate-600 leading-7">
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

          {/* Overview Cards */}
          <div className="mb-6 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Quick Policy Testing
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Run short, focused surveys to validate ideas before they move
                into implementation.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Citizen Sentiment
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Capture support levels, concerns, and recommendations in a clear
                and structured format.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Actionable Insights
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Turn survey responses into practical next steps for
                communication, refinement, and decision-making.
              </p>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                Upload Policy Summary
              </h2>
              <p className="mt-2 text-slate-600">
                Add a short and clear overview of the policy so citizens can
                understand the issue before responding.
              </p>

              <div className="mt-6 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <p className="text-sm text-slate-600">
                  Upload policy documents or summaries here.
                </p>
                <button className="mt-4 rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-slate-800">
                  Upload Policy Summary
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                Survey Snapshot
              </h2>

              <div className="mt-5 space-y-4">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Questions</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">3–4</p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Sentiment Tracking</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    Real-time
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Outcome</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    Actionable Insights
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Responses */}
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