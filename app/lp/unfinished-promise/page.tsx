import Link from "next/link";
import type { Metadata } from "next";

// Bespoke long-form landing page for the "Unfinished Promise" Facebook/Instagram
// ad. A concrete /lp/unfinished-promise route takes precedence over the generic
// /lp/[slug] template, so this page renders instead of the shared one.
// Every call to action points at /signup.

export const metadata: Metadata = {
  title: "The Unfinished Promise — Civix250",
  description:
    "250 years later, the promise is still unfinished. Civix250 gives today's citizens the tools to finish the job — district by district.",
};

const amendments = [
  {
    label: "The 13th Amendment (1865)",
    text: "abolished slavery.",
  },
  {
    label: "The 14th Amendment (1868)",
    text: "made everyone born or naturalized here a citizen and guaranteed due process and equal protection of the laws.",
  },
  {
    label: "The 15th Amendment (1870)",
    text: "barred states from denying the vote on account of race.",
  },
];

const steps = [
  {
    num: "01",
    title: "Choose Your District",
    text: "Sign up and select your congressional district. See the issues, representatives, and discussions that matter where you live.",
  },
  {
    num: "02",
    title: "Join Your Neighbors",
    text: "Connect with fellow citizens in your district. Post issues, vote on priorities, and build a shared agenda.",
  },
  {
    num: "03",
    title: "Be Heard",
    text: "Send messages directly to your state and federal officials, with AI help to make them clear and effective. Your representatives see what their constituents care about, together and in real numbers.",
  },
];

