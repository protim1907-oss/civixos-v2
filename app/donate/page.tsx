"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/layout/Sidebar";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  HeartHandshake,
  Landmark,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

const donationAmounts = [10, 25, 50, 100, 250];
const donationProviders = [
  {
    key: "stripe",
    label: "Stripe",
    description: "Card, wallet, and bank payment checkout",
    envName: "NEXT_PUBLIC_STRIPE_DONATION_URL",
    url: process.env.NEXT_PUBLIC_STRIPE_DONATION_URL || "",
  },
] as const;
const fallbackDonationHref =
  "mailto:donations@civix250.org?subject=Civix250%20donation%20inquiry";

export default function DonatePage() {
  const [selectedAmount, setSelectedAmount] = useState(25);
  const [customAmount, setCustomAmount] = useState("");
  const [frequency, setFrequency] = useState<"one-time" | "monthly">("one-time");
  const [selectedProviderKey, setSelectedProviderKey] =
    useState<(typeof donationProviders)[number]["key"]>("stripe");

  const amount = useMemo(() => {
    const custom = Number(customAmount);
    return Number.isFinite(custom) && custom > 0 ? custom : selectedAmount;
  }, [customAmount, selectedAmount]);

  const selectedProvider =
    donationProviders.find((provider) => provider.key === selectedProviderKey) ||
    donationProviders[0];
  const configuredProviders = donationProviders.filter((provider) => provider.url);
  const paymentHref = selectedProvider.url
    ? `${selectedProvider.url}${selectedProvider.url.includes("?") ? "&" : "?"}amount=${amount}&frequency=${frequency}`
    : fallbackDonationHref;
  const paymentTarget = selectedProvider.url ? "_blank" : undefined;
  const paymentRel = selectedProvider.url ? "noreferrer" : undefined;

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

            <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
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

                <div className="mt-6">
                  <p className="text-sm font-semibold text-slate-700">
                    Choose a donation provider
                  </p>
                  <div className="mt-3 grid gap-3">
                    {donationProviders.map((provider) => {
                      const active = selectedProvider.key === provider.key;
                      const configured = Boolean(provider.url);

                      return (
                        <button
                          key={provider.key}
                          type="button"
                          onClick={() => setSelectedProviderKey(provider.key)}
                          className={`rounded-2xl border-2 p-4 text-left transition ${
                            active
                              ? "border-blue-500 bg-blue-50"
                              : "border-slate-200 bg-white hover:border-blue-200"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-bold text-slate-950">{provider.label}</p>
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                configured
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {configured ? "Ready" : "Needs URL"}
                            </span>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-slate-500">
                            {provider.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <a
                  href={paymentHref}
                  target={paymentTarget}
                  rel={paymentRel}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 text-sm font-bold text-white transition hover:bg-blue-700"
                >
                  Continue with {selectedProvider.label}
                  <ArrowRight className="h-4 w-4" />
                </a>

                {configuredProviders.length === 0 ? (
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Add at least one provider URL:{" "}
                    <span className="font-semibold">NEXT_PUBLIC_STRIPE_DONATION_URL</span> or{" "}
                    <span className="font-semibold">NEXT_PUBLIC_DONORBOX_DONATION_URL</span>.
                    Until then, the button opens a donation inquiry email.
                  </p>
                ) : !selectedProvider.url ? (
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Add <span className="font-semibold">{selectedProvider.envName}</span> to activate{" "}
                    {selectedProvider.label}. Other configured providers remain available.
                  </p>
                ) : null}
              </div>

              <aside className="space-y-4">
                <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 pl-7 shadow-sm before:absolute before:inset-y-0 before:left-0 before:w-2 before:bg-emerald-500">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  <h3 className="mt-3 font-bold text-slate-950">Clean separation</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    This supports the Civix250 platform, not any official, candidate, or campaign.
                  </p>
                </div>

                <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 pl-7 shadow-sm before:absolute before:inset-y-0 before:left-0 before:w-2 before:bg-orange-500">
                  <LockKeyhole className="h-5 w-5 text-orange-600" />
                  <h3 className="mt-3 font-bold text-slate-950">Payment processing</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Connect Stripe or Donorbox for secure checkout, receipts, and compliance.
                  </p>
                </div>

                <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 pl-7 shadow-sm before:absolute before:inset-y-0 before:left-0 before:w-2 before:bg-blue-500">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  <h3 className="mt-3 font-bold text-slate-950">Provider setup</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Paste hosted donation links into env vars and the selector will show them as ready.
                  </p>
                </div>

                <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 pl-7 shadow-sm before:absolute before:inset-y-0 before:left-0 before:w-2 before:bg-indigo-500">
                  <Landmark className="h-5 w-5 text-indigo-600" />
                  <h3 className="mt-3 font-bold text-slate-950">Transparency first</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Keep platform donations visibly separate from campaign-finance information.
                  </p>
                </div>
              </aside>
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
