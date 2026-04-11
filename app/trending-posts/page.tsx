import Link from "next/link";
import { XMLParser } from "fast-xml-parser";
import { createClient } from "@/lib/supabase/server";

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

export default async function TrendingPostsPage() {
  const region = await getUserRegion();
  const news = await getStateNews(region);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            {region.stateName} News Desk
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            Top 5 News in {region.stateName}
          </h1>

          <p className="mt-4 max-w-4xl text-lg leading-8 text-slate-600">
            Live stories auto-loaded for {region.stateName}. Current district:
            {" "}
            <span className="font-semibold text-slate-900">
              {region.districtLabel}
            </span>
            .
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <span className="rounded-full bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
              Live Feed
            </span>
            <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
              Top 5 Stories
            </span>
            <span className="rounded-full bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
              Auto Refresh
            </span>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-5">
            {news.map((item, index) => (
              <a
                key={`${item.link}-${index}`}
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className="block rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
              >
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-50 text-base font-bold text-red-600">
                    {index + 1}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {region.feedLabel}
                      </span>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {item.source || "Source"}
                      </span>
                      <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                        {formatDate(item.pubDate)}
                      </span>
                    </div>

                    <h2 className="mt-3 text-2xl font-bold text-slate-900">
                      {item.title}
                    </h2>

                    <p className="mt-3 text-base leading-7 text-slate-600">
                      {item.description || `Read the latest ${region.stateName} news story.`}
                    </p>

                    <p className="mt-4 text-sm font-medium text-blue-600">
                      Read full story →
                    </p>
                  </div>
                </div>
              </a>
            ))}
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">How this works</p>
              <h3 className="mt-2 text-2xl font-bold text-slate-900">
                Live {region.stateName} feed
              </h3>

              <div className="mt-5 space-y-3 text-sm leading-6 text-slate-600">
                <p>
                  This page fetches the latest stories for {region.stateName}
                  {" "}each time the cache refreshes.
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
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
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
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}