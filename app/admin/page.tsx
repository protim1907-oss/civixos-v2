"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Sidebar from "@/components/layout/Sidebar";
import {
  Shield,
  Users,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Loader2,
  LogOut,
  Search,
  UserCog,
  ShieldCheck,
  Building2,
} from "lucide-react";

type Issue = {
  id: string;
  title: string;
  description: string;
  category: string | null;
  district: string | null;
  status: string | null;
  created_at: string | null;
  user_id: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  district: string | null;
};

type UserRole = "citizen" | "moderator" | "official" | "admin";

export default function AdminDashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [currentUserProfile, setCurrentUserProfile] = useState<ProfileRow | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);

  const [issueSearch, setIssueSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");

  const [issueActionLoadingId, setIssueActionLoadingId] = useState<string | null>(null);
  const [roleActionLoadingId, setRoleActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push("/login");
        return;
      }

      const { data: me } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, district")
        .eq("id", user.id)
        .single();

      if (!me) {
        router.push("/login");
        return;
      }

      if (mounted) {
        setCurrentUserProfile(me);
      }

      if (me.role !== "admin") {
        router.push(me.role === "moderator" ? "/moderator" : "/dashboard");
        return;
      }

      await loadDashboardData();

      if (mounted) {
        setLoading(false);
      }
    };

    init();

    const issuesChannel = supabase
      .channel("admin-live-issues")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "issues" },
        async () => {
          await loadIssues();
        }
      )
      .subscribe();

    const profilesChannel = supabase
      .channel("admin-live-profiles")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        async () => {
          await loadProfiles();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(issuesChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, [router, supabase]);

  async function loadDashboardData() {
    await Promise.all([loadIssues(), loadProfiles()]);
  }

  async function loadIssues() {
    const { data, error } = await supabase
      .from("issues")
      .select("id, title, description, category, district, status, created_at, user_id")
      .order("created_at", { ascending: false });

    if (!error) {
      setIssues(data ?? []);
    }
  }

  async function loadProfiles() {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, district")
      .order("full_name", { ascending: true });

    if (!error) {
      setProfiles(data ?? []);
    }
  }

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await loadDashboardData();
    } finally {
      setRefreshing(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  async function updateIssueStatus(issueId: string, nextStatus: string) {
    try {
      setIssueActionLoadingId(issueId);

      const { error } = await supabase
        .from("issues")
        .update({ status: nextStatus })
        .eq("id", issueId);

      if (error) {
        console.error("Failed to update issue:", error.message);
        return;
      }

      await loadIssues();
    } catch (error) {
      console.error("Unexpected issue update error:", error);
    } finally {
      setIssueActionLoadingId(null);
    }
  }

  async function updateUserRole(profileId: string, nextRole: UserRole) {
    try {
      setRoleActionLoadingId(profileId);

      const { error } = await supabase
        .from("profiles")
        .update({ role: nextRole })
        .eq("id", profileId);

      if (error) {
        console.error("Failed to update role:", error.message);
        return;
      }

      await loadProfiles();
    } catch (error) {
      console.error("Unexpected role update error:", error);
    } finally {
      setRoleActionLoadingId(null);
    }
  }

  const escalatedIssues = useMemo(() => {
    let list = issues.filter((issue) => issue.status === "under_review");

    if (issueSearch.trim()) {
      const q = issueSearch.toLowerCase();
      list = list.filter(
        (issue) =>
          issue.title?.toLowerCase().includes(q) ||
          issue.description?.toLowerCase().includes(q) ||
          issue.category?.toLowerCase().includes(q) ||
          issue.district?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [issues, issueSearch]);

  const filteredUsers = useMemo(() => {
    let list = [...profiles];

    if (userSearch.trim()) {
      const q = userSearch.toLowerCase();
      list = list.filter(
        (profile) =>
          profile.full_name?.toLowerCase().includes(q) ||
          profile.email?.toLowerCase().includes(q) ||
          profile.role?.toLowerCase().includes(q) ||
          profile.district?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [profiles, userSearch]);

  const stats = useMemo(() => {
    const totalUsers = profiles.length;
    const totalPosts = issues.length;
    const underReview = issues.filter((i) => i.status === "under_review").length;
    const removed = issues.filter((i) => i.status === "removed").length;
    const moderators = profiles.filter((p) => p.role === "moderator").length;
    const officials = profiles.filter((p) => p.role === "official").length;
    const admins = profiles.filter((p) => p.role === "admin").length;

    return {
      totalUsers,
      totalPosts,
      underReview,
      removed,
      moderators,
      officials,
      admins,
    };
  }, [issues, profiles]);

  function formatDate(dateString: string | null) {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleString();
  }

  function getStatusClasses(status: string | null) {
    switch (status) {
      case "under_review":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "removed":
        return "bg-red-100 text-red-700 border-red-200";
      case "approved":
        return "bg-green-100 text-green-700 border-green-200";
      case "active":
      case "open":
      case null:
      default:
        return "bg-blue-100 text-blue-700 border-blue-200";
    }
  }

  function getRoleClasses(role: string | null) {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "moderator":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "official":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "citizen":
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8">
          <div className="animate-pulse space-y-6">
            <div className="h-10 w-72 rounded-xl bg-slate-200" />
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
              <div className="h-28 rounded-2xl bg-slate-200" />
              <div className="h-28 rounded-2xl bg-slate-200" />
              <div className="h-28 rounded-2xl bg-slate-200" />
              <div className="h-28 rounded-2xl bg-slate-200" />
              <div className="h-28 rounded-2xl bg-slate-200" />
              <div className="h-28 rounded-2xl bg-slate-200" />
            </div>
            <div className="h-80 rounded-2xl bg-slate-200" />
            <div className="h-96 rounded-2xl bg-slate-200" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />

      <main className="flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-500">
                  Civix250 Admin Console
                </p>
                <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
                  Welcome{currentUserProfile?.full_name ? `, ${currentUserProfile.full_name}` : ""}
                </h1>
                <p className="mt-3 max-w-3xl text-base text-slate-600">
                  Manage escalations, oversee users, and control the governance
                  layer of the Civix250 platform.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {refreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>

                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Users</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {stats.totalUsers}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-100 p-3">
                  <Users className="h-5 w-5 text-slate-700" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Posts</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {stats.totalPosts}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-100 p-3">
                  <FileText className="h-5 w-5 text-slate-700" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Escalated</p>
                  <p className="mt-2 text-3xl font-bold text-yellow-700">
                    {stats.underReview}
                  </p>
                </div>
                <div className="rounded-2xl bg-yellow-100 p-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-700" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Removed</p>
                  <p className="mt-2 text-3xl font-bold text-red-700">
                    {stats.removed}
                  </p>
                </div>
                <div className="rounded-2xl bg-red-100 p-3">
                  <Trash2 className="h-5 w-5 text-red-700" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Moderators</p>
                  <p className="mt-2 text-3xl font-bold text-blue-700">
                    {stats.moderators}
                  </p>
                </div>
                <div className="rounded-2xl bg-blue-100 p-3">
                  <ShieldCheck className="h-5 w-5 text-blue-700" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Officials</p>
                  <p className="mt-2 text-3xl font-bold text-emerald-700">
                    {stats.officials}
                  </p>
                </div>
                <div className="rounded-2xl bg-emerald-100 p-3">
                  <Building2 className="h-5 w-5 text-emerald-700" />
                </div>
              </div>
            </div>
          </section>

          {/* Escalated Cases */}
          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 px-6 py-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Escalated Cases Queue
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Final admin review for posts escalated by moderators.
                  </p>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 lg:w-[380px]">
                  <Search className="h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    value={issueSearch}
                    onChange={(e) => setIssueSearch(e.target.value)}
                    placeholder="Search escalated cases"
                    className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="p-6">
              {escalatedIssues.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
                  <AlertTriangle className="mx-auto h-8 w-8 text-slate-400" />
                  <h3 className="mt-4 text-lg font-semibold text-slate-800">
                    No escalated cases found
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    All escalated items are cleared or nothing matches your search.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {escalatedIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 hover:shadow-sm transition"
                    >
                      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
                                issue.status
                              )}`}
                            >
                              {issue.status ?? "active"}
                            </span>

                            {issue.category && (
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                                {issue.category}
                              </span>
                            )}

                            {issue.district && (
                              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                                {issue.district}
                              </span>
                            )}
                          </div>

                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">
                              {issue.title}
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              {issue.description}
                            </p>
                          </div>

                          <div className="text-xs text-slate-500">
                            Posted on {formatDate(issue.created_at)}
                          </div>
                        </div>

                        <div className="flex flex-wrap xl:flex-col gap-2 xl:min-w-[180px]">
                          <button
                            onClick={() => updateIssueStatus(issue.id, "approved")}
                            disabled={issueActionLoadingId === issue.id}
                            className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
                          >
                            {issueActionLoadingId === issue.id ? "Updating..." : "Approve"}
                          </button>

                          <button
                            onClick={() => updateIssueStatus(issue.id, "active")}
                            disabled={issueActionLoadingId === issue.id}
                            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                          >
                            {issueActionLoadingId === issue.id ? "Updating..." : "Restore"}
                          </button>

                          <button
                            onClick={() => updateIssueStatus(issue.id, "removed")}
                            disabled={issueActionLoadingId === issue.id}
                            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                          >
                            {issueActionLoadingId === issue.id ? "Updating..." : "Remove"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* User Management */}
          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 px-6 py-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    User Management
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Manage roles across Civix250 users.
                  </p>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 lg:w-[380px]">
                  <Search className="h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search users by name, email, role, district"
                    className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-slate-600">
                    <th className="px-6 py-4 font-semibold">User</th>
                    <th className="px-6 py-4 font-semibold">Email</th>
                    <th className="px-6 py-4 font-semibold">District</th>
                    <th className="px-6 py-4 font-semibold">Role</th>
                    <th className="px-6 py-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-10 text-center text-slate-500"
                      >
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((profile) => (
                      <tr
                        key={profile.id}
                        className="border-t border-slate-200 align-top"
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">
                            {profile.full_name || "Unnamed User"}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-slate-600">
                          {profile.email || "—"}
                        </td>

                        <td className="px-6 py-4 text-slate-600">
                          {profile.district || "—"}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getRoleClasses(
                              profile.role
                            )}`}
                          >
                            {profile.role || "citizen"}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => updateUserRole(profile.id, "citizen")}
                              disabled={roleActionLoadingId === profile.id}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                            >
                              Citizen
                            </button>

                            <button
                              onClick={() => updateUserRole(profile.id, "moderator")}
                              disabled={roleActionLoadingId === profile.id}
                              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                            >
                              Moderator
                            </button>

                            <button
                              onClick={() => updateUserRole(profile.id, "official")}
                              disabled={roleActionLoadingId === profile.id}
                              className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                            >
                              Official
                            </button>

                            <button
                              onClick={() => updateUserRole(profile.id, "admin")}
                              disabled={
                                roleActionLoadingId === profile.id ||
                                currentUserProfile?.id === profile.id
                              }
                              className="rounded-lg bg-purple-600 px-3 py-2 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-60"
                            >
                              Admin
                            </button>
                          </div>

                          {roleActionLoadingId === profile.id && (
                            <div className="mt-2 text-xs text-slate-500">
                              Updating role...
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Extra governance card */}
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-purple-100 p-3">
                  <Shield className="h-5 w-5 text-purple-700" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Governance Summary
                  </h3>
                  <p className="text-sm text-slate-500">
                    High-level administrative platform control
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <span>Admins</span>
                  <span className="font-semibold text-slate-900">{stats.admins}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <span>Moderators</span>
                  <span className="font-semibold text-slate-900">{stats.moderators}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <span>Officials</span>
                  <span className="font-semibold text-slate-900">{stats.officials}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <span>Open escalations</span>
                  <span className="font-semibold text-slate-900">{stats.underReview}</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-blue-100 p-3">
                  <UserCog className="h-5 w-5 text-blue-700" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Admin Role in Civix250
                  </h3>
                  <p className="text-sm text-slate-500">
                    What this dashboard controls
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3 text-sm text-slate-600">
                <div className="rounded-xl bg-slate-50 px-4 py-3">
                  Review sensitive or escalated civic content.
                </div>
                <div className="rounded-xl bg-slate-50 px-4 py-3">
                  Assign and manage platform roles across users.
                </div>
                <div className="rounded-xl bg-slate-50 px-4 py-3">
                  Oversee platform integrity and governance operations.
                </div>
                <div className="rounded-xl bg-slate-50 px-4 py-3">
                  Make final decisions where moderator action is not enough.
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}