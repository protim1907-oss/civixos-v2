import { NextRequest, NextResponse } from "next/server";

const CIVIC_API_KEY = process.env.GOOGLE_CIVIC_API_KEY;

type CivicOfficial = {
  name?: string;
  party?: string;
  photoUrl?: string;
  urls?: string[];
  phones?: string[];
};

type CivicOffice = {
  name?: string;
  divisionId?: string;
  levels?: string[];
  roles?: string[];
  officialIndices?: number[];
};

function normalizeStateCode(state?: string | null): string {
  const value = String(state || "").trim().toLowerCase();

  const map: Record<string, string> = {
    texas: "tx",
    tx: "tx",
    "new hampshire": "nh",
    nh: "nh",
    california: "ca",
    ca: "ca",
    florida: "fl",
    fl: "fl",
    "new york": "ny",
    ny: "ny",
  };

  return map[value] || value;
}

function normalizeStateName(stateCode: string): string {
  const map: Record<string, string> = {
    tx: "Texas",
    nh: "New Hampshire",
    ca: "California",
    fl: "Florida",
    ny: "New York",
  };

  return map[stateCode.toLowerCase()] || stateCode.toUpperCase();
}

function officeBadge(officeName = "", roles: string[] = []) {
  const value = `${officeName} ${roles.join(" ")}`.toLowerCase();

  if (value.includes("senator") || roles.includes("legislatorUpperBody")) {
    return { text: "Senate", tone: "red" as const };
  }

  if (
    value.includes("governor") ||
    value.includes("attorney general") ||
    roles.includes("headOfGovernment") ||
    roles.includes("governmentOfficer")
  ) {
    return { text: "State", tone: "green" as const };
  }

  return { text: "Office", tone: "slate" as const };
}

function buildOfficial(
  official: CivicOfficial,
  office: CivicOffice,
  idx: number,
  stateCode: string
) {
  return {
    id: `${official.name || "official"}-${idx}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-"),
    name: official.name || "Unknown Official",
    title: office.name || "Public Office",
    officeLabel: "Statewide Office",
    level: "state" as const,
    state: normalizeStateName(stateCode),
    party: official.party || undefined,
    website: official.urls?.[0] || "#",
    contactUrl: official.urls?.[0] || "#",
    phone: official.phones?.[0] || undefined,
    imageUrl: official.photoUrl || "",
    badge: officeBadge(office.name, office.roles || []),
  };
}

export async function GET(request: NextRequest) {
  try {
    const rawState = request.nextUrl.searchParams.get("state");
    const stateCode = normalizeStateCode(rawState);

    if (!stateCode) {
      return NextResponse.json({ error: "Missing state" }, { status: 400 });
    }

    if (!CIVIC_API_KEY) {
      return NextResponse.json(
        { error: "Missing GOOGLE_CIVIC_API_KEY" },
        { status: 500 }
      );
    }

    const ocdId = `ocd-division/country:us/state:${stateCode}`;

    const url = new URL(
      `https://www.googleapis.com/civicinfo/v2/representatives/${encodeURIComponent(
        ocdId
      )}`
    );
    url.searchParams.set("key", CIVIC_API_KEY);
    url.searchParams.set("levels", "administrativeArea1");
    url.searchParams.set("recursive", "true");

    const response = await fetch(url.toString(), { cache: "no-store" });
    const rawText = await response.text();

    console.log("STATEWIDE URL:", url.toString());
    console.log("STATEWIDE STATUS:", response.status);
    console.log("STATEWIDE RAW:", rawText);

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Google Civic API error",
          status: response.status,
          details: rawText,
        },
        { status: response.status }
      );
    }

    const data = JSON.parse(rawText);
    const officials: CivicOfficial[] = Array.isArray(data.officials)
      ? data.officials
      : [];
    const offices: CivicOffice[] = Array.isArray(data.offices) ? data.offices : [];

    const statewideLeaders: any[] = [];

    for (const office of offices) {
      const officeName = (office.name || "").toLowerCase();
      const roles = office.roles || [];
      const indices = office.officialIndices || [];

      const keep =
        officeName.includes("senator") ||
        officeName.includes("governor") ||
        officeName.includes("attorney general") ||
        roles.includes("legislatorUpperBody") ||
        roles.includes("headOfGovernment") ||
        roles.includes("governmentOfficer");

      if (!keep) continue;

      for (const index of indices) {
        const official = officials[index];
        if (!official) continue;
        statewideLeaders.push(buildOfficial(official, office, index, stateCode));
      }
    }

    return NextResponse.json({ statewideLeaders });
  } catch (error) {
    console.error("statewide route failed:", error);
    return NextResponse.json(
      { error: "Failed to load statewide leaders" },
      { status: 500 }
    );
  }
}