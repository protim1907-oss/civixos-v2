"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AppShell } from "@/components/layout/appshell"
import { supabase } from "../../lib/supabase"

type Profile = {
  id: string
  full_name: string | null
  district: string | null
  role: string | null
}

type Issue = {
  id: string
  title: string
  description: string
  status: string | null
  created_at: string | null
  user_id: string | null
}

export default function DashboardPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState("")
  const [profile, setProfile] = useState<Profile | null>(null)
  const [issues, setIssues] = useState<Issue[]>([])
  const [statusFilter, setStatusFilter] = useState("All")
  const [searchText, setSearchText] = useState("")

  useEffect(() => {
    async function loadDashboardData() {
      const { data: authData, error: authError } = await supabase.auth.getUser()

      if (authError || !authData.user) {
        router.push("/login")
        return
      }

      setUserEmail(authData.user.email || "")

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, district, role")
        .eq("id", authData.user.id)
        .single()

      if (profileError) {
        console.error("Profile error:", profileError)
      } else {
        setProfile(profileData)
      }

      const { data: issuesData, error: issuesError } = await supabase
        .from("issues")
        .select("id, title, description, status, created_at, user_id")
        .order("created_at", { ascending: false })

      if (issuesError) {
        console.error("Issues error:", issuesError)
      } else {
        setIssues(issuesData || [])
      }

      setLoading(false)
    }

    loadDashboardData()
  }, [router])

  const openCount = issues.filter((issue) => issue.status === "Open").length
  const underReviewCount = issues.filter((issue) => issue.status === "Under Review").length
  const resolvedCount = issues.filter((issue) => issue.status === "Resolved").length

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      const matchesStatus =
        statusFilter === "All" ? true : (issue.status || "Open") === statusFilter

      const query = searchText.trim().toLowerCase()
      const matchesSearch =
        query.length === 0
          ? true
          : issue.title.toLowerCase().includes(query) ||
            issue.description.toLowerCase().includes(query)

      return matchesStatus && matchesSearch
    })
  }, [issues, statusFilter, searchText])

  function formatDate(dateString: string | null) {
    if (!dateString) return "No date"

    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  function getStatusStyle(status: string | null) {
    switch (status) {
      case "Open":
        return "bg-red-100 text-red-700"
      case "Under Review":
        return "bg-yellow-100 text-yellow-700"
      case "Resolved":
        return "bg-green-100 text-green-700"
      default:
        return "bg-slate-100 text-slate-700"
    }
  }

  function getInitials(name: string | null, email: string) {
    if (name && name.trim().length > 0) {
      return name
        .trim()
        .split(" ")
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("")
    }

    return email ? email.charAt(0).toUpperCase() : "U"
  }

  if (loading) {
    return (
      <AppShell title="Dashboard">
        <div className="text-sm text-slate-600">Loading dashboard...</div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Dashboard">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-medium text-slate-500">Public Feed</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Welcome back, {profile?.full_name || "User"}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            View recent civic issues across the platform and track community activity.
          </p>
        </div>

        <Link href="/create-post">
          <Button>Create a Post</Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Profile</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">
                {profile?.full_name || "User"}
              </h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {profile?.role || "citizen"}
            </span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Email
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">{userEmail}</p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                District
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {profile?.district || "Not set"}
              </p>
            </div>
          </div>
        </Card>

        <div className="grid gap-4">
          <Card className="p-5">
            <p className="text-sm font-medium text-slate-500">Open Issues</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{openCount}</p>
          </Card>

          <Card className="p-5">
            <p className="text-sm font-medium text-slate-500">Under Review</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{underReviewCount}</p>
          </Card>

          <Card className="p-5">
            <p className="text-sm font-medium text-slate-500">Resolved</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{resolvedCount}</p>
          </Card>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Community Feed</h3>
              <p className="text-sm text-slate-600">
                All submitted civic issues, sorted by most recent.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                placeholder="Search issues"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 sm:w-56"
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >
                <option value="All">All Statuses</option>
                <option value="Open">Open</option>
                <option value="Under Review">Under Review</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {filteredIssues.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                No issues match your current filters.
              </div>
            ) : (
              filteredIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="rounded-2xl border border-slate-200 p-4 transition hover:shadow-sm"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                        {getInitials(profile?.full_name || null, userEmail)}
                      </div>

                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{issue.title}</p>
                        <p className="mt-2 text-sm text-slate-600">
                          {issue.description}
                        </p>
                        <p className="mt-3 text-xs text-slate-500">
                          Submitted on {formatDate(issue.created_at)}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(issue.status)}`}
                    >
                      {issue.status || "Open"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-slate-900">Quick Actions</h3>
          <p className="mt-2 text-sm text-slate-600">
            Create issues, explore activity, and keep track of the public feed.
          </p>

          <div className="mt-5 space-y-3">
            <Link href="/create-post" className="block">
              <Button fullWidth>Create New Issue</Button>
            </Link>

            <button
              type="button"
              onClick={() => {
                setStatusFilter("All")
                setSearchText("")
              }}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Clear Filters
            </button>
          </div>

          <div className="mt-6 rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Feed Summary
            </p>
            <p className="mt-2 text-sm text-slate-700">
              Showing <span className="font-semibold">{filteredIssues.length}</span> of{" "}
              <span className="font-semibold">{issues.length}</span> total issues.
            </p>
          </div>
        </Card>
      </div>
    </AppShell>
  )
}