"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type FeedPost = {
  id: number;
  title: string;
  author: string;
  type: "Official" | "Citizen" | "Community";
  status: "Open" | "Under Review" | "Resolved" | "Escalated";
  category: "Infrastructure" | "Safety" | "Sanitation" | "Transportation" | "Education";
  urgency: "Low" | "Medium" | "High";
  description: string;
  date: string;
  supports: number;
  comments: number;
};

const mockPosts: FeedPost[] = [
  {
    id: 1,
    title: "Streetlights not working on Maple Avenue",
    author: "Priya Sharma",
    type: "Citizen",
    status: "Open",
    category: "Safety",
    urgency: "High",
    description:
      "Several streetlights have been non-functional for more than a week, creating visibility and safety concerns for pedestrians.",
    date: "2026-03-28",
    supports: 18,
    comments: 6,
  },
  {
    id: 2,
    title: "Request for additional garbage bins near park",
    author: "Daniel Lee",
    type: "Citizen",
    status: "Under Review",
    category: "Sanitation",
    urgency: "Medium",
    description:
      "The park entrance and walking track area need more waste bins to reduce littering during weekends.",
    date: "2026-03-27",
    supports: 11,
    comments: 4,
  },
  {
    id: 3,
    title: "Crosswalk repainting near District Elementary",
    author: "District Office",
    type: "Official",
    status: "Resolved",
    category: "Transportation",
    urgency: "Medium",
    description:
      "Crosswalk repainting has been completed and reflective markers have been installed for improved safety.",
    date: "2026-03-25",
    supports: 24,
    comments: 8,
  },
  {
    id: 4,
    title: "Potholes on Elm Street causing traffic delays",
    author: "Marcus Chen",
    type: "Citizen",
    status: "Escalated",
    category: "Infrastructure",
    urgency: "High",
    description:
      "Multiple potholes are affecting traffic flow and vehicle safety, especially during rain.",
    date: "2026-03-26",
    supports: 31,
    comments: 12,
  },
  {
    id: 5,
    title: "Need safer bus stop shelter on 8th Street",
    author: "Ana Lopez",
    type: "Community",
    status: "Open",
    category: "Transportation",
    urgency: "Medium",
    description:
      "The current bus stop has no weather protection and poor lighting, making it difficult for students and elderly residents.",
    date: "2026-03-24",
    supports: 9,
    comments: 3,
  },
  {
    id: 6,
    title: "Improve school zone traffic signage",
    author: "District PTA",
    type: "Community",
    status: "Under Review",
    category: "Education",
    urgency: "High",
    description:
      "Better traffic signage and speed reminders are needed around the school zone during drop-off and pick-up hours.",
    date: "2026-03-23",
    supports: 16,
    comments: 7,
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
      return "bg-green-100 text-green-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function FeedPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [urgencyFilter, setUrgencyFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Newest");

  const filteredPosts = useMemo(() => {
    let result = [...mockPosts];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (post) =>
          post.title.toLowerCase().includes(q) ||
          post.description.toLowerCase().includes(q) ||
          post.author.toLowerCase().includes(q)
      );
    }

    if (typeFilter !== "All") {
      result = result.filter((post) => post.type === typeFilter);
    }

    if (statusFilter !== "All") {
      result = result.filter((post) => post.status === statusFilter);
    }

    if (categoryFilter !== "All") {
      result = result.filter((post) => post.category === categoryFilter);
    }

    if (urgencyFilter !== "All") {
      result = result.filter((post) => post.urgency === urgencyFilter);
    }

    if (sortBy === "Newest") {
      result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (sortBy === "Most Supported") {
      result.sort((a, b) => b.supports - a.supports);
    } else if (sortBy === "Most Commented") {
      result.sort((a, b) => b.comments - a.comments);
    }

    return result;
  }, [search, typeFilter, statusFilter, categoryFilter, urgencyFilter, sortBy]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">District Feed</p>
              <h1 className="text-2xl font-bold text-slate-900">California District 12</h1>
              <p className="mt-1 text-sm text-slate-600">
                Track civic issues, community proposals, and official updates in your district.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/create-post"
                className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-600"
              >
                New Issue +
              </Link>
              <Link
                href="/chat-representatives"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Chat with Representative
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="mb-5">
              <label className="mb-2 block text-sm font-semibold text-slate-700">Search</label>
              <input
                type="text"
                placeholder="Search issues..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
              />
            </div>

            <div className="space-y-5">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-800">Type</h3>
                <div className="space-y-2 text-sm text-slate-700">
                  {["All", "Official", "Citizen", "Community"].map((item) => (
                    <label key={item} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="type"
                        checked={typeFilter === item}
                        onChange={() => setTypeFilter(item)}
                      />
                      {item}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-800">Status</h3>
                <div className="space-y-2 text-sm text-slate-700">
                  {["All", "Open", "Under Review", "Resolved", "Escalated"].map((item) => (
                    <label key={item} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="status"
                        checked={statusFilter === item}
                        onChange={() => setStatusFilter(item)}
                      />
                      {item}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-800">Category</h3>
                <div className="space-y-2 text-sm text-slate-700">
                  {[
                    "All",
                    "Infrastructure",
                    "Safety",
                    "Sanitation",
                    "Transportation",
                    "Education",
                  ].map((item) => (
                    <label key={item} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="category"
                        checked={categoryFilter === item}
                        onChange={() => setCategoryFilter(item)}
                      />
                      {item}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-800">Urgency</h3>
                <div className="space-y-2 text-sm text-slate-700">
                  {["All", "High", "Medium", "Low"].map((item) => (
                    <label key={item} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="urgency"
                        checked={urgencyFilter === item}
                        onChange={() => setUrgencyFilter(item)}
                      />
                      {item}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <section>
            <div className="mb-4 flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">{filteredPosts.length}</span> posts found
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-slate-700">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                >
                  <option>Newest</option>
                  <option>Most Supported</option>
                  <option>Most Commented</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              {filteredPosts.map((post) => (
                <div
                  key={post.id}
                  className={`rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 ${getStatusStyles(post.status)}`}
                >
                  <div className="p-5">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {post.type}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getUrgencyBadge(post.urgency)}`}
                      >
                        {post.urgency} Urgency
                      </span>
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        {post.category}
                      </span>
                    </div>

                    <h2 className="text-lg font-bold text-slate-900">{post.title}</h2>

                    <p className="mt-1 text-sm text-slate-500">
                      By {post.author} · {new Date(post.date).toLocaleDateString()}
                    </p>

                    <p className="mt-4 text-sm leading-6 text-slate-700">{post.description}</p>

                    <div className="mt-4 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      Status: {post.status}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 border-t border-slate-200 text-sm text-slate-600">
                    <div className="flex items-center justify-center px-4 py-3">
                      👍 {post.supports}
                    </div>
                    <div className="flex items-center justify-center border-x border-slate-200 px-4 py-3">
                      💬 {post.comments}
                    </div>
                    <div className="flex items-center justify-center px-4 py-3">
                      📍 District 12
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
                    <Link
                      href={`/feed/${post.id}`}
                      className="text-sm font-semibold text-slate-700 hover:text-red-600"
                    >
                      View Details
                    </Link>

                    <button className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600">
                      Support
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}