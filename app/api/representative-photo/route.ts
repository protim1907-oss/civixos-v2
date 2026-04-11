import { NextRequest, NextResponse } from "next/server";

type WikiOpenSearchResponse = [string, string[], string[], string[]];

type WikiSummaryResponse = {
  title?: string;
  thumbnail?: {
    source?: string;
    width?: number;
    height?: number;
  };
  originalimage?: {
    source?: string;
    width?: number;
    height?: number;
  };
};

function avatarFallback(name: string) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name
  )}&background=e2e8f0&color=334155&size=300`;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "CivicPulse/1.0",
        Accept: "application/json",
      },
      next: { revalidate: 60 * 60 * 24 }, // 24h
    });

    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function findWikipediaTitle(name: string): Promise<string | null> {
  const url =
    `https://en.wikipedia.org/w/api.php?action=opensearch` +
    `&search=${encodeURIComponent(name)}` +
    `&limit=1&namespace=0&format=json&origin=*`;

  const data = await fetchJson<WikiOpenSearchResponse>(url);
  if (!data || !Array.isArray(data) || !Array.isArray(data[1])) return null;

  return data[1][0] || null;
}

async function findSummaryImage(title: string): Promise<string | null> {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
    title
  )}`;

  const data = await fetchJson<WikiSummaryResponse>(url);
  if (!data) return null;

  return data.originalimage?.source || data.thumbnail?.source || null;
}

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name")?.trim();

  if (!name) {
    return NextResponse.json(
      { imageUrl: avatarFallback("Profile"), source: "fallback" },
      { status: 200 }
    );
  }

  const searchCandidates = [
    name,
    `${name} politician`,
    `${name} official`,
  ];

  for (const candidate of searchCandidates) {
    const title = await findWikipediaTitle(candidate);
    if (!title) continue;

    const imageUrl = await findSummaryImage(title);
    if (imageUrl) {
      return NextResponse.json(
        { imageUrl, source: "wikipedia", title },
        { status: 200 }
      );
    }
  }

  return NextResponse.json(
    { imageUrl: avatarFallback(name), source: "fallback" },
    { status: 200 }
  );
}