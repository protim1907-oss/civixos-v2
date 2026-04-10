"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/layout/Sidebar";
import { createClient } from "@/lib/supabase/client";

type FeedPost = {
  id: string | number;
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

function inferUrgency(title: string, description: string): FeedPost["urgency"] {
  const text = `${title} ${description}`.toLowerCase();

  if (
    text.includes("flood") ||
    text.includes("waterlogging") ||
    text.includes("danger") ||
    text.includes("unsafe") ||
    text.includes("pothole")
  ) {
    return "High";
  }

  if (
    text.includes("streetlight") ||
    text.includes("garbage") ||
    text.includes("drain") ||
    text.includes("traffic")
  ) {
    return "Medium";
  }

  return "Low";
}

function inferCategory(title: string, description: string) {
  const text = `${title} ${description}`.toLowerCase();

  if (
    text.includes("road") ||
    text.includes("pothole") ||
    text.includes("drain") ||
    text.includes("waterlogging") ||
    text.includes("pipeline")
  ) {
    return "Infrastructure";
  }

  if (
    text.includes("school") ||
    text.includes("crime") ||
    text.includes("police") ||
    text.includes("safety")
  ) {
    return "Public Safety";
  }

  if (
    text.includes("bus") ||
    text.includes("traffic") ||
    text.includes("crossing")
  ) {
    return "Transportation";
  }

  if (
    text.includes("garbage") ||
    text.includes("trash") ||
    text.includes("waste")
  ) {
    return "Sanitation";
  }

  return "General";
}

export default function FeedPage() {
  const router = useRouter();
  const supabase = createClient();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [urgencyFilter, setUrgencyFilter] = useState("All");

  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [currentDistrict, setCurrentDistrict] = useState("District 12");
  const [currentRepresentative, setCurrentRepresentative] = useState("Representative");
  const [loading, setLoading] = useState(true);
  const [debugMessage, setDebugMessage] = useState("");

  useEffect(() => {
    async function loadFeed() {
      try {
        setLoading(true);
        setDebugMessage("");

        const { data } = await supabase.auth.getSession();
        const session = data?.session;

        const guestUser =
          typeof window !== "undefined"
            ? localStorage.getItem("guest_user")
            : null;

        let district = "District 12";

        if (!session?.user && guestUser) {
          try {
            const parsedGuest = JSON.parse(guestUser);
            district =
              parsedGuest?.district ||
              parsedGuest?.district_name ||
              "District 12";
          } catch (error) {
            console.error("Guest parse error:", error);
          }
        }

        if (session?.user) {
          district =
            session.user.user_metadata?.district ||
            session.user.user_metadata?.district_name ||
            session.user.user_metadata?.district_id ||
            "District 12";
        }

        setCurrentDistrict(district);

        // Representatives table is named "representatives" in your DB
        const { data: repsData, error: repsError } = await supabase
          .from("representatives")
          .select("*")
          .limit(100);

        if (repsError) {
          console.error("Representative load error:", repsError);
        }

        const representativeName =
          repsData?.[0]?.name ||
          repsData?.[0]?.representative_name ||
          repsData?.[0]?.full_name ||
          "Representative";

        setCurrentRepresentative(representativeName);

        // Only select columns that are clearly present
        const { data: issuesData, error: issuesError } = await supabase
          .from("issues")
          .select("id, title, description, user_id")
          .limit(100)
          .order("id", { ascending: false });

        if (issuesError) {
          console.error("Issues load error:", issuesError);
          setFeedPosts([]);
          setDebugMessage(`Could not load issues: ${issuesError.message}`);
          return;
        }

        const mappedPosts: FeedPost[] = ((issuesData as any[]) || []).map(
          (issue, index) => ({
            id: issue.id ?? index,
            title: issue.title || "Untitled issue",
            description: issue.description || "No description provided.",
            district: district,
            category: inferCategory(issue.title || "", issue.description || ""),
            urgency: inferUrgency(issue.title || "", issue.description || ""),
            status: "Open",
            upvotes: 0,
            comments: 0,
            representative: representativeName,
          })
        );

        setFeedPosts(mappedPosts);

        if (mappedPosts.length === 0) {
          setDebugMessage("Issues table loaded successfully, but no rows were returned.");
        }
      } catch (error) {
        console.error("Feed load error:", error);
        setFeedPosts([]);
        setDebugMessage("Something went wrong while loading the feed.");
      } finally {
        setLoading(false);
      }
    }

    loadFeed();
  }, [supabase]);

  const filteredPosts = useMemo(() => {
    return feedPosts.filter((post) => {
      const q = search.toLowerCase().trim();

      const matchesSearch =
        !q ||
        post.title.toLowerCase().includes(q) ||
        post.description.toLowerCase().includes(q) ||
        post.district.toLowerCase().includes(q) ||
        post.representative.toLowerCase().includes(q) ||
        post.category.toLowerCase().includes(q);

      const matchesType =
        typeFilter === "All" || post.category === typeFilter;

      const matchesStatus =
        statusFilter === "All" || post.status === statusFilter;

      const matchesUrgency =
        urgencyFilter === "All" || post.urgency === urgencyFilter;

      return matchesSearch && matchesType && matchesStatus && matchesUrgency;
    });
  }, [feedPosts, search, typeFilter, statusFilter, urgencyFilter]);

  const availableCategories = useMemo(() => {
    const categories = Array.from(
      new Set(feedPosts.map((post) => post.category).filter(Boolean))
    );
    return ["All", ...categories];
  }, [feedPosts]);

  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
      <Sidebar />

      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
            <h1 className="text-3xl font-bold text-slate-900">District Feed</h1>
            <p className="mt-2 text-slate-600">
              Browse civic issues, track status, and connect with your representative
              in <span className="font-semibold text-slate-900">{currentDistrict}</span>.
            </p>
            {debugMessage ? (
              <p className="mt-3 text-sm text-amber-600">{debugMessage}</p>
            ) : null}
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
                {availableCategories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
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
            {loading ? (
              <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
                <p className="text-slate-600">Loading district feed...</p>
              </div>
            ) : filteredPosts.length === 0 ? (
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
                          {currentDistrict}
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

          {!loading && filteredPosts.length > 0 && (
            <div className="mt-6 rounded-2xl bg-white p-4 text-sm text-slate-500 shadow-sm">
              Showing {filteredPosts.length} issue
              {filteredPosts.length === 1 ? "" : "s"} for{" "}
              <span className="font-semibold text-slate-700">{currentDistrict}</span>.
              {" "}Primary representative:{" "}
              <span className="font-semibold text-slate-700">
                {currentRepresentative}
              </span>
              .
            </div>
          )}
        </div>
      </main>
    </div>
  );
}