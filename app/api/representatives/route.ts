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

type CongressMember = {
  bioguideId?: string;
  district?: number | string | null;
  name?: string;
  partyName?: string;
  state?: string;
  terms?: {
    item?: Array<{ chamber?: string }>;
  } | Array<{ chamber?: string }>;
  depiction?: {
    imageUrl?: string;
  };
  officialWebsiteUrl?: string;
  url?: string;
};

type CongressMemberListResponse = {
  members?: CongressMember[];
};

type CongressMemberDetailResponse = {
  member?: any;
};

type OpenStatesPerson = {
  id?: string;
  name?: string;
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
  if (!raw || /^[A-Z]{2}$/.test(raw)) return null;

  const match = raw.match(/(\d{1,2})/);
  return match?.[1] ? Number(match[1]) : null;
}

function normalizePhotoUrl(url?: string) {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("http://")) return trimmed.replace("http://", "https://");
  return trimmed;
}

function getTermsArray(terms: CongressMember["terms"]) {
  if (Array.isArray(terms)) return terms;
  if (Array.isArray(terms?.item)) return terms.item;
  return [];
}

function getChambers(member: CongressMember) {
  return getTermsArray(member.terms)
    .map((term) => String(term?.chamber || "").toLowerCase())
    .filter(Boolean);
}

function isSenator(member: CongressMember) {
  return getChambers(member).some((c) => c.includes("senate"));
}

function isHouseMember(member: CongressMember) {
  return getChambers(member).some((c) => c.includes("house"));
}

function firstDefined<T>(...values: Array<T | null | undefined>): T | undefined {
  return values.find((value) => value !== undefined && value !== null);
}

async function fetchCongressJson(url: URL) {
  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 86400 },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Congress API failed: ${text}`);
  }

  return response.json();
}

async function fetchCongressMembersByState(stateCode: string) {
  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) throw new Error("Missing CONGRESS_API_KEY");

  const url = new URL(`https://api.congress.gov/v3/member/${stateCode}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("currentMember", "true");

  const data = (await fetchCongressJson(url)) as CongressMemberListResponse;
  return Array.isArray(data.members) ? data.members : [];
}

async function fetchCongressMembersByStateDistrict(
  stateCode: string,
  districtNumber: number
) {
  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) throw new Error("Missing CONGRESS_API_KEY");

  const url = new URL(`https://api.congress.gov/v3/member/${stateCode}/${districtNumber}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("format", "json");

  const data = (await fetchCongressJson(url)) as CongressMemberListResponse;
  return Array.isArray(data.members) ? data.members : [];
}

async function fetchCongressMemberDetail(bioguideId?: string) {
  if (!bioguideId) return null;

  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) throw new Error("Missing CONGRESS_API_KEY");

  const url = new URL(`https://api.congress.gov/v3/member/${bioguideId}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("format", "json");

  const data = (await fetchCongressJson(url)) as CongressMemberDetailResponse;
  return data.member || null;
}

function mapCongressToOfficial(
  member: CongressMember,
  detail: any,
  stateName: string,
  districtCode?: string
): Official {
  const senator = isSenator(member);

  const imageUrl = normalizePhotoUrl(
    firstDefined(
      detail?.depiction?.imageUrl,
      member?.depiction?.imageUrl,
      detail?.imageUrl,
      ""
    ) as string
  );

  const website = String(
    firstDefined(detail?.officialWebsiteUrl, member?.officialWebsiteUrl, detail?.url, "#") || "#"
  );

  const phone = firstDefined(
    detail?.phone,
    detail?.addressInformation?.phoneNumber,
    detail?.contact?.phone
  ) as string | undefined;

  return {
    id: String(member.bioguideId || member.name || Math.random()),
    name: String(member.name || "Member of Congress"),
    title: senator ? "U.S. Senator" : "U.S. Representative",
    officeLabel: senator ? stateName : districtCode || `${stateName} Congressional District`,
    level: "federal",
    district: senator ? undefined : districtCode,
    state: stateName,
    party: member.partyName || undefined,
    website,
    contactUrl: website,
    phone,
    imageUrl,
    badge: senator
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

async function fetchGovernor(stateName: string, address?: string): Promise<Official | null> {
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
    governor.offices?.find((office) => office.voice)?.voice ||
    governor.offices?.[0]?.voice ||
    undefined;

  const website = governor.links?.find((link) => link.url)?.url || "#";

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
    imageUrl: normalizePhotoUrl(governor.image),
    badge: {
      text: "State",
      tone: "green",
    },
  };
}

export async function GET(req: NextRequest) {
  const state = req.nextUrl.searchParams.get("state");
  const district = req.nextUrl.searchParams.get("district");
  const address = req.nextUrl.searchParams.get("address");

  if (!state) {
    return NextResponse.json({ error: "Missing state parameter." }, { status: 400 });
  }

  const stateCode = normalizeStateCode(state);
  const stateName = normalizeStateName(state);
  const districtNumber = parseDistrictNumber(district);
  const districtCode =
    districtNumber !== null ? `${stateCode}-${districtNumber}` : stateCode;

  let districtRepresentative: Official | null = null;
  let senators: Official[] = [];
  let governor: Official | null = null;
  const errors: string[] = [];

  try {
    const stateMembers = await fetchCongressMembersByState(stateCode);
    const senatorMembers = stateMembers.filter(isSenator).slice(0, 2);

    senators = await Promise.all(
      senatorMembers.map(async (member) => {
        const detail = await fetchCongressMemberDetail(member.bioguideId);
        return mapCongressToOfficial(member, detail, stateName);
      })
    );
  } catch (error: any) {
    errors.push(`senators: ${error?.message || "failed"}`);
  }

  if (districtNumber !== null) {
    try {
      const districtMembers = await fetchCongressMembersByStateDistrict(
        stateCode,
        districtNumber
      );
      const houseMember = districtMembers.find(isHouseMember) || districtMembers[0] || null;

      if (houseMember) {
        const detail = await fetchCongressMemberDetail(houseMember.bioguideId);
        districtRepresentative = mapCongressToOfficial(
          houseMember,
          detail,
          stateName,
          districtCode
        );
      }
    } catch (error: any) {
      errors.push(`districtRepresentative: ${error?.message || "failed"}`);
    }
  }

  try {
    governor = await fetchGovernor(stateName, address || undefined);
  } catch (error: any) {
    errors.push(`governor: ${error?.message || "failed"}`);
  }

  return NextResponse.json({
    districtRepresentative,
    statewideLeaders: governor ? [...senators, governor] : senators,
    meta: {
      stateCode,
      stateName,
      districtCode,
      errors,
    },
  });
}