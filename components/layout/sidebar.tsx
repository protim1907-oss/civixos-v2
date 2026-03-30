"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/feed", label: "District Feed" },
  { href: "/my-representatives", label: "Representatives" },
  { href: "/moderation", label: "Moderation" },
  { href: "/reports", label: "Reports" },
  { href: "/policy-pulse", label: "Policy Pulse" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
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
  );
}