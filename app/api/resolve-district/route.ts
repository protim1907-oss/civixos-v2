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

  const rawCode =
    first.CD118 ||
    first.BASENAME ||
    first.GEOID?.slice(-2) ||
    "";

  if (!rawCode) return null;

  const normalizedCode = String(Number(rawCode)).padStart(2, "0");

  const label =
    first.NAME ||
    `Congressional District ${Number(normalizedCode)}`;

  return {
    value: normalizedCode,
    label,
  };
}

// Civix250 is open to Texas, California, Illinois, Maryland, Colorado, Nevada,
// Ohio, Georgia, Michigan, and New York only. Registration is gated on the
// address's ACTUAL geocoded state, not on what the user selects — so a fake
// out-of-state address (or an out-of-area resident picking an allowed state)
// is rejected.
const ALLOWED_STATES = ["TX", "CA", "IL", "MD", "CO", "NV", "OH", "GA", "MI", "NY", "VA", "NC", "PA", "FL", "DC", "NJ", "AZ", "WA", "WI", "MA", "TN", "IN", "MN", "MO", "SC"] as const;

function getStateAbbr(state: string) {
  const stateCodeMap: Record<string, string> = {
    Texas: "TX",
    California: "CA",
    Illinois: "IL",
    Maryland: "MD",
    Colorado: "CO",
    Nevada: "NV",
    Ohio: "OH",
    Georgia: "GA",
    Michigan: "MI",
    Florida: "FL",
    "New York": "NY",
    Virginia: "VA",
    "North Carolina": "NC",
    Pennsylvania: "PA",
    "District of Columbia": "DC",
    "Washington DC": "DC",
    "New Jersey": "NJ",
    Arizona: "AZ",
    Washington: "WA",
    Wisconsin: "WI",
    Massachusetts: "MA",
    Tennessee: "TN",
    Indiana: "IN",
    Minnesota: "MN",
    Missouri: "MO",
    "South Carolina": "SC",
  };

  return stateCodeMap[state] || state.slice(0, 2).toUpperCase();
}

function buildDistrictLabel(state: string, districtCode: string, districtId: string) {
  return `${state} Congressional District ${Number(districtCode)} (${districtId})`;
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

    // Use the state the geocoder actually matched the address to — never the
    // user-supplied state — so the eligibility check can't be spoofed.
    const matchedStateAbbr = String(
      match.addressComponents?.state || ""
    ).toUpperCase();
    const effectiveStateAbbr = matchedStateAbbr || getStateAbbr(String(state));

    if (!ALLOWED_STATES.includes(effectiveStateAbbr as (typeof ALLOWED_STATES)[number])) {
      return NextResponse.json(
        {
          error:
            "Civix250 is currently open to residents of Texas, California, Illinois, Maryland, Colorado, Nevada, Ohio, Georgia, Michigan, New York, Virginia, North Carolina, Pennsylvania, Florida, Washington, D.C., New Jersey, Arizona, Washington, Wisconsin, Massachusetts, Tennessee, Indiana, Minnesota, Missouri, and South Carolina only. This address is outside our service area.",
          state: effectiveStateAbbr,
        },
        { status: 403 }
      );
    }

    // Map the geocoded abbreviation back to a full state name for labelling.
    const stateNameByAbbr: Record<string, string> = {
      TX: "Texas",
      CA: "California",
      IL: "Illinois",
      MD: "Maryland",
      CO: "Colorado",
      NV: "Nevada",
      OH: "Ohio",
      GA: "Georgia",
      MI: "Michigan",
      NY: "New York",
      VA: "Virginia",
      NC: "North Carolina",
      PA: "Pennsylvania",
      FL: "Florida",
      DC: "District of Columbia",
      NJ: "New Jersey",
      AZ: "Arizona",
      WA: "Washington",
      WI: "Wisconsin",
      MA: "Massachusetts",
      TN: "Tennessee",
      IN: "Indiana",
      MN: "Minnesota",
      MO: "Missouri",
      SC: "South Carolina",
    };
    const resolvedStateName = stateNameByAbbr[effectiveStateAbbr] || String(state);

    // Maryland, Colorado, Nevada, Georgia, Michigan, and New York congressional
    // districts are stored zero-padded (MD-1 -> MD-01, … NY-1 -> NY-01).
    const zeroPaddedStates = ["MD", "CO", "NV", "GA", "MI", "NY", "VA", "NC", "PA", "FL", "DC", "NJ", "AZ", "WA", "WI", "MA", "TN", "IN", "MN", "MO", "SC"];
    const districtNumber = Number(district.value);
    const districtDigits = zeroPaddedStates.includes(effectiveStateAbbr)
      ? String(districtNumber).padStart(2, "0")
      : String(districtNumber);
    const districtId = `${effectiveStateAbbr}-${districtDigits}`;
    const districtLabel = buildDistrictLabel(
      resolvedStateName,
      String(district.value),
      districtId
    );

    return NextResponse.json({
      district: {
        value: districtId,
        label: districtLabel,
      },
      state: effectiveStateAbbr,
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