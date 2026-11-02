"use client";

import { useState } from "react";

/**
 * Ad placement preview — shows how the "Unfinished Promise" ad appears inside
 * the Facebook and Instagram mobile apps (feed placements), using the real
 * 1080x1350 creative. This mirrors Meta's own Ads Manager preview so the ad can
 * be reviewed on a phone before the campaign runs. Share at /ad-preview.
 *
 * The app chrome here is an illustrative mock for previewing OUR OWN ad; the
 * creative, Page/handle (Vote Beyond Party), and destination are the real ones.
 */

type Placement = "facebook" | "instagram";

const CREATIVE = "/lp/unfinished-promise.png"; // 1080 x 1350 (4:5)

// Ad primary text (caption). Keep nonpartisan + the required disclaimer.
const PRIMARY_TEXT =
  "250 years after America's founding, the promise of “We the People” is still unfinished. You don't answer to Washington — Washington answers to you. Join free and make your voice heard in your district. 🇺🇸";
const HEADLINE = "250 Years Later, the Promise Is Still Unfinished";
const DESCRIPTION = "Free & nonpartisan · Live in all 50 states";
const DISPLAY_URL = "CIVIX250.AI";

export default function AdPreviewPage() {
  const [placement, setPlacement] = useState<Placement>("facebook");

  return (
    <main className="flex min-h-[100svh] w-full flex-col items-center bg-slate-900 px-4 py-6">
      {/* Placement switcher (like Ads Manager) */}
      <div className="mb-5 flex gap-2 rounded-full bg-slate-800 p-1">
        <TogglePill
          active={placement === "facebook"}
          onClick={() => setPlacement("facebook")}
          label="Facebook Feed"
        />
        <TogglePill
          active={placement === "instagram"}
          onClick={() => setPlacement("instagram")}
          label="Instagram Feed"
        />
      </div>

      {/* Phone */}
      <div className="relative flex h-[760px] w-full max-w-[390px] flex-col overflow-hidden rounded-[2.5rem] border-[10px] border-slate-950 bg-white shadow-2xl">
        {/* status bar */}
        <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[12px] font-semibold text-slate-900">
          <span>9:41</span>
          <div className="flex items-center gap-1">
            <svg width="16" height="10" viewBox="0 0 17 11" fill="currentColor">
              <rect x="0" y="7" width="3" height="4" rx="1" />
              <rect x="4.5" y="5" width="3" height="6" rx="1" />
              <rect x="9" y="2.5" width="3" height="8.5" rx="1" />
              <rect x="13.5" y="0" width="3" height="11" rx="1" />
            </svg>
            <svg width="22" height="11" viewBox="0 0 25 12" fill="none">
              <rect x="0.5" y="0.5" width="21" height="11" rx="3" stroke="currentColor" strokeOpacity="0.5" />
              <rect x="2" y="2" width="16" height="8" rx="1.5" fill="currentColor" />
              <rect x="23" y="4" width="2" height="4" rx="1" fill="currentColor" />
            </svg>
          </div>
        </div>

        {placement === "facebook" ? <FacebookAd /> : <InstagramAd />}
      </div>

      <p className="mt-5 max-w-[390px] text-center text-xs leading-5 text-slate-400">
        Preview of how the ad appears in-app. The Facebook/Instagram interface is
        an illustrative mock; the creative, Page, and destination are the real
        campaign assets. Meta&rsquo;s own call-to-action button uses a preset
        label (e.g. &ldquo;Sign Up&rdquo;); &ldquo;Join for Free&rdquo; is part
        of the image itself.
      </p>
    </main>
  );
}

