"use client";

import Link from "next/link";
import Sidebar from "@/components/layout/Sidebar";
import {
  CheckCircle2,
  HeartHandshake,
  Clock,
  ShieldCheck,
} from "lucide-react";

const EIN_NUMBER = "39-4801426";

export default function DonatePage() {
  return (
    <main className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <Sidebar />

        <div className="min-w-0 flex-1 p-4 md:p-8">
          <div className="mx-auto max-w-6xl space-y-6">
            <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 pl-8 shadow-sm before:absolute before:inset-y-0 before:left-0 before:w-2 before:bg-blue-500 md:p-8 md:pl-10">
              <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                    <HeartHandshake className="h-3.5 w-3.5" />
                    Support Civix250
                  </div>
                  <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 md:text-5xl">
                    Help keep civic tools independent and accessible.
                  </h1>
                  <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
                    Donations support district transparency tools, representative lookup,
                    moderation workflows, policy pulse surveys, and community issue tracking.
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-slate-900">
                    What your support funds
                  </p>
                  <div className="mt-4 space-y-3">
                    {[
                      "Reliable civic data and district intelligence",
                      "Resident tools for contacting officials",
                      "Moderation and transparency workflows",
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-3 text-sm text-slate-600">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Online giving is paused while the donation platform is being updated. */}
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm md:p-10">
              <div className="mx-auto max-w-2xl text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                  <Clock className="h-7 w-7" />
                </div>
                <p className="mt-5 text-sm font-semibold uppercase tracking-[0.16em] text-amber-600">
                  Coming back soon
                </p>
                <h2 className="mt-2 text-2xl font-bold text-slate-950 md:text-3xl">
                  Online donations are temporarily unavailable
                </h2>
                <p className="mt-4 text-base leading-7 text-slate-600">
                  We&apos;re updating our donation platform, so online giving is paused right now.
                  Thank you for your support — please check back shortly. In the meantime, you can
                  still explore how contributions are used.
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/donation-tracker"
                    className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
                  >
                    View Donation Tracker
                  </Link>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Back to dashboard
                  </Link>
                </div>

                <p className="mt-8 flex items-center justify-center gap-2 text-xs leading-5 text-slate-500">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Vote Beyond Party is a 501(c)(3) nonprofit. EIN {EIN_NUMBER}. Donations are
                  tax-deductible to the extent permitted by law.
                </p>
              </div>
            </section>

            <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
              Looking for campaign-finance information?{" "}
              <Link href="/donation-tracker" className="font-semibold text-blue-700 hover:underline">
                View Donation Tracker
              </Link>
              .
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
