"use client";

import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-slate-500">Citizen Dashboard</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
              Welcome back, Samuel Jackson
            </h1>
            <p className="mt-4 max-w-4xl text-lg text-slate-600">
              Explore district activity, official announcements, community issues, and progress
              updates in Your District.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/create-post"
              className="rounded-2xl bg-red-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-600"
            >
              Create Post +
            </Link>

            <Link
              href="/feed"
              className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              View District Feed
            </Link>

            <Link
              href="/policy-pulse"
              className="rounded-2xl bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
            >
              Policy Pulse
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <button className="rounded-2xl bg-red-500 px-5 py-3 text-sm font-semibold text-white">
            All Posts
          </button>
          <button className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200">
            Official Updates
          </button>
          <button className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200">
            Community Issues
          </button>
          <button className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200">
            Resolved
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-1">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Search</h2>
            <input
              type="text"
              placeholder="Search posts..."
              className="mt-4 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            />
          </div>

          <div className="mt-8">
            <h3 className="text-xl font-semibold text-slate-900">Status</h3>
            <div className="mt-4 space-y-4 text-slate-700">
              <label className="flex items-center gap-3">
                <input type="radio" name="status" defaultChecked className="h-4 w-4" />
                <span>All</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="radio" name="status" className="h-4 w-4" />
                <span>Open</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="radio" name="status" className="h-4 w-4" />
                <span>Under Review</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="radio" name="status" className="h-4 w-4" />
                <span>Resolved</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="radio" name="status" className="h-4 w-4" />
                <span>Escalated</span>
              </label>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-xl font-semibold text-slate-900">Category</h3>
            <div className="mt-4 space-y-4 text-slate-700">
              <label className="flex items-center gap-3">
                <input type="radio" name="category" defaultChecked className="h-4 w-4" />
                <span>All</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="radio" name="category" className="h-4 w-4" />
                <span>Infrastructure</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="radio" name="category" className="h-4 w-4" />
                <span>Safety</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="radio" name="category" className="h-4 w-4" />
                <span>Transportation</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="radio" name="category" className="h-4 w-4" />
                <span>Environment</span>
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-6 xl:col-span-3">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-lg text-slate-500">Open Issues</p>
              <p className="mt-4 text-5xl font-bold text-slate-900">0</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-lg text-slate-500">Under Review</p>
              <p className="mt-4 text-5xl font-bold text-slate-900">0</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-lg text-slate-500">Resolved</p>
              <p className="mt-4 text-5xl font-bold text-slate-900">0</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-lg text-slate-500">Total Posts</p>
              <p className="mt-4 text-5xl font-bold text-slate-900">0</p>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
            <p className="text-lg text-slate-600">0 posts found</p>

            <div className="flex items-center gap-4">
              <span className="text-lg text-slate-600">Sort by:</span>
              <select className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm text-slate-700 outline-none">
                <option>Newest</option>
                <option>Oldest</option>
                <option>Most Commented</option>
              </select>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <h3 className="text-4xl font-bold text-slate-900">No posts found</h3>
            <p className="mt-4 text-xl text-slate-500">
              Try changing filters or create the first issue for this district.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}