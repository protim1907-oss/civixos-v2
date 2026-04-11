import Link from "next/link";
import { XMLParser } from "fast-xml-parser";
import { createClient } from "@/lib/supabase/server";
import {
  TrendingUp,
  Newspaper,
  MapPinned,
  Clock3,
  Activity,
  ExternalLink,
} from "lucide-react";
import TrendingNewsActions from "@/components/trending/TrendingNewsActions";

type FeedItem = {
  title: string;
  link: string;
  pubDate?: string;
  description?: string;
  source?: string;
};

type RegionInfo = {
  stateName: string;
  districtLabel: string;
  feedLabel: string;
  query: string;
};

function inferRegionFromUserMetadata(
  userMetadata: Record<string, any> | undefined
): RegionInfo {
  const rawDistrict =
    userMetadata?.district ||
    userMetadata?.district_name ||
    userMetadata?.district_id ||
    userMetadata?.state ||
    "District 12";

  const value = String(rawDistrict).toLowerCase();

  if (value.includes("new hampshire") || value === "nh" || value.startsWith("nh-")) {
    return {
      stateName: "New Hampshire",
      districtLabel: String(rawDistrict),
      feedLabel: "NH News",
      query: "New Hampshire",
    };
  }

  if (value.includes("texas") || value === "tx" || value.startsWith("tx-")) {
    return {
      stateName: "Texas",
      districtLabel: String(rawDistrict),
      feedLabel: "Texas News",
      query: "Texas",
    };
  }

  if (value.includes("california") || value === "ca" || value.startsWith("ca-")) {
    return {
      stateName: "California",
      districtLabel: String(rawDistrict),
      feedLabel: "California News",
      query: "California",
    };
  }

  if (value.includes("florida") || value === "fl" || value.startsWith("fl-")) {
    return {
      stateName: "Florida",
      districtLabel: String(rawDistrict),
      feedLabel: "Florida News",
      query: "Florida",
    };
  }

  return {
    stateName: "Your State",
    districtLabel: String(rawDistrict),
    feedLabel: "State News",
    query: String(rawDistrict),
  };
}

async function getUserRegion(): Promise<RegionInfo> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return inferRegionFromUserMetadata(user?.user_metadata);
  } catch (error) {
    console.error("Could not determine user region:", error);
    return {
      stateName: "Your State",
      districtLabel: "District 12",
      feedLabel: "State News",
      query: "United States state news",
    };
  }
}

function buildGoogleNewsRssUrl(query: string) {
  const rssQuery = `${query} when:7d`;
  return `https://news.google.com/rss/search?q=${encodeURIComponent(
    rssQuery
  )}&hl=en-US&gl=US&ceid=US:en`;
}

