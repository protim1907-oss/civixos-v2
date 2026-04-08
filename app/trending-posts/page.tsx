import Link from "next/link";
import { XMLParser } from "fast-xml-parser";

type FeedItem = {
  title: string;
  link: string;
  pubDate?: string;
  description?: string;
  source?: string;
};

async function getTexasNews(): Promise<FeedItem[]> {
  try {
    const res = await fetch("https://feeds.texastribune.org/feeds/main/", {
      next: { revalidate: 1800 }, // refresh every 30 minutes
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
          typeof item.description === "string"
            ? item.description.replace(/<[^>]+>/g, "").trim()
            : "Latest Texas news update.",
        source: "The Texas Tribune",
      }));
  } catch (error) {
    console.error("Texas news fetch error:", error);

    return [
      {
        title: "Unable to load live Texas news right now",
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
  const news = await getTexasNews();

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Texas News Desk</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            Top 5 News in the State of Texas
          </h1>
          <p className="mt-4 max-w-4xl text-lg leading-8 text-slate-600">
            Live stories auto-loaded from a Texas news feed.
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
                        Texas News
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
                      {item.description || "Read the latest Texas news story."}
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
                Live Texas feed
              </h3>

              <div className="mt-5 space-y-3 text-sm leading-6 text-slate-600">
                <p>
                  This page fetches the latest stories from a Texas news RSS feed
                  each time the cache refreshes.
                </p>
                <p>
                  Stories are refreshed every 30 minutes using Next.js server-side
                  revalidation.
                </p>
                <p>
                  You can later swap this feed for a paid news API if you want
                  broader multi-source coverage.
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