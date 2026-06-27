import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  Building2,
  MapPinned,
  ExternalLink,
  Phone,
  ArrowLeft,
  Landmark,
} from "lucide-react";
import ReferralCapture from "@/components/ReferralCapture";

type DistrictRepRow = {
  district_code: string;
  state: string;
  name: string;
  title: string;
  office_label: string;
  party: string | null;
  website: string | null;
  contact_url: string | null;
  phone: string | null;
  image_url: string | null;
};

type StatewideRow = {
  full_name: string | null;
  name: string | null;
  office_title: string | null;
  office: string | null;
  state: string | null;
  district: string | null;
  district_id: string | null;
  party: string | null;
  level: string | null;
  photo_url: string | null;
};

function normalizeStateName(state?: string | null) {
  const value = String(state || "").trim().toLowerCase();
  const map: Record<string, string> = {
    texas: "Texas",
    tx: "Texas",
    california: "California",
    ca: "California",
  };
  return map[value] || String(state || "").trim();
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

async function loadDistrictRep(districtCode: string) {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("district_representatives")
    .select(
      "district_code, state, name, title, office_label, party, website, contact_url, phone, image_url"
    )
    .eq("district_code", districtCode)
    .eq("is_active", true)
    .maybeSingle();

  return data as DistrictRepRow | null;
}

async function loadStatewideLeaders(stateName: string) {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("representatives")
    .select(
      "full_name, name, office_title, office, state, district, district_id, party, level, photo_url"
    )
    .eq("state", stateName)
    .eq("is_active", true);

  return ((data as StatewideRow[]) ?? []).filter((row) => {
    const level = String(row.level || "").toLowerCase();
    return level === "senate" || level === "state";
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ district: string }>;
}) {
  const { district } = await params;
  const districtCode = district.toUpperCase();
  const rep = await loadDistrictRep(districtCode);

  if (!rep) {
    return {
      title: `${districtCode} Representatives | Civix250`,
      description: `Find elected officials representing ${districtCode}.`,
    };
  }

  return {
    title: `${rep.name} — ${districtCode} Representative | Civix250`,
    description: `${rep.name} is the ${rep.title} for ${districtCode} (${rep.office_label}). View contact info, party affiliation, and how to reach their office.`,
  };
}

export default async function DistrictRepresentativePage({
  params,
}: {
  params: Promise<{ district: string }>;
}) {
  const { district } = await params;
  const districtCode = district.toUpperCase();

  const rep = await loadDistrictRep(districtCode);
  if (!rep) {
    notFound();
  }

  const statewideLeaders = await loadStatewideLeaders(normalizeStateName(rep.state));

  return (
    <div className="min-h-screen bg-slate-50">
      <Suspense fallback={null}>
        <ReferralCapture />
      </Suspense>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-5 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-slate-950">
            Civix250
          </Link>
          <Link
            href="/signup"
            className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition"
          >
            Get Early Access
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-14">
        <Link
          href="/representatives"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          All districts
        </Link>

        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
          <MapPinned className="h-3.5 w-3.5" />
          {districtCode}
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">
                {rep.name}
              </h1>
              <p className="mt-1 text-lg text-slate-600">
                {rep.title} · {rep.office_label}
              </p>
            </div>
            {rep.party ? (
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700">
                {rep.party}
              </span>
            ) : null}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {rep.website ? (
              <a
                href={rep.website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <ExternalLink className="h-4 w-4" />
                Official website
              </a>
            ) : null}
            {rep.contact_url ? (
              <a
                href={rep.contact_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Building2 className="h-4 w-4" />
                Contact office
              </a>
            ) : null}
            {rep.phone ? (
              <span className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600">
                <Phone className="h-4 w-4" />
                {rep.phone}
              </span>
            ) : null}
          </div>
        </div>

        {statewideLeaders.length > 0 ? (
          <div className="mt-8">
            <h2 className="text-lg font-bold text-slate-950">Statewide leaders for {rep.state}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {statewideLeaders.map((leader, index) => (
                <div
                  key={`${leader.full_name || leader.name}-${index}`}
                  className="rounded-2xl border border-slate-200 bg-white p-5"
                >
                  <p className="font-bold text-slate-950">{leader.full_name || leader.name}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {leader.office_title || leader.office}
                  </p>
                  {leader.party ? (
                    <span className="mt-2 inline-block rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {leader.party}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <div className="flex justify-center">
            <Landmark className="h-6 w-6 text-slate-400" />
          </div>
          <p className="mt-3 text-slate-600">
            Sign in to message {rep.name} directly, request a meeting, or join the conversation in {districtCode}.
          </p>
          <Link
            href="/signup"
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition"
          >
            Join Civix250
          </Link>
        </div>
      </main>
    </div>
  );
}
