"use client";

import { useEffect, useState } from "react";
import { Fingerprint, Loader2, ScanFace } from "lucide-react";

/**
 * Civix250 mobile-app TEASER — a two-screen, tap-through preview of how the
 * future native app would feel. Deployed at /app-preview so it can be opened
 * on any iPhone or Android browser (no install). This is a design glimpse, not
 * the real app: data shown is illustrative and the bottom tabs are for feel.
 *
 * Flow: Screen 1 (Welcome) → "Get Started" → Screen 2 (District Home).
 */

type Screen = "signin" | "home" | "surveys" | "reps" | "chat" | "you";

export default function AppPreviewPage() {
  const [screen, setScreen] = useState<Screen>("signin");
  const signOut = () => setScreen("signin");
  const nav = { onSignOut: signOut, onNavigate: setScreen };

  return (
    // Dark "desk" background; on >=sm we show a phone bezel, on phones it fills.
    <main className="flex min-h-[100svh] w-full items-center justify-center bg-slate-900 sm:py-8">
      <div className="relative flex h-[100svh] w-full max-w-[400px] flex-col overflow-hidden bg-white sm:h-[840px] sm:rounded-[2.75rem] sm:border-[10px] sm:border-slate-950 sm:shadow-2xl">
        <StatusBar dark={false} />
        {screen === "signin" && (
          <SignInScreen onSignIn={() => setScreen("home")} />
        )}
        {screen === "home" && <HomeScreen {...nav} />}
        {screen === "surveys" && <SurveysScreen {...nav} />}
        {screen === "reps" && <RepsScreen {...nav} />}
        {screen === "chat" && <ChatScreen {...nav} />}
        {screen === "you" && <YouScreen {...nav} />}
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
/* Real biometric sign-in via WebAuthn (Touch ID / Face ID / fingerprint) */
/* ------------------------------------------------------------------ */

// Where we remember the demo passkey's credential id (per device/browser).
const PASSKEY_KEY = "civix-demo-passkey";

function toB64url(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string) {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

type BioState = "checking" | "ready" | "unsupported";

/* ------------------------------------------------------------------ */
/* Screen 1 — Sign in                                                  */
/* ------------------------------------------------------------------ */

function SignInScreen({ onSignIn }: { onSignIn: () => void }) {
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [loginMode, setLoginMode] = useState<"email" | "mobile">("email");

  const [bioState, setBioState] = useState<BioState>("checking");
  const [bioBusy, setBioBusy] = useState(false);
  const [bioError, setBioError] = useState("");
  const [isApple, setIsApple] = useState(false);

  // Detect platform-authenticator support on mount.
  useEffect(() => {
    const ua = navigator.userAgent || "";
    setIsApple(/iPhone|iPad|iPod|Macintosh/.test(ua));

    const C = (window as unknown as { PublicKeyCredential?: unknown })
      .PublicKeyCredential as
      | { isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean> }
      | undefined;

    if (!C || typeof C.isUserVerifyingPlatformAuthenticatorAvailable !== "function") {
      setBioState("unsupported");
      return;
    }
    C.isUserVerifyingPlatformAuthenticatorAvailable()
      .then((ok) => setBioState(ok ? "ready" : "unsupported"))
      .catch(() => setBioState("unsupported"));
  }, []);

  const bioLabel = isApple ? "Face ID / Touch ID" : "fingerprint";

  async function bioSignIn() {
    if (bioBusy) return;
    setBioError("");
    setBioBusy(true);
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const saved =
        typeof window !== "undefined"
          ? window.localStorage.getItem(PASSKEY_KEY)
          : null;

      if (saved) {
        // Returning device — verify with the existing passkey.
        await navigator.credentials.get({
          publicKey: {
            challenge,
            timeout: 60000,
            userVerification: "required",
            allowCredentials: [
              { id: fromB64url(saved), type: "public-key", transports: ["internal"] },
            ],
          },
        });
      } else {
        // First time — create a platform passkey (prompts the biometric sheet).
        const cred = (await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: { name: "Civix250" }, // id defaults to the current domain
            user: {
              id: crypto.getRandomValues(new Uint8Array(16)),
              name: email || "member@civix250.ai",
              displayName: "Civix250 member",
            },
            pubKeyCredParams: [
              { type: "public-key", alg: -7 },
              { type: "public-key", alg: -257 },
            ],
            authenticatorSelection: {
              authenticatorAttachment: "platform",
              userVerification: "required",
              residentKey: "preferred",
            },
            timeout: 60000,
            attestation: "none",
          },
        })) as PublicKeyCredential | null;

        if (cred?.rawId) {
          try {
            window.localStorage.setItem(PASSKEY_KEY, toB64url(cred.rawId));
          } catch {
            /* storage may be blocked; demo still proceeds */
          }
        }
      }

      onSignIn();
    } catch (err) {
      const name = (err as { name?: string })?.name;
      if (name === "NotAllowedError" || name === "AbortError") {
        setBioError("Biometric sign-in was cancelled. Try again.");
      } else if (name === "InvalidStateError") {
        // A passkey already exists on this device — treat as success.
        onSignIn();
        return;
      } else {
        setBioError("Biometrics aren't available here. Use email instead.");
      }
    } finally {
      setBioBusy(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSignIn();
  }

  const isApple2 = isApple; // alias kept for clarity in JSX below

  return (
    <div className="relative flex flex-1 flex-col overflow-y-auto bg-white">
      <div className="flex min-h-full flex-1 flex-col px-6 pt-7 pb-8">
        {/* Heading */}
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
          Welcome back
        </p>
        <h1 className="mt-1 text-[1.6rem] font-extrabold tracking-tight text-slate-900">
          Log in to Civix250
        </h1>

        {/* Email / Mobile toggle */}
        <div className="mt-6 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setLoginMode("email")}
            className={`rounded-xl py-3 text-sm font-bold transition ${
              loginMode === "email"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            Email Login
          </button>
          <button
            type="button"
            onClick={() => setLoginMode("mobile")}
            className={`rounded-xl py-3 text-sm font-bold transition ${
              loginMode === "mobile"
                ? "bg-yellow-400 text-slate-900 shadow-sm"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            Mobile Login
          </button>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="mt-5 space-y-4">
          {loginMode === "email" ? (
            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-700">
                Email
              </label>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-[15px] text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-700">
                Mobile Number
              </label>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="Enter your mobile number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-[15px] text-slate-900 outline-none transition focus:border-yellow-500 focus:bg-white focus:ring-2 focus:ring-yellow-400/20"
              />
            </div>
          )}

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-sm font-bold text-slate-700">
                Password
              </label>
              <button type="button" className="text-xs font-semibold text-blue-600">
                Forgot?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 pr-12 text-[15px] text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
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
            className={`w-full rounded-xl py-3.5 text-center text-[15px] font-bold shadow-sm transition active:scale-[0.98] ${
              loginMode === "email"
                ? "bg-blue-600 text-white"
                : "bg-yellow-400 text-slate-900"
            }`}
          >
            {loginMode === "email" ? "Login with Email" : "Login with Mobile"}
          </button>
        </form>

        {/* Biometric sign-in — real device fingerprint / Face ID via WebAuthn */}
        {bioState !== "unsupported" && (
          <div className="mt-4">
            <button
              type="button"
              onClick={bioSignIn}
              disabled={bioBusy || bioState === "checking"}
              className="group flex w-full items-center justify-center gap-3 rounded-xl border-2 border-blue-100 bg-blue-50/60 py-3 text-[15px] font-bold text-blue-700 transition active:scale-[0.98] disabled:opacity-60"
            >
              <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-600/30">
                {bioBusy ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : isApple2 ? (
                  <ScanFace className="h-5 w-5" />
                ) : (
                  <Fingerprint className="h-5 w-5" />
                )}
              </span>
              {bioBusy ? "Waiting for you…" : `Log in with ${bioLabel}`}
            </button>
            <p className="mt-2 text-center text-xs text-slate-400">
              {bioBusy
                ? "Confirm on your device to continue"
                : `Fast, passwordless sign-in with your ${bioLabel}`}
            </p>
            {bioError && (
              <p className="mt-2 text-center text-xs font-medium text-rose-600">
                {bioError}
              </p>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200" />
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Or continue with
          </span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        {/* Google */}
        <button
          type="button"
          onClick={onSignIn}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-green-600 py-3.5 text-[15px] font-bold text-white transition active:scale-[0.98]"
        >
          Continue with Google
        </button>

        {/* Footer links */}
        <div className="mt-auto pt-6 text-center text-sm text-slate-500">
          New to Civix250?{" "}
          <button type="button" onClick={onSignIn} className="font-bold text-blue-600">
            Create citizen account
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Screen 2 — District Home                                            */
/* ------------------------------------------------------------------ */

function HomeScreen({
  onSignOut,
  onNavigate,
}: {
  onSignOut: () => void;
  onNavigate: (s: Screen) => void;
}) {
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
            onClick={onSignOut}
            aria-label="Sign out"
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
          <button
            type="button"
            onClick={() => onNavigate("reps")}
            className="mt-3 flex w-full items-center gap-4 text-left"
          >
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
          </button>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              onClick={() => onNavigate("chat")}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white active:scale-[0.98]"
            >
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
      <BottomNav active="home" onNavigate={onNavigate} />
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

function BottomNav({
  active,
  onNavigate,
}: {
  active: "home" | "surveys" | "reps" | "chat" | "you";
  onNavigate: (s: Screen) => void;
}) {
  return (
    <nav className="absolute inset-x-0 bottom-0 flex items-center justify-around border-t border-slate-200 bg-white/95 px-2 pb-6 pt-2 backdrop-blur">
      <Tab label="Home" icon="home" active={active === "home"} onClick={() => onNavigate("home")} />
      <Tab label="Surveys" icon="survey" active={active === "surveys"} onClick={() => onNavigate("surveys")} />
      <Tab label="Reps" icon="reps" active={active === "reps"} onClick={() => onNavigate("reps")} />
      <Tab label="Chat" icon="chat" active={active === "chat"} onClick={() => onNavigate("chat")} />
      <Tab label="You" icon="you" active={active === "you"} onClick={() => onNavigate("you")} />
    </nav>
  );
}

function Tab({
  label,
  icon,
  active = false,
  onClick,
}: {
  label: string;
  icon: "home" | "survey" | "reps" | "chat" | "you";
  active?: boolean;
  onClick?: () => void;
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
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-2 py-1 ${color}`}
    >
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

/* ------------------------------------------------------------------ */
/* Screen 3 — Surveys (how surveys appear on mobile)                   */
/* ------------------------------------------------------------------ */

const VOTE_OPTIONS = [
  { label: "Strongly Support", pct: 34, bar: "bg-emerald-600", dot: "bg-emerald-600" },
  { label: "Support", pct: 28, bar: "bg-emerald-400", dot: "bg-emerald-400" },
  { label: "Neutral", pct: 21, bar: "bg-slate-300", dot: "bg-slate-300" },
  { label: "Oppose", pct: 10, bar: "bg-orange-400", dot: "bg-orange-400" },
  { label: "Strongly Oppose", pct: 7, bar: "bg-rose-500", dot: "bg-rose-500" },
] as const;

function SurveysScreen({
  onSignOut,
  onNavigate,
}: {
  onSignOut: () => void;
  onNavigate: (s: Screen) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [voted, setVoted] = useState(false);

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-slate-50">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pb-3 pt-1">
        <div>
          <p className="text-xs font-medium text-slate-500">Your district · TX-24</p>
          <p className="text-[19px] font-extrabold tracking-tight text-slate-900">
            Surveys
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
            TX&ndash;24
          </span>
          <button
            onClick={onSignOut}
            aria-label="Sign out"
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

      {/* Filter chips */}
      <div className="flex gap-2 px-5 pb-1">
        <span className="rounded-full bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white">
          Open · 2
        </span>
        <span className="rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-slate-500 ring-1 ring-slate-200">
          Closed · 5
        </span>
      </div>

      {/* Scroll area */}
      <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-28 pt-3">
        {/* Featured survey with voting */}
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
              Transit
            </span>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
              3 days left
            </span>
          </div>
          <h2 className="mt-3 text-[17px] font-bold leading-snug text-slate-900">
            Should the city fund the new Loop 12 transit line?
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Posted by Rep. Van Duyne&rsquo;s office · 1,284 responses
          </p>

          {!voted ? (
            <>
              <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-400">
                Your position
              </p>
              <div className="mt-2 space-y-2">
                {VOTE_OPTIONS.map((o) => {
                  const on = selected === o.label;
                  return (
                    <button
                      key={o.label}
                      type="button"
                      onClick={() => setSelected(o.label)}
                      className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-sm font-semibold transition active:scale-[0.99] ${
                        on
                          ? "border-blue-500 bg-blue-50 text-blue-800"
                          : "border-slate-200 bg-slate-50 text-slate-700"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full ${
                          on ? "bg-blue-600" : "bg-white ring-2 ring-slate-300"
                        }`}
                      >
                        {on && (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                            <path
                              d="m5 12.5 4.5 4.5L19 7"
                              stroke="#fff"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </span>
                      {o.label}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                disabled={!selected}
                onClick={() => setVoted(true)}
                className="mt-4 w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-40"
              >
                Submit my response
              </button>
            </>
          ) : (
            <>
              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="m5 12.5 4.5 4.5L19 7"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Thanks — your response was recorded
              </div>
              <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-400">
                District results
              </p>
              <div className="mt-3 space-y-2.5">
                {VOTE_OPTIONS.map((o) => (
                  <div key={o.label}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span
                        className={`font-semibold ${
                          selected === o.label ? "text-blue-700" : "text-slate-600"
                        }`}
                      >
                        {o.label}
                        {selected === o.label && " · you"}
                      </span>
                      <span className="font-bold tabular-nums text-slate-700">
                        {o.pct}%
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${o.bar}`} style={{ width: `${o.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* Other open survey */}
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-bold text-violet-700">
              Schools
            </span>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
              6 days left
            </span>
          </div>
          <h3 className="mt-3 text-[15px] font-bold leading-snug text-slate-900">
            Extend the Grapevine ISD school day by 30 minutes?
          </h3>
          <p className="mt-1 text-xs text-slate-500">842 responses so far</p>
          <button
            type="button"
            className="mt-3 w-full rounded-xl bg-slate-100 py-2.5 text-sm font-bold text-slate-700 transition active:scale-[0.98]"
          >
            Open survey
          </button>
        </section>

        {/* Closed survey */}
        <section className="rounded-3xl bg-white p-5 opacity-90 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-500">
              Parks
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-500">
              Closed
            </span>
          </div>
          <h3 className="mt-3 text-[15px] font-bold leading-snug text-slate-900">
            New dog park at Irving Heritage District?
          </h3>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: "71%" }} />
            </div>
            <span className="text-xs font-bold text-emerald-600">71% support</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">2,015 responses · result sent to office</p>
        </section>
      </div>

      <BottomNav active="surveys" onNavigate={onNavigate} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared screen header (title + district chip + sign-out)             */
/* ------------------------------------------------------------------ */

function ScreenHeader({
  eyebrow,
  title,
  onSignOut,
}: {
  eyebrow: string;
  title: string;
  onSignOut: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-5 pb-3 pt-1">
      <div>
        <p className="text-xs font-medium text-slate-500">{eyebrow}</p>
        <p className="text-[19px] font-extrabold tracking-tight text-slate-900">
          {title}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
          TX&ndash;24
        </span>
        <button
          onClick={onSignOut}
          aria-label="Sign out"
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
  );
}

/* ------------------------------------------------------------------ */
/* Screen 4 — My Representative                                        */
/* ------------------------------------------------------------------ */

function RepsScreen({
  onSignOut,
  onNavigate,
}: {
  onSignOut: () => void;
  onNavigate: (s: Screen) => void;
}) {
  const actions = [
    { label: "Message", to: "chat" as Screen, cls: "bg-blue-600 text-white" },
    { label: "Call office", cls: "bg-white text-slate-700 ring-1 ring-slate-200" },
    { label: "Video meeting", cls: "bg-white text-slate-700 ring-1 ring-slate-200" },
    { label: "Website", cls: "bg-white text-slate-700 ring-1 ring-slate-200" },
  ];

  const others = [
    { title: "Governor of Texas", sub: "Statewide · executive" },
    { title: "U.S. Senate — Senior Seat", sub: "Statewide" },
    { title: "U.S. Senate — Junior Seat", sub: "Statewide" },
    { title: "Texas State Senate", sub: "Your state district" },
  ];

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-slate-50">
      <ScreenHeader eyebrow="Your district · TX-24" title="My Representative" onSignOut={onSignOut} />

      <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-28 pt-2">
        {/* Rep hero */}
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-xl font-bold text-white">
              BV
            </div>
            <div className="min-w-0">
              <p className="text-[17px] font-bold text-slate-900">Rep. Beth Van Duyne</p>
              <p className="text-xs text-slate-500">U.S. House · Texas, District 24</p>
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                  <path d="m5 12.5 4.5 4.5L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Verified on Civix250
              </span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            {actions.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => a.to && onNavigate(a.to)}
                className={`rounded-xl py-3 text-sm font-bold transition active:scale-[0.98] ${a.cls}`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </section>

        {/* Represents you */}
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
            Covers the Irving / Grapevine area
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            District 24 spans the mid-cities between Dallas and Fort Worth —
            Irving, Grapevine, Coppell, and Carrollton.
          </p>
        </section>

        {/* Other officials */}
        <section>
          <p className="mb-2 px-1 text-sm font-bold text-slate-900">
            Your other officials
          </p>
          <div className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-100">
            {others.map((o) => (
              <button
                key={o.title}
                type="button"
                className="flex w-full items-center justify-between px-5 py-3.5 text-left active:bg-slate-50"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{o.title}</p>
                  <p className="text-xs text-slate-400">{o.sub}</p>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-slate-300">
                  <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ))}
          </div>
        </section>
      </div>

      <BottomNav active="reps" onNavigate={onNavigate} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Screen 5 — Chat (list + one open thread with video call)            */
/* ------------------------------------------------------------------ */

const CONVERSATIONS = [
  {
    name: "District 24 Office",
    initials: "D24",
    tint: "from-blue-500 to-blue-700",
    preview: "Yes — free parking in the City Library lot after 6pm.",
    time: "9:12 AM",
    online: true,
    unread: 1,
  },
  {
    name: "Maria G. · neighbor",
    initials: "MG",
    tint: "from-rose-400 to-rose-600",
    preview: "See you at the town hall Thursday!",
    time: "Yesterday",
    online: true,
    unread: 0,
  },
  {
    name: "Town Hall — Loop 12",
    initials: "TH",
    tint: "from-violet-400 to-violet-600",
    preview: "James: Parking is my concern too.",
    time: "Mon",
    online: false,
    unread: 3,
  },
  {
    name: "James P. · neighbor",
    initials: "JP",
    tint: "from-amber-400 to-amber-600",
    preview: "Appreciate you raising that.",
    time: "Sun",
    online: false,
    unread: 0,
  },
];

function ChatScreen({
  onSignOut,
  onNavigate,
}: {
  onSignOut: () => void;
  onNavigate: (s: Screen) => void;
}) {
  const [open, setOpen] = useState(false); // open the first thread

  if (open) {
    return (
      <div className="relative flex flex-1 flex-col overflow-hidden bg-slate-50">
        {/* Thread header */}
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 pb-3 pt-1">
          <button
            onClick={() => setOpen(false)}
            aria-label="Back"
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 active:bg-slate-100"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="m15 6-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-xs font-bold text-white">
            D24
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-900">District 24 Office</p>
            <p className="flex items-center gap-1 text-xs text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Online
            </p>
          </div>
          <button
            aria-label="Start video call"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white active:scale-95"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M3 7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Zm12 4 6-3v10l-6-3" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          <Bubble me={false}>Hi! This is the District 24 constituent services desk. How can we help?</Bubble>
          <Bubble me>Will there be parking at Thursday&rsquo;s town hall?</Bubble>
          <Bubble me={false}>Yes — free parking in the City Library lot after 6pm.</Bubble>
          <Bubble me>Perfect, thank you! 🙏</Bubble>
        </div>

        {/* Composer */}
        <div className="flex items-center gap-2 border-t border-slate-200 bg-white px-4 pb-6 pt-3">
          <div className="flex-1 rounded-full bg-slate-100 px-4 py-2.5 text-sm text-slate-400">
            Message…
          </div>
          <button className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white active:scale-95">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M4 12 20 4l-4 16-4-6-8-2Z" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-slate-50">
      <ScreenHeader eyebrow="District 24 · community" title="Messages" onSignOut={onSignOut} />

      {/* Search */}
      <div className="px-5 pb-2">
        <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm text-slate-400 ring-1 ring-slate-200">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="m20 20-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Search people &amp; groups
        </div>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto px-3 pb-28 pt-1">
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-100">
          {CONVERSATIONS.map((c, i) => (
            <button
              key={c.name}
              type="button"
              onClick={() => i === 0 && setOpen(true)}
              className={`flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-slate-50 ${
                i > 0 ? "border-t border-slate-100" : ""
              }`}
            >
              <div className="relative">
                <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white ${c.tint}`}>
                  {c.initials}
                </div>
                {c.online && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-bold text-slate-900">{c.name}</p>
                  <span className="shrink-0 text-[11px] text-slate-400">{c.time}</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-slate-500">{c.preview}</p>
                  {c.unread > 0 && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[11px] font-bold text-white">
                      {c.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
        <p className="mt-3 px-2 text-center text-xs text-slate-400">
          Tap the top conversation to see a live chat &amp; video call.
        </p>
      </div>

      <BottomNav active="chat" onNavigate={onNavigate} />
    </div>
  );
}

function Bubble({ me, children }: { me?: boolean; children: React.ReactNode }) {
  return (
    <div className={`flex ${me ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-snug ${
          me
            ? "rounded-br-md bg-blue-600 text-white"
            : "rounded-bl-md bg-white text-slate-800 ring-1 ring-slate-100"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Screen 6 — You (profile)                                            */
/* ------------------------------------------------------------------ */

function YouScreen({
  onSignOut,
  onNavigate,
}: {
  onSignOut: () => void;
  onNavigate: (s: Screen) => void;
}) {
  const [bioOn, setBioOn] = useState(true);

  const stats = [
    { n: "12", l: "Posts" },
    { n: "34", l: "Votes" },
    { n: "58", l: "Comments" },
  ];

  const rows = [
    { label: "Notifications", value: "On" },
    { label: "Language", value: "English" },
    { label: "Privacy", value: "" },
    { label: "Help & Support", value: "" },
  ];

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-slate-50">
      <ScreenHeader eyebrow="Your account" title="Profile" onSignOut={onSignOut} />

      <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-28 pt-2">
        {/* Identity */}
        <section className="flex items-center gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-xl font-bold text-white">
            CB
          </div>
          <div>
            <p className="text-[17px] font-bold text-slate-900">Costa Brown</p>
            <p className="text-xs text-slate-500">Texas · District 24</p>
            <span className="mt-1.5 inline-block rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
              Verified citizen
            </span>
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.l} className="rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-100">
              <p className="text-xl font-extrabold text-slate-900">{s.n}</p>
              <p className="text-xs text-slate-500">{s.l}</p>
            </div>
          ))}
        </section>

        {/* Settings */}
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-100">
          {/* Biometric toggle */}
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <div>
              <p className="text-sm font-semibold text-slate-900">Face ID / Fingerprint</p>
              <p className="text-xs text-slate-400">Passwordless sign-in</p>
            </div>
            <button
              type="button"
              onClick={() => setBioOn((v) => !v)}
              aria-label="Toggle biometric sign-in"
              className={`relative h-6 w-11 rounded-full transition ${bioOn ? "bg-blue-600" : "bg-slate-300"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                  bioOn ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </div>
          {rows.map((r, i) => (
            <button
              key={r.label}
              type="button"
              className={`flex w-full items-center justify-between px-5 py-3.5 text-left active:bg-slate-50 ${
                i > 0 ? "border-t border-slate-100" : ""
              }`}
            >
              <span className="text-sm font-semibold text-slate-900">{r.label}</span>
              <span className="flex items-center gap-2 text-xs text-slate-400">
                {r.value}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>
          ))}
        </section>

        <button
          type="button"
          onClick={onSignOut}
          className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-bold text-rose-600 shadow-sm active:scale-[0.98]"
        >
          Sign out
        </button>
      </div>

      <BottomNav active="you" onNavigate={onNavigate} />
    </div>
  );
}
