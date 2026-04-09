"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Representative = {
  id: string;
  name: string;
  office: string;
  level: "Senate" | "Congress" | "State" | "Local";
  photo: string;
  linkedin: string;
  chatHref: string;
  emailHref: string;
  districtId?: string;
  state?: string;
  isPrimary?: boolean;
};

const representatives: Representative[] = [
  {
    id: "ted-cruz",
    name: "Ted Cruz",
    office: "U.S. Senator, Texas",
    level: "Senate",
    photo: "https://www.cruz.senate.gov/imo/media/image/cruz_headshot.jpg",
    linkedin: "https://www.linkedin.com/in/cruzted",
    chatHref: "/chat/ted-cruz",
    emailHref:
      "mailto:casework@cruz.senate.gov?subject=Constituent%20Inquiry&body=Hello%20Senator%20Cruz%2C%0A%0AI%20am%20writing%20regarding...",
    state: "Texas",
  },
  {
    id: "joaquin-castro",
    name: "Joaquín Castro",
    office: "U.S. Representative, Texas 20th District",
    level: "Congress",
    photo:
      "https://castro.house.gov/imo/media/image/2023-05-11_NP_0015_re%20%28002%29.jpg",
    linkedin: "https://www.linkedin.com/in/joaquin-castro-2626ab51",
    chatHref: "/chat/joaquin-castro",
    emailHref:
      "mailto:Jasmine.Rodriguez@mail.house.gov?subject=Constituent%20Inquiry%20for%20Rep.%20Castro&body=Hello%2C%0A%0AI%20am%20writing%20regarding...",
    districtId: "TX-20",
    state: "Texas",
    isPrimary: true,
  },
  {
    id: "greg-abbott",
    name: "Greg Abbott",
    office: "Governor of Texas",
    level: "State",
    photo: "https://gov.texas.gov/uploads/images/general/2024-GovernorAbbott-Portrait.jpg",
    linkedin: "https://www.linkedin.com/in/gregabbotttx",
    chatHref: "/chat/greg-abbott",
    emailHref:
      "mailto:greg.abbott@gov.texas.gov?subject=Constituent%20Inquiry&body=Hello%20Governor%20Abbott%2C%0A%0AI%20am%20writing%20regarding...",
    state: "Texas",
  },
  {
    id: "ken-paxton",
    name: "Ken Paxton",
    office: "Attorney General of Texas",
    level: "State",
    photo:
      "https://www.texasattorneygeneral.gov/sites/default/files/images/about/Texas-Attorney-General-Ken-Paxton.jpg",
    linkedin: "https://www.linkedin.com/in/ken-paxton-854b2a13",
    chatHref: "/chat/ken-paxton",
    emailHref:
      "mailto:ken.paxton@oag.texas.gov?subject=Constituent%20Inquiry&body=Hello%20Attorney%20General%20Paxton%2C%0A%0AI%20am%20writing%20regarding...",
    state: "Texas",
  },
  {
    id: "kirk-watson",
    name: "Kirk Watson",
    office: "Mayor of Austin",
    level: "Local",
    photo:
      "https://www.austintexas.gov/sites/default/files/files/Mayor/Mayor_Watson_Headshot.jpg",
    linkedin: "https://www.linkedin.com/in/kirk-watson-045ab81b",
    chatHref: "/chat/kirk-watson",
    emailHref:
      "mailto:mayor@austintexas.gov?subject=Constituent%20Inquiry&body=Hello%20Mayor%20Watson%2C%0A%0AI%20am%20writing%20regarding...",
    districtId: "TX-AUSTIN",
    state: "Texas",
  },
  {
    id: "eric-johnson",
    name: "Eric L. Johnson",
    office: "Mayor of Dallas",
    level: "Local",
    photo:
      "https://dallascityhall.com/government/citymayor/PublishingImages/pages/default/Headshot.jpg",
    linkedin: "https://www.linkedin.com/in/johnsonfordallas",
    chatHref: "/chat/eric-johnson",
    emailHref:
      "mailto:eric.johnson@dallas.gov?subject=Constituent%20Inquiry&body=Hello%20Mayor%20Johnson%2C%0A%0AI%20am%20writing%20regarding...",
    districtId: "TX-DALLAS",
    state: "Texas",
  },
];

