"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import Sidebar from "@/components/layout/Sidebar"
import { Video, PhoneOff } from "lucide-react"

function buildRoomId(repName: string) {
  const safe = repName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
  return `civix250-${safe}`
}

export default function ChatPage() {
  const params = useParams()
  const repName = decodeURIComponent(params.name as string)
  const supabase = createClient()

  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [userId, setUserId] = useState<string | null>(null)
  const [videoOpen, setVideoOpen] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const roomId = buildRoomId(repName)
  const jitsiUrl = `https://meet.jit.si/${roomId}`

  useEffect(() => {
    loadUser()
    loadMessages()
  }, [])

  async function loadUser() {
    const { data } = await supabase.auth.getUser()
    setUserId(data.user?.id || null)
  }

  async function loadMessages() {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("receiver_name", repName)
      .order("created_at", { ascending: true })

    setMessages(data || [])
  }

  async function sendMessage() {
    if (!newMessage.trim()) return

    const { error } = await supabase.from("messages").insert([
      {
        sender_id: userId,
        receiver_name: repName,
        message: newMessage,
      },
    ])

    if (!error) {
      setNewMessage("")
      loadMessages()
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
      <Sidebar />

      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Chat with {repName}</h1>
              <p className="mt-1 text-sm text-slate-500">District citizen conversation</p>
            </div>
            <button
              onClick={() => setVideoOpen(true)}
              className="flex items-center gap-2 rounded-2xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition"
            >
              <Video className="h-4 w-4" />
              Start Video Call
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-[480px] overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <p className="text-center text-sm text-slate-400 mt-16">
                  No messages yet. Say hello!
                </p>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className="flex flex-col gap-1">
                    <div className="inline-block max-w-[75%] rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-800">
                      {msg.message}
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-3 border-t border-slate-100 p-4">
              <input
                className="flex-1 rounded-2xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-400"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className="rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-slate-800 transition"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </main>

      {videoOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          <div className="flex items-center justify-between bg-slate-900 px-4 py-3">
            <div className="flex items-center gap-2 text-white">
              <Video className="h-4 w-4 text-green-400" />
              <span className="text-sm font-semibold">Video call with {repName}</span>
            </div>
            <button
              onClick={() => setVideoOpen(false)}
              className="flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition"
            >
              <PhoneOff className="h-4 w-4" />
              End Call
            </button>
          </div>
          <iframe
            ref={iframeRef}
            src={jitsiUrl}
            allow="camera; microphone; display-capture; fullscreen; autoplay"
            className="flex-1 w-full border-0"
            title={`Video call with ${repName}`}
          />
        </div>
      )}
    </div>
  )
}
