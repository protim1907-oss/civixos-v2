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

function normalizeDistrictCode(raw?: string | null): string {
  const value = String(raw || "").trim().toUpperCase();
  if (!value) return "";

  if (/^[A-Z]{2}-\d{1,2}$/.test(value)) {
    const [state, district] = value.split("-");
    return `${state}-${Number(district)}`;
  }

  const match = value.match(/^([A-Z]{2})[\s-]?(\d{1,2})$/);
  if (match) {
    return `${match[1]}-${Number(match[2])}`;
  }

  return value;
}

function normalizeStateName(stateCode: string): string {
  const map: Record<string, string> = {
    TX: "Texas",
    NH: "New Hampshire",
    CA: "California",
    FL: "Florida",
    NY: "New York",
  };

  return map[stateCode] || stateCode;
}

function buildOfficial(
  official: CivicOfficial,
  office: CivicOffice,
  idx: number,
  districtCode: string
) {
  const stateCode = districtCode.split("-")[0] || "";
  return {
    id: `${official.name || "official"}-${idx}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-"),
    name: official.name || "Unknown Official",
    title: office.name || "Public Office",
    officeLabel: districtCode,
    level: "federal" as const,
    district: districtCode,
    state: normalizeStateName(stateCode),
    party: official.party || undefined,
    website: official.urls?.[0] || "#",
    contactUrl: official.urls?.[0] || "#",
    phone: official.phones?.[0] || undefined,
    imageUrl: official.photoUrl || "",
    badge: {
      text: "House",
      tone: "blue" as const,
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const rawDistrict = request.nextUrl.searchParams.get("district");
    const district = normalizeDistrictCode(rawDistrict);

    if (!district) {
      return NextResponse.json({ error: "Missing district" }, { status: 400 });
    }

    if (!CIVIC_API_KEY) {
      return NextResponse.json(
        { error: "Missing GOOGLE_CIVIC_API_KEY" },
        { status: 500 }
      );
    }

    const [stateCode, districtNumber] = district.split("-");
    if (!stateCode || !districtNumber) {
      return NextResponse.json(
        { error: "Invalid district format. Expected TX-35, CA-42, etc." },
        { status: 400 }
      );
    }

    const ocdId = `ocd-division/country:us/state:${stateCode.toLowerCase()}/cd:${Number(
      districtNumber
    )}`;

    const url = new URL(
      `https://www.googleapis.com/civicinfo/v2/representatives/${encodeURIComponent(
        ocdId
      )}`
    );
    url.searchParams.set("key", CIVIC_API_KEY);
    url.searchParams.set("recursive", "true");

    const response = await fetch(url.toString(), { cache: "no-store" });
    const rawText = await response.text();

    console.log("BY_DISTRICT URL:", url.toString());
    console.log("BY_DISTRICT STATUS:", response.status);
    console.log("BY_DISTRICT RAW:", rawText);

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

    for (const office of offices) {
      const officeName = (office.name || "").toLowerCase();
      const roles = office.roles || [];
      const indices = office.officialIndices || [];

      const isHouseOffice =
        officeName.includes("representative") ||
        officeName.includes("house") ||
        roles.includes("legislatorLowerBody");

      if (!isHouseOffice) continue;

      for (const index of indices) {
        const official = officials[index];
        if (!official) continue;

        districtRepresentative = buildOfficial(
          official,
          office,
          index,
          district
        );
        break;
      }

      if (districtRepresentative) break;
    }

    return NextResponse.json({ districtRepresentative });
  } catch (error) {
    console.error("representatives-by-district route failed:", error);
    return NextResponse.json(
      { error: "Failed to load district representative" },
      { status: 500 }
    );
  }
}