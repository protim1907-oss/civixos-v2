import Link from "next/link";
import { XMLParser } from "fast-xml-parser";
import { createClient } from "@/lib/supabase/server";
import TrendingStoryActions from "@/components/trending/TrendingNewsActions";

type FeedItem = {
  id: string;
  title: string;
  link: string;
  pubDate?: string;
  description?: string;
  source?: string;
};

type RegionInfo = {
  stateName: string;
  districtLabel: string;
  districtNumber?: number | null;
  feedLabel: string;
  query: string;
};

type IssueSummary = {
  title: string;
  summary: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  district: string | null;
  state: string | null;
  city: string | null;
  zip_code: string | null;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  textNodeName: "text",
});

function normalizeText(value: unknown) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 120);
}

function buildStoryId(item: Omit<FeedItem, "id">) {
  return slugify(`${item.title}-${item.link}`);
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "Date unavailable";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function isWithinLast7Days(dateStr?: string) {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);

  return date >= sevenDaysAgo && date <= now;
}

function dedupeFeedItems(items: Omit<FeedItem, "id">[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${normalizeText(item.title).toLowerCase()}|${String(item.link || "").trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractDomain(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "News source";
  }
}

function cleanGoogleNewsLink(url: string) {
  try {
    const parsed = new URL(url);
    const target = parsed.searchParams.get("url");
    return target || url;
  } catch {
    return url;
  }
}

function inferRegionFromProfile(
  profile?: Partial<ProfileRow> | null,
  userMetadata?: Record<string, any>
): RegionInfo {
  const rawDistrict =
    profile?.district ||
    userMetadata?.district ||
    userMetadata?.district_name ||
    userMetadata?.district_id ||
    "";

  const rawState =
    profile?.state ||
    userMetadata?.state ||
    userMetadata?.state_name ||
    "";

  const districtValue = String(rawDistrict || "").toLowerCase().trim();
  const stateValue = String(rawState || "").toLowerCase().trim();

  if (
    districtValue.includes("new hampshire") ||
    districtValue === "nh" ||
    districtValue.startsWith("nh-") ||
    stateValue === "new hampshire" ||
    stateValue === "nh"
  ) {
    const districtNumberMatch = districtValue.match(/(\d{1,2})/);
    const districtNumber = districtNumberMatch ? Number(districtNumberMatch[1]) : null;

    return {
      stateName: "New Hampshire",
      districtLabel: districtNumber ? `NH District ${districtNumber}` : "New Hampshire District",
      districtNumber,
      feedLabel: districtNumber ? `New Hampshire District ${districtNumber}` : "New Hampshire",
      query: districtNumber
        ? `"New Hampshire" district ${districtNumber} local government OR community OR policy OR housing OR transport OR education`
        : `"New Hampshire" local government OR community OR policy OR housing OR transport OR education`,
    };
  }

  if (
    districtValue.includes("texas") ||
    districtValue === "tx" ||
    districtValue.startsWith("tx-") ||
    stateValue === "texas" ||
    stateValue === "tx"
  ) {
    const districtNumberMatch = districtValue.match(/(\d{1,2})/);
    const districtNumber = districtNumberMatch ? Number(districtNumberMatch[1]) : null;

    return {
      stateName: "Texas",
      districtLabel: districtNumber ? `TX District ${districtNumber}` : "Texas District",
      districtNumber,
      feedLabel: districtNumber ? `Texas District ${districtNumber}` : "Texas",
      query: districtNumber
        ? `"Texas" district ${districtNumber} local government OR community OR policy OR public safety OR infrastructure OR education`
        : `"Texas" local government OR community OR policy OR public safety OR infrastructure OR education`,
    };
  }

  const stateName = rawState ? String(rawState).trim() : "your state";
  const districtLabel = rawDistrict ? String(rawDistrict).trim() : "your district";

  return {
    stateName,
    districtLabel,
    districtNumber: null,
    feedLabel: districtLabel,
    query: rawDistrict
      ? `"${districtLabel}" local government OR community OR city council OR school board OR housing OR roads OR public safety`
      : rawState
      ? `"${stateName}" local government OR community OR city council OR school board OR housing OR roads OR public safety`
      : `"local district" government OR community OR housing OR roads OR schools OR public safety`,
  };
}

async function fetchGoogleNews(query: string): Promise<Omit<FeedItem, "id">[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 60 * 60 * 6 },
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) return [];

    const xml = await response.text();
    const parsed = parser.parse(xml);
    const rawItems = parsed?.rss?.channel?.item ?? [];
    const itemsArray = Array.isArray(rawItems) ? rawItems : [rawItems];

    return itemsArray
      .map((item: any) => {
        const link = cleanGoogleNewsLink(item.link || "");
        return {
          title: normalizeText(item.title),
          link,
          pubDate: item.pubDate,
          description: normalizeText(item.description),
          source: extractDomain(link),
        };
      })
      .filter((item: Omit<FeedItem, "id">) => item.title && item.link);
  } catch {
    return [];
  }
}

