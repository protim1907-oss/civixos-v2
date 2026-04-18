"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { createClient } from "@/lib/supabase/client";
import {
  BarChart3,
  MapPinned,
  MessageSquare,
  TrendingUp,
  Smile,
  Meh,
  Frown,
} from "lucide-react";

type IssueRow = {
  id: string;
  title: string;
  description: string | null;
  district: string | null;
  category: string | null;
  status: string | null;
  created_at: string | null;
};

type PostRow = {
  id: string;
  content: string;
  created_at: string;
  discussion_id: string;
};

type DiscussionRow = {
  id: string;
  district: string | null;
  title: string | null;
  topic: string | null;
};

type DistrictMetric = {
  district: string;
  issues: number;
  posts: number;
  total: number;
  sentimentScore: number;
  positive: number;
  neutral: number;
  negative: number;
};

function normalizeDistrict(value: string | null | undefined) {
  const raw = (value || "").trim();

  if (!raw) return "Unknown";

  const upper = raw.toUpperCase();

  if (upper === "DISTRICT 12") return "CA-42";
  if (upper === "DISTRICT 42") return "CA-42";
  if (upper === "CA42") return "CA-42";
  if (upper === "TX35") return "TX-35";
  if (upper === "TX20") return "TX-20";
  if (upper === "TX12") return "TX-12";
  if (upper === "NH01") return "NH-01";
  if (upper === "NH02") return "NH-02";

  const compactMatch = upper.match(/^([A-Z]{2})(\d{1,2})$/);
  if (compactMatch) {
    return `${compactMatch[1]}-${Number(compactMatch[2])}`;
  }

  const spacedMatch = upper.match(/^([A-Z]{2})[\s-]?(\d{1,2})$/);
  if (spacedMatch) {
    return `${spacedMatch[1]}-${Number(spacedMatch[2])}`;
  }

  return upper;
}

function scoreSentiment(text: string) {
  const value = (text || "").toLowerCase();

  const positiveWords = [
    "good",
    "great",
    "improved",
    "improvement",
    "support",
    "helpful",
    "safe",
    "clean",
    "better",
    "progress",
    "resolved",
    "excellent",
    "success",
    "positive",
    "efficient",
  ];

  const negativeWords = [
    "bad",
    "worse",
    "broken",
    "delay",
    "delayed",
    "unsafe",
    "danger",
    "dirty",
    "flood",
    "pothole",
    "issue",
    "problem",
    "angry",
    "frustrated",
    "terrible",
    "slow",
    "crime",
    "failed",
    "negative",
  ];

  let score = 0;

  for (const word of positiveWords) {
    if (value.includes(word)) score += 1;
  }

  for (const word of negativeWords) {
    if (value.includes(word)) score -= 1;
  }

  if (score > 0) return 1;
  if (score < 0) return -1;
  return 0;
}

function getHeatColor(total: number, max: number) {
  if (max <= 0) return "bg-slate-100";
  const ratio = total / max;

  if (ratio >= 0.85) return "bg-red-500 text-white";
  if (ratio >= 0.65) return "bg-orange-400 text-white";
  if (ratio >= 0.45) return "bg-yellow-300 text-slate-900";
  if (ratio >= 0.25) return "bg-blue-300 text-slate-900";
  return "bg-slate-100 text-slate-900";
}

function getSentimentLabel(score: number) {
  if (score > 0.2) return "Positive";
  if (score < -0.2) return "Negative";
  return "Neutral";
}

function getSentimentIcon(score: number) {
  if (score > 0.2) return <Smile className="h-5 w-5 text-green-600" />;
  if (score < -0.2) return <Frown className="h-5 w-5 text-red-600" />;
  return <Meh className="h-5 w-5 text-amber-600" />;
}

