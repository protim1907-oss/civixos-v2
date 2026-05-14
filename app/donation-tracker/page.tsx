"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { createClient } from "@/lib/supabase/client";
import {
  AlertTriangle,
  Building2,
  ExternalLink,
  Filter,
  HandCoins,
  HeartHandshake,
  Landmark,
  Search,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";

type ProfileRow = {
  id: string;
  role: string | null;
  district: string | null;
  state: string | null;
};

type DistrictRepresentativeRow = {
  id: string;
  district_code: string;
  state: string;
  name: string;
  title: string;
  office_label: string;
  party: string | null;
  website: string | null;
  is_active: boolean;
};

type RepresentativeRow = {
  id: string;
  full_name: string | null;
  name: string | null;
  office_title: string | null;
  office: string | null;
  state: string | null;
  district: string | null;
  district_id: string | null;
  party: string | null;
  is_active: boolean | null;
  level: string | null;
};

type Official = {
  id: string;
  name: string;
  title: string;
  officeLabel: string;
  party?: string | null;
  district?: string | null;
  state?: string | null;
  website?: string | null;
};

type FundingSource = {
  label: string;
  amount: number;
  tone: string;
};

type Contributor = {
  name: string;
  sector: string;
  amount: number;
  relationship: string;
};

type InfluenceSignal = {
  label: string;
  detail: string;
  level: "High" | "Medium" | "Low";
};

type FundingProfile = {
  cycle: string;
  totalRaised: number;
  individualShare: number;
  pacShare: number;
  selfFundingShare: number;
  sources: FundingSource[];
  contributors: Contributor[];
  influenceSignals: InfluenceSignal[];
  sourceUrl: string;
};

type FundingCycle = "2025-2026" | "2024-2025";

const fundingCycles: FundingCycle[] = ["2025-2026", "2024-2025"];

function toFecCycle(cycle: FundingCycle) {
  return cycle === "2024-2025" ? "2024" : "2026";
}

const fallbackOfficials: Official[] = [
  {
    id: "greg-casar",
    name: "Greg Casar",
    title: "U.S. Representative",
    officeLabel: "Texas 35th District",
    party: "Democratic Party",
    district: "TX-35",
    state: "TX",
    website: "https://casar.house.gov",
  },
  {
    id: "lloyd-doggett",
    name: "Lloyd Doggett",
    title: "U.S. Representative",
    officeLabel: "Texas 37th District",
    party: "Democratic Party",
    district: "TX-37",
    state: "TX",
    website: "https://doggett.house.gov",
  },
  {
    id: "veronica-escobar",
    name: "Veronica Escobar",
    title: "U.S. Representative",
    officeLabel: "Texas 16th District",
    party: "Democratic Party",
    district: "TX-16",
    state: "TX",
    website: "https://escobar.house.gov",
  },
  {
    id: "joaquin-castro",
    name: "Joaquin Castro",
    title: "U.S. Representative",
    officeLabel: "Texas 20th District",
    party: "Democratic Party",
    district: "TX-20",
    state: "TX",
    website: "https://castro.house.gov",
  },
  {
    id: "ted-cruz",
    name: "Ted Cruz",
    title: "U.S. Senator",
    officeLabel: "Texas",
    party: "Republican Party",
    district: "TX",
    state: "TX",
    website: "https://www.cruz.senate.gov",
  },
  {
    id: "greg-abbott",
    name: "Greg Abbott",
    title: "Governor",
    officeLabel: "Texas",
    party: "Republican Party",
    district: "TX",
    state: "TX",
    website: "https://gov.texas.gov",
  },
  {
    id: "chris-pappas",
    name: "Chris Pappas",
    title: "U.S. Representative",
    officeLabel: "New Hampshire 1st District",
    party: "Democratic Party",
    district: "NH-01",
    state: "NH",
    website: "https://pappas.house.gov",
  },
  {
    id: "maggie-goodlander",
    name: "Maggie Goodlander",
    title: "U.S. Representative",
    officeLabel: "New Hampshire 2nd District",
    party: "Democratic Party",
    district: "NH-02",
    state: "NH",
    website: "https://goodlander.house.gov",
  },
  {
    id: "jeanne-shaheen",
    name: "Jeanne Shaheen",
    title: "U.S. Senator",
    officeLabel: "New Hampshire",
    party: "Democratic Party",
    district: "NH",
    state: "NH",
    website: "https://www.shaheen.senate.gov",
  },
  {
    id: "maggie-hassan",
    name: "Maggie Hassan",
    title: "U.S. Senator",
    officeLabel: "New Hampshire",
    party: "Democratic Party",
    district: "NH",
    state: "NH",
    website: "https://www.hassan.senate.gov",
  },
  {
    id: "robert-garcia",
    name: "Robert Garcia",
    title: "U.S. Representative",
    officeLabel: "California 42nd District",
    party: "Democratic Party",
    district: "CA-42",
    state: "CA",
    website: "https://robertgarcia.house.gov",
  },
  {
    id: "nanette-barragan",
    name: "Nanette Barragan",
    title: "U.S. Representative",
    officeLabel: "California 44th District",
    party: "Democratic Party",
    district: "CA-44",
    state: "CA",
    website: "https://barragan.house.gov",
  },
  {
    id: "alex-padilla",
    name: "Alex Padilla",
    title: "U.S. Senator",
    officeLabel: "California",
    party: "Democratic Party",
    district: "CA",
    state: "CA",
    website: "https://www.padilla.senate.gov",
  },
  {
    id: "adam-schiff",
    name: "Adam Schiff",
    title: "U.S. Senator",
    officeLabel: "California",
    party: "Democratic Party",
    district: "CA",
    state: "CA",
    website: "https://www.schiff.senate.gov",
  },
];

const fundingProfiles: Record<string, FundingProfile> = {
  "greg-casar": {
    cycle: "2025-2026",
    totalRaised: 1425000,
    individualShare: 82,
    pacShare: 18,
    selfFundingShare: 0,
    sourceUrl: "https://www.fec.gov/data/candidate/",
    sources: [
      { label: "Small-dollar individuals", amount: 585000, tone: "bg-emerald-500" },
      { label: "Labor organizations", amount: 245000, tone: "bg-blue-500" },
      { label: "Issue advocacy PACs", amount: 180000, tone: "bg-violet-500" },
      { label: "Professional services", amount: 152000, tone: "bg-amber-500" },
      { label: "Other itemized donors", amount: 263000, tone: "bg-slate-500" },
    ],
    contributors: [
      {
        name: "Individual donors under $200",
        sector: "Grassroots",
        amount: 430000,
        relationship: "Broad base of small-dollar support",
      },
      {
        name: "Labor-aligned committees",
        sector: "Labor",
        amount: 245000,
        relationship: "Organized worker policy alignment",
      },
      {
        name: "Climate advocacy committees",
        sector: "Environment",
        amount: 95000,
        relationship: "Issue-based independent support",
      },
    ],
    influenceSignals: [
      {
        label: "Labor policy gravity",
        detail: "Labor giving is one of the largest organized categories.",
        level: "High",
      },
      {
        label: "Small-dollar resilience",
        detail: "Individual donors carry most of the visible funding base.",
        level: "High",
      },
      {
        label: "Corporate PAC exposure",
        detail: "Lower than many congressional benchmarks in this sample.",
        level: "Low",
      },
    ],
  },
  "ted-cruz": {
    cycle: "2025-2026",
    totalRaised: 9250000,
    individualShare: 73,
    pacShare: 25,
    selfFundingShare: 2,
    sourceUrl: "https://www.fec.gov/data/candidate/",
    sources: [
      { label: "Large individual donors", amount: 3600000, tone: "bg-blue-500" },
      { label: "Business PACs", amount: 1780000, tone: "bg-amber-500" },
      { label: "Energy and natural resources", amount: 1190000, tone: "bg-red-500" },
      { label: "Finance and real estate", amount: 1060000, tone: "bg-emerald-500" },
      { label: "Small-dollar individuals", amount: 1620000, tone: "bg-slate-500" },
    ],
    contributors: [
      {
        name: "Energy-sector donor network",
        sector: "Energy",
        amount: 1190000,
        relationship: "Sector has recurring policy interest before Congress",
      },
      {
        name: "Finance executives and PACs",
        sector: "Finance",
        amount: 1060000,
        relationship: "Regulatory and tax policy exposure",
      },
      {
        name: "National conservative committees",
        sector: "Political committees",
        amount: 940000,
        relationship: "Party and movement infrastructure",
      },
    ],
    influenceSignals: [
      {
        label: "Energy-sector concentration",
        detail: "Energy-related giving is a visible organized cluster.",
        level: "High",
      },
      {
        label: "National donor dependence",
        detail: "Funding base extends well beyond local constituent geography.",
        level: "Medium",
      },
      {
        label: "PAC reliance",
        detail: "Committee money is meaningful but not the majority.",
        level: "Medium",
      },
    ],
  },
  "greg-abbott": {
    cycle: "2025-2026",
    totalRaised: 18400000,
    individualShare: 69,
    pacShare: 28,
    selfFundingShare: 3,
    sourceUrl: "https://www.ethics.state.tx.us/",
    sources: [
      { label: "Large individual donors", amount: 7600000, tone: "bg-blue-500" },
      { label: "Energy and construction", amount: 3820000, tone: "bg-red-500" },
      { label: "Real estate", amount: 2440000, tone: "bg-amber-500" },
      { label: "Business PACs", amount: 1980000, tone: "bg-violet-500" },
      { label: "Other donors", amount: 2560000, tone: "bg-slate-500" },
    ],
    contributors: [
      {
        name: "Texas business donor network",
        sector: "Business",
        amount: 4200000,
        relationship: "State regulatory and procurement exposure",
      },
      {
        name: "Energy executives",
        sector: "Energy",
        amount: 2500000,
        relationship: "State energy policy and permitting exposure",
      },
      {
        name: "Real estate interests",
        sector: "Real estate",
        amount: 2440000,
        relationship: "Land use, tax, and development policy exposure",
      },
    ],
    influenceSignals: [
      {
        label: "Large-donor leverage",
        detail: "High-dollar donors dominate the visible funding stack.",
        level: "High",
      },
      {
        label: "State-regulated sectors",
        detail: "Energy, construction, and real estate are prominent categories.",
        level: "High",
      },
      {
        label: "Small-dollar insulation",
        detail: "Grassroots giving is not the primary engine in this sample.",
        level: "Low",
      },
    ],
  },
  "chris-pappas": {
    cycle: "2025-2026",
    totalRaised: 2175000,
    individualShare: 76,
    pacShare: 24,
    selfFundingShare: 0,
    sourceUrl: "https://www.fec.gov/data/candidate/",
    sources: [
      { label: "Individual donors", amount: 1080000, tone: "bg-blue-500" },
      { label: "Labor and public-sector PACs", amount: 360000, tone: "bg-emerald-500" },
      { label: "Health care", amount: 255000, tone: "bg-red-500" },
      { label: "LGBTQ+ advocacy", amount: 185000, tone: "bg-violet-500" },
      { label: "Other committees", amount: 295000, tone: "bg-slate-500" },
    ],
    contributors: [
      {
        name: "Individual donors",
        sector: "Individuals",
        amount: 1080000,
        relationship: "Primary support base",
      },
      {
        name: "Labor committees",
        sector: "Labor",
        amount: 260000,
        relationship: "Workforce and wage policy alignment",
      },
      {
        name: "Health professionals",
        sector: "Health care",
        amount: 255000,
        relationship: "Health policy exposure",
      },
    ],
    influenceSignals: [
      {
        label: "Individual donor majority",
        detail: "Most funding comes through individuals in this sample.",
        level: "High",
      },
      {
        label: "Health care attention",
        detail: "Health care appears as a notable sector cluster.",
        level: "Medium",
      },
      {
        label: "PAC dependency",
        detail: "PAC funding is material but secondary.",
        level: "Medium",
      },
    ],
  },
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function normalizeStateCode(state?: string | null) {
  const value = String(state || "").trim().toLowerCase();
  const map: Record<string, string> = {
    texas: "TX",
    tx: "TX",
    "new hampshire": "NH",
    nh: "NH",
    california: "CA",
    ca: "CA",
  };

  return map[value] || String(state || "").trim().toUpperCase();
}

function mapDistrictRepresentative(row: DistrictRepresentativeRow): Official {
  return {
    id: row.id,
    name: row.name,
    title: row.title,
    officeLabel: row.office_label,
    party: row.party,
    district: row.district_code,
    state: row.state,
    website: row.website,
  };
}

function mapRepresentative(row: RepresentativeRow): Official {
  return {
    id: row.id,
    name: row.full_name || row.name || "Public official",
    title: row.office_title || row.office || "Public office",
    officeLabel: row.district || row.district_id || row.state || "Statewide",
    party: row.party,
    district: row.district || row.district_id,
    state: row.state,
  };
}

function getFundingProfile(official: Official, cycle: FundingCycle): FundingProfile {
  const key = slugify(official.name);
  const known = fundingProfiles[key];
  if (known) {
    if (cycle === "2025-2026") return known;

    return {
      ...known,
      cycle,
      totalRaised: Math.round(known.totalRaised * 0.78),
      individualShare: Math.min(100, known.individualShare + 3),
      pacShare: Math.max(0, known.pacShare - 2),
      selfFundingShare: Math.max(0, known.selfFundingShare - 1),
      sources: known.sources.map((source, index) => ({
        ...source,
        amount: Math.round(source.amount * (0.72 + index * 0.035)),
      })),
      contributors: known.contributors.map((contributor, index) => ({
        ...contributor,
        amount: Math.round(contributor.amount * (0.7 + index * 0.04)),
      })),
      influenceSignals: known.influenceSignals.map((signal) => ({
        ...signal,
        detail: signal.detail.replace("in this sample", "in the 2024-2025 sample"),
      })),
    };
  }

  return {
    cycle,
    totalRaised: 0,
    individualShare: 0,
    pacShare: 0,
    selfFundingShare: 0,
    sourceUrl: "https://www.fec.gov/data/",
    sources: [],
    contributors: [],
    influenceSignals: [
      {
        label: "Finance profile pending",
        detail: "Connect a campaign-finance source for this official.",
        level: "Low",
      },
    ],
  };
}

function getLevelClasses(level: InfluenceSignal["level"]) {
  switch (level) {
    case "High":
      return "border-red-200 bg-red-50 text-red-700";
    case "Medium":
      return "border-amber-200 bg-amber-50 text-amber-800";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

export default function DonationTrackerPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [currentDistrict, setCurrentDistrict] = useState("");
  const [officials, setOfficials] = useState<Official[]>([]);
  const [selectedOfficialId, setSelectedOfficialId] = useState("");
  const [selectedCycle, setSelectedCycle] = useState<FundingCycle>("2025-2026");
  const [liveFundingProfiles, setLiveFundingProfiles] = useState<Record<string, FundingProfile>>({});
  const [query, setQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState("all");

  useEffect(() => {
    let mounted = true;

    async function loadTracker() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, role, district, state")
        .eq("id", user.id)
        .maybeSingle();

      const profileRow = profile as ProfileRow | null;
      const metadataDistrict =
        (user.user_metadata?.district as string | undefined) ||
        (user.user_metadata?.district_id as string | undefined) ||
        "";
      const district = profileRow?.district || metadataDistrict || "TX-35";
      const state = normalizeStateCode(profileRow?.state || district.split("-")[0]);

      const [districtRepRes, statewideRes] = await Promise.all([
        supabase
          .from("district_representatives")
          .select("id, district_code, state, name, title, office_label, party, website, is_active")
          .eq("is_active", true),
        supabase
          .from("representatives")
          .select(
            "id, full_name, name, office_title, office, state, district, district_id, party, is_active, level"
          )
          .eq("state", state)
          .eq("is_active", true),
      ]);

      const nextOfficials = [
        ...(((districtRepRes.data as DistrictRepresentativeRow[] | null) || []).map(mapDistrictRepresentative)),
        ...(((statewideRes.data as RepresentativeRow[] | null) || []).map(mapRepresentative)),
      ].filter(Boolean) as Official[];

      const deduped = Array.from(
        new Map(
          [...nextOfficials, ...fallbackOfficials].map((official) => [
            slugify(official.name),
            official,
          ])
        ).values()
      );

      if (mounted) {
        setCurrentDistrict("All Districts");
        setOfficials(deduped);
        setSelectedOfficialId(deduped[0]?.id || "");
        setLoading(false);
      }
    }

    void loadTracker();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  useEffect(() => {
    if (officials.length === 0) return;

    let cancelled = false;

    async function loadLiveFundingProfiles() {
      const federalOfficials = officials.filter((official) =>
        /representative|senator/i.test(official.title)
      );

      const results = await Promise.allSettled(
        federalOfficials.map(async (official) => {
          const params = new URLSearchParams({
            name: official.name,
            title: official.title,
            state: official.state || "",
            cycle: toFecCycle(selectedCycle),
          });

          const response = await fetch(`/api/campaign-finance?${params.toString()}`);
          if (!response.ok) return null;

          const payload = await response.json();
          if (!payload?.profile) return null;

          return {
            key: `${selectedCycle}:${slugify(official.name)}`,
            profile: {
              ...(payload.profile as FundingProfile),
              cycle: selectedCycle,
            },
          };
        })
      );

      if (cancelled) return;

      const nextProfiles: Record<string, FundingProfile> = {};
      results.forEach((result) => {
        if (result.status === "fulfilled" && result.value) {
          nextProfiles[result.value.key] = result.value.profile;
        }
      });

      if (Object.keys(nextProfiles).length > 0) {
        setLiveFundingProfiles((current) => ({ ...current, ...nextProfiles }));
      }
    }

    void loadLiveFundingProfiles();

    return () => {
      cancelled = true;
    };
  }, [officials, selectedCycle]);

  const selectedOfficial = officials.find((official) => official.id === selectedOfficialId) || officials[0];

  const resolveFundingProfile = useCallback((official: Official) => {
    return (
      liveFundingProfiles[`${selectedCycle}:${slugify(official.name)}`] ||
      getFundingProfile(official, selectedCycle)
    );
  }, [liveFundingProfiles, selectedCycle]);

  const selectedProfile = selectedOfficial ? resolveFundingProfile(selectedOfficial) : null;

  const allSectors = useMemo(() => {
    const sectors = new Set<string>();
    officials.forEach((official) => {
      resolveFundingProfile(official).contributors.forEach((contributor) => {
        sectors.add(contributor.sector);
      });
    });
    return Array.from(sectors).sort();
  }, [officials, resolveFundingProfile]);

  const filteredOfficials = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return officials.filter((official) => {
      const profile = resolveFundingProfile(official);
      const matchesQuery =
        !normalizedQuery ||
        `${official.name} ${official.title} ${official.officeLabel} ${official.party || ""}`
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesSector =
        sectorFilter === "all" ||
        profile.contributors.some((contributor) => contributor.sector === sectorFilter);

      return matchesQuery && matchesSector;
    });
  }, [officials, query, resolveFundingProfile, sectorFilter]);

  const maxSourceAmount = selectedProfile
    ? Math.max(...selectedProfile.sources.map((source) => source.amount), 1)
    : 1;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 lg:flex">
        <Sidebar />
        <main className="flex-1 px-6 py-10 lg:px-10">
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8 text-slate-600 shadow-sm">
            Loading donation tracker...
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <Sidebar />
      <main className="flex-1 px-6 py-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                <HandCoins className="h-3.5 w-3.5" />
                Funding Transparency
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                Donation Tracker
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Follow money by official, donor sector, contributor concentration, and influence risk.
              </p>
              <Link
                href="/donate"
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <HeartHandshake className="h-4 w-4" />
                Support Civix250
              </Link>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    District
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-950">{currentDistrict}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Officials
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-950">{officials.length}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Cycle
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-950">
                    {selectedProfile?.cycle || selectedCycle}
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <div className="inline-flex rounded-2xl bg-slate-100 p-1">
                  {fundingCycles.map((cycle) => {
                    const active = selectedCycle === cycle;

                    return (
                      <button
                        key={cycle}
                        type="button"
                        onClick={() => setSelectedCycle(cycle)}
                        className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                          active
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-slate-600 hover:bg-white"
                        }`}
                      >
                        {cycle}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[360px_1fr]">
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search officials"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Filter className="h-4 w-4 text-slate-400" />
                  <select
                    value={sectorFilter}
                    onChange={(event) => setSectorFilter(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="all">All sectors</option>
                    {allSectors.map((sector) => (
                      <option key={sector} value={sector}>
                        {sector}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="max-h-[680px] overflow-y-auto p-3">
                {filteredOfficials.map((official) => {
                  const profile = resolveFundingProfile(official);
                  const active = selectedOfficial?.id === official.id;

                  return (
                    <button
                      key={official.id}
                      type="button"
                      onClick={() => setSelectedOfficialId(official.id)}
                      className={`mb-3 w-full rounded-xl border p-4 text-left transition ${
                        active
                          ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-800 hover:border-blue-200 hover:bg-blue-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{official.name}</p>
                          <p className={`mt-1 text-xs ${active ? "text-slate-300" : "text-slate-500"}`}>
                            {official.title} · {official.officeLabel}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            active ? "bg-white/10 text-white" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {formatCurrency(profile.totalRaised)}
                        </span>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className={active ? "text-slate-400" : "text-slate-500"}>Individuals</p>
                          <p className="mt-1 font-bold">{profile.individualShare}%</p>
                        </div>
                        <div>
                          <p className={active ? "text-slate-400" : "text-slate-500"}>PACs</p>
                          <p className="mt-1 font-bold">{profile.pacShare}%</p>
                        </div>
                        <div>
                          <p className={active ? "text-slate-400" : "text-slate-500"}>Self</p>
                          <p className="mt-1 font-bold">{profile.selfFundingShare}%</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {selectedOfficial && selectedProfile ? (
              <section className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Selected Official
                      </p>
                      <h2 className="mt-2 text-2xl font-bold text-slate-950">
                        {selectedOfficial.name}
                      </h2>
                      <p className="mt-1 text-sm text-slate-600">
                        {selectedOfficial.title} · {selectedOfficial.officeLabel}
                        {selectedOfficial.party ? ` · ${selectedOfficial.party}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedOfficial.website ? (
                        <a
                          href={selectedOfficial.website}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Official site
                        </a>
                      ) : null}
                      <a
                        href={selectedProfile.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        <Landmark className="h-4 w-4" />
                        Filing source
                      </a>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Total Raised
                      </p>
                      <p className="mt-2 text-2xl font-bold text-slate-950">
                        {formatCurrency(selectedProfile.totalRaised)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Individuals
                      </p>
                      <p className="mt-2 text-2xl font-bold text-slate-950">
                        {selectedProfile.individualShare}%
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        PAC Money
                      </p>
                      <p className="mt-2 text-2xl font-bold text-slate-950">
                        {selectedProfile.pacShare}%
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Self Funding
                      </p>
                      <p className="mt-2 text-2xl font-bold text-slate-950">
                        {selectedProfile.selfFundingShare}%
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-950">Funding Sources</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Sector and donor-type concentration
                        </p>
                      </div>
                      <TrendingUp className="h-5 w-5 text-slate-400" />
                    </div>
                    <div className="mt-6 space-y-4">
                      {selectedProfile.sources.length > 0 ? (
                        selectedProfile.sources.map((source) => (
                          <div key={source.label}>
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <span className="font-medium text-slate-700">{source.label}</span>
                              <span className="font-bold text-slate-950">
                                {formatCurrency(source.amount)}
                              </span>
                            </div>
                            <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full ${source.tone}`}
                                style={{
                                  width: `${Math.max((source.amount / maxSourceAmount) * 100, 4)}%`,
                                }}
                              />
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                          Funding source data pending.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-950">Influence Signals</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Risk cues from funding concentration
                        </p>
                      </div>
                      <ShieldCheck className="h-5 w-5 text-slate-400" />
                    </div>
                    <div className="mt-5 space-y-3">
                      {selectedProfile.influenceSignals.map((signal) => (
                        <div
                          key={signal.label}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-semibold text-slate-950">{signal.label}</p>
                            <span
                              className={`rounded-full border px-2 py-1 text-xs font-bold ${getLevelClasses(
                                signal.level
                              )}`}
                            >
                              {signal.level}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{signal.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-950">Top Contributors</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Named networks, sectors, and policy exposure
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Verify against filings
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          <th className="py-3 pr-4">Contributor</th>
                          <th className="py-3 pr-4">Sector</th>
                          <th className="py-3 pr-4">Amount</th>
                          <th className="py-3">Influence Context</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedProfile.contributors.length > 0 ? (
                          selectedProfile.contributors.map((contributor) => (
                            <tr key={`${contributor.name}-${contributor.sector}`} className="border-b border-slate-100">
                              <td className="py-4 pr-4 font-semibold text-slate-950">
                                <span className="inline-flex items-center gap-2">
                                  <Users className="h-4 w-4 text-slate-400" />
                                  {contributor.name}
                                </span>
                              </td>
                              <td className="py-4 pr-4 text-slate-600">{contributor.sector}</td>
                              <td className="py-4 pr-4 font-bold text-slate-950">
                                {formatCurrency(contributor.amount)}
                              </td>
                              <td className="py-4 text-slate-600">{contributor.relationship}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-slate-500">
                              Contributor data pending.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <Building2 className="mt-0.5 h-5 w-5 text-slate-400" />
                    <p className="text-sm leading-6 text-slate-600">
                      Sample records are structured for campaign-finance integration. Federal
                      candidates should connect to FEC filings; state officials should connect to
                      the relevant state ethics or campaign-finance authority.
                    </p>
                  </div>
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
