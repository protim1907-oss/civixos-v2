"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "../../../lib/supabase"
import { AppShell } from "@/components/layout/appshell"
import { Button } from "@/components/ui/button"
import { Video, X, PhoneOff } from "lucide-react"

function buildRoomId(repName: string) {
  // Deterministic room name so both participants always join the same room.
  // Strip non-alphanumeric chars and lowercase so casing differences don't split rooms.
  const safe = repName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
  return `civix250-${safe}`
}

export default function ChatPage() {
  const params = useParams()
  const repName = decodeURIComponent(params.name as string)

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
    <AppShell title={`Chat with ${repName}`}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Chat with {repName}</h1>
          <button
            onClick={() => setVideoOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition"
          >
            <Video className="h-4 w-4" />
            Start Video Call
          </button>
        </div>

        <div className="border rounded-xl p-4 h-[400px] overflow-y-auto mb-4">
          {messages.map((msg) => (
            <div key={msg.id} className="mb-3">
              <div className="text-sm text-slate-700">{msg.message}</div>
              <div className="text-xs text-slate-400">
                {new Date(msg.created_at).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            className="flex-1 border rounded-lg px-3 py-2"
            placeholder="Type a message"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
          />
          <Button onClick={sendMessage}>Send</Button>
        </div>
      </div>

      {/* Video call modal */}
      {videoOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          <div className="flex items-center justify-between bg-slate-900 px-4 py-3">
            <div className="flex items-center gap-2 text-white">
              <Video className="h-4 w-4 text-green-400" />
              <span className="text-sm font-semibold">
                Video call with {repName}
              </span>
            </div>
            <button
              onClick={() => setVideoOpen(false)}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 transition"
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
    </AppShell>
  )
}
