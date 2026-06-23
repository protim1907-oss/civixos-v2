import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { Building2, MapPinned, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Find Your Representatives | Civix250",
  description:
    "Look up your U.S. Representative, Senators, and state officials by congressional district. Free and public — no sign-in required.",
};

type DistrictRow = {
  district_code: string;
  state: string;
  name: string;
  title: string;
  office_label: string;
  party: string | null;
};

async function loadDistricts(): Promise<DistrictRow[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data } = await supabase
    .from("district_representatives")
    .select("district_code, state, name, title, office_label, party")
    .eq("is_active", true)
    .order("district_code", { ascending: true });

  return (data as DistrictRow[]) ?? [];
}

export default async function RepresentativesDirectoryPage() {
  const districts = await loadDistricts();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-5 flex items-center justify-between">
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

      <main className="mx-auto max-w-5xl px-6 py-14">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
          <Building2 className="h-3.5 w-3.5" />
          Representative Directory
        </div>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-950">
          Find your representatives
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-slate-600">
          Browse elected officials by congressional district — no account required.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {districts.map((district) => (
            <Link
              key={district.district_code}
              href={`/representatives/${district.district_code.toLowerCase()}`}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
                  <MapPinned className="h-4 w-4" />
                  {district.district_code}
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:text-blue-500" />
              </div>
              <p className="mt-4 text-lg font-bold text-slate-950">{district.name}</p>
              <p className="mt-1 text-sm text-slate-500">
                {district.title} · {district.office_label}
              </p>
              {district.party ? (
                <span className="mt-3 inline-block rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {district.party}
                </span>
              ) : null}
            </Link>
          ))}
        </div>

        {districts.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-slate-500">
            District data is being added. Check back soon.
          </div>
        ) : null}

        <div className="mt-14 rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-slate-600">
            Don&apos;t see your district? Sign up to find and message your representatives directly.
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
