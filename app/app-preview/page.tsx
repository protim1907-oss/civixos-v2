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

type Screen = "signin" | "home";

export default function AppPreviewPage() {
  const [screen, setScreen] = useState<Screen>("signin");

  return (
    // Dark "desk" background; on >=sm we show a phone bezel, on phones it fills.
    <main className="flex min-h-[100svh] w-full items-center justify-center bg-slate-900 sm:py-8">
      <div className="relative flex h-[100svh] w-full max-w-[400px] flex-col overflow-hidden bg-white sm:h-[840px] sm:rounded-[2.75rem] sm:border-[10px] sm:border-slate-950 sm:shadow-2xl">
        <StatusBar dark={false} />
        {screen === "signin" ? (
          <SignInScreen onSignIn={() => setScreen("home")} />
        ) : (
          <HomeScreen onBack={() => setScreen("signin")} />
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
/* Screen 1 — Sign in                                                  */
/* ------------------------------------------------------------------ */

function SignInScreen({ onSignIn }: { onSignIn: () => void }) {
  const [showPw, setShowPw] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSignIn();
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-y-auto bg-white">
      <div className="flex min-h-full flex-1 flex-col px-7 pt-8">
        {/* Logo mark */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-600/30">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2.5 3.5 6v6c0 5 3.6 8.3 8.5 9.5 4.9-1.2 8.5-4.5 8.5-9.5V6L12 2.5Z"
                fill="#fff"
                fillOpacity="0.15"
                stroke="#fff"
                strokeWidth="1.4"
              />
              <path
                d="m8.5 12 2.4 2.4L15.8 9.5"
                stroke="#fff"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-slate-900">
            Welcome back
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Sign in to your Civix250 district
          </p>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Email
            </label>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@email.com"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-[15px] text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-600">
                Password
              </label>
              <button
                type="button"
                className="text-xs font-semibold text-blue-600"
              >
                Forgot?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 pr-12 text-[15px] text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400"
              >
                {showPw ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M3 3l18 18M10.6 10.7a2 2 0 0 0 2.8 2.8M9.9 5.1A9.3 9.3 0 0 1 12 5c5 0 9 4.5 9 7 0 1-1 2.7-2.6 4.1M6.1 6.2C4 7.6 3 9.6 3 12c0 1 1 2.7 2.6 4.1A10 10 0 0 0 12 19c1 0 2-.2 2.9-.5"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="mt-2 w-full rounded-2xl bg-blue-600 py-4 text-center text-base font-bold text-white shadow-lg shadow-blue-600/30 transition active:scale-[0.98]"
          >
            Sign in
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200" />
          <span className="text-xs font-medium text-slate-400">or</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        {/* Google */}
        <button
          type="button"
          onClick={onSignIn}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-3.5 text-[15px] font-semibold text-slate-700 transition active:scale-[0.98]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.2a5.3 5.3 0 0 1-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.6Z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.4 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7H1.7v3C3.6 21.4 7.5 24 12 24Z"
            />
            <path
              fill="#FBBC05"
              d="M5.6 14.7a7.2 7.2 0 0 1 0-4.6V7.2H1.7a12 12 0 0 0 0 10.7l3.9-3.2Z"
            />
            <path
              fill="#EA4335"
              d="M12 4.8c1.7 0 3.2.6 4.4 1.7l3.3-3.3C17.7 1.2 15.1 0 12 0 7.5 0 3.6 2.6 1.7 6.3l3.9 3c.9-2.7 3.4-4.5 6.4-4.5Z"
            />
          </svg>
          Continue with Google
        </button>

        {/* Sign up */}
        <p className="mt-auto pb-8 pt-8 text-center text-sm text-slate-500">
          New to Civix250?{" "}
          <button
            type="button"
            onClick={onSignIn}
            className="font-bold text-blue-600"
          >
            Create account
          </button>
        </p>
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