export default function DistrictAnalyticsPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [discussions, setDiscussions] = useState<DiscussionRow[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>("All");

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoading(true);

        const [issuesRes, postsRes, discussionsRes] = await Promise.all([
          supabase
            .from("issues")
            .select("id, title, description, district, category, status, created_at")
            .neq("status", "removed"),

          supabase
            .from("posts")
            .select("id, content, created_at, discussion_id")
            .eq("status", "active"),

          supabase
            .from("discussions")
            .select("id, district, title, topic")
            .eq("status", "active"),
        ]);

        if (issuesRes.error) {
          console.error("Issues analytics load error:", issuesRes.error);
        }
        if (postsRes.error) {
          console.error("Posts analytics load error:", postsRes.error);
        }
        if (discussionsRes.error) {
          console.error("Discussions analytics load error:", discussionsRes.error);
        }

        setIssues((issuesRes.data as IssueRow[]) || []);
        setPosts((postsRes.data as PostRow[]) || []);
        setDiscussions((discussionsRes.data as DiscussionRow[]) || []);
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, [supabase]);

  const discussionMap = useMemo(() => {
    const map = new Map<string, DiscussionRow>();
    discussions.forEach((d) => map.set(d.id, d));
    return map;
  }, [discussions]);

  const districtMetrics = useMemo<DistrictMetric[]>(() => {
    const metrics: Record<string, DistrictMetric> = {};

    for (const issue of issues) {
      const district = normalizeDistrict(issue.district);

      if (!metrics[district]) {
        metrics[district] = {
          district,
          issues: 0,
          posts: 0,
          total: 0,
          sentimentScore: 0,
          positive: 0,
          neutral: 0,
          negative: 0,
        };
      }

      metrics[district].issues += 1;
      metrics[district].total += 1;

      const issueSentiment = scoreSentiment(
        `${issue.title || ""} ${issue.description || ""}`
      );

      if (issueSentiment > 0) metrics[district].positive += 1;
      else if (issueSentiment < 0) metrics[district].negative += 1;
      else metrics[district].neutral += 1;

      metrics[district].sentimentScore += issueSentiment;
    }

    for (const post of posts) {
      const discussion = discussionMap.get(post.discussion_id);
      const district = normalizeDistrict(discussion?.district);

      if (!metrics[district]) {
        metrics[district] = {
          district,
          issues: 0,
          posts: 0,
          total: 0,
          sentimentScore: 0,
          positive: 0,
          neutral: 0,
          negative: 0,
        };
      }

      metrics[district].posts += 1;
      metrics[district].total += 1;

      const postSentiment = scoreSentiment(post.content || "");

      if (postSentiment > 0) metrics[district].positive += 1;
      else if (postSentiment < 0) metrics[district].negative += 1;
      else metrics[district].neutral += 1;

      metrics[district].sentimentScore += postSentiment;
    }

    return Object.values(metrics)
      .map((item) => ({
        ...item,
        sentimentScore: item.total > 0 ? item.sentimentScore / item.total : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [issues, posts, discussionMap]);

  const availableDistricts = useMemo(() => {
    return ["All", ...districtMetrics.map((d) => d.district)];
  }, [districtMetrics]);

  const filteredMetrics = useMemo(() => {
    if (selectedDistrict === "All") return districtMetrics;
    return districtMetrics.filter((d) => d.district === selectedDistrict);
  }, [districtMetrics, selectedDistrict]);

  const maxTotal = useMemo(() => {
    return Math.max(...districtMetrics.map((d) => d.total), 0);
  }, [districtMetrics]);

  const summary = useMemo(() => {
    const totals = filteredMetrics.reduce(
      (acc, item) => {
        acc.issues += item.issues;
        acc.posts += item.posts;
        acc.positive += item.positive;
        acc.neutral += item.neutral;
        acc.negative += item.negative;
        acc.total += item.total;
        acc.sentimentScore += item.sentimentScore * item.total;
        return acc;
      },
      {
        issues: 0,
        posts: 0,
        positive: 0,
        neutral: 0,
        negative: 0,
        total: 0,
        sentimentScore: 0,
      }
    );

    const avgSentiment =
      totals.total > 0 ? totals.sentimentScore / totals.total : 0;

    return {
      ...totals,
      avgSentiment,
    };
  }, [filteredMetrics]);

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <Sidebar />

        <div className="flex-1 p-4 md:p-6 xl:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 px-6 py-6 md:px-8">
                <p className="text-sm font-medium text-blue-100/80">
                  District Analytics
                </p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">
                  Heatmap + Sentiment Intelligence
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100/80 md:text-base">
                  Understand where civic activity is concentrated and how citizens feel across districts.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-4 md:p-6">
                <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">Total Issues</p>
                    <MapPinned className="h-5 w-5 text-slate-400" />
                  </div>
                  <p className="mt-3 text-3xl font-bold text-slate-900">{summary.issues}</p>
                </div>

                <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">Total Posts</p>
                    <MessageSquare className="h-5 w-5 text-slate-400" />
                  </div>
                  <p className="mt-3 text-3xl font-bold text-slate-900">{summary.posts}</p>
                </div>

                <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">Sentiment</p>
                    {getSentimentIcon(summary.avgSentiment)}
                  </div>
                  <p className="mt-3 text-3xl font-bold text-slate-900">
                    {getSentimentLabel(summary.avgSentiment)}
                  </p>
                </div>

                <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">Districts Tracked</p>
                    <BarChart3 className="h-5 w-5 text-slate-400" />
                  </div>
                  <p className="mt-3 text-3xl font-bold text-slate-900">{districtMetrics.length}</p>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm text-slate-500">Filter</p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-900">
                    District Heatmap
                  </h2>
                </div>

                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none"
                >
                  {availableDistricts.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-6">
                {loading ? (
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-16 text-center">
                    <h3 className="text-2xl font-bold text-slate-900">Loading analytics...</h3>
                  </div>
                ) : filteredMetrics.length === 0 ? (
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-16 text-center">
                    <h3 className="text-2xl font-bold text-slate-900">No district data found</h3>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredMetrics.map((item) => (
                      <div
                        key={item.district}
                        className={`rounded-3xl p-5 shadow-sm ring-1 ring-slate-200 ${getHeatColor(
                          item.total,
                          maxTotal
                        )}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium opacity-80">District</p>
                            <h3 className="mt-1 text-2xl font-bold">{item.district}</h3>
                          </div>
                          <TrendingUp className="h-5 w-5 opacity-80" />
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                          <div className="rounded-2xl bg-white/30 p-3">
                            <p className="text-xs font-medium opacity-80">Issues</p>
                            <p className="mt-1 text-xl font-bold">{item.issues}</p>
                          </div>
                          <div className="rounded-2xl bg-white/30 p-3">
                            <p className="text-xs font-medium opacity-80">Posts</p>
                            <p className="mt-1 text-xl font-bold">{item.posts}</p>
                          </div>
                          <div className="rounded-2xl bg-white/30 p-3">
                            <p className="text-xs font-medium opacity-80">Total Activity</p>
                            <p className="mt-1 text-xl font-bold">{item.total}</p>
                          </div>
                          <div className="rounded-2xl bg-white/30 p-3">
                            <p className="text-xs font-medium opacity-80">Sentiment</p>
                            <p className="mt-1 text-xl font-bold">
                              {getSentimentLabel(item.sentimentScore)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 rounded-2xl bg-white/30 p-3">
                          <p className="text-xs font-medium opacity-80">Sentiment Breakdown</p>
                          <div className="mt-2 flex items-center gap-4 text-sm font-semibold">
                            <span>😊 {item.positive}</span>
                            <span>😐 {item.neutral}</span>
                            <span>☹️ {item.negative}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}