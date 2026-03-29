"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type TabType = "All Posts" | "Official Updates" | "Community Issues" | "Resolved";

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  district_id: string | null;
  role: string | null;
  districts?: { id: string; name: string | null }[] | null;
};

type IssueRow = {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  category: string | null;
  created_at: string | null;
  district_id: string | null;
  user_id: string | null;
  profiles?: { full_name: string | null; role: string | null }[] | null;
};

type DashboardPost = {
  id: string;
  title: string;
  author: string;
  type: "Official" | "Citizen" | "Community";
  status: "Open" | "Under Review" | "Resolved" | "Escalated";
  category: string;
  urgency: "Low" | "Medium" | "High";
  description: string;
  date: string;
  supports: number;
  comments: number;
};

function normalizeStatus(status?: string | null): DashboardPost["status"] {
  const value = (status || "").toLowerCase();
  if (value.includes("review")) return "Under Review";
  if (value.includes("resolve")) return "Resolved";
  if (value.includes("escalat")) return "Escalated";
  return "Open";
}

function deriveType(role?: string | null): DashboardPost["type"] {
  const value = (role || "").toLowerCase();
  if (value.includes("admin") || value.includes("official")) return "Official";
  if (value.includes("community")) return "Community";
  return "Citizen";
}

function deriveUrgency(category?: string | null): DashboardPost["urgency"] {
  const value = (category || "").toLowerCase();
  if (value.includes("safety")) return "High";
  if (value.includes("transport")) return "Medium";
  return "Low";
}

function getStatusBorder(status: DashboardPost["status"]) {
  return {
    Open: "border-l-4 border-red-500",
    "Under Review": "border-l-4 border-amber-500",
    Resolved: "border-l-4 border-green-500",
    Escalated: "border-l-4 border-blue-500",
  }[status];
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [posts, setPosts] = useState<DashboardPost[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<TabType>("All Posts");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*, districts(id,name)")
        .eq("id", user.id)
        .single();

      const typedProfile = profileData as unknown as ProfileRow;
      setProfile(typedProfile);

      const { data: issuesData } = await supabase
        .from("issues")
        .select("*, profiles:user_id(full_name,role)")
        .eq("district_id", typedProfile?.district_id)
        .order("created_at", { ascending: false });

      const mapped = ((issuesData as unknown as IssueRow[]) || []).map((i) => ({
        id: i.id,
        title: i.title,
        author: i.profiles?.[0]?.full_name || "Citizen",
        type: deriveType(i.profiles?.[0]?.role),
        status: normalizeStatus(i.status),
        category: i.category || "General",
        urgency: deriveUrgency(i.category),
        description: i.description || "",
        date: i.created_at || "",
        supports: 0,
        comments: 0,
      }));

      setPosts(mapped);
      setLoading(false);
    };

    load();
  }, [router, supabase]);

  const filtered = useMemo(() => {
    let result = [...posts];

    if (activeTab === "Official Updates")
      result = result.filter((p) => p.type === "Official");

    if (activeTab === "Community Issues")
      result = result.filter((p) => p.type !== "Official");

    if (activeTab === "Resolved")
      result = result.filter((p) => p.status === "Resolved");

    return result;
  }, [posts, activeTab]);

  if (loading) return <div className="p-6">Loading...</div>;

  const districtName = profile?.districts?.[0]?.name || "District";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl shadow">
        <h1 className="text-xl font-bold">Citizen Dashboard</h1>
        <p className="text-sm text-gray-500">{districtName}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {["All Posts", "Official Updates", "Community Issues", "Resolved"].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t as TabType)}
            className={`px-3 py-1 rounded ${
              activeTab === t ? "bg-red-500 text-white" : "bg-gray-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map((p) => (
          <div key={p.id} className={`bg-white p-4 rounded-xl shadow ${getStatusBorder(p.status)}`}>
            <h2 className="font-bold">{p.title}</h2>
            <p className="text-sm text-gray-500">{p.author}</p>
            <p className="text-sm mt-2">{p.description}</p>

            <div className="flex justify-between mt-4 text-sm">
              <span>{p.status}</span>
              <Link href={`/feed/${p.id}`} className="text-red-500">
                View
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}