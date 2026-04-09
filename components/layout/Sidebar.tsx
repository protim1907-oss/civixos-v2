"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Public Feed", href: "/feed" },
  { label: "Create Post", href: "/create-post" },
  { label: "My Representatives", href: "/my-representatives" },
  { label: "Policy Pulse", href: "/policy-pulse" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="min-h-screen w-[280px] bg-[#04143b] px-10 py-12 text-white">
      <h2 className="text-5xl font-bold tracking-tight text-white">CivixOS</h2>

      <nav className="mt-20 space-y-6">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-[20px] px-8 py-7 text-[26px] font-medium transition ${
                isActive
                  ? "bg-[#2563eb] text-white shadow-sm"
                  : "text-slate-200 hover:bg-white/5"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}