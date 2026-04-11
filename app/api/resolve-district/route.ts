import { NextResponse } from "next/server";

type CensusDistrict = {
  GEOID?: string;
  CD118?: string;
  BASENAME?: string;
  NAME?: string;
};

function extractDistrictFromGeographies(geographies: Record<string, unknown>) {
  const districtKey = Object.keys(geographies).find((key) =>
    key.toLowerCase().includes("congressional district")
  );

  if (!districtKey) return null;

  const districtList = geographies[districtKey] as CensusDistrict[] | undefined;
  const first = districtList?.[0];

  if (!first) return null;

  const code =
    first.CD118 ||
    first.BASENAME ||
    first.GEOID?.slice(-2) ||
    "";

  const label =
    first.NAME ||
    (code ? `Congressional District ${code}` : "Congressional District");

  if (!code) return null;

  return {
    value: code.startsWith("0") ? `${code}` : code,
    label,
  };
}

function buildDistrictId(state: string, districtCode: string) {
  const stateCodeMap: Record<string, string> = {
    Texas: "TX",
    "New Hampshire": "NH",
    California: "CA",
  };

  const stateAbbr = stateCodeMap[state] || state.slice(0, 2).toUpperCase();

  if (state === "New Hampshire") {
    return "NH";
  }

  const padded =
    districtCode.length === 1 ? `0${districtCode}` : districtCode;

  return `${stateAbbr}-${Number(padded)}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { street, city, state, zipCode } = body ?? {};

    if (!street || !state || !zipCode) {
      return NextResponse.json(
        { error: "Street address, state, and ZIP code are required." },
        { status: 400 }
      );
    }

    const params = new URLSearchParams({
      street: String(street),
      city: String(city || ""),
      state: String(state),
      zip: String(zipCode),
      benchmark: "Public_AR_Current",
      vintage: "Current_Current",
      format: "json",
      layers: "all",
    });

    const response = await fetch(
      `https://geocoding.geo.census.gov/geocoder/geographies/address?${params.toString()}`,
      {
        headers: {
          "User-Agent": "CivicPulse/1.0",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `Census lookup failed with status ${response.status}.` },
        { status: 502 }
      );
    }

    const result = await response.json();
    const match = result?.result?.addressMatches?.[0];

    if (!match?.geographies) {
      return NextResponse.json(
        { error: "We could not resolve this address to a district." },
        { status: 404 }
      );
    }

    const district = extractDistrictFromGeographies(match.geographies);

    if (!district) {
      return NextResponse.json(
        { error: "No congressional district was found for this address." },
        { status: 404 }
      );
    }

    const districtId = buildDistrictId(String(state), String(district.value));

    return NextResponse.json({
      district: {
        value: districtId,
        label:
          state === "New Hampshire"
            ? "New Hampshire"
            : `${state} ${district.label} (${districtId})`,
      },
      matchedAddress: match.matchedAddress || null,
      coordinates: match.coordinates || null,
    });
  } catch (error) {
    console.error("resolve-district error:", error);
    return NextResponse.json(
      { error: "Unexpected error while resolving district." },
      { status: 500 }
    );
  }
}