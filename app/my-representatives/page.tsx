"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Sidebar from "@/components/layout/Sidebar";

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

function getDisplayWebsite(rep: Representative) {
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
  switch ((districtId || "").toUpperCase()) {
    case "TX-20":
      return "Texas 20th District";
    case "TX-12":
      return "Texas 12th District";
    case "TX":
      return "State of Texas";
    case "NH":
      return "New Hampshire";
    case "NH-01":
      return "New Hampshire 1st Congressional District";
    case "NH-02":
      return "New Hampshire 2nd Congressional District";
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

function isNewHampshireContext(userState: string, userDistrict: string) {
  const state = normalizeState(userState);
  const district = normalizeDistrict(userDistrict);

  return (
    state === "new hampshire" ||
    state === "nh" ||
    district === "NH" ||
    district.startsWith("NH-")
  );
}

function buildFallbackRepresentativesForNewHampshire(): Representative[] {
  return [
    {
      id: "nh-governor-kelly-ayotte",
      full_name: "Kelly Ayotte",
      office_title: "Governor of New Hampshire",
      state: "New Hampshire",
      district: "NH",
      party: "Republican",
      photo_url: null,
      email: null,
      linkedin_url: "https://www.governor.nh.gov/",
      created_at: new Date().toISOString(),
      name: "Kelly Ayotte",
      office: "Governor of New Hampshire",
      level: "State",
      photo: null,
      linkedin: "https://www.governor.nh.gov/",
      chat_href: "#",
      email_href: "https://www.governor.nh.gov/contact-governor-ayotte",
      district_id: "NH",
      is_primary: false,
      is_active: true,
    },
    {
      id: "nh-senate-jeanne-shaheen",
      full_name: "Jeanne Shaheen",
      office_title: "United States Senator",
      state: "New Hampshire",
      district: "NH",
      party: "Democratic",
      photo_url: null,
      email: null,
      linkedin_url: "https://www.shaheen.senate.gov/",
      created_at: new Date().toISOString(),
      name: "Jeanne Shaheen",
      office: "United States Senator",
      level: "Senate",
      photo: null,
      linkedin: "https://www.shaheen.senate.gov/",
      chat_href: "#",
      email_href: "https://www.shaheen.senate.gov/contact/contact-jeanne",
      district_id: "NH",
      is_primary: false,
      is_active: true,
    },
    {
      id: "nh-senate-maggie-hassan",
      full_name: "Maggie Hassan",
      office_title: "United States Senator",
      state: "New Hampshire",
      district: "NH",
      party: "Democratic",
      photo_url: null,
      email: null,
      linkedin_url: "https://www.hassan.senate.gov/",
      created_at: new Date().toISOString(),
      name: "Maggie Hassan",
      office: "United States Senator",
      level: "Senate",
      photo: null,
      linkedin: "https://www.hassan.senate.gov/",
      chat_href: "#",
      email_href: "https://www.hassan.senate.gov/contact/email",
      district_id: "NH",
      is_primary: false,
      is_active: true,
    },
    {
      id: "nh-house-chris-pappas",
      full_name: "Chris Pappas",
      office_title: "United States Representative",
      state: "New Hampshire",
      district: "NH-01",
      party: "Democratic",
      photo_url: null,
      email: null,
      linkedin_url: "https://pappas.house.gov/",
      created_at: new Date().toISOString(),
      name: "Chris Pappas",
      office: "U.S. Representative for New Hampshire's 1st District",
      level: "Congress",
      photo: null,
      linkedin: "https://pappas.house.gov/",
      chat_href: "#",
      email_href: "https://pappas.house.gov/contact",
      district_id: "NH-01",
      is_primary: true,
      is_active: true,
    },
    {
      id: "nh-house-maggie-goodlander",
      full_name: "Maggie Goodlander",
      office_title: "United States Representative",
      state: "New Hampshire",
      district: "NH-02",
      party: "Democratic",
      photo_url: null,
      email: null,
      linkedin_url: "https://goodlander.house.gov/",
      created_at: new Date().toISOString(),
      name: "Maggie Goodlander",
      office: "U.S. Representative for New Hampshire's 2nd District",
      level: "Congress",
      photo: null,
      linkedin: "https://goodlander.house.gov/",
      chat_href: "#",
      email_href: "https://goodlander.house.gov/contact",
      district_id: "NH-02",
      is_primary: true,
      is_active: true,
    },
  ];
}

function mergeRepresentativesWithFallback(
  dbRows: Representative[],
  userState: string,
  userDistrict: string
) {
  if (!isNewHampshireContext(userState, userDistrict)) {
    return dbRows;
  }

  const fallbackRows = buildFallbackRepresentativesForNewHampshire();
  const existingNames = new Set(
    dbRows.map((rep) => getDisplayName(rep).trim().toLowerCase())
  );

  const missingFallbackRows = fallbackRows.filter(
    (rep) => !existingNames.has(getDisplayName(rep).trim().toLowerCase())
  );

  return [...dbRows, ...missingFallbackRows];
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

  if (isNewHampshireContext(userState, userDistrict)) {
    if (level === "Senate" || level === "State") return true;

    if (level === "Congress") {
      if (normalizedUserDistrict === "NH") {
        return repDistrict === "NH-01" || repDistrict === "NH-02";
      }
      return repDistrict === normalizedUserDistrict;
    }

    if (level === "Local") return repDistrict === normalizedUserDistrict;
    return false;
  }

  if (level === "Senate" || level === "State") return true;
  if (level === "Congress") return repDistrict === normalizedUserDistrict;
  if (level === "Local") return repDistrict === normalizedUserDistrict;

  return false;
}

function sortStatewideLeadership(reps: Representative[]) {
  const order: Record<string, number> = {
    "jeanne shaheen": 1,
    "maggie hassan": 2,
    "kelly ayotte": 3,
  };

  return [...reps].sort((a, b) => {
    const aKey = getDisplayName(a).trim().toLowerCase();
    const bKey = getDisplayName(b).trim().toLowerCase();
    return (order[aKey] ?? 99) - (order[bKey] ?? 99);
  });
}

function DynamicRepresentativePhoto({
  name,
  alt,
  className,
}: {
  name: string;
  alt: string;
  className?: string;
}) {
  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name
  )}&background=e2e8f0&color=334155&size=300`;

  const [src, setSrc] = useState(fallback);

  useEffect(() => {
    let cancelled = false;

    async function loadImage() {
      try {
        const res = await fetch(
          `/api/representative-photo?name=${encodeURIComponent(name)}`
        );
        if (!res.ok) return;

        const data = await res.json();
        if (!cancelled && data?.imageUrl) {
          setSrc(data.imageUrl);
        }
      } catch {
        // keep fallback
      }
    }

    loadImage();

    return () => {
      cancelled = true;
    };
  }, [name, fallback]);

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).src = fallback;
      }}
    />
  );
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
            (String(district).toUpperCase().startsWith("NH")
              ? "New Hampshire"
              : String(district).toUpperCase().startsWith("TX")
              ? "Texas"
              : "Texas");
        } else if (guestUser) {
          try {
            const parsedGuest = JSON.parse(guestUser);
            name = parsedGuest?.name || "Guest Citizen";
            district = parsedGuest?.district_id || "TX-20";
            state =
              parsedGuest?.state ||
              (String(district).toUpperCase().startsWith("NH")
                ? "New Hampshire"
                : "Texas");
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

          const fallbackOnly = mergeRepresentativesWithFallback([], state, district);
          setRepresentatives(fallbackOnly);

          if (!isNewHampshireContext(state, district)) {
            setLoadError(error.message || "Failed to load representatives");
          }
        } else {
          const merged = mergeRepresentativesWithFallback(
            (repData as Representative[]) || [],
            state,
            district
          );

          setRepresentatives(merged);
        }
      } catch (error) {
        console.error("Failed to load representative context:", error);

        const fallbackOnly = mergeRepresentativesWithFallback([], userState, userDistrict);
        setRepresentatives(fallbackOnly);

        if (!isNewHampshireContext(userState, userDistrict)) {
          setLoadError("Unexpected error while loading representatives");
        }
      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, [supabase, userDistrict, userState]);

  const visibleRepresentatives = useMemo(() => {
    return representatives.filter((rep) =>
      matchesDistrictRepresentative(rep, userDistrict, userState)
    );
  }, [representatives, userDistrict, userState]);

  const primaryRepresentative = useMemo(() => {
    const normalizedUserDistrict = normalizeDistrict(userDistrict);

    if (normalizedUserDistrict === "NH") {
      return undefined;
    }

    return (
      visibleRepresentatives.find(
        (rep) =>
          getDisplayLevel(rep) === "Congress" &&
          normalizeDistrict(getDisplayDistrict(rep)) === normalizedUserDistrict &&
          rep.is_primary
      ) ||
      visibleRepresentatives.find(
        (rep) =>
          getDisplayLevel(rep) === "Congress" &&
          normalizeDistrict(getDisplayDistrict(rep)) === normalizedUserDistrict
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

  const statewideLeadership = useMemo(() => {
    return sortStatewideLeadership([...senateRepresentatives, ...stateRepresentatives]);
  }, [senateRepresentatives, stateRepresentatives]);

  const primaryCardTitle = useMemo(() => {
    if (normalizeDistrict(userDistrict) === "NH") {
      return "New Hampshire district representatives";
    }

    return loading
      ? "Loading representative..."
      : primaryRepresentative
      ? getDisplayName(primaryRepresentative)
      : "Representative not assigned yet";
  }, [loading, primaryRepresentative, userDistrict]);

  const primaryCardSubtitle = useMemo(() => {
    if (normalizeDistrict(userDistrict) === "NH") {
      return "New Hampshire has two U.S. House districts. Both congressional representatives are shown on this page below.";
    }

    return loading
      ? "Loading office details..."
      : primaryRepresentative
      ? getDisplayOffice(primaryRepresentative)
      : `We are preparing representative information for ${districtDisplayLabel(
          userDistrict
        )}.`;
  }, [loading, primaryRepresentative, userDistrict]);

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <main className="flex-1 p-4 md:p-8">
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
                representatives table.
              </p>
            </section>
          ) : null}

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.25fr]">
            <div className="space-y-6">
              <section className="rounded-3xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
                <p className="text-sm font-medium text-blue-700">Primary District Representative</p>
                <h2 className="mt-3 text-3xl font-bold text-slate-900">{primaryCardTitle}</h2>
                <p className="mt-2 text-lg text-slate-700">{primaryCardSubtitle}</p>
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
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-2xl bg-white px-5 py-3 text-center text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                    >
                      Send Email
                    </a>
                  </div>
                ) : (
                  <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600">
                    {normalizeDistrict(userDistrict) === "NH"
                      ? "New Hampshire statewide and congressional contacts are available below."
                      : "Representative details unavailable."}
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
                    {primaryRepresentative
                      ? getDisplayName(primaryRepresentative)
                      : normalizeDistrict(userDistrict) === "NH"
                      ? "NH Delegation"
                      : "Pending"}
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
                      Congressional Representation
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
                              <DynamicRepresentativePhoto
                                name={getDisplayName(rep)}
                                alt={getDisplayName(rep)}
                                className="h-28 w-28 rounded-full object-cover ring-4 ring-white"
                              />

                              <div
                                className={`mt-5 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${levelClasses(level)}`}
                              >
                                {level}
                              </div>

                              <h2 className="mt-4 text-2xl font-bold text-slate-900">
                                {getDisplayName(rep)}
                              </h2>
                              <p className="mt-2 text-sm text-slate-600">{getDisplayOffice(rep)}</p>
                              <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                                {districtDisplayLabel(getDisplayDistrict(rep) || "")}
                              </p>
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
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full rounded-2xl bg-white px-4 py-3 text-center text-base font-semibold text-slate-800 transition hover:bg-slate-100"
                              >
                                Send Email
                              </a>

                              <a
                                href={getDisplayWebsite(rep)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full rounded-2xl bg-white px-4 py-3 text-center text-base font-semibold text-slate-800 transition hover:bg-slate-100"
                              >
                                Official Website
                              </a>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {statewideLeadership.length > 0 ? (
                  <div className="mt-8">
                    <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Statewide Leadership
                    </p>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                      {statewideLeadership.map((rep) => {
                        const level = getDisplayLevel(rep);
                        return (
                          <article
                            key={rep.id}
                            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                          >
                            <div className="flex flex-col items-center text-center">
                              <DynamicRepresentativePhoto
                                name={getDisplayName(rep)}
                                alt={getDisplayName(rep)}
                                className="h-28 w-28 rounded-full object-cover ring-4 ring-slate-100"
                              />

                              <div
                                className={`mt-5 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${levelClasses(level)}`}
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
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full rounded-2xl bg-slate-100 px-4 py-3 text-center text-base font-semibold text-slate-800 transition hover:bg-slate-200"
                              >
                                Send Email
                              </a>

                              <a
                                href={getDisplayWebsite(rep)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full rounded-2xl bg-slate-100 px-4 py-3 text-center text-base font-semibold text-slate-800 transition hover:bg-slate-200"
                              >
                                Official Website
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
      </main>
    </div>
  );
}