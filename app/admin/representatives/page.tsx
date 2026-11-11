"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Sidebar from "@/components/layout/Sidebar";
import {
  Users,
  MapPinned,
  Search,
  ExternalLink,
  Phone,
  Landmark,
  AlertCircle,
} from "lucide-react";

type RepRow = {
  id: string;
  district_code: string;
  state: string | null;
  district_number: number | null;
  name: string;
  title: string | null;
  office_label: string | null;
  party: string | null;
  website: string | null;
  contact_url: string | null;
  phone: string | null;
  image_url: string | null;
  is_active: boolean;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function partyTone(party: string | null): { label: string; cls: string } {
  const p = (party || "").toLowerCase();
  if (p.startsWith("r") || p.includes("republican"))
    return { label: party || "Republican", cls: "bg-red-50 text-red-700 border-red-200" };
  if (p.startsWith("d") || p.includes("democrat"))
    return { label: party || "Democratic", cls: "bg-blue-50 text-blue-700 border-blue-200" };
  if (p.startsWith("i") || p.includes("independent"))
    return { label: party || "Independent", cls: "bg-amber-50 text-amber-700 border-amber-200" };
  return { label: party || "—", cls: "bg-slate-100 text-slate-600 border-slate-200" };
}

function isVacant(name: string) {
  return /vacant/i.test(name);
}

export default function AdminRepresentativesPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [reps, setReps] = useState<RepRow[]>([]);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("ALL");

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace("/login");
          return;
        }

        const { data: me } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (!me || me.role !== "admin") {
          router.replace(me?.role === "moderator" ? "/moderator" : "/dashboard");
          return;
        }

        if (mounted) setAuthorized(true);

        const { data, error: repError } = await supabase
          .from("district_representatives")
          .select(
            "id, district_code, state, district_number, name, title, office_label, party, website, contact_url, phone, image_url, is_active"
          )
          .eq("is_active", true)
          .order("state", { ascending: true })
          .order("district_number", { ascending: true });

        if (repError) {
          console.error("Load representatives error:", repError.message);
          if (mounted) setError("Could not load representatives. Please try again.");
        } else if (mounted) {
          setReps((data ?? []) as RepRow[]);
        }
      } catch (err) {
        console.error("Admin representatives init error:", err);
        if (mounted) setError("Something went wrong while loading the page.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();
    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  const states = useMemo(
    () =>
      Array.from(new Set(reps.map((r) => (r.state || "").trim()).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [reps]
  );

  const vacantCount = useMemo(() => reps.filter((r) => isVacant(r.name)).length, [reps]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reps.filter((r) => {
      if (stateFilter !== "ALL" && (r.state || "").trim() !== stateFilter) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        (r.district_code || "").toLowerCase().includes(q) ||
        (r.office_label || "").toLowerCase().includes(q) ||
        (r.title || "").toLowerCase().includes(q) ||
        (r.party || "").toLowerCase().includes(q) ||
        (r.state || "").toLowerCase().includes(q)
      );
    });
  }, [reps, search, stateFilter]);

  // Group the filtered rows by state for display.
  const grouped = useMemo(() => {
    const map = new Map<string, RepRow[]>();
    for (const r of filtered) {
      const key = (r.state || "Other").trim() || "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 p-6 md:p-8">
            <div className="mx-auto max-w-6xl space-y-4">
              <div className="h-10 w-72 animate-pulse rounded-xl bg-slate-200" />
              <div className="h-6 w-96 max-w-full animate-pulse rounded-xl bg-slate-200" />
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200" />
                ))}
              </div>
              <div className="mt-6 h-96 animate-pulse rounded-3xl bg-slate-200" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-4 md:p-8">
          <div className="mx-auto max-w-6xl">
            {/* Header */}
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Admin Console
              </p>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 md:text-4xl">
                My Representatives
              </h1>
              <p className="max-w-3xl text-base text-slate-600">
                Every U.S. House representative on record across all 50 states and D.C. Search by name,
                district, or party, or filter to a single state.
              </p>
            </div>

            {/* Stats */}
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <Users className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Representatives</span>
                </div>
                <p className="mt-2 text-3xl font-bold">{reps.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <MapPinned className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">States &amp; D.C.</span>
                </div>
                <p className="mt-2 text-3xl font-bold">{states.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Vacant seats</span>
                </div>
                <p className="mt-2 text-3xl font-bold">{vacantCount}</p>
              </div>
            </div>

            {/* Controls */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, district (e.g. TX-24), office, or party…"
                  className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-12 pr-4 text-base outline-none transition focus:border-slate-400"
                />
              </div>
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold outline-none transition focus:border-slate-400 sm:w-64"
              >
                <option value="ALL">All states ({states.length})</option>
                {states.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <p className="mt-3 text-sm text-slate-500">
              Showing {filtered.length} of {reps.length} representatives
              {stateFilter !== "ALL" ? ` in ${stateFilter}` : ""}.
            </p>

            {error ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {/* Grouped list */}
            {filtered.length === 0 && !error ? (
              <div className="mt-8 rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center text-slate-500">
                No representatives match your search.
              </div>
            ) : (
              <div className="mt-6 space-y-10">
                {grouped.map(([state, rows]) => (
                  <section key={state}>
                    <div className="mb-3 flex items-center gap-2">
                      <Landmark className="h-5 w-5 text-slate-400" />
                      <h2 className="text-lg font-bold text-slate-900">{state}</h2>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                        {rows.length}
                      </span>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {rows.map((r) => {
                        const tone = partyTone(r.party);
                        const vacant = isVacant(r.name);
                        return (
                          <div
                            key={r.id}
                            className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 transition hover:shadow-sm"
                          >
                            <div className="flex items-start gap-3">
                              {r.image_url && !vacant ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={r.image_url}
                                  alt={r.name}
                                  className="h-14 w-14 shrink-0 rounded-xl object-cover"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).style.display = "none";
                                  }}
                                />
                              ) : (
                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-500">
                                  {vacant ? "—" : initials(r.name)}
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="rounded-md bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">
                                    {r.district_code}
                                  </span>
                                  <span
                                    className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${tone.cls}`}
                                  >
                                    {tone.label}
                                  </span>
                                </div>
                                <p className="mt-1.5 truncate text-base font-bold text-slate-900">
                                  {r.name}
                                </p>
                                <p className="text-sm text-slate-500">
                                  {r.title || "U.S. Representative"}
                                </p>
                              </div>
                            </div>

                            {r.office_label ? (
                              <p className="mt-3 text-sm text-slate-600">{r.office_label}</p>
                            ) : null}

                            <div className="mt-auto flex flex-wrap gap-2 pt-4">
                              {r.website ? (
                                <a
                                  href={r.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  Website
                                </a>
                              ) : null}
                              {r.contact_url && r.contact_url !== r.website ? (
                                <a
                                  href={r.contact_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  Contact
                                </a>
                              ) : null}
                              {r.phone ? (
                                <a
                                  href={`tel:${r.phone}`}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                                >
                                  <Phone className="h-3.5 w-3.5" />
                                  {r.phone}
                                </a>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
