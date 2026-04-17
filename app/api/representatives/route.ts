import { NextRequest, NextResponse } from "next/server";

const CIVIC_API_KEY = process.env.GOOGLE_CIVIC_API_KEY;
const CIVIC_BASE = "https://www.googleapis.com/civicinfo/v2/representatives";

type CivicOfficial = {
  name?: string;
  party?: string;
  photoUrl?: string;
  urls?: string[];
  phones?: string[];
  emails?: string[];
};

type CivicOffice = {
  name?: string;
  divisionId?: string;
  levels?: string[];
  roles?: string[];
  officialIndices?: number[];
};

function getStateNameFromOcd(ocdId?: string) {
  if (!ocdId) return "";
  const match = ocdId.match(/state:([a-z]{2})/i);
  if (!match) return "";
  return match[1].toUpperCase();
}

function officeBadge(officeName = "", roles: string[] = []) {
  const value = `${officeName} ${roles.join(" ")}`.toLowerCase();

  if (value.includes("senator") || roles.includes("legislatorUpperBody")) {
    return { text: "Senate", tone: "red" as const };
  }

  if (
    value.includes("representative") ||
    value.includes("house") ||
    roles.includes("legislatorLowerBody")
  ) {
    return { text: "House", tone: "blue" as const };
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
  idx: number
) {
  return {
    id: `${official.name || "official"}-${idx}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-"),
    name: official.name || "Unknown Official",
    title: office.name || "Public Office",
    officeLabel:
      office.name?.includes("United States")
        ? office.name
        : office.divisionId || "District Office",
    level:
      office.levels?.includes("administrativeArea1") ? "state" : "federal",
    state: getStateNameFromOcd(office.divisionId),
    party: official.party || undefined,
    website: official.urls?.[0] || "#",
    contactUrl: official.urls?.[0] || "#",
    phone: official.phones?.[0] || undefined,
    imageUrl: official.photoUrl || "",
    badge: officeBadge(office.name, office.roles || []),
  };
}

function isDistrictRepresentative(office: CivicOffice) {
  const officeName = (office.name || "").toLowerCase();
  const roles = office.roles || [];
  const divisionId = (office.divisionId || "").toLowerCase();

  return (
    officeName.includes("representative") ||
    officeName.includes("house of representatives") ||
    roles.includes("legislatorLowerBody") ||
    divisionId.includes("/cd:")
  );
}

function isStatewideLeader(office: CivicOffice) {
  const officeName = (office.name || "").toLowerCase();
  const roles = office.roles || [];

  return (
    officeName.includes("senator") ||
    officeName.includes("governor") ||
    officeName.includes("attorney general") ||
    roles.includes("legislatorUpperBody") ||
    roles.includes("headOfGovernment") ||
    roles.includes("governmentOfficer")
  );
}

export async function GET(request: NextRequest) {
  try {
    const address = request.nextUrl.searchParams.get("address");

    if (!address) {
      return NextResponse.json({ error: "Missing address" }, { status: 400 });
    }

    if (!CIVIC_API_KEY) {
      return NextResponse.json(
        { error: "Missing GOOGLE_CIVIC_API_KEY" },
        { status: 500 }
      );
    }

    const url = new URL(CIVIC_BASE);
    url.searchParams.set("key", CIVIC_API_KEY);
    url.searchParams.set("address", address);
    url.searchParams.set("includeOffices", "true");

    const response = await fetch(url.toString(), { cache: "no-store" });
    const rawText = await response.text();

    console.log("REPRESENTATIVES URL:", url.toString());
    console.log("REPRESENTATIVES STATUS:", response.status);
    console.log("REPRESENTATIVES RAW:", rawText);

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

    let districtRepresentative: any = null;
    const statewideLeaders: any[] = [];

    for (const office of offices) {
      const indices = office.officialIndices || [];

      for (const index of indices) {
        const official = officials[index];
        if (!official) continue;

        const mapped = buildOfficial(official, office, index);

        if (isDistrictRepresentative(office) && !districtRepresentative) {
          districtRepresentative = mapped;
          continue;
        }

        if (isStatewideLeader(office)) {
          statewideLeaders.push(mapped);
        }
      }
    }

    return NextResponse.json({
      districtRepresentative,
      statewideLeaders,
    });
  } catch (error) {
    console.error("representatives route failed:", error);
    return NextResponse.json(
      { error: "Failed to load representatives" },
      { status: 500 }
    );
  }
}