function levelClasses(level: Representative["level"]) {
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

function matchesDistrictRepresentative(rep: Representative, userDistrict: string, userState: string) {
  const normalizedState = userState.toLowerCase();

  if (normalizedState === "texas") {
    if (rep.level === "Senate" || rep.level === "State") return rep.state === "Texas";
    if (rep.level === "Congress") return rep.districtId === userDistrict;
    if (rep.level === "Local") return false;
    return false;
  }

  if (rep.level === "Senate" || rep.level === "State") {
    return rep.state?.toLowerCase() === normalizedState;
  }

  if (rep.level === "Congress") {
    return rep.districtId === userDistrict;
  }

  return false;
}

export default function MyRepresentativesPage() {
  const supabase = createClient();

  const [userDistrict, setUserDistrict] = useState("TX-20");
  const [userState, setUserState] = useState("Texas");
  const [userName, setUserName] = useState("Citizen");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUserContext() {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data?.session;

        const guestUser =
          typeof window !== "undefined"
            ? localStorage.getItem("guest_user")
            : null;

        if (session?.user) {
          const user = session.user;

          const displayName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split("@")[0] ||
            "Citizen";

          const district =
            user.user_metadata?.district_id ||
            user.user_metadata?.district ||
            "TX-20";

          const state =
            user.user_metadata?.state ||
            (String(district).startsWith("TX") ? "Texas" : "Texas");

          setUserName(displayName);
          setUserDistrict(district);
          setUserState(state);
          setLoading(false);
          return;
        }

        if (guestUser) {
          try {
            const parsedGuest = JSON.parse(guestUser);
            setUserName(parsedGuest?.name || "Guest Citizen");
            setUserDistrict(parsedGuest?.district_id || "TX-20");
            setUserState(parsedGuest?.state || "Texas");
          } catch {
            setUserName("Guest Citizen");
            setUserDistrict("TX-20");
            setUserState("Texas");
          }
        }
      } catch (error) {
        console.error("Failed to load representative context:", error);
      } finally {
        setLoading(false);
      }
    }

    loadUserContext();
  }, [supabase]);

  const visibleRepresentatives = useMemo(() => {
    return representatives.filter((rep) =>
      matchesDistrictRepresentative(rep, userDistrict, userState)
    );
  }, [userDistrict, userState]);

  const primaryRepresentative = useMemo(() => {
    return visibleRepresentatives.find(
      (rep) => rep.level === "Congress" && rep.districtId === userDistrict
    );
  }, [visibleRepresentatives, userDistrict]);

  const senateRepresentatives = useMemo(() => {
    return visibleRepresentatives.filter((rep) => rep.level === "Senate");
  }, [visibleRepresentatives]);

  const stateRepresentatives = useMemo(() => {
    return visibleRepresentatives.filter((rep) => rep.level === "State");
  }, [visibleRepresentatives]);

  const districtRepresentatives = useMemo(() => {
    return visibleRepresentatives.filter((rep) => rep.level === "Congress");
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

      <section className="rounded-3xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-700">Primary District Representative</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">
              {loading
                ? "Loading representative..."
                : primaryRepresentative?.name || "Representative not assigned yet"}
            </h2>
            <p className="mt-2 text-base text-slate-700">
              {loading
                ? "Loading office details..."
                : primaryRepresentative?.office ||
                  `We are preparing representative information for ${districtDisplayLabel(
                    userDistrict
                  )}.`}
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Chat directly with the office serving your district, send a formal email, and monitor
              official communication relevant to your community.
            </p>
          </div>

          {primaryRepresentative ? (
            <div className="flex flex-wrap gap-3">
              <a
                href={primaryRepresentative.chatHref}
                className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Chat with Representative
              </a>

              <a
                href={primaryRepresentative.emailHref}
                className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
              >
                Send Email
              </a>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600">
              Representative details unavailable.
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">District</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {districtDisplayLabel(userDistrict)}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Primary Office</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {primaryRepresentative?.name || "Pending"}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Visible Representatives</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {loading ? "..." : visibleRepresentatives.length}
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm text-slate-500">District Delegation</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">
              Representatives for {districtDisplayLabel(userDistrict)}
            </h2>
            <p className="mt-3 max-w-4xl text-base text-slate-600">
              Federal, state, and statewide leaders relevant to your district are shown below. The
              page prioritizes your district representative first, followed by statewide contacts.
            </p>
          </div>
        </div>

        {!loading && visibleRepresentatives.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
            <h3 className="text-2xl font-bold text-slate-900">No representatives found</h3>
            <p className="mt-3 text-slate-600">
              We could not find a representative mapping for {districtDisplayLabel(userDistrict)}.
            </p>
          </div>
        ) : null}

        {districtRepresentatives.length > 0 ? (
          <div className="mt-6">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              Congressional Representative
            </p>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {districtRepresentatives.map((rep) => (
                <article
                  key={rep.id}
                  className="rounded-3xl border border-blue-200 bg-blue-50/40 p-6 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex flex-col items-center text-center">
                    <img
                      src={rep.photo}
                      alt={rep.name}
                      className="h-32 w-32 rounded-full object-cover ring-4 ring-white"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          "https://placehold.co/300x300/e2e8f0/334155?text=Profile";
                      }}
                    />

                    <div
                      className={`mt-5 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${levelClasses(
                        rep.level
                      )}`}
                    >
                      {rep.level}
                    </div>

                    <h2 className="mt-4 text-2xl font-bold text-slate-900">{rep.name}</h2>
                    <p className="mt-2 text-sm text-slate-600">{rep.office}</p>
                  </div>

                  <div className="mt-6 space-y-3">
                    <a
                      href={rep.chatHref}
                      className="block w-full rounded-2xl bg-blue-600 px-4 py-3 text-center text-base font-semibold text-white transition hover:bg-blue-700"
                    >
                      Chat with Representative
                    </a>

                    <a
                      href={rep.emailHref}
                      className="block w-full rounded-2xl bg-white px-4 py-3 text-center text-base font-semibold text-slate-800 transition hover:bg-slate-100"
                    >
                      Send Email
                    </a>

                    <a
                      href={rep.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full rounded-2xl bg-white px-4 py-3 text-center text-base font-semibold text-slate-800 transition hover:bg-slate-100"
                    >
                      View LinkedIn Profile
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {senateRepresentatives.length > 0 ? (
          <div className="mt-8">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              Senate Representation
            </p>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {senateRepresentatives.map((rep) => (
                <article
                  key={rep.id}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex flex-col items-center text-center">
                    <img
                      src={rep.photo}
                      alt={rep.name}
                      className="h-32 w-32 rounded-full object-cover ring-4 ring-slate-100"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          "https://placehold.co/300x300/e2e8f0/334155?text=Profile";
                      }}
                    />

                    <div
                      className={`mt-5 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${levelClasses(
                        rep.level
                      )}`}
                    >
                      {rep.level}
                    </div>

                    <h2 className="mt-4 text-2xl font-bold text-slate-900">{rep.name}</h2>
                    <p className="mt-2 text-sm text-slate-600">{rep.office}</p>
                  </div>

                  <div className="mt-6 space-y-3">
                    <a
                      href={rep.chatHref}
                      className="block w-full rounded-2xl bg-blue-600 px-4 py-3 text-center text-base font-semibold text-white transition hover:bg-blue-700"
                    >
                      Chat with Representative
                    </a>

                    <a
                      href={rep.emailHref}
                      className="block w-full rounded-2xl bg-slate-100 px-4 py-3 text-center text-base font-semibold text-slate-800 transition hover:bg-slate-200"
                    >
                      Send Email
                    </a>

                    <a
                      href={rep.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full rounded-2xl bg-slate-100 px-4 py-3 text-center text-base font-semibold text-slate-800 transition hover:bg-slate-200"
                    >
                      View LinkedIn Profile
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {stateRepresentatives.length > 0 ? (
          <div className="mt-8">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              Statewide Offices
            </p>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {stateRepresentatives.map((rep) => (
                <article
                  key={rep.id}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex flex-col items-center text-center">
                    <img
                      src={rep.photo}
                      alt={rep.name}
                      className="h-32 w-32 rounded-full object-cover ring-4 ring-slate-100"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          "https://placehold.co/300x300/e2e8f0/334155?text=Profile";
                      }}
                    />

                    <div
                      className={`mt-5 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${levelClasses(
                        rep.level
                      )}`}
                    >
                      {rep.level}
                    </div>

                    <h2 className="mt-4 text-2xl font-bold text-slate-900">{rep.name}</h2>
                    <p className="mt-2 text-sm text-slate-600">{rep.office}</p>
                  </div>

                  <div className="mt-6 space-y-3">
                    <a
                      href={rep.chatHref}
                      className="block w-full rounded-2xl bg-blue-600 px-4 py-3 text-center text-base font-semibold text-white transition hover:bg-blue-700"
                    >
                      Chat with Representative
                    </a>

                    <a
                      href={rep.emailHref}
                      className="block w-full rounded-2xl bg-slate-100 px-4 py-3 text-center text-base font-semibold text-slate-800 transition hover:bg-slate-200"
                    >
                      Send Email
                    </a>

                    <a
                      href={rep.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full rounded-2xl bg-slate-100 px-4 py-3 text-center text-base font-semibold text-slate-800 transition hover:bg-slate-200"
                    >
                      View LinkedIn Profile
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}