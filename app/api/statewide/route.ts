import { NextRequest, NextResponse } from "next/server";

type CivicOfficial = {
  name?: string;
  photoUrl?: string;
  phones?: string[];
  emails?: string[];
  urls?: string[];
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

function normalizePhotoUrl(url?: string) {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("http://")) return trimmed.replace("http://", "https://");
  return trimmed;
}

function badgeForOffice(role?: string, officeName?: string) {
  const roleText = role || "";
  const office = (officeName || "").toLowerCase();

  if (roleText === "legislatorUpperBody" || office.includes("senator")) {
    return { text: "Senate", tone: "red" as const };
  }

  return { text: "State", tone: "green" as const };
}

function firstUrl(official?: CivicOfficial) {
  return official?.urls?.find(Boolean) || "";
}

function firstPhone(official?: CivicOfficial) {
  return official?.phones?.find(Boolean) || "";
}

function firstEmail(official?: CivicOfficial) {
  return official?.emails?.find(Boolean) || "";
}

function contactUrl(official?: CivicOfficial) {
  const email = firstEmail(official);
  if (email) return `mailto:${email}`;
  return firstUrl(official);
}

function normalizeStateCode(state?: string | null) {
  const value = String(state || "").trim().toLowerCase();

  const map: Record<string, string> = {
    tx: "tx",
    texas: "tx",
    nh: "nh",
    "new hampshire": "nh",
    ca: "ca",
    california: "ca",
    fl: "fl",
    florida: "fl",
    ny: "ny",
    "new york": "ny",
  };

  return map[value] || String(state || "").trim().toLowerCase();
}

function normalizeStateName(state?: string | null) {
  const value = String(state || "").trim().toLowerCase();

  const map: Record<string, string> = {
    tx: "Texas",
    texas: "Texas",
    nh: "New Hampshire",
    "new hampshire": "New Hampshire",
    ca: "California",
    california: "California",
    fl: "Florida",
    florida: "Florida",
    ny: "New York",
    "new york": "New York",
  };

  return map[value] || String(state || "").trim() || "State";
}

export async function GET(req: NextRequest) {
  try {
    const state = req.nextUrl.searchParams.get("state");

    if (!state) {
      return NextResponse.json(
        { error: "Missing state parameter." },
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

    const stateCode = normalizeStateCode(state);
    const ocdId = `ocd-division/country:us/state:${stateCode}`;

    const url = new URL("https://www.googleapis.com/civicinfo/v2/representatives");
    url.searchParams.set("ocdId", ocdId);
    url.searchParams.set("recursive", "true");
    url.searchParams.set("key", apiKey);

    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
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
    const offices = data.offices || [];
    const officials = data.officials || [];

    const statewideLeaders = offices.flatMap((office) => {
      const officeName = office.name || "";
      const role = office.roles?.[0];

      const isWanted =
        officeName.toLowerCase().includes("senator") ||
        officeName.toLowerCase().includes("governor") ||
        officeName.toLowerCase().includes("attorney general");

      if (!isWanted) return [];

      return (office.officialIndices || []).map((idx) => {
        const person = officials[idx];
        return {
          id: `${office.divisionId || officeName}-${idx}`,
          name: person?.name || "Official",
          title: officeName,
          officeLabel: normalizeStateName(state),
          level: officeName.toLowerCase().includes("senator")
            ? "federal"
            : "state",
          state: normalizeStateName(state),
          website: firstUrl(person) || "#",
          contactUrl: contactUrl(person) || firstUrl(person) || "#",
          phone: firstPhone(person) || undefined,
          imageUrl: normalizePhotoUrl(person?.photoUrl),
          badge: badgeForOffice(role, officeName),
        };
      });
    });

    return NextResponse.json({ statewideLeaders });
  } catch (error) {
    console.error("Statewide route failed:", error);
    return NextResponse.json(
      { error: "Failed to load statewide leaders." },
      { status: 500 }
    );
  }
}