import { NextRequest, NextResponse } from "next/server";

type Official = {
  id: string;
  name: string;
  title: string;
  officeLabel: string;
  level: "federal" | "state";
  district?: string;
  state: string;
  party?: string;
  website: string;
  contactUrl: string;
  phone?: string;
  imageUrl: string;
  badge: {
    text: string;
    tone: "red" | "green" | "blue" | "slate";
  };
};

type CongressListMember = {
  bioguideId?: string;
  district?: number | string | null;
  name?: string;
  partyName?: string;
  state?: string;
  terms?: any;
  updateDate?: string;
  url?: string;
};

type CongressListResponse = {
  members?: CongressListMember[];
  pagination?: {
    count?: number;
    next?: string;
  };
};

type CongressDetailResponse = {
  member?: any;
};

type OpenStatesPerson = {
  id?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  image?: string;
  party?: string[];
  current_role?: {
    title?: string;
    district?: string;
    org_classification?: string;
    jurisdiction?: {
      name?: string;
    };
  };
  offices?: Array<{
    voice?: string;
    fax?: string;
    address?: string;
    classification?: string;
  }>;
  links?: Array<{
    note?: string;
    url?: string;
  }>;
};

type OpenStatesResponse = {
  results?: OpenStatesPerson[];
};

function normalizeStateCode(state?: string | null): string {
  const value = String(state || "").trim().toLowerCase();

  const map: Record<string, string> = {
    texas: "TX",
    tx: "TX",
    "new hampshire": "NH",
    nh: "NH",
    california: "CA",
    ca: "CA",
    florida: "FL",
    fl: "FL",
    "new york": "NY",
    ny: "NY",
  };

  return map[value] || String(state || "").trim().toUpperCase();
}

function normalizeStateName(state?: string | null): string {
  const value = String(state || "").trim().toLowerCase();

  const map: Record<string, string> = {
    texas: "Texas",
    tx: "Texas",
    "new hampshire": "New Hampshire",
    nh: "New Hampshire",
    california: "California",
    ca: "California",
    florida: "Florida",
    fl: "Florida",
    "new york": "New York",
    ny: "New York",
  };

  return map[value] || String(state || "").trim() || "State";
}

function parseDistrictNumber(district?: string | null): number | null {
  const raw = String(district || "").trim().toUpperCase();
  if (!raw) return null;
  if (/^[A-Z]{2}$/.test(raw)) return null;

  const match = raw.match(/(\d{1,2})/);
  if (!match?.[1]) return null;

  return Number(match[1]);
}

function getCurrentChambers(terms: any): string[] {
  const items = Array.isArray(terms)
    ? terms
    : Array.isArray(terms?.item)
    ? terms.item
    : [];

  return items
    .map((term: any) => String(term?.chamber || ""))
    .filter(Boolean);
}

function isSenator(member: CongressListMember): boolean {
  return getCurrentChambers(member.terms).some((chamber) =>
    chamber.toLowerCase().includes("senate")
  );
}

function isHouseMember(member: CongressListMember): boolean {
  return getCurrentChambers(member.terms).some((chamber) =>
    chamber.toLowerCase().includes("house")
  );
}

function firstDefined<T>(...values: Array<T | null | undefined>): T | undefined {
  return values.find((v) => v !== undefined && v !== null);
}

async function fetchCongressCurrentMembers(stateCode: string) {
  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) throw new Error("Missing CONGRESS_API_KEY");

  const url = new URL("https://api.congress.gov/v3/member");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "600");
  url.searchParams.set("currentMember", "true");

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 86400 },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Congress member list failed: ${text}`);
  }

  const data = (await response.json()) as CongressListResponse;
  const members = Array.isArray(data.members) ? data.members : [];

  return members.filter(
    (member) => String(member.state || "").toUpperCase() === stateCode
  );
}

async function fetchCongressMemberDetail(member: CongressListMember) {
  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) throw new Error("Missing CONGRESS_API_KEY");

  const detailUrl =
    member.url ||
    (member.bioguideId
      ? `https://api.congress.gov/v3/member/${member.bioguideId}`
      : "");

  if (!detailUrl) return null;

  const url = new URL(detailUrl);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("format", "json");

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 86400 },
  });

  if (!response.ok) return null;

  const data = (await response.json()) as CongressDetailResponse;
  return data.member || null;
}

