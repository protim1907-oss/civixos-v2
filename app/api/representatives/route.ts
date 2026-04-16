import { NextRequest, NextResponse } from "next/server";

type CivicOfficial = {
  name?: string;
  party?: string;
  photoUrl?: string;
  phones?: string[];
  emails?: string[];
  urls?: string[];
  address?: Array<{
    line1?: string;
    line2?: string;
    line3?: string;
    city?: string;
    state?: string;
    zip?: string;
  }>;
};

type CivicOffice = {
  name?: string;
  divisionId?: string;
  levels?: string[];
  roles?: string[];
  officialIndices?: number[];
};

type CivicResponse = {
  offices?: CivicOffice[];
  officials?: CivicOfficial[];
};

type OfficialCard = {
  id: string;
  name: string;
  title: string;
  officeLabel: string;
  level: "federal" | "state";
  website: string;
  contactUrl: string;
  phone?: string;
  email?: string;
  imageUrl: string;
  badge: {
    text: string;
    tone: "red" | "green" | "blue" | "slate";
  };
};

function normalizePhotoUrl(url?: string) {
  if (!url) return "";

  const trimmed = url.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("http://")) {
    return trimmed.replace("http://", "https://");
  }

  return trimmed;
}

function pickBadge(role?: string, officeName?: string) {
  const roleText = role || "";
  const office = (officeName || "").toLowerCase();

  if (roleText === "legislatorUpperBody" || office.includes("senator")) {
    return { text: "Senate", tone: "red" as const };
  }

  if (
    roleText === "legislatorLowerBody" ||
    office.includes("representative") ||
    office.includes("house")
  ) {
    return { text: "House", tone: "blue" as const };
  }

  return { text: "State", tone: "green" as const };
}

function getLevel(office: CivicOffice): "federal" | "state" {
  const divisionId = office.divisionId || "";
  const levels = office.levels || [];

  if (levels.includes("country")) return "federal";
  if (levels.includes("administrativeArea1")) return "state";

  if (divisionId.includes("/country:us")) {
    if (divisionId.includes("/cd:")) return "federal";
    if (divisionId.includes("/sld")) return "state";
    if (divisionId.includes("/state:")) return "state";
    return "federal";
  }

  return "state";
}

function getFirstUrl(official?: CivicOfficial) {
  return official?.urls?.find(Boolean) || "";
}

function getFirstPhone(official?: CivicOfficial) {
  return official?.phones?.find(Boolean) || "";
}

function getFirstEmail(official?: CivicOfficial) {
  return official?.emails?.find(Boolean) || "";
}

function buildContactUrl(official?: CivicOfficial) {
  const email = getFirstEmail(official);
  if (email) return `mailto:${email}`;
  return getFirstUrl(official);
}

function mapOfficeToCards(data: CivicResponse): OfficialCard[] {
  const offices = data.offices || [];
  const officials = data.officials || [];

  const cards: OfficialCard[] = [];

  for (const office of offices) {
    const indices = office.officialIndices || [];
    const role = office.roles?.[0];
    const badge = pickBadge(role, office.name);
    const level = getLevel(office);

    for (const idx of indices) {
      const person = officials[idx];
      if (!person?.name) continue;

      cards.push({
        id: `${office.divisionId || office.name || "office"}-${idx}`,
        name: person.name,
        title: office.name || "Public Official",
        officeLabel: office.name || "Public Office",
        level,
        website: getFirstUrl(person),
        contactUrl: buildContactUrl(person),
        phone: getFirstPhone(person),
        email: getFirstEmail(person),
        imageUrl: normalizePhotoUrl(person.photoUrl),
        badge,
      });
    }
  }

  return cards;
}

function scoreDistrictRepresentative(card: OfficialCard) {
  const title = card.title.toLowerCase();
  let score = 0;

  if (card.badge.text === "House") score += 10;
  if (title.includes("united states house")) score += 8;
  if (title.includes("representative")) score += 7;
  if (title.includes("congress")) score += 5;
  if (card.level === "federal") score += 4;
  if (title.includes("senator")) score -= 10;
  if (title.includes("governor")) score -= 10;
  if (title.includes("attorney general")) score -= 10;

  return score;
}

function pickDistrictRepresentative(cards: OfficialCard[]) {
  const ranked = [...cards]
    .filter((card) => scoreDistrictRepresentative(card) > 0)
    .sort((a, b) => scoreDistrictRepresentative(b) - scoreDistrictRepresentative(a));

  return ranked[0] || null;
}

function pickStatewide(cards: OfficialCard[]) {
  return cards.filter((card) => {
    const title = card.title.toLowerCase();
    return (
      title.includes("senator") ||
      title.includes("governor") ||
      title.includes("attorney general")
    );
  });
}

export async function GET(req: NextRequest) {
  try {
    const address = req.nextUrl.searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        { error: "Missing address parameter." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_CIVIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GOOGLE_CIVIC_API_KEY." },
        { status: 500 }
      );
    }

    const url = new URL("https://www.googleapis.com/civicinfo/v2/representatives");
    url.searchParams.set("address", address);
    url.searchParams.set("includeOffices", "true");
    url.searchParams.set("key", apiKey);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: "Google Civic API error", details: text },
        { status: response.status }
      );
    }

    const data = (await response.json()) as CivicResponse;
    const allOfficials = mapOfficeToCards(data);
    const districtRepresentative = pickDistrictRepresentative(allOfficials);
    const statewideLeaders = pickStatewide(allOfficials);

    return NextResponse.json({
      districtRepresentative,
      statewideLeaders,
      allOfficials,
    });
  } catch (error) {
    console.error("Civic representatives route failed:", error);
    return NextResponse.json(
      { error: "Failed to load representatives." },
      { status: 500 }
    );
  }
}