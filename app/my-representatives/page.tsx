"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Representative = {
  id: string;
  full_name: string;
  office_title: string;
  state: string;
  district: string | null;
  party: string | null;
  photo_url: string | null;
  email: string | null;
  linkedin_url: string | null;
  created_at?: string;
  name: string | null;
  office: string | null;
  level: "Senate" | "Congress" | "State" | "Local" | null;
  photo: string | null;
  linkedin: string | null;
  chat_href: string | null;
  email_href: string | null;
  district_id: string | null;
  is_primary: boolean | null;
  is_active: boolean | null;
};

function getDisplayName(rep: Representative) {
  return rep.name || rep.full_name;
}

function getDisplayOffice(rep: Representative) {
  return rep.office || rep.office_title;
}

function getDisplayPhoto(rep: Representative) {
  return (
    rep.photo ||
    rep.photo_url ||
    "https://placehold.co/300x300/e2e8f0/334155?text=Profile"
  );
}

function getDisplayLinkedin(rep: Representative) {
  return rep.linkedin || rep.linkedin_url || "#";
}

function getDisplayEmailHref(rep: Representative) {
  if (rep.email_href) return rep.email_href;
  if (rep.email) return `mailto:${rep.email}`;
  return "#";
}

function getDisplayDistrict(rep: Representative) {
  return rep.district_id || rep.district || null;
}

function getDisplayLevel(
  rep: Representative
): "Senate" | "Congress" | "State" | "Local" {
  if (
    rep.level === "Senate" ||
    rep.level === "Congress" ||
    rep.level === "State" ||
    rep.level === "Local"
  ) {
    return rep.level;
  }

  const office = getDisplayOffice(rep).toLowerCase();

  if (office.includes("senator")) return "Senate";
  if (office.includes("representative")) return "Congress";
  if (office.includes("governor") || office.includes("attorney general")) return "State";
  return "Local";
}

