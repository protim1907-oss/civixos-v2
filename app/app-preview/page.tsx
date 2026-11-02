"use client";

import { useEffect, useState } from "react";

/**
 * Civix250 mobile-app TEASER — a two-screen, tap-through preview of how the
 * future native app would feel. Deployed at /app-preview so it can be opened
 * on any iPhone or Android browser (no install). This is a design glimpse, not
 * the real app: data shown is illustrative and the bottom tabs are for feel.
 *
 * Flow: Screen 1 (Welcome) → "Get Started" → Screen 2 (District Home).
 */

type Screen = "welcome" | "home";

export default function AppPreviewPage() {
  const [screen, setScreen] = useState<Screen>("welcome");

  return (
    // Dark "desk" background; on >=sm we show a phone bezel, on phones it fills.
    <main className="flex min-h-[100svh] w-full items-center justify-center bg-slate-900 sm:py-8">
      <div className="relative flex h-[100svh] w-full max-w-[400px] flex-col overflow-hidden bg-white sm:h-[840px] sm:rounded-[2.75rem] sm:border-[10px] sm:border-slate-950 sm:shadow-2xl">
        <StatusBar dark={screen === "welcome"} />
        {screen === "welcome" ? (
          <WelcomeScreen onStart={() => setScreen("home")} />
        ) : (
          <HomeScreen onBack={() => setScreen("welcome")} />
        )}
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Faux status bar (adds the native feel on phone + desktop frame)     */
/* ------------------------------------------------------------------ */

function StatusBar({ dark }: { dark: boolean }) {
  const [time, setTime] = useState("");
  useEffect(() => {
    const fmt = () =>
      new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    setTime(fmt());
    const id = setInterval(() => setTime(fmt()), 15000);
    return () => clearInterval(id);
  }, []);

  const tint = dark ? "text-white/90" : "text-slate-900";
  return (
    <div
      className={`flex items-center justify-between px-6 pt-4 pb-1 text-[13px] font-semibold ${tint}`}
    >
      <span className="tabular-nums">{time || "9:41"}</span>
      <div className="flex items-center gap-1.5">
        {/* signal */}
        <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor">
          <rect x="0" y="7" width="3" height="4" rx="1" />
          <rect x="4.5" y="5" width="3" height="6" rx="1" />
          <rect x="9" y="2.5" width="3" height="8.5" rx="1" />
          <rect x="13.5" y="0" width="3" height="11" rx="1" />
        </svg>
        {/* battery */}
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
          <rect
            x="0.5"
            y="0.5"
            width="21"
            height="11"
            rx="3"
            stroke="currentColor"
            strokeOpacity="0.5"
          />
          <rect x="2" y="2" width="16" height="8" rx="1.5" fill="currentColor" />
          <rect x="23" y="4" width="2" height="4" rx="1" fill="currentColor" />
        </svg>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Screen 1 — Welcome / onboarding                                     */
/* ------------------------------------------------------------------ */

function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative flex flex-1 flex-col overflow-y-auto bg-gradient-to-b from-[#0b1f3a] via-[#0a2a52] to-[#07152b] text-white">
      {/* soft glow */}
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-500/30 blur-3xl" />

      <div className="relative flex min-h-full flex-1 flex-col px-7 pt-10">
        {/* Logo mark */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2.5 3.5 6v6c0 5 3.6 8.3 8.5 9.5 4.9-1.2 8.5-4.5 8.5-9.5V6L12 2.5Z"
                fill="#fff"
                fillOpacity="0.12"
                stroke="#fff"
                strokeWidth="1.4"
              />
              <path
                d="m8.5 12 2.4 2.4L15.8 9.5"
                stroke="#60a5fa"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="text-lg font-extrabold tracking-tight">Civix250</span>
        </div>

        {/* Headline block pushed toward the middle */}
        <div className="mt-auto">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-300">
            The boss is you
          </p>
          <h1 className="mt-3 text-[2.5rem] font-extrabold leading-[1.05] tracking-tight">
            Your government.
            <br />
            Your voice.
          </h1>
          <p className="mt-4 max-w-[19rem] text-[15px] leading-relaxed text-blue-100/80">
            Meet your representatives, weigh in on real decisions, and see what&rsquo;s
            happening in your district — all in one place.
          </p>
        </div>

        {/* Feature ticks */}
        <ul className="mt-7 space-y-3 text-[14px] text-blue-50/90">
          {[
            "Know exactly who represents you",
            "Vote on district surveys in seconds",
            "Message and meet your officials",
          ].map((t) => (
            <li key={t} className="flex items-center gap-3">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-400/20 ring-1 ring-blue-300/40">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                  <path
                    d="m5 12.5 4.5 4.5L19 7"
                    stroke="#93c5fd"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              {t}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="mt-8 pb-8">
          <button
            onClick={onStart}
            className="w-full rounded-2xl bg-blue-500 py-4 text-center text-base font-bold text-white shadow-lg shadow-blue-900/40 transition active:scale-[0.98]"
          >
            Get Started
          </button>
          <button
            onClick={onStart}
            className="mt-3 w-full py-2 text-center text-sm font-semibold text-blue-200/80"
          >
            I already have an account
          </button>
          <p className="mt-4 text-center text-[11px] leading-4 text-blue-200/50">
            Free &amp; nonpartisan · A project of Vote Beyond Party, a 501(c)(3)
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Screen 2 — District Home                                            */
/* ------------------------------------------------------------------ */

function HomeScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-slate-50">
      {/* App header */}
      <div className="flex items-center justify-between px-5 pb-3 pt-1">
        <div>
          <p className="text-xs font-medium text-slate-500">Good afternoon</p>
          <p className="text-[17px] font-extrabold tracking-tight text-slate-900">
            Welcome back 👋
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
            TX&ndash;24
          </span>
          <button
            onClick={onBack}
            aria-label="Back to start"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm ring-1 ring-slate-200"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2.5 3.5 6v6c0 5 3.6 8.3 8.5 9.5 4.9-1.2 8.5-4.5 8.5-9.5V6L12 2.5Z"
                stroke="currentColor"
                strokeWidth="1.6"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Scroll area */}
      <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-28">
        {/* Representative card */}
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
            Your Representative
          </p>
          <div className="mt-3 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-lg font-bold text-white">
              BV
            </div>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold text-slate-900">
                Rep. Beth Van Duyne
              </p>
              <p className="text-xs text-slate-500">
                U.S. House · Texas, District 24
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white active:scale-[0.98]">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 5h16v12H7l-3 3V5Z"
                  stroke="#fff"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
              Message
            </button>
            <button className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 py-2.5 text-sm font-bold text-slate-700 active:scale-[0.98]">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 4h3l2 5-2 1a12 12 0 0 0 5 5l1-2 5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
              Call office
            </button>
          </div>
        </section>

        {/* Open survey card */}
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
              Open Survey
            </p>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
              3 days left
            </span>
          </div>
          <p className="mt-2 text-[15px] font-bold leading-snug text-slate-900">
            Should the city fund the new Loop 12 transit line?
          </p>
          <p className="mt-1 text-xs text-slate-500">
            1,284 neighbors have weighed in
          </p>
          {/* support meter */}
          <div className="mt-4 space-y-2">
            <MeterRow label="Support" pct={62} color="bg-emerald-500" />
            <MeterRow label="Neutral" pct={21} color="bg-slate-300" />
            <MeterRow label="Oppose" pct={17} color="bg-rose-500" />
          </div>
          <button className="mt-4 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white active:scale-[0.98]">
            Cast your vote
          </button>
        </section>

        {/* District feed */}
        <section>
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-sm font-bold text-slate-900">In your district</p>
            <span className="text-xs font-semibold text-blue-600">See all</span>
          </div>
          <div className="space-y-3">
            <FeedItem
              tag="Town Hall"
              tagColor="text-violet-700 bg-violet-100"
              title="Budget town hall — Thu 6:30pm at City Library"
              meta="Posted by Rep. Van Duyne's office · 2h ago"
            />
            <FeedItem
              tag="Local Issue"
              tagColor="text-sky-700 bg-sky-100"
              title="Potholes on Belt Line Rd — 48 residents reported"
              meta="Trending in TX-24 · 5h ago"
            />
          </div>
        </section>
      </div>

      {/* Bottom tab bar */}
      <nav className="absolute inset-x-0 bottom-0 flex items-center justify-around border-t border-slate-200 bg-white/95 px-2 pb-6 pt-2 backdrop-blur">
        <Tab label="Home" active icon="home" />
        <Tab label="Surveys" icon="survey" />
        <Tab label="Reps" icon="reps" />
        <Tab label="Chat" icon="chat" />
        <Tab label="You" icon="you" />
      </nav>
    </div>
  );
}

function MeterRow({
  label,
  pct,
  color,
}: {
  label: string;
  pct: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 shrink-0 text-xs font-medium text-slate-600">
        {label}
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-9 shrink-0 text-right text-xs font-bold tabular-nums text-slate-700">
        {pct}%
      </span>
    </div>
  );
}

function FeedItem({
  tag,
  tagColor,
  title,
  meta,
}: {
  tag: string;
  tagColor: string;
  title: string;
  meta: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <span
        className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${tagColor}`}
      >
        {tag}
      </span>
      <p className="mt-2 text-sm font-semibold leading-snug text-slate-900">
        {title}
      </p>
      <p className="mt-1 text-xs text-slate-400">{meta}</p>
    </div>
  );
}

function Tab({
  label,
  icon,
  active = false,
}: {
  label: string;
  icon: "home" | "survey" | "reps" | "chat" | "you";
  active?: boolean;
}) {
  const color = active ? "text-blue-600" : "text-slate-400";
  const paths: Record<string, React.ReactNode> = {
    home: <path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8Z" />,
    survey: (
      <path d="M5 4h14v16H5V4Zm3 4h8M8 12h8M8 16h5" fill="none" strokeWidth="1.8" />
    ),
    reps: (
      <path
        d="M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-7 9a7 7 0 0 1 14 0"
        fill="none"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    ),
    chat: (
      <path
        d="M4 5h16v11H9l-5 4V5Z"
        fill="none"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    ),
    you: (
      <path
        d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0"
        fill="none"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    ),
  };
  return (
    <button className={`flex flex-col items-center gap-1 px-2 py-1 ${color}`}>
      <svg
        width="23"
        height="23"
        viewBox="0 0 24 24"
        fill={icon === "home" ? "currentColor" : "none"}
        stroke="currentColor"
      >
        {paths[icon]}
      </svg>
      <span className="text-[10px] font-semibold">{label}</span>
    </button>
  );
}
