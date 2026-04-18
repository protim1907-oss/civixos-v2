import { NextRequest, NextResponse } from "next/server";

type OfficialUpdateCategory =
  | "Public Notice"
  | "Policy Update"
  | "Infrastructure"
  | "Public Safety"
  | "Education"
  | "Community";

type OfficialUpdate = {
  id: string;
  district: string;
  state: string;
  title: string;
  summary: string;
  body: string;
  category: OfficialUpdateCategory;
  office: string;
  date: string;
  priority: "High" | "Normal";
  status: "Active" | "New" | "Ongoing";
  upvotes: number;
  comments: number;
  shares: number;
  sourceUrl?: string;
};

type SourceConfig = {
  label: string;
  url: string;
};

function getStateFromDistrict(district: string) {
  const upper = district.toUpperCase();

  if (upper.startsWith("CA")) return "California";
  if (upper.startsWith("TX")) return "Texas";
  if (upper.startsWith("NH")) return "New Hampshire";
  if (upper.startsWith("FL")) return "Florida";
  if (upper.startsWith("NY")) return "New York";

  return "State";
}

function getSourcesForDistrict(district: string): SourceConfig[] {
  const upper = district.toUpperCase();

  if (upper.startsWith("CA")) {
    return [
      {
        label: "House Press Releases",
        url: "https://robertgarcia.house.gov/media/press-releases?page=1",
      },
      {
        label: "City of Long Beach",
        url: "https://www.longbeach.gov/press-releases/",
      },
      {
        label: "LA County",
        url: "https://lacounty.gov/newsroom/latest-news/news-releases/",
      },
      {
        label: "Caltrans District 7",
        url: "https://dot.ca.gov/caltrans-near-me/district-7/district-7-news",
      },
    ];
  }

  if (upper.startsWith("TX")) {
    return [
      {
        label: "Texas Governor Newsroom",
        url: "https://gov.texas.gov/news",
      },
      {
        label: "TxDOT News",
        url: "https://www.txdot.gov/newsroom.html",
      },
      {
        label: "Local Government News",
        url: "https://www.sanantonio.gov/News",
      },
    ];
  }

  if (upper.startsWith("NH")) {
    return [
      {
        label: "NH Government News",
        url: "https://www.nh.gov/nhinfo/news/index.htm",
      },
      {
        label: "NHDOT News",
        url: "https://www.dot.nh.gov/news-and-media",
      },
    ];
  }

  return [];
}

function inferCategory(title: string, summary: string): OfficialUpdateCategory {
  const text = `${title} ${summary}`.toLowerCase();

  if (
    text.includes("road") ||
    text.includes("traffic") ||
    text.includes("bridge") ||
    text.includes("construction") ||
    text.includes("transit") ||
    text.includes("infrastructure")
  ) {
    return "Infrastructure";
  }

  if (
    text.includes("police") ||
    text.includes("crime") ||
    text.includes("emergency") ||
    text.includes("alert") ||
    text.includes("safety")
  ) {
    return "Public Safety";
  }

  if (
    text.includes("school") ||
    text.includes("student") ||
    text.includes("education") ||
    text.includes("grant")
  ) {
    return "Education";
  }

  if (
    text.includes("policy") ||
    text.includes("funding") ||
    text.includes("bill") ||
    text.includes("legislation")
  ) {
    return "Policy Update";
  }

  if (
    text.includes("community") ||
    text.includes("meeting") ||
    text.includes("public input") ||
    text.includes("listening")
  ) {
    return "Community";
  }

  return "Public Notice";
}

function inferPriority(title: string, summary: string): "High" | "Normal" {
  const text = `${title} ${summary}`.toLowerCase();

  if (
    text.includes("emergency") ||
    text.includes("closure") ||
    text.includes("warning") ||
    text.includes("alert") ||
    text.includes("urgent")
  ) {
    return "High";
  }

  return "Normal";
}

function inferOffice(sourceLabel: string) {
  return sourceLabel;
}

async function fetchPage(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Civix250/1.0",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.text();
}

function extractLinks(html: string, baseUrl: string, sourceLabel: string) {
  const items: { title: string; url: string; source: string }[] = [];
  const regex = /<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gims;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(html))) {
    const rawHref = match[1];
    const rawTitle = match[2]
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!rawHref || !rawTitle || rawTitle.length < 12) continue;

    if (
      rawTitle.toLowerCase().includes("read more") ||
      rawTitle.toLowerCase().includes("learn more") ||
      rawTitle.toLowerCase().includes("click here")
    ) {
      continue;
    }

    let url = rawHref;
    if (url.startsWith("/")) {
      const origin = new URL(baseUrl).origin;
      url = `${origin}${url}`;
    }

    if (!/^https?:\/\//i.test(url)) continue;

    items.push({
      title: rawTitle,
      url,
      source: sourceLabel,
    });
  }

  return items;
}

function isRelevantToDistrict(district: string, title: string, url: string) {
  const upperDistrict = district.toUpperCase();
  const text = `${title} ${url}`.toLowerCase();

  if (upperDistrict === "CA-42") {
    return (
      text.includes("long beach") ||
      text.includes("ca-42") ||
      text.includes("42nd district") ||
      text.includes("robert garcia") ||
      text.includes("district 7") ||
      text.includes("los angeles county")
    );
  }

  if (upperDistrict === "TX-35") {
    return (
      text.includes("tx-35") ||
      text.includes("district 35") ||
      text.includes("san antonio") ||
      text.includes("austin") ||
      text.includes("texas")
    );
  }

  if (upperDistrict === "NH" || upperDistrict === "NH-01" || upperDistrict === "NH-02") {
    return (
      text.includes("new hampshire") ||
      text.includes("nh") ||
      text.includes("concord") ||
      text.includes("manchester") ||
      text.includes("nashua")
    );
  }

  return true;
}

export async function GET(request: NextRequest) {
  try {
    const district = request.nextUrl.searchParams.get("district")?.trim().toUpperCase();

    if (!district) {
      return NextResponse.json({ updates: [] }, { status: 400 });
    }

    const state = getStateFromDistrict(district);
    const sources = getSourcesForDistrict(district);

    if (sources.length === 0) {
      return NextResponse.json({ updates: [] });
    }

    const pages = await Promise.all(
      sources.map(async (source) => {
        try {
          const html = await fetchPage(source.url);
          return extractLinks(html, source.url, source.label);
        } catch (error) {
          console.error(`Source fetch failed for ${source.url}`, error);
          return [];
        }
      })
    );

    const merged = pages
      .flat()
      .filter((item) => isRelevantToDistrict(district, item.title, item.url));

    const deduped = Array.from(
      new Map(merged.map((item) => [item.url, item])).values()
    ).slice(0, 12);

    const updates: OfficialUpdate[] = deduped.map((item, index) => ({
      id: `${district.toLowerCase()}-live-${index + 1}`,
      district,
      state,
      title: item.title,
      summary: `Latest official update from ${item.source}.`,
      body: `Open the source page to read the full official announcement from ${item.source}.`,
      category: inferCategory(item.title, item.source),
      office: inferOffice(item.source),
      date: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      priority: inferPriority(item.title, item.source),
      status: "Active",
      upvotes: 0,
      comments: 0,
      shares: 0,
      sourceUrl: item.url,
    }));

    return NextResponse.json({ updates });
  } catch (error) {
    console.error("Official updates fetch error:", error);
    return NextResponse.json({ updates: [] }, { status: 200 });
  }
}