"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
  title?: string;
};

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/feed", label: "District Feed" },
  { href: "/my-representatives", label: "Representatives" },
  { href: "/moderation", label: "Moderation" },
  { href: "/reports", label: "Reports" },
  { href: "/policy-pulse", label: "Policy Pulse" },
];

export function AppShell({ children, title }: AppShellProps) {
  const pathname = usePathname();

  const currentLabel =
    title || navItems.find((item) => item.href === pathname)?.label || "Dashboard";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 bg-slate-950 text-white lg:flex lg:flex-col">
          <div className="border-b border-slate-800 px-7 py-8">
            <h1 className="text-3xl font-bold tracking-tight">CivixOS</h1>
            <p className="mt-2 text-sm text-slate-400">Citizen decision intelligence</p>
          </div>

          <nav className="flex-1 px-4 py-6">
            <div className="space-y-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block rounded-xl px-4 py-3 text-sm transition ${
                      isActive
                        ? "bg-slate-800 font-semibold text-white"
                        : "text-slate-300 hover:bg-slate-900 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="m-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm font-semibold">Prototype Goal</p>
            <p className="mt-3 text-sm text-slate-300">Run a targeted civic poll</p>
            <p className="mt-1 text-sm text-slate-400">
              Collect fast policy sentiment before full platform launch.
            </p>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
              <div>
                <p className="text-sm text-slate-500">CivixOS Platform</p>
                <h2 className="text-lg font-semibold text-slate-900">{currentLabel}</h2>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/policy-pulse"
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Policy Pulse
                </Link>
                <Link
                  href="/create-post"
                  className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
                >
                  Create Post +
                </Link>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">{children}</main>
        </div>
      </div>
    </div>
  );
}

export default AppShell;