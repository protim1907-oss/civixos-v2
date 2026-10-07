import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Landing = {
  eyebrow: string;
  headline: string;
  paragraphs: string[];
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