function TogglePill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-bold transition ${
        active ? "bg-white text-slate-900" : "text-slate-300"
      }`}
    >
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Facebook feed placement                                             */
/* ------------------------------------------------------------------ */

function FacebookAd() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-slate-100">
      {/* FB top bar */}
      <div className="flex items-center justify-between bg-white px-4 py-2.5">
        <span className="text-[22px] font-extrabold tracking-tight text-[#0866FF]">
          facebook
        </span>
        <div className="flex items-center gap-2">
          <IconCircle>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm6 13 4 4" stroke="#050505" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </IconCircle>
          <IconCircle>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#050505">
              <path d="M12 2C6.5 2 2 6 2 11c0 2.7 1.3 5.1 3.5 6.7V22l3.2-1.8c1 .3 2.1.4 3.3.4 5.5 0 10-4 10-9s-4.5-9.6-10-9.6Zm1 12-2.5-2.7L5.6 14l5.4-5.7 2.6 2.7L18.4 8 13 14Z" />
            </svg>
          </IconCircle>
        </div>
      </div>

      {/* Post */}
      <div className="flex-1 overflow-y-auto pb-4">
        <div className="bg-white">
          {/* header row */}
          <div className="flex items-center gap-3 px-4 pt-3">
            <PageAvatar />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-[#050505]">
                Vote Beyond Party
              </p>
              <p className="flex items-center gap-1 text-[12px] text-[#65676B]">
                Sponsored ·{" "}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#65676B">
                  <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2c1.3 0 2 2.2 2.3 5H9.7C10 6.2 10.7 4 12 4ZM4.3 11h3.4c0 1 .1 2 .2 3H4.9a8 8 0 0 1-.6-3Zm.6 5h2.9c.2 1.2.5 2.2.9 3A8 8 0 0 1 4.9 16Zm2.8-8H4.9a8 8 0 0 1 3.8-3c-.4.8-.7 1.8-.9 3H7.7ZM12 20c-1.3 0-2-2.2-2.3-5h4.6c-.3 2.8-1 5-2.3 5Zm2.4-7H9.6c-.1-1-.2-2-.2-3h5.2c0 1-.1 2-.2 3Zm1.9 6c.4-.8.7-1.8.9-3h2.9a8 8 0 0 1-3.8 3Zm1.1-5c.1-1 .2-2 .2-3h3.4a8 8 0 0 1-.6 3h-3Zm0-5c-.2-1.2-.5-2.2-.9-3a8 8 0 0 1 3.8 3h-2.9Z" />
                </svg>
              </p>
            </div>
            <span className="text-[#65676B]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
              </svg>
            </span>
          </div>

          {/* primary text */}
          <p className="px-4 py-2.5 text-[14px] leading-5 text-[#050505]">
            {PRIMARY_TEXT}
          </p>

          {/* creative */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={CREATIVE} alt="The Unfinished Promise" width={1080} height={1350} className="w-full" />

          {/* link card */}
          <div className="flex items-center gap-3 bg-[#F0F2F5] px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-[12px] uppercase tracking-wide text-[#65676B]">{DISPLAY_URL}</p>
              <p className="truncate text-[15px] font-bold leading-snug text-[#050505]">{HEADLINE}</p>
              <p className="truncate text-[13px] text-[#65676B]">{DESCRIPTION}</p>
            </div>
            <button className="shrink-0 rounded-md bg-[#E4E6EB] px-4 py-2 text-[14px] font-bold text-[#050505]">
              Sign Up
            </button>
          </div>

          {/* counts */}
          <div className="flex items-center justify-between px-4 py-2 text-[13px] text-[#65676B]">
            <span className="flex items-center gap-1">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#0866FF] text-[9px] text-white">👍</span>
              1.2K
            </span>
            <span>184 comments · 97 shares</span>
          </div>

          {/* actions */}
          <div className="flex items-center justify-around border-t border-slate-200 py-1 text-[14px] font-semibold text-[#65676B]">
            <FbAction label="Like" />
            <FbAction label="Comment" />
            <FbAction label="Share" />
          </div>
        </div>
      </div>
    </div>
  );
}

function FbAction({ label }: { label: string }) {
  const icon =
    label === "Like" ? (
      <path d="M7 10v10H4V10h3Zm3 0 1.5-5A2 2 0 0 1 14 4c1 0 2 .8 2 2v3h4a2 2 0 0 1 2 2l-1.5 7a2 2 0 0 1-2 1.5H10V10Z" />
    ) : label === "Comment" ? (
      <path d="M4 5h16v11H9l-5 4V5Z" />
    ) : (
      <path d="M13 3 22 12l-9 9v-5C7 16 4 18 2 21c0-7 4-11 11-11V3Z" />
    );
  return (
    <button className="flex items-center gap-2 px-3 py-2">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#65676B" strokeWidth="1.8" strokeLinejoin="round">
        {icon}
      </svg>
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Instagram feed placement                                            */
/* ------------------------------------------------------------------ */

function InstagramAd() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-white">
      {/* IG top bar */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <span className="text-[22px] font-semibold tracking-tight text-[#262626]" style={{ fontFamily: "'Segoe Script', 'Snell Roundhand', cursive" }}>
          Instagram
        </span>
        <div className="flex items-center gap-4">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="1.8">
            <path d="M12 21s-7-4.3-9.3-9A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 9.3 5c-2.3 4.7-9.3 9-9.3 9Z" strokeLinejoin="round" />
          </svg>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="1.8">
            <path d="m22 3-11 11M22 3l-7 19-4-8-8-4 19-7Z" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* header row */}
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="rounded-full bg-gradient-to-tr from-yellow-400 via-rose-500 to-purple-600 p-[2px]">
            <div className="rounded-full border-2 border-white">
              <PageAvatar small />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-[#262626]">votebeyondparty</p>
            <p className="text-[12px] text-[#262626]">Sponsored</p>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#262626">
            <circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" />
          </svg>
        </div>

        {/* creative */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={CREATIVE} alt="The Unfinished Promise" width={1080} height={1350} className="w-full" />

        {/* CTA bar */}
        <button className="flex w-full items-center justify-between border-y border-slate-100 bg-white px-4 py-3">
          <span className="text-[14px] font-semibold text-[#0095F6]">Sign Up</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0095F6" strokeWidth="2">
            <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* actions */}
        <div className="flex items-center justify-between px-4 pt-3">
          <div className="flex items-center gap-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="1.7">
              <path d="M12 21s-7-4.3-9.3-9A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 9.3 5c-2.3 4.7-9.3 9-9.3 9Z" strokeLinejoin="round" />
            </svg>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="1.7">
              <path d="M21 11.5a8 8 0 0 1-11.5 7.2L3 20l1.3-4A8 8 0 1 1 21 11.5Z" strokeLinejoin="round" />
            </svg>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="1.7">
              <path d="m22 3-11 11M22 3l-7 19-4-8-8-4 19-7Z" strokeLinejoin="round" />
            </svg>
          </div>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="1.7">
            <path d="M6 3h12v18l-6-4-6 4V3Z" strokeLinejoin="round" />
          </svg>
        </div>

        {/* likes + caption */}
        <div className="px-4 pt-2 pb-4 text-[13px] text-[#262626]">
          <p className="font-semibold">1,284 likes</p>
          <p className="mt-1 leading-5">
            <span className="font-semibold">votebeyondparty</span> {PRIMARY_TEXT}
          </p>
          <p className="mt-1 text-[#8E8E8E]">View all 86 comments</p>
          <p className="mt-1 text-[11px] uppercase tracking-wide text-[#8E8E8E]">
            Paid for by Vote Beyond Party · a nonpartisan 501(c)(3)
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

function PageAvatar({ small = false }: { small?: boolean }) {
  const size = small ? "h-8 w-8 text-[11px]" : "h-10 w-10 text-sm";
  return (
    <div className={`flex ${size} items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-800 font-bold text-white`}>
      VBP
    </div>
  );
}

function IconCircle({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E4E6EB]">
      {children}
    </span>
  );
}