function CtaButtons({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row ${className}`}>
      <Link
        href="/signup"
        className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700"
      >
        Join Free
      </Link>
      <Link
        href="/signup"
        className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-8 py-4 text-base font-semibold text-slate-800 transition hover:bg-slate-50"
      >
        Find My District
      </Link>
    </div>
  );
}

function SectionHeading({
  year,
  title,
}: {
  year: string;
  title: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <span className="rounded-lg bg-blue-600/10 px-3 py-1 text-sm font-extrabold uppercase tracking-wide text-blue-700">
        {year}
      </span>
      <h2 className="text-2xl font-extrabold tracking-tight text-slate-950 md:text-3xl">
        {title}
      </h2>
    </div>
  );
}

export default function UnfinishedPromisePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-6">
        <Link href="/" className="text-lg font-extrabold tracking-tight text-slate-950">
          Civix250
        </Link>
        <Link
          href="/signup"
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
        >
          Join Free
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-5 pb-12 pt-4 md:pt-8">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="order-2 md:order-1">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">
              The Unfinished Promise
            </p>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-950 md:text-5xl">
              250 Years Later, the Promise Is Still Unfinished.
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-700">
              &ldquo;All men are created equal.&rdquo; Americans have been working to
              make those words true since 1776. Civix250 gives today&rsquo;s citizens
              the tools to finish the job.
            </p>
            <CtaButtons className="mt-8" />
          </div>
          <div className="order-1 md:order-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/lp/unfinished-promise-hero.png"
              alt="The Unfinished Promise"
              width={1080}
              height={1080}
              className="mx-auto h-auto w-full max-w-[560px] rounded-3xl border border-slate-200 shadow-lg"
            />
          </div>
        </div>
      </section>

      {/* Narrative */}
      <article className="mx-auto max-w-3xl px-5 pb-4">
        <div className="space-y-14 text-lg leading-8 text-slate-700">
          {/* 1776 */}
          <section>
            <SectionHeading year="1776" title="A Promise Made" />
            <p>
              In 1776, the Declaration of Independence proclaimed that &ldquo;all men
              are created equal.&rdquo; It was the boldest promise any nation had ever
              made to its people.
            </p>
            <p className="mt-4">
              But a gap opened on that very first day, between the equality the
              Declaration announced and the equality Americans actually lived. Two
              hundred fifty years later, that gap still exists.
            </p>
          </section>

          {/* 1787 */}
          <section>
            <SectionHeading year="1787" title="A Compromise and Its Cost" />
            <p>
              When the Constitution was written, slavery was left in place. Some
              historians argue this was the price of keeping the Southern states in
              the Union and getting the Constitution ratified.
            </p>
            <p className="mt-4">
              The founders may have believed the compromise was necessary. But they
              set aside the vision of the Declaration and made no plan for a
              transition to freedom. The bill came due in the Civil War, the deadliest
              conflict in American history, which claimed an estimated 620,000 to
              750,000 lives.
            </p>
            <p className="mt-4 font-semibold text-slate-900">
              We should ask ourselves an honest question: what does it cost a nation
              to postpone justice?
            </p>
          </section>

          {/* 1865–1870 */}
          <section>
            <SectionHeading year="1865–1870" title="Amendments That Widened the Circle" />
            <p>After the war, three amendments rebuilt the Constitution:</p>
            <ul className="mt-4 space-y-3">
              {amendments.map((a) => (
                <li key={a.label} className="flex gap-3">
                  <span className="mt-3 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                  <span>
                    <span className="font-semibold text-slate-900">{a.label}</span>{" "}
                    {a.text}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4">
              On paper, Black men could now vote. In practice, poll taxes, literacy
              tests, and intimidation shut most of them out for nearly a century, until
              the Voting Rights Act of 1965. Women of every race were still denied
              the ballot entirely.
            </p>
          </section>

          {/* 20th century */}
          <section>
            <SectionHeading year="The 20th Century" title="Real Progress" />
            <p>
              The last century brought hard-won progress. In 1920, the 19th Amendment
              finally gave women the right to vote. In 1965, the Voting Rights Act
              began to make the 15th Amendment&rsquo;s promise real.
            </p>
            <p className="mt-4">
              Each step happened for the same reason: ordinary citizens organized,
              spoke up, and refused to be ignored.
            </p>
          </section>

          {/* Mid-page CTA */}
          <div className="flex justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-10 py-4 text-base font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700"
            >
              Join Free
            </Link>
          </div>

          {/* 21st century */}
          <section>
            <SectionHeading year="The 21st Century" title="A New Challenge" />
            <div className="mt-2 space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-extrabold text-white">
                    1
                  </span>
                  <div>
                    <h3 className="text-xl font-bold text-slate-950">
                      Who counts in representation.
                    </h3>
                    <p className="mt-3 text-base leading-7 text-slate-700">
                      Under the 14th Amendment, seats in the House of Representatives
                      are divided among the states by counting every resident, citizen
                      and non-citizen alike. Non-citizens cannot vote in federal
                      elections, yet
                      they are counted when deciding how much representation each state
                      receives. States with large non-citizen populations gain seats,
                      and citizens in other states lose influence. When the
                      Congressional Research Service modeled a citizen-only count after
                      the 2010 Census, seven House seats shifted among 11 states. The
                      result is that a citizen&rsquo;s vote does not
                      carry equal weight from one state to the next.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-extrabold text-white">
                    2
                  </span>
                  <div>
                    <h3 className="text-xl font-bold text-slate-950">
                      Who funds our elections.
                    </h3>
                    <p className="mt-3 text-base leading-7 text-slate-700">
                      In Citizens United v. FEC (2010), the Supreme Court ruled that
                      corporations and unions may spend unlimited sums on independent
                      political advertising. That decision opened the door to super
                      PACs and
                      &ldquo;dark money&rdquo; from donors the public often never sees.
                      Then, in June 2026, the Court went further. In NRSC v. FEC, it
                      struck down the limits on how much political parties can spend in
                      coordination with their own candidates.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-6">
              Every one of these decisions moves power toward those with the most
              money, and away from the citizen who has only a vote.
            </p>
          </section>

          {/* The answer */}
          <section>
            <SectionHeading year="The Answer" title="Citizens, Together" />
            <p className="text-xl font-semibold text-slate-900">
              Money can buy television ads. It cannot cast a ballot.
            </p>
            <p className="mt-4">
              Civix250 brings citizens together, district by district, so their
              combined voice is impossible to ignore. When neighbors organize and speak
              to their elected officials as one, their votes carry more force than any
              campaign war chest.
            </p>
            <p className="mt-4">
              This is how the gap between &ldquo;created equal&rdquo; and real equality
              has always been closed: by citizens who showed up.
            </p>
          </section>
        </div>
      </article>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-5 py-16">
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-slate-950">
          How It Works
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <div
              key={s.num}
              className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"
            >
              <span className="text-sm font-extrabold tracking-wide text-blue-600">
                {s.num}
              </span>
              <h3 className="mt-3 text-xl font-bold text-slate-950">{s.title}</h3>
              <p className="mt-3 text-base leading-7 text-slate-700">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-5 pb-16">
        <div className="mx-auto max-w-4xl rounded-[2.5rem] bg-slate-950 px-8 py-14 text-center text-white">
          <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">
            You Are the Boss. Act Like It.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-300">
            Join Civix250 free today and stand with fellow citizens in your district.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-10 py-4 text-base font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700"
            >
              Join Free
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate-400">
            No credit card required. Free for all citizens.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200">
        <div className="mx-auto max-w-3xl space-y-2 px-5 py-10 text-xs leading-5 text-slate-400">
          <p>
            &copy; 2026 Civix250. This platform does not represent any political party,
            candidate, or campaign.
          </p>
          <p>
            Vote Beyond Party is a tax-exempt organization under Section 501(c)(3) of
            the Internal Revenue Code. Donations are tax-deductible to the extent
            permitted by law. EIN: 39-4801426.
          </p>
          <p>
            Your address is used only to confirm your congressional district. It is
            never shared with campaigns, candidates, or third parties.
          </p>
        </div>
      </footer>
    </main>
  );
}
