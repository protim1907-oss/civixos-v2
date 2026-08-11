import Link from "next/link";
import type { Metadata } from "next";

const title = "Pass State and Federal Bills — Civix250";
const description =
  "Speak to state and federal lawmakers. Write, call, and influence your representative. Free for verified voters in your congressional district.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "https://www.civix250.ai/bills" },
  openGraph: {
    title,
    description,
    url: "https://www.civix250.ai/bills",
    siteName: "Civix250",
    type: "website",
  },
  twitter: { card: "summary_large_image", title, description },
};

const pillars = [
  {
    k: "01",
    title: "Verified voters only",
    body: "Registration verifies your status as a registered voter in your congressional district.",
  },
  {
    k: "02",
    title: "Direct access to your reps",
    body: "Direct access to your congressional and state representatives is provided.",
  },
  {
    k: "03",
    title: "Talk to your district",
    body: "Communication with fellow district voters is accommodated.",
  },
  {
    k: "04",
    title: "Coordinated action",
    body: "Joint action within your district — and coordinated efforts with other districts — is encouraged.",
  },
];

const Arrow = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

export default function BillsLanding() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        .lobby * { font-family: 'Inter', sans-serif; }
        .lobby-hero {
          background:
            radial-gradient(1100px 520px at 82% -8%, rgba(185,28,28,.28), transparent 60%),
            linear-gradient(160deg,#0b1220 0%,#0f172a 46%,#111f3d 100%);
        }
        .lobby-stripe {
          height: 8px;
          background: linear-gradient(90deg,#b91c1c 0 34%,#e2e8f0 34% 42%,#1d4ed8 42% 100%);
        }
      `}</style>

      <div className="lobby min-h-screen bg-white text-slate-900">
        {/* NAV — white band + wordmark, mirrors the ad creative */}
        <nav className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between">
            <Link href="/" className="text-2xl font-black tracking-tight">
              <span className="text-slate-900">Civix</span><span className="text-red-700">250</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/login" className="hidden sm:inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
                Log In
              </Link>
              <Link href="/signup" className="inline-flex items-center gap-2 rounded-full bg-red-700 px-5 py-2 text-sm font-bold text-white hover:bg-red-800 transition shadow-lg shadow-red-700/30">
                Sign Up Free <Arrow />
              </Link>
            </div>
          </div>
        </nav>

        {/* HERO — matches Ad 2 headline + palette for tight ad↔page message match */}
        <section className="lobby-hero text-white">
          <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
            <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-red-400">
              State · Federal · Lawmakers
            </p>
            <h1 className="mt-4 text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.03] tracking-tight max-w-3xl">
              Pass State and Federal Bills
            </h1>
            <p className="mt-6 text-xl md:text-2xl text-slate-300 leading-relaxed max-w-2xl">
              Speak to state and federal lawmakers. Write, call, and influence your representative.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link href="/signup" className="inline-flex items-center gap-2 rounded-full bg-red-700 px-8 py-4 text-base font-bold text-white hover:bg-red-800 transition shadow-lg shadow-red-700/40">
                Sign Up Free <Arrow />
              </Link>
              <Link href="/login" className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-8 py-4 text-base font-bold text-white hover:bg-white/10 transition">
                Log In
              </Link>
            </div>
            <p className="mt-6 text-sm text-slate-400">
              Free for citizens · No credit card required · Your address is used only to confirm your district — never shared.
            </p>
          </div>
          <div className="lobby-stripe" />
        </section>

        {/* NARRATIVE — the four things every visitor should read before signing up */}
        <section className="py-20 md:py-24 px-5">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-widest text-blue-700 mb-3">How it works</p>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-950">
                Move legislation, verified and district-based
              </h2>
              <p className="mt-4 text-lg text-slate-600 leading-relaxed">
                Civix250 turns your voter registration into direct, coordinated pressure on the
                lawmakers who write state and federal bills.
              </p>
            </div>

            <div className="mt-12 grid sm:grid-cols-2 gap-6">
              {pillars.map((p) => (
                <div key={p.k} className="rounded-3xl border border-slate-200 bg-slate-50 p-7">
                  <div className="text-3xl font-black text-red-700/90 select-none">{p.k}</div>
                  <h3 className="mt-3 text-xl font-bold text-slate-900">{p.title}</h3>
                  <p className="mt-2 text-slate-600 leading-relaxed">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-slate-950 text-white px-5 py-20 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-red-400 mb-4">Restore citizen power</p>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              Ready to move real legislation?
            </h2>
            <p className="mt-5 text-xl text-slate-400 leading-relaxed">
              Register in minutes, verify your district, and start writing, calling, and organizing today.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-full bg-red-700 px-8 py-4 text-base font-bold text-white hover:bg-red-800 transition shadow-lg shadow-red-700/40">
                Sign Up Free <Arrow />
              </Link>
              <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 bg-transparent px-8 py-4 text-base font-bold text-white hover:bg-white/10 transition">
                Log In
              </Link>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="bg-slate-950 border-t border-slate-800 py-10 px-5 text-slate-400">
          <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
            <Link href="/" className="text-lg font-black tracking-tight">
              <span className="text-white">Civix</span><span className="text-red-500">250</span>
            </Link>
            <p className="text-xs text-slate-500 text-center">
              This platform does not represent any political party, candidate, or campaign. Your address is
              used solely to confirm your congressional district.
            </p>
            <div className="flex gap-6 text-sm">
              <Link href="/legal#privacy" className="hover:text-white transition">Privacy</Link>
              <Link href="/legal#terms" className="hover:text-white transition">Terms</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
