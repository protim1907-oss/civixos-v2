"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, ExternalLink, Video, Users } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import { createClient } from "@/lib/supabase/client";

type TownHallRow = {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  district: string | null;
  meeting_url: string;
  created_at: string | null;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getCountdown(value: string) {
  const diff = new Date(value).getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `in ${days}d ${hours}h`;
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `in ${hours}h ${mins}m`;
  return `in ${mins}m`;
}

export default function TownHallPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [townHalls, setTownHalls] = useState<TownHallRow[]>([]);
  const [district, setDistrict] = useState("");
  const [filter, setFilter] = useState<"upcoming" | "past">("upcoming");

  useEffect(() => {
    async function load() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        let resolvedDistrict = "";

        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("district")
            .eq("id", user.id)
            .maybeSingle();

          resolvedDistrict =
            profile?.district ||
            user.user_metadata?.district ||
            user.user_metadata?.district_id ||
            "";
        } else {
          // Guest: read district from localStorage
          try {
            const guestRaw = localStorage.getItem("guest_user");
            if (guestRaw) {
              const guest = JSON.parse(guestRaw);
              resolvedDistrict = guest?.district || guest?.district_id || "";
            }
          } catch {
            // ignore
          }
        }

        setDistrict(resolvedDistrict);

        const { data, error } = await supabase
          .from("town_halls")
          .select("id, title, description, scheduled_at, district, meeting_url, created_at")
          .order("scheduled_at", { ascending: true });

        if (!error) {
          setTownHalls((data as TownHallRow[]) || []);
        }
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router, supabase]);

  const now = new Date();

  const visible = useMemo(() => {
    return townHalls.filter((h) => {
      const isUpcoming = new Date(h.scheduled_at) >= now;
      return filter === "upcoming" ? isUpcoming : !isUpcoming;
    });
  }, [townHalls, filter]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <p className="text-2xl font-bold text-slate-950">Loading town halls...</p>
          <p className="mt-2 text-slate-500">Fetching your district calendar.</p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
      <Sidebar />

      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-7xl space-y-6">

          {/* Header */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
              Town Hall Calendar
            </p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-slate-950">
              Public Town Halls
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-slate-600">
              Attend live video town halls hosted by your district representatives.
              {district ? (
                <span className="font-semibold text-slate-900"> Showing events for {district} and all districts.</span>
              ) : null}
            </p>
          </section>

          {/* Filter */}
          <div className="flex gap-2">
            {(["upcoming", "past"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`rounded-2xl px-5 py-2.5 text-sm font-semibold capitalize transition ${
                  filter === tab
                    ? "bg-slate-950 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Town hall cards */}
          {visible.length > 0 ? (
            <section className="space-y-4">
              {visible.map((hall) => {
                const isPast = new Date(hall.scheduled_at) < now;
                const countdown = getCountdown(hall.scheduled_at);
                return (
                  <article
                    key={hall.id}
                    className={`rounded-3xl border bg-white p-6 shadow-sm ${
                      isPast ? "border-slate-200 opacity-75" : "border-blue-200"
                    }`}
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {countdown && (
                            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                              {countdown}
                            </span>
                          )}
                          {hall.district && (
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                              {hall.district}
                            </span>
                          )}
                          {!hall.district && (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                              All districts
                            </span>
                          )}
                        </div>

                        <h2 className="mt-3 text-2xl font-bold text-slate-950">{hall.title}</h2>

                        <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-slate-500">
                          <CalendarClock className="h-4 w-4" />
                          {formatDate(hall.scheduled_at)}
                        </p>

                        {hall.description && (
                          <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                            {hall.description}
                          </p>
                        )}

                        <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
                          <Users className="h-4 w-4" />
                          Open to all citizens — no registration required
                        </div>
                      </div>

                      <div className="xl:w-48">
                        {!isPast ? (
                          <a
                            href={hall.meeting_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                          >
                            <Video className="h-4 w-4" />
                            Join Town Hall
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : (
                          <a
                            href={hall.meeting_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-50"
                          >
                            <Video className="h-4 w-4" />
                            View Recording Room
                          </a>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center shadow-sm">
              <CalendarClock className="mx-auto h-10 w-10 text-slate-400" />
              <p className="mt-4 text-xl font-bold text-slate-950">
                No {filter} town halls
              </p>
              <p className="mt-2 text-slate-500">
                {filter === "upcoming"
                  ? "Check back soon — your representatives will schedule town halls here."
                  : "Past town halls will appear here once events have concluded."}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
