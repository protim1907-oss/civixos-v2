"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/layout/Sidebar";
import {
  CheckCircle2,
  Copy,
  HeartHandshake,
  Landmark,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

const donationAmounts = [10, 25, 50, 100, 250];

// ---------------------------------------------------------------------------
// ACH / bank-transfer details.
// TODO: replace the empty placeholder fields with the real bank details once
// they are available. Any field left as "" renders as "To be added" so the
// layout is complete and safe to ship before the numbers arrive.
// ---------------------------------------------------------------------------
const ACH_DETAILS = {
  accountHolder: "Vote Beyond Party",
  bankName: "Chase",
  routingNumber: "111000614",
  accountNumber: "2909929787",
  accountType: "Checking",
  memo: "Civix250 donation",
  einNumber: "39-4801426",
  // Optional: address for donors who prefer to mail a check.
  checkPayableTo: "Vote Beyond Party",
  mailingAddress: "", // TODO: add mailing address if offering check donations
};

const PENDING_LABEL = "To be added";

function DetailRow({
  label,
  value,
  copyable,
}: {
  label: string;
  value: string;
  copyable?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const isPending = !value;

  async function handleCopy() {
    if (isPending) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable; silently ignore.
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
      <span className="text-sm text-slate-500">{label}</span>
      <div className="flex items-center gap-2">
        <span
          className={`text-sm font-semibold ${
            isPending ? "italic text-slate-400" : "text-slate-900"
          }`}
        >
          {isPending ? PENDING_LABEL : value}
        </span>
        {copyable && !isPending ? (
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
            title={`Copy ${label}`}
          >
            {copied ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function DonatePage() {
  const [selectedAmount, setSelectedAmount] = useState(25);
  const [customAmount, setCustomAmount] = useState("");
  const [frequency, setFrequency] = useState<"one-time" | "monthly">("one-time");

  const amount = useMemo(() => {
    const custom = Number(customAmount);
    return Number.isFinite(custom) && custom > 0 ? custom : selectedAmount;
  }, [customAmount, selectedAmount]);

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

            <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              {/* Suggested amount */}
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Step 1
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-950">
                    Choose an amount
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Use this as the amount for your bank transfer.
                  </p>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
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

                <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  You&apos;re preparing a{" "}
                  <span className="font-bold text-slate-900">${amount}</span>{" "}
                  {frequency === "monthly" ? "monthly" : "one-time"} gift.
                  {frequency === "monthly" ? (
                    <span className="mt-1 block text-xs text-slate-500">
                      Set up a recurring transfer with this amount in your bank&apos;s
                      bill-pay to give monthly.
                    </span>
                  ) : null}
                </div>
              </div>

              {/* ACH / bank transfer instructions */}
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-blue-600" />
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Step 2 · Bank transfer (ACH)
                  </p>
                </div>
                <h2 className="mt-2 text-2xl font-bold text-slate-950">
                  Send your gift by ACH
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Use the details below to send an ACH bank transfer from your bank&apos;s
                  bill-pay or transfer tool. Please include the memo so we can credit your gift.
                </p>

                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-2">
                  <DetailRow label="Account holder" value={ACH_DETAILS.accountHolder} copyable />
                  <DetailRow label="Bank name" value={ACH_DETAILS.bankName} copyable />
                  <DetailRow label="Routing number (ABA)" value={ACH_DETAILS.routingNumber} copyable />
                  <DetailRow label="Account number" value={ACH_DETAILS.accountNumber} copyable />
                  <DetailRow label="Account type" value={ACH_DETAILS.accountType} />
                  <DetailRow label="Memo / reference" value={ACH_DETAILS.memo} copyable />
                </div>

                {!ACH_DETAILS.routingNumber || !ACH_DETAILS.accountNumber ? (
                  <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
                    Bank details are being finalized and will appear here shortly. In the
                    meantime, email{" "}
                    <a
                      href="mailto:messages@civix250.ai?subject=Civix250%20ACH%20donation"
                      className="font-semibold underline"
                    >
                      messages@civix250.ai
                    </a>{" "}
                    to arrange your gift.
                  </p>
                ) : null}

                {/* Check option */}
                <div className="mt-5">
                  <p className="text-sm font-semibold text-slate-700">Prefer to mail a check?</p>
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-2">
                    <DetailRow label="Make payable to" value={ACH_DETAILS.checkPayableTo} copyable />
                    <DetailRow label="Mailing address" value={ACH_DETAILS.mailingAddress} copyable />
                  </div>
                </div>

                <div className="mt-5 space-y-2 text-xs leading-5 text-slate-500">
                  <p className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    Vote Beyond Party is a 501(c)(3) nonprofit. EIN {ACH_DETAILS.einNumber}.
                    Donations are tax-deductible to the extent permitted by law.
                  </p>
                  <p className="flex items-center gap-2">
                    <LockKeyhole className="h-4 w-4 text-slate-400" />
                    We never store your bank credentials — transfers are initiated entirely
                    from your own bank.
                  </p>
                </div>
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