function stripHtml(value?: string) {
  if (!value) return "";
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function getStateNews(region: RegionInfo): Promise<FeedItem[]> {
  try {
    const res = await fetch(buildGoogleNewsRssUrl(region.query), {
      next: { revalidate: 1800 },
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch feed: ${res.status}`);
    }

    const xml = await res.text();

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
      trimValues: true,
    });

    const parsed = parser.parse(xml);
    const rawItems = parsed?.rss?.channel?.item ?? [];
    const items = Array.isArray(rawItems) ? rawItems : [rawItems];

    return items
      .filter((item: any) => item?.title && item?.link)
      .slice(0, 5)
      .map((item: any) => ({
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        description:
          stripHtml(item.description) ||
          `Latest news update for ${region.stateName}.`,
        source: item?.source?.["#text"] || item?.source || "Google News",
      }));
  } catch (error) {
    console.error(`${region.stateName} news fetch error:`, error);

    return [
      {
        title: `Unable to load live ${region.stateName} news right now`,
        link: "/dashboard",
        description:
          "The live feed is temporarily unavailable. Please try again shortly.",
        source: "System",
      },
    ];
  }
}

function formatDate(dateString?: string) {
  if (!dateString) return "Latest";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Latest";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getFreshnessLabel(dateString?: string) {
  if (!dateString) return "Live";

  const published = new Date(dateString).getTime();
  if (Number.isNaN(published)) return "Live";

  const diffHours = Math.floor((Date.now() - published) / (1000 * 60 * 60));

  if (diffHours < 24) return "Today";
  if (diffHours < 48) return "Yesterday";
  if (diffHours < 24 * 7) return "This week";
  return "Recent";
}

function getTopSource(news: FeedItem[]) {
  if (!news.length) return "N/A";

  const counts: Record<string, number> = {};
  news.forEach((item) => {
    const source = item.source || "Unknown";
    counts[source] = (counts[source] || 0) + 1;
  });

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function extractTrendingTopics(news: FeedItem[]) {
  const text = news
    .map((item) => `${item.title} ${item.description || ""}`)
    .join(" ")
    .toLowerCase();

  const topicBank = [
    "voting",
    "election",
    "education",
    "housing",
    "healthcare",
    "transportation",
    "immigration",
    "tax",
    "budget",
    "economy",
    "jobs",
    "community",
    "public safety",
    "sports",
    "climate",
    "energy",
    "technology",
    "infrastructure",
  ];

  const matched = topicBank.filter((topic) => text.includes(topic.toLowerCase()));

  if (matched.length >= 3) return matched.slice(0, 3);
  if (matched.length === 2) return [...matched, "community"];
  if (matched.length === 1) return [matched[0], "community", "local updates"];

  return ["community", "policy", "local updates"];
}

function getCitizenPulse(news: FeedItem[]) {
  const titles = news.map((item) => item.title.toLowerCase()).join(" ");

  if (
    titles.includes("vote") ||
    titles.includes("bill") ||
    titles.includes("law") ||
    titles.includes("policy") ||
    titles.includes("governor")
  ) {
    return {
      label: "High civic attention",
      description:
        "This news cycle shows strong public-interest activity around government actions and civic issues.",
      tone: "bg-red-50 text-red-700 border-red-200",
    };
  }

  if (
    titles.includes("school") ||
    titles.includes("city") ||
    titles.includes("community") ||
    titles.includes("transport")
  ) {
    return {
      label: "Moderate public discussion",
      description:
        "Stories suggest an active but balanced level of community discussion across the district.",
      tone: "bg-amber-50 text-amber-700 border-amber-200",
    };
  }

  return {
    label: "General local activity",
    description:
      "The feed reflects a mix of local updates and community interest topics across the region.",
      tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
}

export default async function TrendingPostsPage() {
  const region = await getUserRegion();
  const news = await getStateNews(region);

  const topSource = getTopSource(news);
  const latestStoryDate = news[0]?.pubDate ? formatDate(news[0].pubDate) : "Latest";
  const freshness = getFreshnessLabel(news[0]?.pubDate);
  const trendingTopics = extractTrendingTopics(news);
  const citizenPulse = getCitizenPulse(news);

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="w-full p-4 md:p-6 xl:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 px-6 py-6 md:px-8">
              <p className="text-sm font-medium text-blue-100/80">Trending Posts</p>

              <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">
                Top stories in {region.stateName}
              </h1>

              <p className="mt-3 text-sm text-blue-100/80 md:text-base">
                Current district:{" "}
                <span className="font-semibold text-white">{region.districtLabel}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 md:grid-cols-4 md:p-6">
              <div className="rounded-3xl bg-red-500 p-5 text-white">
                <p>Stories</p>
                <p className="text-2xl font-bold">{news.length}</p>
              </div>

              <div className="rounded-3xl bg-purple-500 p-5 text-white">
                <p>Source</p>
                <p className="text-lg font-bold">{topSource}</p>
              </div>

              <div className="rounded-3xl bg-blue-500 p-5 text-white">
                <p>Latest</p>
                <p className="text-lg font-bold">{latestStoryDate}</p>
              </div>

              <div className="rounded-3xl bg-green-500 p-5 text-white">
                <p>Coverage</p>
                <p className="text-lg font-bold">{region.stateName}</p>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="space-y-4">
                {news.map((item, index) => (
                  <div
                    key={`${item.link}-${index}`}
                    className="rounded-3xl border border-slate-300 p-6 transition hover:bg-slate-50"
                  >
                    <div className="flex gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 font-bold text-red-600">
                        {index + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>

                        <p className="mt-2 text-sm leading-6 text-gray-600">
                          {item.description}
                        </p>

                        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                            <Clock3 className="h-4 w-4" />
                            {formatDate(item.pubDate)}
                          </span>

                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                            <Newspaper className="h-4 w-4" />
                            {item.source || "News Source"}
                          </span>
                        </div>

                        <div className="mt-4">
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600"
                          >
                            Read full story
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>

                        <TrendingNewsActions title={item.title} link={item.link} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <aside className="space-y-4">
              <div className="sticky top-6 space-y-4">
                <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <MapPinned className="h-5 w-5 text-slate-700" />
                    <h3 className="text-lg font-semibold text-slate-900">
                      District Snapshot
                    </h3>
                  </div>

                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                      <span className="text-slate-600">State</span>
                      <span className="font-semibold text-slate-900">
                        {region.stateName}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                      <span className="text-slate-600">District</span>
                      <span className="font-semibold text-slate-900">
                        {region.districtLabel}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                      <span className="text-slate-600">Stories tracked</span>
                      <span className="font-semibold text-slate-900">{news.length}</span>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                      <span className="text-slate-600">Freshness</span>
                      <span className="font-semibold text-slate-900">{freshness}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-slate-700" />
                    <h3 className="text-lg font-semibold text-slate-900">
                      What’s Trending
                    </h3>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {trendingTopics.map((topic) => (
                      <span
                        key={topic}
                        className="rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-medium capitalize text-indigo-700"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>

                  <p className="mt-4 text-sm leading-6 text-slate-600">
                    These topic signals are inferred from recent headlines and summaries
                    in your district feed.
                  </p>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-slate-700" />
                    <h3 className="text-lg font-semibold text-slate-900">
                      Citizen Pulse
                    </h3>
                  </div>

                  <div
                    className={`mt-4 rounded-2xl border px-4 py-4 ${citizenPulse.tone}`}
                  >
                    <p className="font-semibold">{citizenPulse.label}</p>
                    <p className="mt-2 text-sm leading-6">{citizenPulse.description}</p>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Newspaper className="h-5 w-5 text-slate-700" />
                    <h3 className="text-lg font-semibold text-slate-900">
                      Quick Actions
                    </h3>
                  </div>

                  <div className="mt-4 space-y-3">
                    <Link
                      href="/district-feed"
                      className="flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90"
                    >
                      View District Feed
                    </Link>

                    <Link
                      href="/create-post"
                      className="flex items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90"
                    >
                      Create Post
                    </Link>

                    <Link
                      href="/my-representatives"
                      className="flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90"
                    >
                      Contact Representatives
                    </Link>

                    <Link
                      href="/dashboard"
                      className="flex items-center justify-center rounded-2xl bg-amber-500 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90"
                    >
                      Back to Dashboard
                    </Link>
                  </div>
                </div>
              </div>
            </aside>
          </section>
        </div>
      </div>
    </main>
  );
}