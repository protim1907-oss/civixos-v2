"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  FileText,
  TrendingUp,
  PlusSquare,
  ShieldCheck,
  LogOut,
  Users,
} from "lucide-react";

type Profile = {
  id: string;
  role: string | null;
};

export default function Sidebar() {
  const pathname = usePathname();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", user.id)
        .single();

      setProfile(data);
    };

    loadProfile();
  }, []);

  const role = profile?.role ?? "citizen";

  const navItems = [
    {
      label: "Dashboard",
      href: role === "moderator" ? "/moderator" : "/dashboard",
      icon: LayoutDashboard,
      show: true,
    },
    {
      label: "Create Post",
      href: "/create-post",
      icon: PlusSquare,
      show: role === "citizen",
    },
    {
      label: "Trending",
      href: "/trending",
      icon: TrendingUp,
      show: role === "citizen",
    },
    {
      label: "My Representatives",
      href: "/my-representative",
      icon: Users,
      show: role === "citizen", // ✅ hidden for moderator
    },
    {
      label: "Moderation",
      href: "/moderator",
      icon: ShieldCheck,
      show: role === "moderator",
    },
  ];

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col">
      {/* Logo */}
      <div className="px-6 py-6 text-xl font-bold border-b border-slate-800">
        Policy Pulse
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems
          .filter((item) => item.show)
          .map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? "bg-white text-slate-900"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
      </nav>

      {/* Logout */}
      <div className="px-4 py-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}