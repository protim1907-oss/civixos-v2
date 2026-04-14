"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Newspaper,
  Megaphone,
  MessageSquareText,
  TrendingUp,
  UserCircle2,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/feed",
    label: "District Feed",
    icon: Newspaper,
  },
  {
    href: "/official-updates",
    label: "Official Updates",
    icon: Megaphone,
  },
  {
    href: "/create-post",
    label: "Create Post",
    icon: MessageSquareText,
  },
  {
    href: "/trending-posts",
    label: "Trending Posts",
    icon: TrendingUp,
  },
  {
    href: "/my-representatives",
    label: "My Representative",
    icon: UserCircle2,
  },
];

function isActivePath(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white lg:block">
      <div className="sticky top-0 flex h-screen flex-col">
        <div className="border-b border-slate-200 px-6 py-6">
          <Link href="/dashboard" className="block">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
              Civic Platform
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
              Civix250
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Citizen engagement and district intelligence
            </p>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-5">
          <div className="space-y-2">
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href, item.exact);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    active
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${
                      active ? "text-white" : "text-slate-500"
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-slate-200 px-4 py-4">
          <div className="rounded-2xl bg-slate-50 px-4 py-4">
            <p className="text-sm font-semibold text-slate-900">
              Civic engagement hub
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Follow district issues, track updates, and participate in local discussions.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}