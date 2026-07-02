"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/layout/Sidebar";
import {
  ArrowRight,
  CheckCircle2,
  HeartHandshake,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

const donationAmounts = [10, 25, 50, 100, 250];

const EIN_NUMBER = "39-4801426";

// Hosted donation checkout URL — Givebutter campaign for Vote Beyond Party.
// Defaults to the live campaign; override with NEXT_PUBLIC_GIVEBUTTER_DONATION_URL
// (or NEXT_PUBLIC_DONATION_URL) if the campaign link ever changes.
const DONATION_URL =
  process.env.NEXT_PUBLIC_DONATION_URL ||
  process.env.NEXT_PUBLIC_GIVEBUTTER_DONATION_URL ||
  "https://givebutter.com/civix250-o0rdlz";

export default function DonatePage() {
  const [selectedAmount, setSelectedAmount] = useState(25);
  const [customAmount, setCustomAmount] = useState("");
  const [frequency, setFrequency] = useState<"one-time" | "monthly">("one-time");

  const amount = useMemo(() => {
    const custom = Number(customAmount);
    return Number.isFinite(custom) && custom > 0 ? custom : selectedAmount;
  }, [customAmount, selectedAmount]);

  const donateHref = DONATION_URL
    ? `${DONATION_URL}${DONATION_URL.includes("?") ? "&" : "?"}amount=${amount}&frequency=${frequency}`
    : "";

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

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Donation
                </p>
                <h2 className="mt-2 text-2xl font-bold text-slate-950">
                  Choose an amount
                </h2>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
                {donationAmounts.map((value) => {
                  const active = !customAmount && selectedAmount === value;

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setSelectedAmount(value);
                        setCustomAmount("");
                      }}
                      className={`rounded-2xl border-2 px-4 py-4 text-lg font-bold transition ${
                        active
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-800 hover:border-blue-200"
                      }`}
                    >
                      ${value}
                    </button>
                  );
                })}
              </div>

              <label className="mt-5 block">
                <span className="text-sm font-semibold text-slate-700">Custom amount</span>
                <input
                  type="number"
                  min="1"
                  value={customAmount}
                  onChange={(event) => setCustomAmount(event.target.value)}
                  placeholder="Enter amount"
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  { key: "one-time", label: "One-time" },
                  { key: "monthly", label: "Monthly" },
                ].map((item) => {
                  const active = frequency === item.key;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setFrequency(item.key as "one-time" | "monthly")}
                      className={`rounded-2xl border-2 px-4 py-3 text-sm font-semibold transition ${
                        active
                          ? "border-slate-950 bg-slate-950 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {donateHref ? (
                <a
                  href={donateHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 text-base font-bold text-white transition hover:bg-blue-700"
                >
                  Donate now — ${amount} {frequency === "monthly" ? "/mo" : ""}
                  <ArrowRight className="h-4 w-4" />
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  title="Donation checkout URL not configured yet"
                  className="mt-6 inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-slate-300 px-5 py-4 text-base font-bold text-white"
                >
                  Donate now
                </button>
              )}

              {!donateHref ? (
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Set{" "}
                  <span className="font-semibold">NEXT_PUBLIC_GIVEBUTTER_DONATION_URL</span>{" "}
                  to your Givebutter campaign link to activate the Donate now
                  button.
                </p>
              ) : null}

              <div className="mt-5 space-y-2 text-xs leading-5 text-slate-500">
                <p className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Vote Beyond Party is a 501(c)(3) nonprofit. EIN {EIN_NUMBER}.
                  Donations are tax-deductible to the extent permitted by law.
                </p>
                <p className="flex items-center gap-2">
                  <LockKeyhole className="h-4 w-4 text-slate-400" />
                  Payments are processed securely by our payment provider.
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
