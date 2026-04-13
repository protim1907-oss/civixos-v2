"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { APP_NAME } from "@/lib/config";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: "🏠" },
  { label: "Public Feed", href: "/feed", icon: "📢" },
  { label: "Create Post", href: "/create-post", icon: "✍️" },
  { label: "Policy Pulse", href: "/policy-pulse", icon: "📊" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
        >
          ☰ Menu
        </button>

        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
            Civic Platform
          </p>
          <h2 className="text-base font-bold text-slate-900">{APP_NAME}</h2>
        </div>

        <div className="w-[74px]" />
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-[280px] transform border-r border-white/10
          bg-[#081a43] text-white shadow-2xl transition-transform duration-300
          lg:sticky lg:top-0 lg:z-30 lg:block lg:min-h-screen lg:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"} lg:w-[250px] xl:w-[270px]
        `}
      >
        <div className="flex h-full flex-col px-5 py-6">
          {/* Top */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-200/70">
                Civic Platform
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
                {APP_NAME}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Community engagement and district insight hub
              </p>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-white/10 px-3 py-1.5 text-sm text-slate-200 lg:hidden"
            >
              ✕
            </button>
          </div>

          {/* Nav */}
          <nav className="mt-8 space-y-2">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-medium transition ${
                    isActive
                      ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg"
                      : "text-slate-200 hover:bg-white/8 hover:text-white"
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Bottom card */}
          <div className="mt-auto rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200/70">
              Live Status
            </p>
            <h3 className="mt-2 text-lg font-bold text-white">
              Community Overview
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Track district issues, public sentiment, and official updates in one place.
            </p>

            <Link
              href="/policy-pulse"
              onClick={() => setOpen(false)}
              className="mt-4 inline-flex rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Open Policy Pulse
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}