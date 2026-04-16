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

function pickBadge(role?: string, officeName?: string) {
  const roleText = role || "";
  const office = officeName || "";

  if (roleText === "legislatorUpperBody" || office.toLowerCase().includes("senator")) {
    return { text: "Senate", tone: "red" as const };
  }

  if (roleText === "legislatorLowerBody" || office.toLowerCase().includes("representative")) {
    return { text: "House", tone: "blue" as const };
  }

  return { text: "State", tone: "green" as const };
}

function levelFromOffice(office: CivicOffice): "federal" | "state" {
  const divisionId = office.divisionId || "";
  if (divisionId.includes("/country:us")) {
    if (divisionId.includes("/state:") && !divisionId.includes("/cd:")) {
      return "state";
    }
    return "federal";
  }
  return "state";
}

function firstUrl(official?: CivicOfficial) {
  return official?.urls?.[0] || "";
}

function firstPhone(official?: CivicOfficial) {
  return official?.phones?.[0] || "";
}

function firstEmail(official?: CivicOfficial) {
  return official?.emails?.[0] || "";
}

function buildContactUrl(official?: CivicOfficial) {
  const email = firstEmail(official);
  if (email) return `mailto:${email}`;
  return firstUrl(official);
}

function mapOfficeToCards(data: CivicResponse) {
  const offices = data.offices || [];
  const officials = data.officials || [];

  const cards: OfficialCard[] = [];

  for (const office of offices) {
    const indices = office.officialIndices || [];
    const role = office.roles?.[0];
    const level = levelFromOffice(office);
    const badge = pickBadge(role, office.name);

    for (const idx of indices) {
      const person = officials[idx];
      if (!person?.name) continue;

      cards.push({
        id: `${office.divisionId || "office"}-${idx}`,
        name: person.name,
        title: office.name || "Public Official",
        officeLabel: office.divisionId || "",
        level,
        website: firstUrl(person),
        contactUrl: buildContactUrl(person),
        phone: firstPhone(person),
        email: firstEmail(person),
        imageUrl: person.photoUrl || "/officials/fallback-avatar.jpg",
        badge,
      });
    }
  }

  return cards;
}

function pickDistrictRepresentative(cards: OfficialCard[]) {
  return (
    cards.find(
      (c) =>
        c.badge.text === "House" &&
        c.title.toLowerCase().includes("representative")
    ) || null
  );
}

function pickStatewide(cards: OfficialCard[]) {
  return cards.filter((c) => {
    const title = c.title.toLowerCase();
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

    const key = process.env.GOOGLE_CIVIC_API_KEY;
    if (!key) {
      return NextResponse.json(
        { error: "Missing GOOGLE_CIVIC_API_KEY." },
        { status: 500 }
      );
    }

    const url = new URL(
      "https://www.googleapis.com/civicinfo/v2/representatives"
    );
    url.searchParams.set("address", address);
    url.searchParams.set("includeOffices", "true");
    url.searchParams.set("key", key);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 }, // 24h
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: "Google Civic API error", details: text },
        { status: response.status }
      );
    }

    const data = (await response.json()) as CivicResponse;
    const cards = mapOfficeToCards(data);

    const districtRepresentative = pickDistrictRepresentative(cards);
    const statewideLeaders = pickStatewide(cards);

    return NextResponse.json({
      districtRepresentative,
      statewideLeaders,
      allOfficials: cards,
    });
  } catch (error) {
    console.error("Civic representatives route failed:", error);
    return NextResponse.json(
      { error: "Failed to load representatives." },
      { status: 500 }
    );
  }
}