function scoreItemForRegion(item: Omit<FeedItem, "id">, region: RegionInfo) {
  const haystack = `${item.title} ${item.description || ""}`.toLowerCase();
  let score = 0;

  if (haystack.includes(region.stateName.toLowerCase())) score += 4;
  if (region.districtNumber && haystack.includes(`district ${region.districtNumber}`)) score += 5;
  if (
    region.districtNumber &&
    haystack.includes(`${region.stateName.toLowerCase()} district ${region.districtNumber}`)
  ) {
    score += 5;
  }

  const civicKeywords = [
    "housing",
    "school",
    "education",
    "roads",
    "transport",
    "transit",
    "zoning",
    "budget",
    "council",
    "public safety",
    "police",
    "health",
    "community",
    "infrastructure",
    "tax",
    "water",
    "energy",
    "environment",
    "election",
    "development",
  ];

  for (const keyword of civicKeywords) {
    if (haystack.includes(keyword)) score += 1;
  }

  if (isWithinLast7Days(item.pubDate)) score += 3;
  return score;
}

function keywordBucket(text: string) {
  const t = text.toLowerCase();

  if (/(housing|rent|zoning|home|homeless|real estate|affordability)/.test(t)) {
    return "Housing and affordability";
  }
  if (/(school|student|teacher|education|college|campus)/.test(t)) {
    return "Education and schools";
  }
  if (/(road|traffic|bridge|transport|transit|rail|bus|infrastructure|construction)/.test(t)) {
    return "Transportation and infrastructure";
  }
  if (/(crime|police|public safety|fire|emergency|violence)/.test(t)) {
    return "Public safety";
  }
  if (/(health|hospital|clinic|mental health|medicaid|healthcare)/.test(t)) {
    return "Healthcare access";
  }
  if (/(budget|tax|spending|finance|funding)/.test(t)) {
    return "Budget and taxes";
  }
  if (/(environment|water|climate|energy|storm|flood|pollution)/.test(t)) {
    return "Environment and utilities";
  }
  if (/(election|vote|ballot|legislation|bill|policy|council)/.test(t)) {
    return "Policy and governance";
  }

  return "Community issues";
}

function buildFallbackTopIssues(items: Omit<FeedItem, "id">[]): IssueSummary[] {
  const bucketMap = new Map<string, { count: number; headlines: string[] }>();

  for (const item of items) {
    const bucket = keywordBucket(`${item.title} ${item.description || ""}`);
    const current = bucketMap.get(bucket) || { count: 0, headlines: [] };
    current.count += 1;
    current.headlines.push(item.title);
    bucketMap.set(bucket, current);
  }

  const top = [...bucketMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3)
    .map(([title, data]) => ({
      title,
      summary:
        data.headlines.length > 0
          ? `This issue appeared in ${data.count} recent ${data.count > 1 ? "stories" : "story"} this week, including: ${data.headlines
              .slice(0, 2)
              .join(" • ")}.`
          : `This issue appeared in ${data.count} recent ${data.count > 1 ? "stories" : "story"} this week.`,
    }));

  while (top.length < 3) {
    top.push({
      title: `Issue ${top.length + 1}`,
      summary: "Not enough district-specific stories were available this week to generate a stronger summary.",
    });
  }

  return top;
}

