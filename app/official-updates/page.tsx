"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import {
  Megaphone,
  Search,
  Filter,
  Bell,
  ShieldCheck,
  CalendarDays,
  FileText,
  Building2,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";

type OfficialUpdate = {
  id: string;
  title: string;
  summary: string;
  category: "Public Notice" | "Policy Update" | "Infrastructure" | "Safety" | "Community";
  office: string;
  district: string;
  published_at: string;
  priority: "High" | "Medium" | "Routine";
  status: "Active" | "Scheduled" | "Closed";
};

const sampleUpdates: OfficialUpdate[] = [
  {
    id: "1",
    title: "Road resurfacing scheduled for Main Street corridor",
    summary:
      "District transportation teams will begin resurfacing work next week. Temporary lane closures and posted detours will be in effect during work hours.",
    category: "Infrastructure",
    office: "District Transportation Office",
    district: "New Hampshire",
    published_at: "2026-04-14",
    priority: "High",
    status: "Active",
  },
  {
    id: "2",
    title: "Public listening session on school safety improvements",
    summary:
      "Residents are invited to attend a community town hall to review proposed school safety upgrades and submit questions to district officials.",
    category: "Safety",
    office: "Education & Community Affairs",
    district: "New Hampshire",
    published_at: "2026-04-13",
    priority: "Medium",
    status: "Scheduled",
  },
  {
    id: "3",
    title: "Updated guidance on district stormwater maintenance",
    summary:
      "The district has released new maintenance guidance for storm drains, flood-prone streets, and reporting channels for blocked drainage infrastructure.",
    category: "Policy Update",
    office: "Public Works Department",
    district: "New Hampshire",
    published_at: "2026-04-11",
    priority: "Medium",
    status: "Active",
  },
  {
    id: "4",
    title: "Community grant applications open for local neighborhood projects",
    summary:
      "Civic and community organizations may now apply for district mini-grants supporting beautification, youth engagement, and neighborhood improvement programs.",
    category: "Community",
    office: "District Engagement Office",
    district: "New Hampshire",
    published_at: "2026-04-10",
    priority: "Routine",
    status: "Active",
  },
  {
    id: "5",
    title: "Temporary service disruption notice for permit processing",
    summary:
      "Permit intake may take longer than usual this week due to a planned system maintenance window. Residents are encouraged to submit urgent requests early.",
    category: "Public Notice",
    office: "District Administrative Services",
    district: "New Hampshire",
    published_at: "2026-04-09",
    priority: "High",
    status: "Active",
  },
];

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getPriorityClasses(priority: OfficialUpdate["priority"]) {
  switch (priority) {
    case "High":
      return "bg-red-50 text-red-700 border-red-200";
    case "Medium":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "Routine":
      return "bg-green-50 text-green-700 border-green-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

function getStatusClasses(status: OfficialUpdate["status"]) {
  switch (status) {
    case "Active":
      return "bg-blue-50 text-blue-700";
    case "Scheduled":
      return "bg-violet-50 text-violet-700";
    case "Closed":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function OfficialUpdatesPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const filteredUpdates = useMemo(() => {
    let result = [...sampleUpdates];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q) ||
          item.office.toLowerCase().includes(q)
      );
    }

    if (categoryFilter !== "all") {
      result = result.filter(
        (item) => item.category.toLowerCase() === categoryFilter
      );
    }

    if (priorityFilter !== "all") {
      result = result.filter(
        (item) => item.priority.toLowerCase() === priorityFilter
      );
    }

    return result.sort(
      (a, b) =>
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    );
  }, [search, categoryFilter, priorityFilter]);

  const activeCount = sampleUpdates.filter((u) => u.status === "Active").length;
  const highPriorityCount = sampleUpdates.filter((u) => u.priority === "High").length;
  const officeCount = new Set(sampleUpdates.map((u) => u.office)).size;

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <Sidebar />

        <div className="flex min-w-0 flex-1">
          <div className="w-full p-4 md:p-6 xl:p-8">
            <div className="mx-auto max-w-7xl space-y-6">
              <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 px-6 py-6 md:px-8">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-100/80">
                        District Updates
                      </p>
                      <h1 className="mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">
                        Official Updates
                      </h1>
                      <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100/80 md:text-base">
                        View verified announcements, public notices, policy changes,
                        and official communications from district offices and representatives.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white backdrop-blur">
                        <span className="font-semibold">Source:</span> Verified district offices
                      </div>

                      <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                      >
                        Back to Dashboard
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3 md:p-6">
                  <div className="rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-400 p-5 text-white shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-white/85">Active Notices</p>
                      <Bell className="h-5 w-5 text-white/85" />
                    </div>
                    <p className="mt-4 text-3xl font-bold">{activeCount}</p>
                  </div>

                  <div className="rounded-3xl bg-gradient-to-br from-red-500 to-rose-400 p-5 text-white shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-white/85">High Priority</p>
                      <AlertTriangle className="h-5 w-5 text-white/85" />
                    </div>
                    <p className="mt-4 text-3xl font-bold">{highPriorityCount}</p>
                  </div>

                  <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-green-400 p-5 text-white shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-white/85">Reporting Offices</p>
                      <Building2 className="h-5 w-5 text-white/85" />
                    </div>
                    <p className="mt-4 text-3xl font-bold">{officeCount}</p>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                <div className="space-y-6 xl:col-span-8">
                  <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm text-slate-500">Verified communication feed</p>
                        <h2 className="mt-1 text-2xl font-bold text-slate-900">
                          Latest Official Announcements
                        </h2>
                      </div>

                      <p className="text-sm text-slate-500">
                        {filteredUpdates.length} update{filteredUpdates.length !== 1 ? "s" : ""} found
                      </p>
                    </div>

                    <div className="mt-6 space-y-4">
                      {filteredUpdates.length === 0 ? (
                        <div className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-16 text-center">
                          <h3 className="text-2xl font-bold text-slate-900">No updates found</h3>
                          <p className="mt-3 text-slate-500">
                            Try changing your filters or search term.
                          </p>
                        </div>
                      ) : (
                        filteredUpdates.map((update) => (
                          <article
                            key={update.id}
                            className="rounded-3xl border border-slate-200 bg-white p-6 transition hover:border-slate-300 hover:bg-slate-50"
                          >
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                              <div>
                                <div className="mb-3 flex flex-wrap items-center gap-2">
                                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                    {update.category}
                                  </span>
                                  <span
                                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${getPriorityClasses(
                                      update.priority
                                    )}`}
                                  >
                                    {update.priority} Priority
                                  </span>
                                  <span
                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                                      update.status
                                    )}`}
                                  >
                                    {update.status}
                                  </span>
                                </div>

                                <h3 className="text-xl font-bold text-slate-900 md:text-2xl">
                                  {update.title}
                                </h3>

                                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
                                  {update.summary}
                                </p>

                                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                                  <span className="inline-flex items-center gap-2">
                                    <Building2 className="h-4 w-4" />
                                    {update.office}
                                  </span>
                                  <span className="inline-flex items-center gap-2">
                                    <CalendarDays className="h-4 w-4" />
                                    {formatDate(update.published_at)}
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                              >
                                View details
                                <ArrowRight className="h-4 w-4" />
                              </button>
                            </div>
                          </article>
                        ))
                      )}
                    </div>
                  </section>
                </div>

                <aside className="xl:col-span-4">
                  <div className="sticky top-6 space-y-6">
                    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="flex items-center gap-2">
                        <Search className="h-5 w-5 text-slate-400" />
                        <h2 className="text-xl font-semibold text-slate-900">Search</h2>
                      </div>

                      <input
                        type="text"
                        placeholder="Search official updates..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="mt-4 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                      />
                    </section>

                    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="flex items-center gap-2">
                        <Filter className="h-5 w-5 text-slate-400" />
                        <h3 className="text-xl font-semibold text-slate-900">Filters</h3>
                      </div>

                      <div className="mt-6">
                        <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                          Category
                        </h4>
                        <div className="mt-4 space-y-4 text-slate-700">
                          {[
                            ["all", "All"],
                            ["public notice", "Public Notice"],
                            ["policy update", "Policy Update"],
                            ["infrastructure", "Infrastructure"],
                            ["safety", "Safety"],
                            ["community", "Community"],
                          ].map(([value, label]) => (
                            <label key={value} className="flex items-center gap-3">
                              <input
                                type="radio"
                                name="category"
                                checked={categoryFilter === value}
                                onChange={() => setCategoryFilter(value)}
                                className="h-4 w-4"
                              />
                              <span>{label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="mt-8">
                        <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                          Priority
                        </h4>
                        <div className="mt-4 space-y-4 text-slate-700">
                          {[
                            ["all", "All"],
                            ["high", "High"],
                            ["medium", "Medium"],
                            ["routine", "Routine"],
                          ].map(([value, label]) => (
                            <label key={value} className="flex items-center gap-3">
                              <input
                                type="radio"
                                name="priority"
                                checked={priorityFilter === value}
                                onChange={() => setPriorityFilter(value)}
                                className="h-4 w-4"
                              />
                              <span>{label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </section>

                    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                      <p className="text-sm text-slate-500">Verification status</p>
                      <h3 className="mt-2 text-2xl font-bold text-slate-900">
                        Trusted Information
                      </h3>

                      <div className="mt-5 space-y-4">
                        <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                          <ShieldCheck className="mt-0.5 h-5 w-5 text-green-600" />
                          <div>
                            <p className="font-semibold text-slate-900">Verified source</p>
                            <p className="mt-1 text-sm text-slate-600">
                              All items on this page should come from district offices,
                              public agencies, or official representatives.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                          <CheckCircle2 className="mt-0.5 h-5 w-5 text-blue-600" />
                          <div>
                            <p className="font-semibold text-slate-900">Public relevance</p>
                            <p className="mt-1 text-sm text-slate-600">
                              Prioritize updates that affect district operations, safety,
                              services, timelines, and citizen engagement.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                          <Info className="mt-0.5 h-5 w-5 text-amber-600" />
                          <div>
                            <p className="font-semibold text-slate-900">Next enhancement</p>
                            <p className="mt-1 text-sm text-slate-600">
                              Next we can connect this page to Supabase and show only
                              live official notices by district, office, and publish date.
                            </p>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                      <p className="text-sm text-slate-500">Suggested content blocks</p>
                      <h3 className="mt-2 text-xl font-bold text-slate-900">
                        Good content for this page
                      </h3>

                      <div className="mt-4 space-y-3 text-sm text-slate-600">
                        <div className="rounded-2xl bg-slate-50 p-4">
                          Emergency alerts and urgent district notices
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4">
                          Public meeting schedules and hearing announcements
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4">
                          Road closures, repairs, and infrastructure work
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4">
                          Policy changes that affect residents directly
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4">
                          Grant programs, civic opportunities, and community notices
                        </div>
                      </div>
                    </section>
                  </div>
                </aside>
              </section>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}