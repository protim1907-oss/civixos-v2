"use client";

import Link from "next/link";

const texasTrendingNews = [
  {
    id: 1,
    title: "Texas losing billions from booming data-center tax break",
    source: "The Texas Tribune",
    category: "Policy & Economy",
    summary:
      "Texas is projected to lose billions in sales-tax revenue because of a major exemption tied to rapid data-center growth across the state.",
    href: "https://www.texastribune.org/2026/04/08/texas-data-centers-sales-tax-break-billion-dollars/",
  },
  {
    id: 2,
    title: "Bible stories in Texas public-school reading lists draw scrutiny",
    source: "Associated Press",
    category: "Education",
    summary:
      "A proposal involving Bible stories in Texas public-school reading lists is drawing national attention and renewed debate over religion in schools.",
    href: "https://apnews.com/article/6c25559a83a7975dfb09a9a2f68e279b",
  },
  {
    id: 3,
    title: "Pearland Walmart evacuated after bomb threat",
    source: "Houston Chronicle",
    category: "Public Safety",
    summary:
      "Police evacuated a Walmart in Pearland after a bomb threat, prompting an active response and ongoing investigation.",
    href: "https://www.houstonchronicle.com/news/houston-texas/article/pearland-walmart-bomb-threat-22193596.php",
  },
  {
    id: 4,
    title: "New forecast raises Texas weather concerns ahead of possible El Niño",
    source: "Houston Chronicle",
    category: "Weather",
    summary:
      "A new forecast suggests a stronger El Niño risk later in 2026, with possible implications for Texas hurricane activity and winter rainfall.",
    href: "https://www.houstonchronicle.com/news/houston-weather/article/super-el-nino-2026-forecast-hurricane-season-22191622.php",
  },
  {
    id: 5,
    title: "Texas communities prepare for World Cup transit demand",
    source: "Houston Chronicle",
    category: "Infrastructure & Events",
    summary:
      "Transit planning is expanding in parts of Texas ahead of the 2026 FIFA World Cup, including shuttle service tied to Houston matches.",
    href: "https://www.houstonchronicle.com/news/houston-texas/trending/article/fifa-world-cup-shuttle-conroe-22161577.php",
  },
];

export default function TrendingPostsPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Texas News Desk</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            Top 5 News in the State of Texas
          </h1>
          <p className="mt-4 max-w-4xl text-lg leading-8 text-slate-600">
            A live-style snapshot of the most talked-about developments across Texas, including
            public policy, safety, weather, and statewide civic issues.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <span className="rounded-full bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
              Updated News View
            </span>
            <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
              Statewide Coverage
            </span>
            <span className="rounded-full bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
              Top 5 Stories
            </span>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-5">
            {texasTrendingNews.map((item, index) => (
              <a
                key={item.id}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="block rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-50 text-base font-bold text-red-600">
                      {index + 1}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {item.category}
                        </span>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          {item.source}
                        </span>
                      </div>

                      <h2 className="mt-3 text-2xl font-bold text-slate-900">
                        {item.title}
                      </h2>

                      <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                        {item.summary}
                      </p>

                      <p className="mt-4 text-sm font-medium text-blue-600">
                        Read full story →
                      </p>
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Trending Breakdown</p>
              <h3 className="mt-2 text-2xl font-bold text-slate-900">What Texas is talking about</h3>

              <div className="mt-5 space-y-3">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-sm font-medium text-slate-500">Policy & Economy</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">
                    Data centers and tax incentives
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-sm font-medium text-slate-500">Education</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">
                    School curriculum debate
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-sm font-medium text-slate-500">Public Safety</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">
                    Threat response and emergency alerts
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-sm font-medium text-slate-500">Weather</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">
                    El Niño and storm outlook
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-sm font-medium text-slate-500">Infrastructure</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">
                    World Cup travel and transit planning
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Navigation</p>
              <div className="mt-4 grid gap-3">
                <Link
                  href="/dashboard"
                  className="rounded-2xl bg-blue-600 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Back to Dashboard
                </Link>

                <Link
                  href="/feed"
                  className="rounded-2xl bg-red-500 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-red-600"
                >
                  View District Feed
                </Link>

                <Link
                  href="/official-updates"
                  className="rounded-2xl bg-green-600 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-green-700"
                >
                  Official Updates
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}