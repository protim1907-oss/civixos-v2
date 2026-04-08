"use client";

import Link from "next/link";

export default function OfficialUpdatesPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-6xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-slate-500">District Updates</p>
        <h1 className="mt-3 text-4xl font-bold text-slate-900">Official Updates</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          View verified announcements, public notices, and official communication from your
          representatives and district offices.
        </p>

        <div className="mt-8">
          <Link
            href="/dashboard"
            className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}