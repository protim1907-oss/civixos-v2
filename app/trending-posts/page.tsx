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

function inferRegionFromUserMetadata(userMetadata: Record<string, any> | undefined): RegionInfo {
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
  return value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
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
        source:
          item?.source?.["#text"] ||
          item?.source ||
          "Google News",
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

export default async function TrendingPostsPage() {
  const region = await getUserRegion();
  const news = await getStateNews(region);

  const topSource = getTopSource(news);
  const latestStoryDate = news[0]?.pubDate ? formatDate(news[0].pubDate) : "Latest";

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="w-full p-4 md:p-6 xl:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 px-6 py-6 md:px-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-100/80">
                    Trending Posts
                  </p>
                  <h1 className="mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">
                    Top stories in {region.stateName}
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100/80 md:text-base">
                    Explore regional headlines, policy signals, and public-interest
                    stories connected to{" "}
                    <span className="font-semibold text-white">
                      {region.districtLabel}
                    </span>
                    .
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white backdrop-blur">
                    <span className="font-semibold">Current district:</span>{" "}
                    {region.districtLabel}
                  </div>

                  <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white backdrop-blur">
                    <span className="font-semibold">Feed:</span> {region.feedLabel}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 md:grid-cols-4 md:p-6">
              <div className="rounded-3xl bg-gradient-to-br from-red-500 to-orange-400 p-5 text-white shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white/85">Top Stories</p>
                  <Newspaper className="h-5 w-5 text-white/85" />
                </div>
                <p className="mt-4 text-3xl font-bold">{news.length}</p>
              </div>

              <div className="rounded-3xl bg-gradient-to-br from-violet-500 to-fuchsia-500 p-5 text-white shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white/85">Lead Source</p>
                  <Activity className="h-5 w-5 text-white/85" />
                </div>
                <p className="mt-4 text-lg font-bold leading-6">{topSource}</p>
              </div>

              <div className="rounded-3xl bg-gradient-to-br from-blue-500 to-sky-400 p-5 text-white shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white/85">Latest Story</p>
                  <Clock3 className="h-5 w-5 text-white/85" />
                </div>
                <p className="mt-4 text-2xl font-bold">{latestStoryDate}</p>
              </div>

              <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-green-400 p-5 text-white shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white/85">Coverage</p>
                  <MapPinned className="h-5 w-5 text-white/85" />
                </div>
                <p className="mt-4 text-2xl font-bold">{region.stateName}</p>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard"
                className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98]"
              >
                Back to Dashboard
              </Link>

              <Link
                href="/feed"
                className="rounded-2xl bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600 active:scale-[0.98]"
              >
                View District Feed
              </Link>

              <Link
                href="/official-updates"
                className="rounded-2xl bg-green-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-600 active:scale-[0.98]"
              >
                Official Updates
              </Link>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <div className="xl:col-span-8 space-y-6">
              <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Regional News Stream</p>
                    <h2 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">
                      What’s trending in {region.stateName}
                    </h2>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 md:text-base">
                      Live headlines curated for your state and district context,
                      presented in the same visual style as the CivicPulse dashboard.
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {news.map((item, index) => (
                    <a
                      key={`${item.link}-${index}`}
                      href={item.link}
                      target="_blank"
                      rel="noreferrer"
                      className="block"
                    >
                      <div className="rounded-3xl border border-slate-200 bg-white p-6 transition hover:border-slate-300 hover:bg-slate-50">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div className="flex min-w-0 gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-sm font-bold text-red-600">
                              {index + 1}
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap gap-2">
                                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                                  {region.feedLabel}
                                </span>
                                <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
                                  {item.source || "Source"}
                                </span>
                                <span className="rounded-full bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
                                  {getFreshnessLabel(item.pubDate)}
                                </span>
                              </div>

                              <h3 className="mt-4 text-xl font-bold text-slate-900 md:text-2xl">
                                {item.title}
                              </h3>

                              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
                                {item.description || `Read the latest ${region.stateName} news story.`}
                              </p>

                              <div className="mt-4 flex items-center gap-2 text-sm font-medium text-blue-600">
                                <span>Read full story</span>
                                <ExternalLink className="h-4 w-4" />
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 md:justify-end">
                            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                              {formatDate(item.pubDate)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            </div>

            <aside className="xl:col-span-4">
              <div className="sticky top-6 space-y-6">
                <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-slate-400" />
                    <h2 className="text-xl font-semibold text-slate-900">
                      Feed Summary
                    </h2>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">State</p>
                      <p className="mt-2 text-lg font-bold text-slate-900">
                        {region.stateName}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">District</p>
                      <p className="mt-2 text-lg font-bold text-slate-900">
                        {region.districtLabel}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Stories loaded</p>
                      <p className="mt-2 text-lg font-bold text-slate-900">
                        {news.length}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">How this works</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-900">
                    Live {region.stateName} feed
                  </h3>

                  <div className="mt-5 space-y-3 text-sm leading-6 text-slate-600">
                    <p>
                      This page fetches the latest stories for {region.stateName}{" "}
                      each time the cache refreshes.
                    </p>
                    <p>
                      Stories are refreshed every 30 minutes using Next.js server-side
                      revalidation.
                    </p>
                    <p>
                      The feed adapts to the logged-in user’s district or state
                      instead of showing Texas for every user.
                    </p>
                  </div>
                </section>

                <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">Navigation</p>
                  <div className="mt-4 grid gap-3">
                    <Link
                      href="/dashboard"
                      className="rounded-2xl bg-blue-600 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      Back to Dashboard
                    </Link>

                    <Link
                      href="/feed"
                      className="rounded-2xl bg-red-500 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-red-600"
                    >
                      View District Feed
                    </Link>

                    <Link
                      href="/official-updates"
                      className="rounded-2xl bg-green-600 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-green-700"
                    >
                      Official Updates
                    </Link>
                  </div>
                </section>
              </div>
            </aside>
          </section>
        </div>
      </div>
    </main>
  );
}