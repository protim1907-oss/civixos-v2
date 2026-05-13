import { NextRequest, NextResponse } from "next/server";
import type { Contributor, FundingProfile, FundingSource, InfluenceSignal } from "@/lib/donation-tracker";

const FEC_BASE_URL = "https://api.open.fec.gov/v1";
const DEFAULT_CYCLE = 2026;

type FecCandidate = {
  candidate_id?: string;
  name?: string;
  office?: string;
  state?: string;
  principal_committees?: Array<{
    committee_id?: string;
    name?: string;
  }>;
};

type FecTotals = {
  receipts?: number;
  individual_contributions?: number;
  other_political_committee_contributions?: number;
  political_party_committee_contributions?: number;
  candidate_contribution?: number;
  candidate_loans?: number;
  transfers_from_other_authorized_committee?: number;
};

type FecAggregateRow = {
  employer?: string;
  occupation?: string;
  total?: number;
  count?: number;
};

function inferFederalOffice(title: string) {
  const value = title.toLowerCase();

  if (value.includes("senator")) return "S";
  if (value.includes("representative") || value.includes("house")) return "H";

  return "";
}

function getNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function buildUrl(path: string, params: Record<string, string | number | undefined>) {
  const url = new URL(`${FEC_BASE_URL}${path}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url;
}

async function fetchFec<T>(
  path: string,
  params: Record<string, string | number | undefined>
): Promise<T[]> {
  const url = buildUrl(path, params);
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`FEC request failed with ${response.status}`);
  }

  const payload = await response.json();
  return Array.isArray(payload?.results) ? (payload.results as T[]) : [];
}

function buildFundingSources(totals: FecTotals): FundingSource[] {
  const individual = getNumber(totals.individual_contributions);
  const pacs =
    getNumber(totals.other_political_committee_contributions) +
    getNumber(totals.political_party_committee_contributions);
  const selfFunding =
    getNumber(totals.candidate_contribution) + getNumber(totals.candidate_loans);
  const transfers = getNumber(totals.transfers_from_other_authorized_committee);
  const receipts = getNumber(totals.receipts);
  const tracked = individual + pacs + selfFunding + transfers;
  const other = Math.max(receipts - tracked, 0);

  return [
    { label: "Individual contributions", amount: individual, tone: "bg-blue-500" },
    { label: "PAC and party committees", amount: pacs, tone: "bg-violet-500" },
    { label: "Candidate self-funding", amount: selfFunding, tone: "bg-amber-500" },
    { label: "Authorized committee transfers", amount: transfers, tone: "bg-emerald-500" },
    { label: "Other receipts", amount: other, tone: "bg-slate-500" },
  ].filter((source) => source.amount > 0);
}

function percentage(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function buildContributorRows(rows: FecAggregateRow[]): Contributor[] {
  return rows
    .filter((row) => getNumber(row.total) > 0)
    .slice(0, 5)
    .map((row) => {
      const label = row.employer || row.occupation || "Unspecified";

      return {
        name: label,
        sector: row.employer ? "Employer aggregation" : "Occupation aggregation",
        amount: getNumber(row.total),
        relationship: `${row.count || 0} itemized contribution${row.count === 1 ? "" : "s"} in FEC records`,
      };
    });
}

function buildInfluenceSignals(
  sources: FundingSource[],
  contributors: Contributor[],
  totalRaised: number
): InfluenceSignal[] {
  const topSource = [...sources].sort((a, b) => b.amount - a.amount)[0];
  const topContributor = contributors[0];
  const pacSource = sources.find((source) => source.label.includes("PAC"));
  const pacShare = percentage(pacSource?.amount || 0, totalRaised);

  return [
    topSource
      ? {
          label: `${topSource.label} lead`,
          detail: `${topSource.label} is the largest visible funding category in current FEC totals.`,
          level: percentage(topSource.amount, totalRaised) >= 50 ? "High" : "Medium",
        }
      : null,
    topContributor
      ? {
          label: "Contributor concentration",
          detail: `${topContributor.name} is the largest visible employer/occupation aggregate among itemized receipts.`,
          level: percentage(topContributor.amount, totalRaised) >= 10 ? "High" : "Medium",
        }
      : null,
    {
      label: "Committee money exposure",
      detail: `PAC and party committee funding accounts for ${pacShare}% of current visible receipts.`,
      level: pacShare >= 35 ? "High" : pacShare >= 15 ? "Medium" : "Low",
    },
  ].filter(Boolean) as InfluenceSignal[];
}

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.FEC_API_KEY || "DEMO_KEY";
    const name = request.nextUrl.searchParams.get("name")?.trim() || "";
    const title = request.nextUrl.searchParams.get("title")?.trim() || "";
    const state = request.nextUrl.searchParams.get("state")?.trim() || "";
    const cycle = Number(request.nextUrl.searchParams.get("cycle") || DEFAULT_CYCLE);
    const office = inferFederalOffice(title);

    if (!name || !office) {
      return NextResponse.json({ profile: null, reason: "Federal candidate name and office required" });
    }

    const candidates = await fetchFec<FecCandidate>("/candidates/search/", {
      api_key: apiKey,
      q: name,
      office,
      state,
      cycle,
      per_page: 5,
      sort: "-receipts",
    });

    const candidate =
      candidates.find((item) => item.name?.toLowerCase().includes(name.toLowerCase())) ||
      candidates[0];

    if (!candidate?.candidate_id) {
      return NextResponse.json({ profile: null, reason: "No FEC candidate match" });
    }

    const [totalsRows, committeeRows] = await Promise.all([
      fetchFec<FecTotals>(`/candidate/${candidate.candidate_id}/totals/`, {
        api_key: apiKey,
        cycle,
        per_page: 1,
      }),
      fetchFec<{ committee_id?: string; name?: string }>(
        `/candidate/${candidate.candidate_id}/committees/`,
        {
          api_key: apiKey,
          cycle,
          designation: "P",
          per_page: 5,
        }
      ),
    ]);

    const totals = totalsRows[0] || {};
    const committeeId =
      candidate.principal_committees?.[0]?.committee_id || committeeRows[0]?.committee_id;

    const employerRows = committeeId
      ? await fetchFec<FecAggregateRow>("/schedules/schedule_a/by_employer/", {
          api_key: apiKey,
          committee_id: committeeId,
          cycle,
          sort: "-total",
          per_page: 5,
        })
      : [];

    const totalRaised = getNumber(totals.receipts);
    const sources = buildFundingSources(totals);
    const contributors = buildContributorRows(employerRows);
    const individual = getNumber(totals.individual_contributions);
    const pacs =
      getNumber(totals.other_political_committee_contributions) +
      getNumber(totals.political_party_committee_contributions);
    const selfFunding =
      getNumber(totals.candidate_contribution) + getNumber(totals.candidate_loans);

    const profile: FundingProfile = {
      cycle: String(cycle),
      totalRaised,
      individualShare: percentage(individual, totalRaised),
      pacShare: percentage(pacs, totalRaised),
      selfFundingShare: percentage(selfFunding, totalRaised),
      sources,
      contributors,
      influenceSignals: buildInfluenceSignals(sources, contributors, totalRaised),
      sourceUrl: `https://www.fec.gov/data/candidate/${candidate.candidate_id}/`,
    };

    return NextResponse.json({
      profile,
      candidate: {
        id: candidate.candidate_id,
        name: candidate.name,
        committeeId,
      },
    });
  } catch (error) {
    console.error("Campaign finance route failed:", error);
    return NextResponse.json(
      { profile: null, error: "Failed to load campaign finance data" },
      { status: 500 }
    );
  }
}
