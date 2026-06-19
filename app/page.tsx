"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function HomePage() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("visible");
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    document.querySelectorAll(".fade-in").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { font-family: 'Inter', sans-serif; }
        html { scroll-behavior: smooth; }
        .gradient-hero { background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 40%, #f0fdf4 100%); }
        .gradient-text { background: linear-gradient(135deg, #1e3a8a, #166534); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .card-hover { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .card-hover:hover { transform: translateY(-4px); box-shadow: 0 20px 40px -12px rgba(0,0,0,0.12); }
        .nav-blur { backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
        .pulse-ring { animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite; }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(34,197,94,0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }
        .fade-in { opacity: 0; transform: translateY(24px); transition: opacity 0.6s ease, transform 0.6s ease; }
        .fade-in.visible { opacity: 1; transform: translateY(0); }
        .stat-counter { font-variant-numeric: tabular-nums; }
      `}</style>

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 nav-blur bg-white/80 border-b border-slate-200/60">
        <div className="mx-auto max-w-7xl px-5 py-3 flex items-center justify-between">
          <span className="text-lg font-bold text-slate-900 tracking-tight">Civix250</span>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition">Features</a>
            <a href="#how-it-works" className="hover:text-slate-900 transition">How It Works</a>
            <a href="#for-officials" className="hover:text-slate-900 transition">For Officials</a>
            <a href="#citizens" className="hover:text-slate-900 transition">For Citizens</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:inline-flex items-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
              Log In
            </Link>
            <Link href="/signup" className="inline-flex items-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition">
              Get Early Access
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="gradient-hero pt-28 pb-20 px-5 overflow-hidden">
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <div className="fade-in">
              <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-green-700 mb-6">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500 pulse-ring"></span>
                Now Live · America&apos;s Civic Platform
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight text-slate-950">
                Power the Future of
                <span className="gradient-text"> Civic Engagement</span>
              </h1>
              <p className="mt-6 text-xl md:text-2xl text-slate-600 leading-relaxed max-w-xl">
                Civix250 connects citizens directly with their elected representatives — through AI-powered tools built for transparency, accountability, and real community action.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link href="/login" className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-7 py-4 text-base font-bold text-white hover:bg-blue-700 transition shadow-lg shadow-blue-600/30">
                  Launch the App
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
                </Link>
                <Link href="/signup" className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-7 py-4 text-base font-bold text-white hover:bg-slate-800 transition shadow-lg shadow-slate-900/20">
                  Get Early Access
                </Link>
                <a href="#how-it-works" className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-7 py-4 text-base font-bold text-slate-700 hover:bg-slate-50 transition">
                  See How It Works
                </a>
              </div>
              <div className="mt-14 flex flex-wrap gap-10">
                <div><p className="stat-counter text-3xl font-extrabold text-slate-950">50+</p><p className="text-sm text-slate-500 mt-0.5">Districts Covered</p></div>
                <div><p className="stat-counter text-3xl font-extrabold text-slate-950">2</p><p className="text-sm text-slate-500 mt-0.5">States Active</p></div>
                <div><p className="stat-counter text-3xl font-extrabold text-slate-950">AI</p><p className="text-sm text-slate-500 mt-0.5">Powered Insights</p></div>
              </div>
            </div>

            <div className="fade-in relative">
              <div className="rounded-[2rem] overflow-hidden shadow-2xl border border-slate-200 bg-white">
                <img src="/hero-image.png" alt="American flag and civic platform" className="w-full aspect-[4/3] object-cover" />
                <div className="px-6 py-4 bg-white border-t border-slate-100 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Your Voice in Democracy</p>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-3 py-1 text-xs font-semibold text-green-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span> Live Platform
                  </span>
                </div>
              </div>
              <div className="absolute -bottom-6 -left-6 hidden lg:flex items-center gap-3 rounded-2xl border border-slate-200 bg-white shadow-xl px-5 py-4">
                <div className="flex -space-x-2">
                  <div className="h-8 w-8 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold">C</div>
                  <div className="h-8 w-8 rounded-full bg-green-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold">O</div>
                  <div className="h-8 w-8 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold">R</div>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Citizens + Officials</p>
                  <p className="text-xs text-slate-500">Bridging the gap in real time</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TICKER */}
      <div className="border-y border-slate-100 bg-slate-50 py-4 overflow-hidden">
        <div className="flex items-center gap-12 px-8 flex-wrap justify-center text-sm font-semibold text-slate-400 uppercase tracking-widest">
          <span>Texas</span><span className="text-slate-200">•</span>
          <span>California</span><span className="text-slate-200">•</span>
          <span>TX-35 · TX-20 · TX-12</span><span className="text-slate-200">•</span>
          <span>CA-42</span>
        </div>
      </div>

      {/* FEATURES */}
      <section id="features" className="py-24 px-5">
        <div className="mx-auto max-w-7xl">
          <div className="fade-in text-center mb-16">
            <p className="text-sm font-bold uppercase tracking-widest text-blue-600 mb-3">Platform Features</p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-950 tracking-tight">Everything civic engagement needs</h2>
            <p className="mt-4 text-xl text-slate-500 max-w-2xl mx-auto">One platform for citizens, representatives, and government officials — with AI doing the heavy lifting.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { border: "border-yellow-400", bg: "bg-yellow-50/50", iconBg: "bg-yellow-100 border-yellow-200", iconColor: "text-yellow-600", title: "Quick Policy Testing", desc: "Run focused surveys to validate public sentiment before policy rollout. Get real data, not guesses.", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"/> },
              { border: "border-red-400", bg: "bg-red-50/50", iconBg: "bg-red-100 border-red-200", iconColor: "text-red-600", title: "Citizen Sentiment", desc: "Capture support levels, concerns, and recommendations in one place — structured, searchable, and actionable.", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/> },
              { border: "border-green-400", bg: "bg-green-50/50", iconBg: "bg-green-100 border-green-200", iconColor: "text-green-600", title: "Chat with Representatives", desc: "Connect directly with elected officials and share concerns in real time. No more waiting for town halls.", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"/> },
              { border: "border-blue-400", bg: "bg-blue-50/50", iconBg: "bg-blue-100 border-blue-200", iconColor: "text-blue-600", title: "AI-Powered Insights", desc: "Turn citizen feedback into data-driven decisions, communication strategies, and next steps — automatically.", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/> },
            ].map((card) => (
              <div key={card.title} className={`fade-in card-hover rounded-3xl border-2 ${card.border} ${card.bg} p-7`}>
                <div className={`h-12 w-12 rounded-2xl ${card.iconBg} border flex items-center justify-center mb-5`}>
                  <svg className={`w-6 h-6 ${card.iconColor}`} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">{card.icon}</svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900">{card.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-24 px-5 bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="fade-in text-center mb-16">
            <p className="text-sm font-bold uppercase tracking-widest text-green-400 mb-3">How It Works</p>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">Three steps to civic impact</h2>
            <p className="mt-4 text-xl text-slate-400 max-w-xl mx-auto">From signup to making your voice heard — in minutes.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { n: "01", title: "Choose Your District", body: "Sign up and select your congressional district. Civix250 instantly surfaces the issues, representatives, and discussions that matter to your community." },
              { n: "02", title: "Post & Engage", body: "Create posts about local issues, vote on what matters, comment on discussions, and send AI-assisted messages directly to your elected representatives." },
              { n: "03", title: "Drive Real Change", body: "Officials see aggregated sentiment, trending issues, and constituent priorities — enabling smarter, faster, and more accountable governance." },
            ].map((step) => (
              <div key={step.n} className="fade-in relative">
                <div className="text-7xl font-black text-slate-800 mb-4 select-none">{step.n}</div>
                <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                <p className="text-slate-400 leading-relaxed">{step.body}</p>
                <div className="mt-6 h-px bg-slate-800"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOR CITIZENS */}
      <section id="citizens" className="py-24 px-5">
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="fade-in">
              <p className="text-sm font-bold uppercase tracking-widest text-blue-600 mb-3">For Citizens</p>
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-950">Your community. Your voice. Your district.</h2>
              <p className="mt-6 text-xl text-slate-600 leading-relaxed">Browse real issues from your congressional district, vote on priorities, and directly message your representatives — all in one place.</p>
              <ul className="mt-8 space-y-4">
                {["Browse district issues", "Post civic issues", "Message representatives with AI", "Track policy activity"].map((item) => (
                  <li key={item} className="flex items-start gap-4">
                    <div className="mt-1 flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                    </div>
                    <p className="font-semibold text-slate-900">{item}</p>
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="mt-10 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-7 py-4 text-base font-bold text-white hover:bg-blue-700 transition">
                Join as a Citizen
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
              </Link>
            </div>
            <div className="fade-in">
              <div className="rounded-[2rem] border border-slate-200 bg-white shadow-xl overflow-hidden">
                <div className="bg-slate-950 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500"></div>
                    <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  </div>
                  <p className="text-xs text-slate-400 font-mono">civix250.ai/dashboard</p>
                  <div></div>
                </div>
                <div className="p-6 bg-slate-50 space-y-4">
                  <div className="bg-white rounded-2xl border border-slate-200 p-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Citizen Dashboard</p>
                    <h4 className="text-xl font-extrabold text-slate-900">TX-35 · Austin / San Antonio</h4>
                    <p className="text-sm text-slate-500 mt-1">3 active issues · 2 upcoming votes</p>
                    <div className="mt-4 flex gap-2">
                      <span className="rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold px-3 py-1">Infrastructure</span>
                      <span className="rounded-full bg-red-100 text-red-700 text-xs font-semibold px-3 py-1">Public Safety</span>
                      <span className="rounded-full bg-green-100 text-green-700 text-xs font-semibold px-3 py-1">Healthcare</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200 p-5">
                    <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">Top Issue</p>
                    <p className="font-semibold text-slate-900">Waterlogging on IH-35 affecting commuters</p>
                    <p className="text-sm text-slate-500 mt-1">47 votes · 12 comments · Rep. Casar notified</p>
                    <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: "72%" }}></div>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">72% community support</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOR OFFICIALS */}
      <section id="for-officials" className="py-24 px-5 bg-gradient-to-br from-slate-50 to-green-50/40">
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="fade-in order-2 lg:order-1">
              <div className="rounded-[2rem] border border-slate-200 bg-white shadow-xl overflow-hidden">
                <div className="bg-green-700 px-6 py-4 flex items-center justify-between">
                  <p className="text-sm font-bold text-white">Official Dashboard</p>
                  <span className="rounded-full bg-green-600 border border-green-500 px-3 py-1 text-xs font-semibold text-green-100">Verified Official</span>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4 text-center"><p className="text-2xl font-extrabold text-blue-700">247</p><p className="text-xs text-blue-500 mt-1 font-medium">Constituents</p></div>
                    <div className="rounded-2xl bg-yellow-50 border border-yellow-100 p-4 text-center"><p className="text-2xl font-extrabold text-yellow-700">18</p><p className="text-xs text-yellow-500 mt-1 font-medium">Open Issues</p></div>
                    <div className="rounded-2xl bg-green-50 border border-green-100 p-4 text-center"><p className="text-2xl font-extrabold text-green-700">94%</p><p className="text-xs text-green-500 mt-1 font-medium">Response Rate</p></div>
                  </div>
                  <div className="rounded-2xl border border-green-200 bg-green-50 p-4 flex items-center gap-3">
                    <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/></svg>
                    <p className="text-sm text-green-800 font-medium">AI drafted 3 constituent responses ready to review</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="fade-in order-1 lg:order-2">
              <p className="text-sm font-bold uppercase tracking-widest text-green-600 mb-3">For Officials</p>
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-950">Govern smarter. Respond faster.</h2>
              <p className="mt-6 text-xl text-slate-600 leading-relaxed">Get a real-time window into your district&apos;s priorities — with AI that helps you respond, analyze, and act before issues escalate.</p>
              <Link href="/signup-official" className="mt-10 inline-flex items-center gap-2 rounded-2xl bg-green-600 px-7 py-4 text-base font-bold text-white hover:bg-green-700 transition">
                Register as Official
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-5 bg-slate-950 text-white">
        <div className="mx-auto max-w-3xl text-center fade-in">
          <p className="text-sm font-bold uppercase tracking-widest text-green-400 mb-4">Get Early Access</p>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">Ready to engage your district?</h2>
          <p className="mt-5 text-xl text-slate-400 leading-relaxed">Join Civix250 today — free for citizens. Verified official access available for elected representatives and government staff.</p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-bold text-slate-950 hover:bg-slate-100 transition shadow-lg">
              Join as Citizen — Free
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
            </Link>
            <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-green-500 bg-transparent px-8 py-4 text-base font-bold text-green-400 hover:bg-green-950 transition">
              Log In
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
            </Link>
          </div>
          <p className="mt-6 text-sm text-slate-500">No credit card required. Free for all citizens. Official verification required for government accounts.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 border-t border-slate-800 py-12 px-5 text-slate-400">
        <div className="mx-auto max-w-7xl">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            <div className="sm:col-span-2 lg:col-span-1">
              <p className="text-lg font-bold text-white mb-4">Civix250</p>
              <p className="text-sm leading-relaxed">America&apos;s civic engagement platform. Connecting citizens, communities, and elected officials through AI-powered tools.</p>
              <p className="text-xs mt-4 text-slate-600">civix250.ai</p>
            </div>
            <div>
              <p className="text-sm font-bold text-white uppercase tracking-widest mb-4">Platform</p>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition">How It Works</a></li>
                <li><a href="#citizens" className="hover:text-white transition">For Citizens</a></li>
                <li><a href="#for-officials" className="hover:text-white transition">For Officials</a></li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-bold text-white uppercase tracking-widest mb-4">Districts</p>
              <ul className="space-y-2 text-sm">
                <li>TX-35 · Austin / San Antonio</li>
                <li>TX-20 · San Antonio area</li>
                <li>TX-12 · Fort Worth area</li>
                <li>CA-42 · Riverside</li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-bold text-white uppercase tracking-widest mb-4">Contact</p>
              <ul className="space-y-2 text-sm">
                <li><a href="mailto:donations@civix250.org" className="hover:text-white transition">Support Civix250</a></li>
                <li><Link href="/login" className="hover:text-white transition">Citizen Login</Link></li>
                <li><Link href="/signup-official" className="hover:text-white transition">Official Registration</Link></li>
                <li><Link href="/signup" className="hover:text-white transition">Citizen Signup</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
            <p>© 2025 Civix250. All rights reserved. This platform does not represent any political party, candidate, or campaign.</p>
            <p className="mt-2">🔒 Your data is safe with us. We use industry-standard encryption to protect your personal information. Your address is used solely to confirm your congressional district — it is never shared with campaigns, candidates, or third parties.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-slate-400 transition">Privacy</a>
              <a href="#" className="hover:text-slate-400 transition">Terms</a>
              <a href="#" className="hover:text-slate-400 transition">Accessibility</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
