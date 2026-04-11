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
  const latestStoryDate = news[0]?.pubDate
    ? formatDate(news[0].pubDate)
    : "Latest";

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="w-full p-4 md:p-6 xl:p-8">
        <div className="mx-auto max-w-7xl space-y-6">

          {/* HEADER */}
          <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 px-6 py-6 md:px-8">
              <p className="text-sm font-medium text-blue-100/80">
                Trending Posts
              </p>

              <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">
                Top stories in {region.stateName}
              </h1>

              <p className="mt-3 text-sm text-blue-100/80 md:text-base">
                Current district:{" "}
                <span className="font-semibold text-white">
                  {region.districtLabel}
                </span>
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

          {/* NEWS LIST */}
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-4">
              {news.map((item, index) => (
                <a
                  key={`${item.link}-${index}`}
                  href={item.link}
                  target="_blank"
                  rel="noreferrer"
                  className="block"
                >
                  <div className="rounded-3xl border p-6 hover:bg-slate-50">
                    <div className="flex gap-4">
                      <div className="h-10 w-10 bg-red-100 text-red-600 flex items-center justify-center rounded-full font-bold">
                        {index + 1}
                      </div>

                      <div>
                        <h3 className="font-bold text-xl">{item.title}</h3>

                        <p className="text-sm text-gray-600 mt-2">
                          {item.description}
                        </p>

                        <p className="text-blue-600 mt-3 text-sm">
                          Read full story →
                        </p>
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </section>

        </div>
      </div>
    </main>
  );
}