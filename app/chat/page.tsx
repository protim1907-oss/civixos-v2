"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/layout/appshell"
import { Video } from "lucide-react"

export default function ChatIndexPage() {
  const router = useRouter()
  const [name, setName] = useState("")

  function startChat() {
    const trimmed = name.trim()
    if (!trimmed) return
    router.push(`/chat/${encodeURIComponent(trimmed)}`)
  }

  return (
    <AppShell title="Community Chat">
      <div className="mx-auto max-w-md">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Community Chat</h1>
          <p className="mt-1 text-sm text-slate-500">
            Start a conversation with a fellow citizen in your district. You can also video call directly from the chat.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Who do you want to chat with?
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") startChat()
            }}
            placeholder="Enter their name or username"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
          <button
            onClick={startChat}
            disabled={!name.trim()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-slate-800 transition"
          >
            <Video className="h-4 w-4" />
            Open Chat
          </button>
        </div>

        <p className="mt-4 text-xs text-slate-400 text-center">
          Video calls are powered by Jitsi Meet — no account or download required.
        </p>
      </div>
    </AppShell>
  )
}
