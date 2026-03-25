"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Create Post", href: "/create-post" },
  { label: "My Representatives", href: "/my-representatives" },
  { label: "My Issues", href: "/my-issues" },
  { label: "Notifications", href: "/notifications" },
  { label: "Settings", href: "/settings" },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
      <div className="flex h-16 items-center border-b border-slate-200 px-6">
        <span className="text-xl font-bold text-slate-900">CivixOS</span>
      </div>

      <nav className="p-4">
        <div className="mb-6 rounded-2xl bg-slate-900 p-4 text-white">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
            Workspace
          </p>
          <p className="mt-2 text-sm font-medium">
            Civic engagement platform
          </p>
        </div>

        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block rounded-xl px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}