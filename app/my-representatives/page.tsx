"use client";

type Representative = {
  id: string;
  name: string;
  office: string;
  level: "Senate" | "Congress" | "State" | "Local";
  photo: string;
  linkedin: string;
  chatHref: string;
  emailHref: string;
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

export default function MyRepresentativesPage() {
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
              Connect with Texas representatives across federal, state, and local government.
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {representatives.map((rep) => (
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
      </section>
    </div>
  );
}