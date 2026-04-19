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
  AlertTriangle,
  Activity,
  ShieldAlert,
  Database,
  Clock3,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
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
  content: string | null;
  created_at: string | null;
  discussion_id: string | null;
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
  positivePct: number;
  neutralPct: number;
  negativePct: number;
  topCategory: string;
  lastActivityAt: string | null;
  activeIssues: number;
  reviewIssues: number;
  resolvedIssues: number;
  removedIssues: number;
  riskLevel: "Low" | "Medium" | "High";
  riskScore: number;
  activityDeltaPct: number;
};

type TrendPoint = {
  date: string;
  label: string;
  issues: number;
  posts: number;
  total: number;
  positive: number;
  neutral: number;
  negative: number;
};

type AlertSignal = {
  id: string;
  level: "high" | "medium" | "low";
  title: string;
  description: string;
  district?: string;
};

type ThemeRow = {
  theme: string;
  count: number;
  districts: number;
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
  const value = text.toLowerCase();

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
    "fixed",
    "faster",
    "strong",
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
    "damaged",
    "blocked",
    "concern",
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
  if (max <= 0) return "bg-slate-100 text-slate-900";
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

function getRiskLevelFromScore(score: number): "Low" | "Medium" | "High" {
  if (score >= 70) return "High";
  if (score >= 35) return "Medium";
  return "Low";
}

function getRiskBadgeClasses(level: "Low" | "Medium" | "High") {
  switch (level) {
    case "High":
      return "bg-red-100 text-red-700 ring-red-200";
    case "Medium":
      return "bg-amber-100 text-amber-700 ring-amber-200";
    default:
      return "bg-emerald-100 text-emerald-700 ring-emerald-200";
  }
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function getTrendTextClasses(delta: number) {
  if (delta > 0) return "text-red-600";
  if (delta < 0) return "text-emerald-600";
  return "text-slate-500";
}

function daysAgo(date: Date, count: number) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - count);
  return next;
}

function toDayKey(value: string | null | undefined) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

function categoryBucket(text: string | null | undefined) {
  const value = String(text || "").toLowerCase();

  if (/(housing|rent|zoning|home|affordability|homeless)/.test(value)) {
    return "Housing";
  }
  if (/(school|education|student|teacher|college)/.test(value)) {
    return "Education";
  }
  if (/(road|traffic|bridge|transit|bus|rail|transport|infrastructure)/.test(value)) {
    return "Transportation";
  }
  if (/(crime|police|public safety|fire|emergency|violence)/.test(value)) {
    return "Public Safety";
  }
  if (/(health|hospital|clinic|mental health|healthcare)/.test(value)) {
    return "Healthcare";
  }
  if (/(budget|tax|funding|finance|spending)/.test(value)) {
    return "Budget & Taxes";
  }
  if (/(water|climate|energy|environment|pollution|storm|flood)/.test(value)) {
    return "Environment";
  }
  if (/(policy|bill|election|vote|council|government)/.test(value)) {
    return "Policy";
  }

  return "General";
}

