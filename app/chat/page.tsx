"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { startPresence, subscribePresence, presenceKey } from "@/lib/supabase/presence"
import Sidebar from "@/components/layout/Sidebar"
import { Video, Search, MessageSquare } from "lucide-react"

type Citizen = { name: string; district: string }

export default function ChatIndexPage() {
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState("")
  const [citizens, setCitizens] = useState<Citizen[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [myName, setMyName] = useState<string | null>(null)
  const [onlineKeys, setOnlineKeys] = useState<Set<string>>(new Set())

  useEffect(() => {
    let mounted = true
    async function load() {
      // Current user's name — so we can exclude them from the picker.
      const { data: authData } = await supabase.auth.getUser()
      if (authData.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", authData.user.id)
          .maybeSingle()
        if (mounted) setMyName((profile?.full_name || "").trim() || null)
      }

      try {
        const res = await fetch("/api/citizens")
        const body = await res.json()
        if (mounted && Array.isArray(body.citizens)) setCitizens(body.citizens as Citizen[])
      } catch {
        // directory is optional — manual name entry still works
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [supabase])

  // Read online status from the shared presence channel. startPresence() also
  // ensures the current user is tracked (in case the Sidebar hasn't yet).
  useEffect(() => {
    void startPresence()
    const unsubscribe = subscribePresence(setOnlineKeys)
    return unsubscribe
  }, [])

  function openChat(target: string) {
    const trimmed = target.trim()
    if (!trimmed) return
    router.push(`/chat/${encodeURIComponent(trimmed)}`)
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return citizens
      .filter((c) => !myName || c.name.toLowerCase() !== myName.toLowerCase())
      .filter(
        (c) =>
          !q ||
          c.name.toLowerCase().includes(q) ||
          c.district.toLowerCase().includes(q)
      )
      .map((c) => ({ ...c, online: onlineKeys.has(presenceKey(c.name, c.district)) }))
      // Online citizens first, then alphabetical.
      .sort((a, b) =>
        a.online === b.online ? a.name.localeCompare(b.name) : a.online ? -1 : 1
      )
  }, [citizens, query, myName, onlineKeys])

  const onlineCount = useMemo(
    () =>
      citizens.filter(
        (c) =>
          (!myName || c.name.toLowerCase() !== myName.toLowerCase()) &&
          onlineKeys.has(presenceKey(c.name, c.district))
      ).length,
    [citizens, myName, onlineKeys]
  )

  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
      <Sidebar />

      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Community Chat</h1>
            <p className="mt-1 text-sm text-slate-500">
              Start a conversation with any fellow citizen — pick someone from the
              directory below or enter a name. You can also video call directly from
              the chat.
            </p>
          </div>

          {/* Citizen picker */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm font-semibold text-slate-700">
                Find a citizen
              </label>
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                {onlineCount} online
              </span>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or district (e.g. CA-49)"
                className="w-full rounded-2xl border border-slate-300 py-3 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-blue-400"
              />
            </div>

            <div className="mt-4 max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-100">
              {loading ? (
                <p className="p-4 text-center text-sm text-slate-400">Loading citizens…</p>
              ) : filtered.length === 0 ? (
                <p className="p-4 text-center text-sm text-slate-400">
                  {citizens.length === 0
                    ? "No citizens found yet."
                    : "No matches — try a different search, or enter a name below."}
                </p>
              ) : (
                filtered.map((c) => (
                  <button
                    key={`${c.name}-${c.district}`}
                    onClick={() => openChat(c.name)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                          c.online ? "bg-green-500" : "bg-slate-300"
                        }`}
                        title={c.online ? "Online" : "Offline"}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {c.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {[c.district, c.online ? "Online" : "Offline"]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    </div>
                    <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
                      <MessageSquare className="h-3.5 w-3.5" />
                      Chat
                    </span>
                  </button>
                ))
              )}
            </div>

            {/* Manual entry fallback (officials, or anyone not in the list) */}
            <div className="mt-5 border-t border-slate-100 pt-4">
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                …or enter a name directly
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") openChat(name)
                  }}
                  placeholder="Enter their name or username"
                  className="flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400"
                />
                <button
                  onClick={() => openChat(name)}
                  disabled={!name.trim()}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  Open Chat
                </button>
              </div>
            </div>
          </div>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <Video className="h-3.5 w-3.5" />
            Video calls run inside the chat — no separate app or download needed.
          </p>
        </div>
      </main>
    </div>
  )
}
