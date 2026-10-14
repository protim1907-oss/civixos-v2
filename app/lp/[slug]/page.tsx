import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Landing = {
  eyebrow: string;
  headline: string;
  paragraphs: string[];
  bullets?: { intro: string; items: string[] };
  closing?: string;
  yourMove: string;
};

// One landing page per Facebook/Instagram ad. Point each ad's URL at
// https://www.civix250.ai/lp/<slug> — every page carries the same "Free Sign Up"
// call to action into /signup. More ads will be added one at a time.
const LANDINGS: Record<string, Landing> = {
  "whos-the-boss": {
    eyebrow: "Who's the boss?",
    headline: "Every politician has a boss. It's you.",
    paragraphs: [
      "Every elected official in America works for someone — and it isn't a party, a donor, or a lobbyist. It's you.",
      'The Constitution opens with three words that settle the question: "We the People." The Founders called the people "the only legitimate fountain of power" (Federalist No. 49). Government doesn\'t grant citizens authority — citizens grant it to government, and they can take it back at the ballot box.',
      "Too often, officeholders act as if the relationship runs the other way. It doesn't. The chair they sit in belongs to the citizens who put them there.",
    ],
    yourMove: "Find out who represents you — and let them know you're paying attention.",
  },
  "job-interview": {
    eyebrow: "Every election is a job interview",
    headline: "You're doing the hiring.",
    paragraphs: [
      "An election is a job interview — and you are the hiring committee.",
      "Candidates send you their resumes in the form of ads, speeches, and promises. A good employer doesn't hire on a slogan. They check references, review past performance, and ask hard questions.",
    ],
    bullets: {
      intro: "Before you vote, ask three questions:",
      items: [
        "What has this candidate actually done — not just promised?",
        "Whose interests do they serve: their district, their party, or their donors?",
        "Would I hire this person to manage something I care about?",
      ],
    },
    closing:
      "A party label is not a qualification. Do the homework and hire the best candidate for the job.",
    yourMove:
      "Confirm your voter registration and research the candidates on your ballot.",
  },
  "we-the-people": {
    eyebrow: "We the People. Still in charge.",
    headline: "The people are the source of the power.",
    paragraphs: [
      'The Constitution was not handed down by a king or a Congress. It was "ordained and established" by "We the People of the United States."',
      "Every member of Congress swears an oath to support and defend that Constitution, which protects the rights of every person within our nation's jurisdiction. Political authority, though, flows from the people — and is exercised by citizens through their vote.",
      "More than 230 years later, the arrangement hasn't changed. Officials come and go; the people remain the source of their power. Remembering that is the first duty of citizenship.",
    ],
    yourMove:
      "Read the Constitution's opening lines, then read your representative's voting record.",
  },
  "performance-review": {
    eyebrow: "Time for a performance review",
    headline: "Your representative works for you.",
    paragraphs: [
      "In any job, performance gets reviewed. Your representative's job should be no different.",
    ],
    bullets: {
      intro: "Ask the same questions any employer would:",
      items: [
        "Attendance: Did they show up and vote?",
        "Results: What did they deliver for the district?",
        "Communication: Do they respond when constituents reach out?",
        "Integrity: Did they keep the promises they made?",
      ],
    },
    closing:
      "This year, Congress saw two government shutdowns, a housing bill left unsigned, and a failed effort to limit congressional stock trading. Each member had a role in those outcomes — citizens have the right to know what it was.",
    yourMove:
      "Look up your representative's record and give them your own review.",
  },
  "the-boss-is-you": {
    eyebrow: "The boss is you.",
    headline: "One minute. The most powerful thing you do.",
    paragraphs: [
      "It takes about a minute to cast a ballot — and that minute is the most powerful thing a citizen does.",
      "Your vote decides who writes the laws, who sets the budget, and who answers to you for the next two, four, or six years. When citizens stay home, someone else makes those decisions for them.",
      "The boss doesn't sit out the hiring decision. Neither should you.",
    ],
    yourMove:
      "Check your registration, find your polling place, and make a plan to vote.",
  },
  "beyond-party": {
    eyebrow: "Party doesn't run the show. Citizens do.",
    headline: "Judge the record, not the label.",
    paragraphs: [
      'Political parties are not mentioned anywhere in the Constitution. George Washington warned against "the spirit of party" in his Farewell Address. Yet today, party loyalty often decides votes before the facts do.',
      "Voting beyond party doesn't mean abandoning your values. It means holding every officeholder, in any party, to the same standard: honesty, results, and service to the people who hired them.",
      "When citizens judge candidates on their record rather than their label, every politician has to earn the job.",
    ],
    yourMove:
      "Compare the candidates on the issues that matter to you, not the letter after their name.",
  },
};

export function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  return params.then(({ slug }) => {
    const data = LANDINGS[slug];
    if (!data) return { title: "Civix250 — Your Voice in Democracy" };
    return {
      title: `${data.eyebrow} — Civix250`,
      description: data.paragraphs[0],
    };
  });
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = LANDINGS[slug];
  if (!data) notFound();

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
          Free Sign Up
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-5 pb-10 pt-6 md:pt-12">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/lp/${slug}.png`}
          alt={data.eyebrow}
          width={1080}
          height={1080}
          className="mb-8 w-full max-w-[440px] rounded-3xl border border-slate-200 shadow-lg"
        />
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">
          {data.eyebrow}
        </p>
        <h1 className="mt-4 text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-950 md:text-5xl">
          {data.headline}
        </h1>

        <div className="mt-8 space-y-5 text-lg leading-8 text-slate-700">
          {data.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        {data.bullets && (
          <div className="mt-6 text-lg leading-8 text-slate-700">
            <p className="font-semibold text-slate-900">{data.bullets.intro}</p>
            <ul className="mt-3 space-y-3">
              {data.bullets.items.map((item, i) => {
                const [label, ...rest] = item.split(": ");
                const hasLabel = rest.length > 0;
                return (
                  <li key={i} className="flex gap-3">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                    <span>
                      {hasLabel ? (
                        <>
                          <span className="font-semibold text-slate-900">
                            {label}:
                          </span>{" "}
                          {rest.join(": ")}
                        </>
                      ) : (
                        item
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {data.closing && (
          <p className="mt-6 text-lg leading-8 text-slate-700">{data.closing}</p>
        )}

        {/* Your move + primary CTA */}
        <div className="mt-10 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-base font-semibold text-slate-900">
            <span className="text-blue-700">Your move:</span> {data.yourMove}
          </p>
          <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700"
            >
              Free Sign Up
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-4 text-base font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Already a member? Log in
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Free and nonpartisan. Live in all 50 states and DC.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-3xl px-5 pb-12 text-xs leading-5 text-slate-400">
        Civix250 is a project of Vote Beyond Party, a 501(c)(3) nonprofit. This
        platform does not represent any political party, candidate, or campaign.
      </footer>
    </main>
  );
}