function percent(part: number, whole: number) {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

export default function DistrictAnalyticsPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [discussions, setDiscussions] = useState<DiscussionRow[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"total" | "risk" | "sentiment" | "lastActivity">("total");

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
            .select("id, content, created_at, discussion_id, status")
            .eq("status", "active"),

          supabase
            .from("discussions")
            .select("id, district, title, topic, status")
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

        setIssues((issuesRes.data as IssueRow[]) ?? []);
        setPosts(((postsRes.data as Array<Record<string, unknown>>) ?? []).map((row) => ({
          id: String(row.id ?? ""),
          content: (row.content as string | null) ?? null,
          created_at: (row.created_at as string | null) ?? null,
          discussion_id: (row.discussion_id as string | null) ?? null,
        })));
        setDiscussions(((discussionsRes.data as Array<Record<string, unknown>>) ?? []).map((row) => ({
          id: String(row.id ?? ""),
          district: (row.district as string | null) ?? null,
          title: (row.title as string | null) ?? null,
          topic: (row.topic as string | null) ?? null,
        })));
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, [supabase]);

  const discussionMap = useMemo(() => {
    const map = new Map<string, DiscussionRow>();
    discussions.forEach((discussion) => {
      map.set(discussion.id, discussion);
    });
    return map;
  }, [discussions]);

  const trendData = useMemo<TrendPoint[]>(() => {
    const now = new Date();
    const keys: string[] = [];
    const baseMap = new Map<string, TrendPoint>();

    for (let i = 6; i >= 0; i -= 1) {
      const date = daysAgo(now, i);
      const key = date.toISOString().slice(0, 10);
      keys.push(key);
      baseMap.set(key, {
        date: key,
        label: formatDateLabel(key),
        issues: 0,
        posts: 0,
        total: 0,
        positive: 0,
        neutral: 0,
        negative: 0,
      });
    }

    for (const issue of issues) {
      const key = toDayKey(issue.created_at);
      if (!key || !baseMap.has(key)) continue;

      const point = baseMap.get(key)!;
      const sentiment = scoreSentiment(`${issue.title || ""} ${issue.description || ""}`);
      point.issues += 1;
      point.total += 1;

      if (sentiment > 0) point.positive += 1;
      else if (sentiment < 0) point.negative += 1;
      else point.neutral += 1;
    }

    for (const post of posts) {
      const key = toDayKey(post.created_at);
      if (!key || !baseMap.has(key)) continue;

      const point = baseMap.get(key)!;
      const sentiment = scoreSentiment(post.content || "");
      point.posts += 1;
      point.total += 1;

      if (sentiment > 0) point.positive += 1;
      else if (sentiment < 0) point.negative += 1;
      else point.neutral += 1;
    }

    return keys.map((key) => baseMap.get(key)!);
  }, [issues, posts]);

  const districtMetrics = useMemo<DistrictMetric[]>(() => {
    const metrics: Record<string, DistrictMetric> = {};
    const currentWindowStart = daysAgo(new Date(), 6).getTime();
    const previousWindowStart = daysAgo(new Date(), 13).getTime();

    const districtCurrentCounts: Record<string, number> = {};
    const districtPreviousCounts: Record<string, number> = {};
    const districtCategories: Record<string, Record<string, number>> = {};
    const districtLastActivity: Record<string, string | null> = {};

    const ensureMetric = (district: string) => {
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
          positivePct: 0,
          neutralPct: 0,
          negativePct: 0,
          topCategory: "General",
          lastActivityAt: null,
          activeIssues: 0,
          reviewIssues: 0,
          resolvedIssues: 0,
          removedIssues: 0,
          riskLevel: "Low",
          riskScore: 0,
          activityDeltaPct: 0,
        };
      }
    };

    for (const issue of issues) {
      const district = normalizeDistrict(issue.district);
      ensureMetric(district);

      metrics[district].issues += 1;
      metrics[district].total += 1;

      const issueSentiment = scoreSentiment(`${issue.title || ""} ${issue.description || ""}`);
      if (issueSentiment > 0) metrics[district].positive += 1;
      else if (issueSentiment < 0) metrics[district].negative += 1;
      else metrics[district].neutral += 1;

      metrics[district].sentimentScore += issueSentiment;

      const status = String(issue.status || "").toLowerCase();
      if (status === "under_review") metrics[district].reviewIssues += 1;
      else if (status === "resolved") metrics[district].resolvedIssues += 1;
      else if (status === "removed") metrics[district].removedIssues += 1;
      else metrics[district].activeIssues += 1;

      const bucket = categoryBucket(issue.category || issue.title || issue.description || "");
      districtCategories[district] = districtCategories[district] || {};
      districtCategories[district][bucket] = (districtCategories[district][bucket] || 0) + 1;

      const createdAt = issue.created_at ? new Date(issue.created_at).getTime() : 0;
      if (createdAt >= currentWindowStart) {
        districtCurrentCounts[district] = (districtCurrentCounts[district] || 0) + 1;
      } else if (createdAt >= previousWindowStart && createdAt < currentWindowStart) {
        districtPreviousCounts[district] = (districtPreviousCounts[district] || 0) + 1;
      }

      if (
        issue.created_at &&
        (!districtLastActivity[district] ||
          new Date(issue.created_at).getTime() >
            new Date(districtLastActivity[district] || 0).getTime())
      ) {
        districtLastActivity[district] = issue.created_at;
      }
    }

    for (const post of posts) {
      const discussion = post.discussion_id ? discussionMap.get(post.discussion_id) : undefined;
      const district = normalizeDistrict(discussion?.district);
      ensureMetric(district);

      metrics[district].posts += 1;
      metrics[district].total += 1;

      const postSentiment = scoreSentiment(post.content || "");
      if (postSentiment > 0) metrics[district].positive += 1;
      else if (postSentiment < 0) metrics[district].negative += 1;
      else metrics[district].neutral += 1;

      metrics[district].sentimentScore += postSentiment;

      const bucket = categoryBucket(
        `${discussion?.topic || ""} ${discussion?.title || ""} ${post.content || ""}`
      );
      districtCategories[district] = districtCategories[district] || {};
      districtCategories[district][bucket] = (districtCategories[district][bucket] || 0) + 1;

      const createdAt = post.created_at ? new Date(post.created_at).getTime() : 0;
      if (createdAt >= currentWindowStart) {
        districtCurrentCounts[district] = (districtCurrentCounts[district] || 0) + 1;
      } else if (createdAt >= previousWindowStart && createdAt < currentWindowStart) {
        districtPreviousCounts[district] = (districtPreviousCounts[district] || 0) + 1;
      }

      if (
        post.created_at &&
        (!districtLastActivity[district] ||
          new Date(post.created_at).getTime() >
            new Date(districtLastActivity[district] || 0).getTime())
      ) {
        districtLastActivity[district] = post.created_at;
      }
    }

    return Object.values(metrics)
      .map((item) => {
        const avgSentiment = item.total > 0 ? item.sentimentScore / item.total : 0;
        const topCategoryEntries = Object.entries(districtCategories[item.district] || {}).sort(
          (a, b) => b[1] - a[1]
        );
        const topCategory = topCategoryEntries[0]?.[0] || "General";

        const currentCount = districtCurrentCounts[item.district] || 0;
        const previousCount = districtPreviousCounts[item.district] || 0;

        const deltaPct =
          previousCount > 0
            ? Math.round(((currentCount - previousCount) / previousCount) * 100)
            : currentCount > 0
            ? 100
            : 0;

        const negativePct = item.total > 0 ? (item.negative / item.total) * 100 : 0;
        const reviewPct = item.issues > 0 ? (item.reviewIssues / item.issues) * 100 : 0;
        const unknownPenalty = item.district === "Unknown" ? 20 : 0;

        const riskScore = Math.min(
          100,
          Math.round(
            negativePct * 0.6 + reviewPct * 0.8 + Math.min(item.total * 4, 30) + unknownPenalty
          )
        );

        return {
          ...item,
          sentimentScore: avgSentiment,
          positivePct: percent(item.positive, item.total),
          neutralPct: percent(item.neutral, item.total),
          negativePct: percent(item.negative, item.total),
          topCategory,
          lastActivityAt: districtLastActivity[item.district] || null,
          riskScore,
          riskLevel: getRiskLevelFromScore(riskScore),
          activityDeltaPct: deltaPct,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [issues, posts, discussionMap]);

  const availableDistricts = useMemo(() => {
    return ["All", ...districtMetrics.map((d) => d.district)];
  }, [districtMetrics]);

  const filteredMetrics = useMemo(() => {
    let result = districtMetrics;

    if (selectedDistrict !== "All") {
      result = result.filter((d) => d.district === selectedDistrict);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (d) =>
          d.district.toLowerCase().includes(q) ||
          d.topCategory.toLowerCase().includes(q) ||
          d.riskLevel.toLowerCase().includes(q)
      );
    }

    const sorted = [...result];

    if (sortBy === "risk") {
      sorted.sort((a, b) => b.riskScore - a.riskScore || b.total - a.total);
    } else if (sortBy === "sentiment") {
      sorted.sort((a, b) => a.sentimentScore - b.sentimentScore || b.total - a.total);
    } else if (sortBy === "lastActivity") {
      sorted.sort(
        (a, b) =>
          new Date(b.lastActivityAt || 0).getTime() -
          new Date(a.lastActivityAt || 0).getTime()
      );
    } else {
      sorted.sort((a, b) => b.total - a.total || b.riskScore - a.riskScore);
    }

    return sorted;
  }, [districtMetrics, selectedDistrict, searchTerm, sortBy]);

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
        acc.reviewIssues += item.reviewIssues;
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
        reviewIssues: 0,
      }
    );

    const avgSentiment = totals.total > 0 ? totals.sentimentScore / totals.total : 0;
    const reviewRate =
      totals.issues > 0 ? Math.round((totals.reviewIssues / totals.issues) * 100) : 0;

    return {
      ...totals,
      avgSentiment,
      positivePct: percent(totals.positive, totals.total),
      neutralPct: percent(totals.neutral, totals.total),
      negativePct: percent(totals.negative, totals.total),
      reviewRate,
    };
  }, [filteredMetrics]);

  const executiveSignals = useMemo(() => {
    const totalCurrentWeek = trendData.reduce((sum, item) => sum + item.total, 0);

    const previousWeekEstimate = Math.max(
      0,
      districtMetrics.reduce((sum, item) => {
        const estimate =
          item.activityDeltaPct !== 0
            ? Math.max(
                0,
                Math.round(item.total / (1 + item.activityDeltaPct / 100))
              )
            : item.total;
        return sum + estimate;
      }, 0)
    );

    const activityDeltaPct =
      previousWeekEstimate > 0
        ? Math.round(((totalCurrentWeek - previousWeekEstimate) / previousWeekEstimate) * 100)
        : totalCurrentWeek > 0
        ? 100
        : 0;

    const highestRiskDistrict = [...districtMetrics].sort(
      (a, b) => b.riskScore - a.riskScore || b.total - a.total
    )[0];

    const fastestGrowingDistrict = [...districtMetrics].sort(
      (a, b) => b.activityDeltaPct - a.activityDeltaPct || b.total - a.total
    )[0];

    return {
      totalCurrentWeek,
      activityDeltaPct,
      highestRiskDistrict,
      fastestGrowingDistrict,
    };
  }, [trendData, districtMetrics]);

  const topThemes = useMemo<ThemeRow[]>(() => {
    const themeMap = new Map<string, { count: number; districts: Set<string> }>();

    for (const issue of issues) {
      const district = normalizeDistrict(issue.district);
      const bucket = categoryBucket(issue.category || `${issue.title} ${issue.description || ""}`);
      const current = themeMap.get(bucket) || { count: 0, districts: new Set<string>() };
      current.count += 1;
      current.districts.add(district);
      themeMap.set(bucket, current);
    }

    for (const post of posts) {
      const discussion = post.discussion_id ? discussionMap.get(post.discussion_id) : undefined;
      const district = normalizeDistrict(discussion?.district);
      const bucket = categoryBucket(
        `${discussion?.topic || ""} ${discussion?.title || ""} ${post.content || ""}`
      );
      const current = themeMap.get(bucket) || { count: 0, districts: new Set<string>() };
      current.count += 1;
      current.districts.add(district);
      themeMap.set(bucket, current);
    }

    return [...themeMap.entries()]
      .map(([theme, data]) => ({
        theme,
        count: data.count,
        districts: data.districts.size,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [issues, posts, discussionMap]);

  const alerts = useMemo<AlertSignal[]>(() => {
    const items: AlertSignal[] = [];

    const highRisk = districtMetrics.filter((d) => d.riskLevel === "High").slice(0, 2);
    for (const district of highRisk) {
      items.push({
        id: `high-risk-${district.district}`,
        level: "high",
        title: `${district.district} is under elevated pressure`,
        description: `${district.negativePct}% negative sentiment with ${district.reviewIssues} issues currently flagged for review.`,
        district: district.district,
      });
    }

    const unmapped = districtMetrics.find((d) => d.district === "Unknown");
    if (unmapped && unmapped.total > 0) {
      items.push({
        id: "unmapped-district",
        level: "medium",
        title: "Unmapped district activity detected",
        description: `${unmapped.total} records are landing in Unknown. District mapping cleanup is recommended for better analytics trust.`,
        district: "Unknown",
      });
    }

    const growing = districtMetrics
      .filter((d) => d.activityDeltaPct >= 50)
      .sort((a, b) => b.activityDeltaPct - a.activityDeltaPct)[0];

    if (growing) {
      items.push({
        id: `growth-${growing.district}`,
        level: "medium",
        title: `${growing.district} activity is rising`,
        description: `Civic activity is up ${growing.activityDeltaPct}% versus the previous period.`,
        district: growing.district,
      });
    }

    if (items.length === 0) {
      items.push({
        id: "stable",
        level: "low",
        title: "No major anomaly detected",
        description: "District activity and sentiment appear stable across the current reporting window.",
      });
    }

    return items.slice(0, 4);
  }, [districtMetrics]);

  const chartBars = useMemo(() => {
    const max = Math.max(...trendData.map((d) => d.total), 1);

    return trendData.map((point) => ({
      ...point,
      totalHeight: Math.max(12, Math.round((point.total / max) * 100)),
      positiveHeight: point.total > 0 ? Math.max(8, Math.round((point.positive / max) * 100)) : 8,
      neutralHeight: point.total > 0 ? Math.max(8, Math.round((point.neutral / max) * 100)) : 8,
      negativeHeight: point.total > 0 ? Math.max(8, Math.round((point.negative / max) * 100)) : 8,
    }));
  }, [trendData]);

  const dataIntegrity = useMemo(() => {
    const totalTracked = districtMetrics.reduce((sum, d) => sum + d.total, 0);
    const unknown = districtMetrics.find((d) => d.district === "Unknown");
    const mapped = totalTracked - (unknown?.total || 0);
    const mappingCoverage = totalTracked > 0 ? Math.round((mapped / totalTracked) * 100) : 100;

    return {
      totalTracked,
      unknownCount: unknown?.total || 0,
      mappingCoverage,
      lastSync: new Date().toISOString(),
      confidence:
        summary.total > 0
          ? Math.max(60, Math.min(96, 100 - Math.round((unknown?.total || 0) * 2)))
          : 100,
    };
  }, [districtMetrics, summary.total]);

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <Sidebar />

        <div className="flex-1 p-4 md:p-6 xl:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 px-6 py-6 md:px-8">
                <p className="text-sm font-medium text-blue-100/80">District Analytics</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">
                  District Intelligence Workspace
                </h1>
                <p className="mt-3 max-w-4xl text-sm leading-6 text-blue-100/80 md:text-base">
                  Monitor civic activity, compare district sentiment, surface risk signals,
                  and understand where attention is needed most.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-4 md:p-6">
                <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">Total Civic Activity</p>
                    <Activity className="h-5 w-5 text-slate-400" />
                  </div>
                  <p className="mt-3 text-3xl font-bold text-slate-900">{summary.total}</p>
                  <div
                    className={`mt-3 flex items-center gap-1 text-sm font-semibold ${getTrendTextClasses(
                      executiveSignals.activityDeltaPct
                    )}`}
                  >
                    {executiveSignals.activityDeltaPct > 0 ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : executiveSignals.activityDeltaPct < 0 ? (
                      <ArrowDownRight className="h-4 w-4" />
                    ) : (
                      <Minus className="h-4 w-4" />
                    )}
                    <span>
                      {executiveSignals.activityDeltaPct >= 0 ? "+" : ""}
                      {executiveSignals.activityDeltaPct}% vs prior period
                    </span>
                  </div>
                </div>

                <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">Dominant Sentiment</p>
                    {summary.avgSentiment > 0.2 ? (
                      <Smile className="h-5 w-5 text-green-600" />
                    ) : summary.avgSentiment < -0.2 ? (
                      <Frown className="h-5 w-5 text-red-600" />
                    ) : (
                      <Meh className="h-5 w-5 text-amber-600" />
                    )}
                  </div>
                  <p className="mt-3 text-3xl font-bold text-slate-900">
                    {getSentimentLabel(summary.avgSentiment)}
                  </p>
                  <p className="mt-3 text-sm text-slate-500">
                    {summary.negativePct}% negative · {summary.neutralPct}% neutral ·{" "}
                    {summary.positivePct}% positive
                  </p>
                </div>

                <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">Highest Risk District</p>
                    <ShieldAlert className="h-5 w-5 text-slate-400" />
                  </div>
                  <p className="mt-3 text-3xl font-bold text-slate-900">
                    {executiveSignals.highestRiskDistrict?.district || "—"}
                  </p>
                  <div className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
                    {executiveSignals.highestRiskDistrict?.riskLevel || "Low"} Risk
                  </div>
                </div>

                <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">Fastest Growing District</p>
                    <TrendingUp className="h-5 w-5 text-slate-400" />
                  </div>
                  <p className="mt-3 text-3xl font-bold text-slate-900">
                    {executiveSignals.fastestGrowingDistrict?.district || "—"}
                  </p>
                  <p className="mt-3 text-sm font-semibold text-slate-600">
                    {executiveSignals.fastestGrowingDistrict
                      ? `${executiveSignals.fastestGrowingDistrict.activityDeltaPct >= 0 ? "+" : ""}${executiveSignals.fastestGrowingDistrict.activityDeltaPct}% activity change`
                      : "No recent growth signal"}
                  </p>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Signals</p>
                    <h2 className="mt-1 text-2xl font-bold text-slate-900">Alerts & Insights</h2>
                  </div>
                  <AlertTriangle className="h-5 w-5 text-slate-400" />
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`rounded-3xl border p-5 ${
                        alert.level === "high"
                          ? "border-red-200 bg-red-50"
                          : alert.level === "medium"
                          ? "border-amber-200 bg-amber-50"
                          : "border-emerald-200 bg-emerald-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              alert.level === "high"
                                ? "bg-red-100 text-red-700"
                                : alert.level === "medium"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {alert.level.toUpperCase()}
                          </span>
                          <h3 className="mt-3 text-lg font-semibold text-slate-900">
                            {alert.title}
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {alert.description}
                          </p>
                        </div>
                        <AlertTriangle className="mt-1 h-5 w-5 text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Integrity</p>
                    <h2 className="mt-1 text-2xl font-bold text-slate-900">Data Quality</h2>
                  </div>
                  <Database className="h-5 w-5 text-slate-400" />
                </div>

                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Mapped district coverage
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                      {dataIntegrity.mappingCoverage}%
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Unmapped records
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                      {dataIntegrity.unknownCount}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Confidence estimate
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                      {dataIntegrity.confidence}%
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Clock3 className="h-4 w-4" />
                    Last sync: {formatDateTime(dataIntegrity.lastSync)}
                  </div>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Trend</p>
                    <h2 className="mt-1 text-2xl font-bold text-slate-900">7-Day Activity Trend</h2>
                  </div>
                  <BarChart3 className="h-5 w-5 text-slate-400" />
                </div>

                <div className="mt-8">
                  <div className="flex h-72 items-end gap-3 rounded-3xl bg-slate-50 p-4">
                    {chartBars.map((point) => (
                      <div key={point.date} className="flex flex-1 flex-col items-center gap-3">
                        <div className="flex h-56 w-full items-end justify-center gap-1">
                          <div
                            className="w-3 rounded-t-full bg-emerald-500"
                            style={{ height: `${point.positiveHeight}%` }}
                            title={`Positive: ${point.positive}`}
                          />
                          <div
                            className="w-3 rounded-t-full bg-amber-400"
                            style={{ height: `${point.neutralHeight}%` }}
                            title={`Neutral: ${point.neutral}`}
                          />
                          <div
                            className="w-3 rounded-t-full bg-red-500"
                            style={{ height: `${point.negativeHeight}%` }}
                            title={`Negative: ${point.negative}`}
                          />
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-semibold text-slate-700">{point.label}</p>
                          <p className="mt-1 text-xs text-slate-500">{point.total} total</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-emerald-500" />
                      Positive
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-amber-400" />
                      Neutral
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-red-500" />
                      Negative
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Themes</p>
                    <h2 className="mt-1 text-2xl font-bold text-slate-900">Top Civic Themes</h2>
                  </div>
                  <MapPinned className="h-5 w-5 text-slate-400" />
                </div>

                <div className="mt-6 space-y-3">
                  {topThemes.map((theme, index) => (
                    <div key={theme.theme} className="rounded-2xl bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{theme.theme}</p>
                            <p className="text-sm text-slate-500">
                              {theme.districts} districts involved
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-slate-900">{theme.count}</p>
                          <p className="text-xs text-slate-500">records</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {topThemes.length === 0 && (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                      No civic themes available yet.
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="text-sm text-slate-500">Operational view</p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-900">District Heatmap</h2>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3">
                    <Search className="h-4 w-4 text-slate-400" />
                    <input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search district, theme, risk"
                      className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                    />
                  </div>

                  <div className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <select
                      value={selectedDistrict}
                      onChange={(e) => setSelectedDistrict(e.target.value)}
                      className="bg-transparent text-sm text-slate-700 outline-none"
                    >
                      {availableDistricts.map((district) => (
                        <option key={district} value={district}>
                          {district}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-2xl border border-slate-300 bg-white px-4 py-3">
                    <select
                      value={sortBy}
                      onChange={(e) =>
                        setSortBy(
                          e.target.value as "total" | "risk" | "sentiment" | "lastActivity"
                        )
                      }
                      className="bg-transparent text-sm text-slate-700 outline-none"
                    >
                      <option value="total">Sort by Activity</option>
                      <option value="risk">Sort by Risk</option>
                      <option value="sentiment">Sort by Sentiment</option>
                      <option value="lastActivity">Sort by Last Activity</option>
                    </select>
                  </div>
                </div>
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
                          <div className="flex flex-col items-end gap-2">
                            <TrendingUp className="h-5 w-5 opacity-80" />
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${getRiskBadgeClasses(
                                item.riskLevel
                              )}`}
                            >
                              {item.riskLevel} Risk
                            </span>
                          </div>
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

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div className="rounded-2xl bg-white/30 p-3">
                            <p className="text-xs font-medium opacity-80">Top Theme</p>
                            <p className="mt-1 text-base font-bold">{item.topCategory}</p>
                          </div>
                          <div className="rounded-2xl bg-white/30 p-3">
                            <p className="text-xs font-medium opacity-80">Last Activity</p>
                            <p className="mt-1 text-base font-bold">{formatDateTime(item.lastActivityAt)}</p>
                          </div>
                        </div>

                        <div className="mt-4 rounded-2xl bg-white/30 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-medium opacity-80">Sentiment Breakdown</p>
                            <p className="text-xs font-semibold opacity-80">Risk Score {item.riskScore}</p>
                          </div>

                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/40">
                            <div className="flex h-full w-full">
                              <div
                                className="h-full bg-emerald-500"
                                style={{ width: `${item.positivePct}%` }}
                              />
                              <div
                                className="h-full bg-amber-400"
                                style={{ width: `${item.neutralPct}%` }}
                              />
                              <div
                                className="h-full bg-red-500"
                                style={{ width: `${item.negativePct}%` }}
                              />
                            </div>
                          </div>

                          <div className="mt-3 flex items-center gap-4 text-sm font-semibold">
                            <span>😊 {item.positivePct}%</span>
                            <span>😐 {item.neutralPct}%</span>
                            <span>☹️ {item.negativePct}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-500">Comparison view</p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-900">
                    District Comparison Table
                  </h2>
                </div>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="rounded-l-2xl px-4 py-4 font-semibold">District</th>
                      <th className="px-4 py-4 font-semibold">Issues</th>
                      <th className="px-4 py-4 font-semibold">Posts</th>
                      <th className="px-4 py-4 font-semibold">Total</th>
                      <th className="px-4 py-4 font-semibold">Sentiment</th>
                      <th className="px-4 py-4 font-semibold">Risk</th>
                      <th className="px-4 py-4 font-semibold">Top Theme</th>
                      <th className="px-4 py-4 font-semibold">Last Activity</th>
                      <th className="rounded-r-2xl px-4 py-4 font-semibold">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMetrics.map((item) => (
                      <tr key={item.district} className="border-t border-slate-200">
                        <td className="px-4 py-4 font-semibold text-slate-900">{item.district}</td>
                        <td className="px-4 py-4 text-slate-600">{item.issues}</td>
                        <td className="px-4 py-4 text-slate-600">{item.posts}</td>
                        <td className="px-4 py-4 font-semibold text-slate-900">{item.total}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            {item.sentimentScore > 0.2 ? (
                              <Smile className="h-5 w-5 text-green-600" />
                            ) : item.sentimentScore < -0.2 ? (
                              <Frown className="h-5 w-5 text-red-600" />
                            ) : (
                              <Meh className="h-5 w-5 text-amber-600" />
                            )}
                            <span className="font-medium text-slate-700">
                              {getSentimentLabel(item.sentimentScore)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${getRiskBadgeClasses(
                              item.riskLevel
                            )}`}
                          >
                            {item.riskLevel}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-600">{item.topCategory}</td>
                        <td className="px-4 py-4 text-slate-600">
                          {formatDateTime(item.lastActivityAt)}
                        </td>
                        <td className="px-4 py-4">
                          <div
                            className={`flex items-center gap-1 font-semibold ${getTrendTextClasses(
                              item.activityDeltaPct
                            )}`}
                          >
                            {item.activityDeltaPct > 0 ? (
                              <ArrowUpRight className="h-4 w-4" />
                            ) : item.activityDeltaPct < 0 ? (
                              <ArrowDownRight className="h-4 w-4" />
                            ) : (
                              <Minus className="h-4 w-4" />
                            )}
                            <span>
                              {item.activityDeltaPct >= 0 ? "+" : ""}
                              {item.activityDeltaPct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {!loading && filteredMetrics.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                          No comparison data available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}