function mapCongressToOfficial(
  member: CongressListMember,
  detail: any,
  stateName: string,
  districtCode?: string
): Official {
  const chambers = getCurrentChambers(member.terms);
  const chamber = chambers[0] || "";
  const isSen = chamber.toLowerCase().includes("senate");

  const imageUrl = firstDefined(
    detail?.depiction?.imageUrl,
    detail?.imageUrl,
    detail?.image,
    ""
  ) as string;

  const website = firstDefined(
    detail?.officialWebsiteUrl,
    detail?.website,
    detail?.url,
    "#"
  ) as string;

  const phone = firstDefined(
    detail?.phone,
    detail?.addressInformation?.phoneNumber,
    detail?.contact?.phone,
    undefined
  ) as string | undefined;

  return {
    id: String(member.bioguideId || member.name || Math.random()),
    name: String(member.name || "Member of Congress"),
    title: isSen ? "U.S. Senator" : "U.S. Representative",
    officeLabel: isSen
      ? stateName
      : districtCode || `${stateName} Congressional District`,
    level: "federal",
    district: isSen ? undefined : districtCode,
    state: stateName,
    party: member.partyName || undefined,
    website,
    contactUrl: website,
    phone,
    imageUrl: imageUrl || "",
    badge: isSen
      ? { text: "Senate", tone: "red" }
      : { text: "House", tone: "blue" },
  };
}

async function geocodeAddress(address: string) {
  if (!address) return null;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", address);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "Civix250/1.0",
    },
    next: { revalidate: 86400 },
  });

  if (!response.ok) return null;

  const data = await response.json();
  if (!Array.isArray(data) || !data[0]) return null;

  return {
    lat: Number(data[0].lat),
    lon: Number(data[0].lon),
  };
}

async function fetchOpenStatesGovernorByState(
  stateName: string,
  address?: string
): Promise<Official | null> {
  const apiKey = process.env.OPENSTATES_API_KEY;
  if (!apiKey) throw new Error("Missing OPENSTATES_API_KEY");

  let url: URL;

  const geo = address ? await geocodeAddress(address) : null;

  if (geo) {
    url = new URL("https://v3.openstates.org/people.geo");
    url.searchParams.set("lat", String(geo.lat));
    url.searchParams.set("lng", String(geo.lon));
    url.searchParams.set("include", "current_role,offices,links");
  } else {
    url = new URL("https://v3.openstates.org/people");
    url.searchParams.set("jurisdiction", stateName);
    url.searchParams.set("include", "current_role,offices,links");
    url.searchParams.set("per_page", "100");
  }

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "X-API-KEY": apiKey,
    },
    next: { revalidate: 86400 },
  });

  if (!response.ok) return null;

  const data = (await response.json()) as OpenStatesResponse;
  const people = Array.isArray(data.results) ? data.results : [];

  const governor = people.find((person) => {
    const title = String(person.current_role?.title || "").toLowerCase();
    const classification = String(
      person.current_role?.org_classification || ""
    ).toLowerCase();

    return title.includes("governor") || classification.includes("executive");
  });

  if (!governor) return null;

  const phone =
    governor.offices?.find((o) => o.voice)?.voice ||
    governor.offices?.[0]?.voice ||
    undefined;

  const website =
    governor.links?.find((l) => l.url)?.url ||
    "#";

  return {
    id: governor.id || `openstates-${governor.name}`,
    name: governor.name || "Governor",
    title: governor.current_role?.title || "Governor",
    officeLabel: stateName,
    level: "state",
    state: stateName,
    party: Array.isArray(governor.party) ? governor.party[0] : undefined,
    website,
    contactUrl: website,
    phone,
    imageUrl: governor.image || "",
    badge: {
      text: "State",
      tone: "green",
    },
  };
}

export async function GET(req: NextRequest) {
  try {
    const state = req.nextUrl.searchParams.get("state");
    const district = req.nextUrl.searchParams.get("district");
    const address = req.nextUrl.searchParams.get("address");

    if (!state) {
      return NextResponse.json(
        { error: "Missing state parameter." },
        { status: 400 }
      );
    }

    const stateCode = normalizeStateCode(state);
    const stateName = normalizeStateName(state);
    const districtNumber = parseDistrictNumber(district);
    const districtCode =
      districtNumber !== null ? `${stateCode}-${districtNumber}` : stateCode;

    const members = await fetchCongressCurrentMembers(stateCode);

    const senatorMembers = members.filter(isSenator);
    const houseMembers = members.filter(isHouseMember);

    const districtHouseMember =
      districtNumber !== null
        ? houseMembers.find((m) => Number(m.district) === districtNumber) || null
        : houseMembers.length === 1
        ? houseMembers[0]
        : null;

    const districtRepresentative = districtHouseMember
      ? mapCongressToOfficial(
          districtHouseMember,
          await fetchCongressMemberDetail(districtHouseMember),
          stateName,
          districtCode
        )
      : null;

    const senators: Official[] = [];
    for (const senator of senatorMembers.slice(0, 2)) {
      const detail = await fetchCongressMemberDetail(senator);
      senators.push(mapCongressToOfficial(senator, detail, stateName));
    }

    const governor = await fetchOpenStatesGovernorByState(stateName, address || undefined);

    const statewideLeaders = governor ? [...senators, governor] : senators;

    return NextResponse.json({
      districtRepresentative,
      statewideLeaders,
      meta: {
        stateCode,
        stateName,
        districtCode,
      },
    });
  } catch (error: any) {
    console.error("representatives route failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load representatives." },
      { status: 500 }
    );
  }
}