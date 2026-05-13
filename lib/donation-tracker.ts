export type FundingSource = {
  label: string;
  amount: number;
  tone: string;
};

export type Contributor = {
  name: string;
  sector: string;
  amount: number;
  relationship: string;
};

export type InfluenceSignal = {
  label: string;
  detail: string;
  level: "High" | "Medium" | "Low";
};

export type FundingProfile = {
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

export type FundingOfficialInput = {
  name: string;
};

export const fundingProfiles: Record<string, FundingProfile> = {
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

export function slugifyFundingName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatFundingCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function getFundingProfile(official: FundingOfficialInput): FundingProfile {
  const known = fundingProfiles[slugifyFundingName(official.name)];
  if (known) return known;

  return {
    cycle: "2025-2026",
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

export function getInfluenceLevelClasses(level: InfluenceSignal["level"]) {
  switch (level) {
    case "High":
      return "border-red-200 bg-red-50 text-red-700";
    case "Medium":
      return "border-amber-200 bg-amber-50 text-amber-800";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}