function levelClasses(level: "Senate" | "Congress" | "State" | "Local") {
  switch (level) {
    case "Senate":
      return "bg-red-50 text-red-700 border-red-200";
    case "Congress":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "State":
      return "bg-green-50 text-green-700 border-green-200";
    case "Local":
      return "bg-yellow-50 text-yellow-800 border-yellow-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

function districtDisplayLabel(districtId: string) {
  switch (districtId) {
    case "TX-20":
      return "Texas 20th District";
    case "TX-12":
      return "Texas 12th District";
    case "TX":
      return "State of Texas";
    case "NH":
      return "New Hampshire";
    default:
      return districtId || "Your District";
  }
}

function normalizeState(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function normalizeDistrict(value: string | null | undefined) {
  return (value || "").trim().toUpperCase();
}

function matchesDistrictRepresentative(
  rep: Representative,
  userDistrict: string,
  userState: string
) {
  const repState = normalizeState(rep.state);
  const normalizedState = normalizeState(userState);
  const level = getDisplayLevel(rep);
  const repDistrict = normalizeDistrict(getDisplayDistrict(rep));
  const normalizedUserDistrict = normalizeDistrict(userDistrict);

  if (repState !== normalizedState) return false;

  if (level === "Senate" || level === "State") return true;
  if (level === "Congress") return repDistrict === normalizedUserDistrict;
  if (level === "Local") return repDistrict === normalizedUserDistrict;

  return false;
}

export default function MyRepresentativesPage() {
  const supabase = createClient();

  const [userDistrict, setUserDistrict] = useState("TX-20");
  const [userState, setUserState] = useState("Texas");
  const [userName, setUserName] = useState("Citizen");
  const [loading, setLoading] = useState(true);
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    async function loadPage() {
      try {
        setLoadError("");

        const { data } = await supabase.auth.getSession();
        const session = data?.session;

        const guestUser =
          typeof window !== "undefined"
            ? localStorage.getItem("guest_user")
            : null;

        let district = "TX-20";
        let state = "Texas";
        let name = "Citizen";

        if (session?.user) {
          const user = session.user;

          name =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split("@")[0] ||
            "Citizen";

          district =
            user.user_metadata?.district_id ||
            user.user_metadata?.district ||
            "TX-20";

          state =
            user.user_metadata?.state ||
            (String(district).startsWith("TX") ? "Texas" : "Texas");
        } else if (guestUser) {
          try {
            const parsedGuest = JSON.parse(guestUser);
            name = parsedGuest?.name || "Guest Citizen";
            district = parsedGuest?.district_id || "TX-20";
            state = parsedGuest?.state || "Texas";
          } catch {
            name = "Guest Citizen";
            district = "TX-20";
            state = "Texas";
          }
        }

        setUserName(name);
        setUserDistrict(district);
        setUserState(state);

        const { data: repData, error } = await supabase
          .from("representatives")
          .select("*")
          .eq("is_active", true)
          .order("is_primary", { ascending: false })
          .order("full_name", { ascending: true });

        if (error) {
          console.error("Failed to load representatives:", error);
          setLoadError(error.message || "Failed to load representatives");
          setRepresentatives([]);
        } else {
          console.log("Representatives loaded:", repData);
          setRepresentatives((repData as Representative[]) || []);
        }
      } catch (error) {
        console.error("Failed to load representative context:", error);
        setLoadError("Unexpected error while loading representatives");
      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, [supabase]);

  const visibleRepresentatives = useMemo(() => {
    return representatives.filter((rep) =>
      matchesDistrictRepresentative(rep, userDistrict, userState)
    );
  }, [representatives, userDistrict, userState]);

  const primaryRepresentative = useMemo(() => {
    return (
      visibleRepresentatives.find(
        (rep) =>
          getDisplayLevel(rep) === "Congress" &&
          normalizeDistrict(getDisplayDistrict(rep)) === normalizeDistrict(userDistrict) &&
          rep.is_primary
      ) ||
      visibleRepresentatives.find(
        (rep) =>
          getDisplayLevel(rep) === "Congress" &&
          normalizeDistrict(getDisplayDistrict(rep)) === normalizeDistrict(userDistrict)
      )
    );
  }, [visibleRepresentatives, userDistrict]);

  const senateRepresentatives = useMemo(() => {
    return visibleRepresentatives.filter((rep) => getDisplayLevel(rep) === "Senate");
  }, [visibleRepresentatives]);

  const stateRepresentatives = useMemo(() => {
    return visibleRepresentatives.filter((rep) => getDisplayLevel(rep) === "State");
  }, [visibleRepresentatives]);

  const districtRepresentatives = useMemo(() => {
    return visibleRepresentatives.filter((rep) => getDisplayLevel(rep) === "Congress");
  }, [visibleRepresentatives]);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm text-slate-500">Citizen Dashboard</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
              My Representatives
            </h1>
            <p className="mt-4 max-w-4xl text-lg text-slate-600">
              View and connect with representatives assigned to{" "}
              <span className="font-semibold text-slate-900">
                {districtDisplayLabel(userDistrict)}
              </span>{" "}
              in <span className="font-semibold text-slate-900">{userState}</span>.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-sm text-slate-500">Signed in as</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{userName}</p>
          </div>
        </div>
      </section>

      {loadError ? (
        <section className="rounded-3xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <p className="text-sm font-semibold text-red-700">Representative load error</p>
          <p className="mt-2 text-sm text-red-700">{loadError}</p>
          <p className="mt-2 text-sm text-red-600">
            Most likely cause: your RLS/select policy is blocking reads from the
            `representatives` table.
          </p>
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.25fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
            <p className="text-sm font-medium text-blue-700">Primary District Representative</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">
              {loading
                ? "Loading representative..."
                : primaryRepresentative
                ? getDisplayName(primaryRepresentative)
                : "Representative not assigned yet"}
            </h2>
            <p className="mt-2 text-lg text-slate-700">
              {loading
                ? "Loading office details..."
                : primaryRepresentative
                ? getDisplayOffice(primaryRepresentative)
                : `We are preparing representative information for ${districtDisplayLabel(
                    userDistrict
                  )}.`}
            </p>
            <p className="mt-4 text-base leading-8 text-slate-600">
              Chat directly with the office serving your district, send a formal email, and monitor
              official communication relevant to your community.
            </p>

            {primaryRepresentative ? (
              <div className="mt-6 grid gap-3">
                <a
                  href={primaryRepresentative.chat_href || "#"}
                  className="rounded-2xl bg-blue-600 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Chat with Representative
                </a>

                <a
                  href={getDisplayEmailHref(primaryRepresentative)}
                  className="rounded-2xl bg-white px-5 py-3 text-center text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                >
                  Send Email
                </a>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600">
                Representative details unavailable.
              </div>
            )}
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">District</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {districtDisplayLabel(userDistrict)}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Primary Office</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {primaryRepresentative ? getDisplayName(primaryRepresentative) : "Pending"}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Visible Representatives</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {loading ? "..." : visibleRepresentatives.length}
              </p>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <p className="text-sm text-slate-500">District Delegation</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">
                Representatives for {districtDisplayLabel(userDistrict)}
              </h2>
              <p className="mt-3 max-w-4xl text-base text-slate-600">
                Federal, state, and statewide leaders relevant to your district are shown below.
                The page prioritizes your district representative first, followed by statewide
                contacts.
              </p>
            </div>

            {!loading && visibleRepresentatives.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                <h3 className="text-2xl font-bold text-slate-900">No representatives found</h3>
                <p className="mt-3 text-slate-600">
                  We could not find a representative mapping for{" "}
                  {districtDisplayLabel(userDistrict)}.
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Total rows loaded from database: {representatives.length}
                </p>
              </div>
            ) : null}

            {districtRepresentatives.length > 0 ? (
              <div className="mt-8">
                <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Congressional Representative
                </p>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {districtRepresentatives.map((rep) => {
                    const level = getDisplayLevel(rep);
                    return (
                      <article
                        key={rep.id}
                        className="rounded-3xl border border-blue-200 bg-blue-50/40 p-6 shadow-sm transition hover:shadow-md"
                      >
                        <div className="flex flex-col items-center text-center">
                          <img
                            src={getDisplayPhoto(rep)}
                            alt={getDisplayName(rep)}
                            className="h-28 w-28 rounded-full object-cover ring-4 ring-white"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                "https://placehold.co/300x300/e2e8f0/334155?text=Profile";
                            }}
                          />

                          <div
                            className={`mt-5 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${levelClasses(
                              level
                            )}`}
                          >
                            {level}
                          </div>

                          <h2 className="mt-4 text-2xl font-bold text-slate-900">
                            {getDisplayName(rep)}
                          </h2>
                          <p className="mt-2 text-sm text-slate-600">{getDisplayOffice(rep)}</p>
                        </div>

                        <div className="mt-6 space-y-3">
                          <a
                            href={rep.chat_href || "#"}
                            className="block w-full rounded-2xl bg-blue-600 px-4 py-3 text-center text-base font-semibold text-white transition hover:bg-blue-700"
                          >
                            Chat with Representative
                          </a>

                          <a
                            href={getDisplayEmailHref(rep)}
                            className="block w-full rounded-2xl bg-white px-4 py-3 text-center text-base font-semibold text-slate-800 transition hover:bg-slate-100"
                          >
                            Send Email
                          </a>

                          <a
                            href={getDisplayLinkedin(rep)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full rounded-2xl bg-white px-4 py-3 text-center text-base font-semibold text-slate-800 transition hover:bg-slate-100"
                          >
                            View LinkedIn Profile
                          </a>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {senateRepresentatives.length > 0 ? (
              <div className="mt-8">
                <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Senate Representation
                </p>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {senateRepresentatives.map((rep) => {
                    const level = getDisplayLevel(rep);
                    return (
                      <article
                        key={rep.id}
                        className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                      >
                        <div className="flex flex-col items-center text-center">
                          <img
                            src={getDisplayPhoto(rep)}
                            alt={getDisplayName(rep)}
                            className="h-28 w-28 rounded-full object-cover ring-4 ring-slate-100"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                "https://placehold.co/300x300/e2e8f0/334155?text=Profile";
                            }}
                          />

                          <div
                            className={`mt-5 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${levelClasses(
                              level
                            )}`}
                          >
                            {level}
                          </div>

                          <h2 className="mt-4 text-2xl font-bold text-slate-900">
                            {getDisplayName(rep)}
                          </h2>
                          <p className="mt-2 text-sm text-slate-600">{getDisplayOffice(rep)}</p>
                        </div>

                        <div className="mt-6 space-y-3">
                          <a
                            href={rep.chat_href || "#"}
                            className="block w-full rounded-2xl bg-blue-600 px-4 py-3 text-center text-base font-semibold text-white transition hover:bg-blue-700"
                          >
                            Chat with Representative
                          </a>

                          <a
                            href={getDisplayEmailHref(rep)}
                            className="block w-full rounded-2xl bg-slate-100 px-4 py-3 text-center text-base font-semibold text-slate-800 transition hover:bg-slate-200"
                          >
                            Send Email
                          </a>

                          <a
                            href={getDisplayLinkedin(rep)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full rounded-2xl bg-slate-100 px-4 py-3 text-center text-base font-semibold text-slate-800 transition hover:bg-slate-200"
                          >
                            View LinkedIn Profile
                          </a>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {stateRepresentatives.length > 0 ? (
              <div className="mt-8">
                <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Statewide Offices
                </p>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {stateRepresentatives.map((rep) => {
                    const level = getDisplayLevel(rep);
                    return (
                      <article
                        key={rep.id}
                        className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                      >
                        <div className="flex flex-col items-center text-center">
                          <img
                            src={getDisplayPhoto(rep)}
                            alt={getDisplayName(rep)}
                            className="h-28 w-28 rounded-full object-cover ring-4 ring-slate-100"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                "https://placehold.co/300x300/e2e8f0/334155?text=Profile";
                            }}
                          />

                          <div
                            className={`mt-5 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${levelClasses(
                              level
                            )}`}
                          >
                            {level}
                          </div>

                          <h2 className="mt-4 text-2xl font-bold text-slate-900">
                            {getDisplayName(rep)}
                          </h2>
                          <p className="mt-2 text-sm text-slate-600">{getDisplayOffice(rep)}</p>
                        </div>

                        <div className="mt-6 space-y-3">
                          <a
                            href={rep.chat_href || "#"}
                            className="block w-full rounded-2xl bg-blue-600 px-4 py-3 text-center text-base font-semibold text-white transition hover:bg-blue-700"
                          >
                            Chat with Representative
                          </a>

                          <a
                            href={getDisplayEmailHref(rep)}
                            className="block w-full rounded-2xl bg-slate-100 px-4 py-3 text-center text-base font-semibold text-slate-800 transition hover:bg-slate-200"
                          >
                            Send Email
                          </a>

                          <a
                            href={getDisplayLinkedin(rep)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full rounded-2xl bg-slate-100 px-4 py-3 text-center text-base font-semibold text-slate-800 transition hover:bg-slate-200"
                          >
                            View LinkedIn Profile
                          </a>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </section>
    </div>
  );
}