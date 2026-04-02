"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/layout/Sidebar";

type FeedPost = {
  id: number;
  title: string;
  description: string;
  district: string;
  category: string;
  urgency: "High" | "Medium" | "Low";
  status: "Open" | "Under Review" | "Resolved" | "Escalated";
  upvotes: number;
  comments: number;
  representative: string;
};

const feedPosts: FeedPost[] = [
  {
    id: 1,
    title: "Potholes causing traffic delays on Main Street",
    description:
      "Residents have reported multiple potholes creating unsafe driving conditions and slowing down traffic during peak hours.",
    district: "California District 12",
    category: "Infrastructure",
    urgency: "High",
    status: "Open",
    upvotes: 42,
    comments: 18,
    representative: "Nancy Pelosi",
  },
  {
    id: 2,
    title: "Need improved street lighting near school zone",
    description:
      "Poor lighting near the school entrance is creating safety concerns for students and parents during early morning hours.",
    district: "California District 12",
    category: "Public Safety",
    urgency: "Medium",
    status: "Under Review",
    upvotes: 31,
    comments: 9,
    representative: "Nancy Pelosi",
  },
  {
    id: 3,
    title: "Overflowing trash bins in public park",
    description:
      "Waste bins in the neighborhood park are not being cleared regularly, affecting cleanliness and public health.",
    district: "California District 12",
    category: "Sanitation",
    urgency: "Low",
    status: "Resolved",
    upvotes: 19,
    comments: 6,
    representative: "Nancy Pelosi",
  },
  {
    id: 4,
    title: "Broken pedestrian crossing signal",
    description:
      "The crossing signal at a busy intersection is not functioning, making it dangerous for elderly residents and children.",
    district: "California District 12",
    category: "Transportation",
    urgency: "High",
    status: "Escalated",
    upvotes: 54,
    comments: 21,
    representative: "Nancy Pelosi",
  },
  {
    id: 5,
    title: "Request for more community policing presence",
    description:
      "Residents are asking for increased patrol visibility after a rise in petty theft complaints in the area.",
    district: "California District 12",
    category: "Public Safety",
    urgency: "Medium",
    status: "Under Review",
    upvotes: 27,
    comments: 12,
    representative: "Nancy Pelosi",
  },
  {
    id: 6,
    title: "Bus stop shelter damaged after storm",
    description:
      "The shelter roof is partially broken, leaving commuters exposed to rain and heat while waiting.",
    district: "California District 12",
    category: "Transportation",
    urgency: "Medium",
    status: "Open",
    upvotes: 23,
    comments: 7,
    representative: "Nancy Pelosi",
  },
];

function getStatusStyles(status: FeedPost["status"]) {
  switch (status) {
    case "Open":
      return "border-l-4 border-red-500";
    case "Under Review":
      return "border-l-4 border-amber-500";
    case "Resolved":
      return "border-l-4 border-emerald-500";
    case "Escalated":
      return "border-l-4 border-blue-500";
    default:
      return "border-l-4 border-slate-300";
  }
}

function getUrgencyBadge(urgency: FeedPost["urgency"]) {
  switch (urgency) {
    case "High":
      return "bg-red-100 text-red-700";
    case "Medium":
      return "bg-amber-100 text-amber-700";
    case "Low":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getStatusBadge(status: FeedPost["status"]) {
  switch (status) {
    case "Open":
      return "bg-red-100 text-red-700";
    case "Under Review":
      return "bg-amber-100 text-amber-700";
    case "Resolved":
      return "bg-emerald-100 text-emerald-700";
    case "Escalated":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function FeedPage() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [urgencyFilter, setUrgencyFilter] = useState("All");

  const filteredPosts = useMemo(() => {
    return feedPosts.filter((post) => {
      const matchesSearch =
        post.title.toLowerCase().includes(search.toLowerCase()) ||
        post.description.toLowerCase().includes(search.toLowerCase()) ||
        post.district.toLowerCase().includes(search.toLowerCase());

      const matchesType =
        typeFilter === "All" || post.category === typeFilter;

      const matchesStatus =
        statusFilter === "All" || post.status === statusFilter;

      const matchesUrgency =
        urgencyFilter === "All" || post.urgency === urgencyFilter;

      return matchesSearch && matchesType && matchesStatus && matchesUrgency;
    });
  }, [search, typeFilter, statusFilter, urgencyFilter]);

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <main className="flex-1 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900">District Feed</h1>
            <p className="mt-2 text-slate-600">
              Browse civic issues, track status, and connect with your representative.
            </p>
          </div>

          <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <input
                type="text"
                placeholder="Search issues..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              />

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              >
                <option>All</option>
                <option>Infrastructure</option>
                <option>Public Safety</option>
                <option>Sanitation</option>
                <option>Transportation</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              >
                <option>All</option>
                <option>Open</option>
                <option>Under Review</option>
                <option>Resolved</option>
                <option>Escalated</option>
              </select>

              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              >
                <option>All</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
          </div>

          <div className="space-y-5">
            {filteredPosts.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
                <p className="text-slate-600">No issues matched your filters.</p>
              </div>
            ) : (
              filteredPosts.map((post) => (
                <div
                  key={post.id}
                  className={`rounded-2xl bg-white p-6 shadow-sm ${getStatusStyles(
                    post.status
                  )}`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getUrgencyBadge(
                            post.urgency
                          )}`}
                        >
                          {post.urgency} Urgency
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(
                            post.status
                          )}`}
                        >
                          {post.status}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {post.category}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {post.district}
                        </span>
                      </div>

                      <h2 className="text-xl font-bold text-slate-900">
                        {post.title}
                      </h2>

                      <p className="mt-3 text-slate-600">{post.description}</p>

                      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                        <span>⬆ {post.upvotes} upvotes</span>
                        <span>💬 {post.comments} comments</span>
                        <span>Representative: {post.representative}</span>
                      </div>
                    </div>

                    <div className="flex w-full flex-col gap-3 lg:w-64">
                      <button
                        onClick={() =>
                          router.push(
                            `/chat/${encodeURIComponent(post.representative)}`
                          )
                        }
                        className="rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700"
                      >
                        Chat with my representative
                      </button>

                      <button
                        onClick={() =>
                          router.push(
                            `/chat/${encodeURIComponent(post.representative)}`
                          )
                        }
                        className="rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        View representative thread
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}