async function generateAISummary(
  items: Omit<FeedItem, "id">[],
  region: RegionInfo
): Promise<IssueSummary[]> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || items.length === 0) {
    return buildFallbackTopIssues(items);
  }

  try {
    const headlinesBlock = items
      .slice(0, 15)
      .map(
        (item, index) =>
          `${index + 1}. ${item.title}${item.description ? ` — ${item.description}` : ""}`
      )
      .join("\n");

    const prompt = `
You are summarizing local civic news for ${region.feedLabel}.

Based on the headlines below, identify the top 3 civic/public issues this week.
Return ONLY valid JSON in this exact shape:
{
  "issues": [
    { "title": "Issue name", "summary": "1-2 sentence summary" },
    { "title": "Issue name", "summary": "1-2 sentence summary" },
    { "title": "Issue name", "summary": "1-2 sentence summary" }
  ]
}

Focus on public-interest themes like housing, transportation, education, public safety, infrastructure, environment, healthcare, local policy, or community concerns.
Be specific to the district/state context and keep summaries concise.

Headlines:
${headlinesBlock}
`.trim();

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: "You are a precise civic news summarizer that returns clean JSON only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
      cache: "no-store",
    });

    if (!response.ok) return buildFallbackTopIssues(items);

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return buildFallbackTopIssues(items);

    const parsed = JSON.parse(content);
    const issues = Array.isArray(parsed?.issues) ? parsed.issues : [];

    const cleaned = issues
      .slice(0, 3)
      .map((issue: any) => ({
        title: normalizeText(issue?.title || "Issue"),
        summary: normalizeText(issue?.summary || "Summary unavailable."),
      }))
      .filter((issue: IssueSummary) => issue.title && issue.summary);

    if (cleaned.length === 3) return cleaned;
    return buildFallbackTopIssues(items);
  } catch {
    return buildFallbackTopIssues(items);
  }
}

async function getCurrentUserProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null as ProfileRow | null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, district, state, city, zip_code")
    .eq("id", user.id)
    .maybeSingle();

  return { user, profile: profile as ProfileRow | null };
}

const borderAccentClasses = [
  "border-l-[6px] border-[#f59e0b]", // yellow
  "border-l-[6px] border-[#3b82f6]", // blue
  "border-l-[6px] border-[#ef4444]", // red
  "border-l-[6px] border-[#22c55e]", // green
];

export default async function TrendingPostsPage() {
  const { user, profile } = await getCurrentUserProfile();

  const region = inferRegionFromProfile(profile, user?.user_metadata);

  const searchQueries = [
    region.query,
    `"${region.stateName}" community issues OR local government OR infrastructure`,
    `"${region.feedLabel}" housing OR education OR roads OR public safety`,
  ];

  const feedResults = await Promise.all(searchQueries.map((query) => fetchGoogleNews(query)));
  const mergedItems = dedupeFeedItems(feedResults.flat());

  const scored = mergedItems
    .map((item) => ({
      ...item,
      id: buildStoryId(item),
      score: scoreItemForRegion(item, region),
    }))
    .sort((a, b) => b.score - a.score);

  const districtSpecificItems = scored.filter((item) => item.score >= 4);
  const weeklyItems = districtSpecificItems.filter((item) => isWithinLast7Days(item.pubDate));
  const newsToShow = (weeklyItems.length > 0 ? weeklyItems : districtSpecificItems).slice(0, 12);

  const topIssues = await generateAISummary(newsToShow, region);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
                Trending Posts
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                {region.feedLabel} News & Community Signals
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Daily-refreshed civic headlines and issue summaries tailored to your district.
              </p>
            </div>

            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Back to Dashboard
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                District
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{region.districtLabel}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Stories this week
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{weeklyItems.length}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Last refresh
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {new Intl.DateTimeFormat("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }).format(new Date())}
              </p>
            </div>
          </div>
        </div>

        <section className="mb-8">
          <div className="rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 p-[1px] shadow-lg">
            <div className="rounded-3xl bg-white p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
                    AI Summarization
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-900">
                    Top 3 issues this week
                  </h2>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {topIssues.map((issue, index) => (
                  <div
                    key={`${issue.title}-${index}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                      {index + 1}
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">{issue.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{issue.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Recent stories</h2>
              <p className="mt-1 text-sm text-slate-600">
                Showing the most relevant civic headlines for {region.feedLabel}.
              </p>
            </div>
          </div>

          {newsToShow.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">
                No district-specific stories found yet
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Try again later after more local stories are indexed.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {newsToShow.map((item, index) => (
                <article
                  key={item.id}
                  className={`group rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md ${
                    borderAccentClasses[index % borderAccentClasses.length]
                  }`}
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {item.source || "News"}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      {formatDate(item.pubDate)}
                    </span>
                  </div>

                  <a href={item.link} target="_blank" rel="noreferrer" className="block">
                    <h3 className="text-xl font-bold leading-snug text-slate-900 transition group-hover:text-blue-700">
                      {item.title}
                    </h3>
                  </a>

                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                    {item.description || "Read more about this district-related civic update."}
                  </p>

                  <div className="mt-5">
                    <TrendingStoryActions
                      storyId={item.id}
                      title={item.title}
                      link={item.link}
                      source={item.source || "News source"}
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}