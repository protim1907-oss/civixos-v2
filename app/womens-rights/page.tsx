import Link from "next/link";
import type { Metadata } from "next";

const title = "Women's Rights Continue to Be Threatened — Civix250";
const description =
  "Women's rights diminished by the overturn of Roe v. Wade. Join verified voters organizing to protect them.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "https://www.civix250.ai/womens-rights" },
  openGraph: {
    title,
    description,
    url: "https://www.civix250.ai/womens-rights",
    siteName: "Civix250",
    type: "website",
  },
  twitter: { card: "summary_large_image", title, description },
};

const Arrow = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

export default function WomensRightsLanding() {
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
        {/* NAV */}
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
                Add Your Voice <Arrow />
              </Link>
            </div>
          </div>
        </nav>

        {/* HERO — matches Ad 7 */}
        <section className="lobby-hero text-white">
          <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
            <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-red-400">
              Women&apos;s Rights
            </p>
            <h1 className="mt-4 text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.03] tracking-tight max-w-3xl">
              Women&apos;s rights continue to be threatened
            </h1>
            <p className="mt-6 text-xl md:text-2xl text-slate-300 leading-relaxed max-w-2xl">
              Women&apos;s rights diminished by the overturn of Roe v. Wade.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link href="/signup" className="inline-flex items-center gap-2 rounded-full bg-red-700 px-8 py-4 text-base font-bold text-white hover:bg-red-800 transition shadow-lg shadow-red-700/40">
                Add Your Voice <Arrow />
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

        {/* NARRATIVE — kept as-is */}
        <section className="py-20 md:py-24 px-5 bg-slate-50 border-b border-slate-200">
          <div className="mx-auto max-w-4xl">
            <p className="text-sm font-bold uppercase tracking-widest text-blue-700 mb-3">A proposed constitutional protection</p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-950 max-w-3xl">
              Protect equal protection, bodily integrity, and medical care
            </h2>
            <blockquote className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 md:p-10 shadow-sm border-l-4 border-l-red-700">
              <p className="text-lg md:text-xl leading-8 text-slate-700">
                In regulating matters involving a viable fetus and a pregnant person, Congress and the
                States may enact laws to protect potential human life, provided that such laws do not deny
                the pregnant person equal protection of the laws, bodily integrity, or life-preserving
                medical care. Nothing in this Section shall be construed to mandate or forbid any particular
                medical procedure, but all such regulation shall conform to the guarantees of the
                Constitution.
              </p>
            </blockquote>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-slate-950 text-white px-5 py-20 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-red-400 mb-4">Protect women&apos;s rights</p>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              Stand up for these rights
            </h2>
            <p className="mt-5 text-xl text-slate-400 leading-relaxed">
              Register in minutes, verify your district, and start organizing to protect women&apos;s rights.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-full bg-red-700 px-8 py-4 text-base font-bold text-white hover:bg-red-800 transition shadow-lg shadow-red-700/40">
                Add Your Voice <Arrow />
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
